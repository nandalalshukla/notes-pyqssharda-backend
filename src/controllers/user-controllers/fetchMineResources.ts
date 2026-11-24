import { Request, Response } from "express";
import mongoose from "mongoose";
import { Note } from "../../models/notes/notes.model.js";
import { Pyq } from "../../models/pyqs/pyq.model.js";
import { Syllabus } from "../../models/syllabus/syllabus.model.js";
import { AppError } from "../../utils/errors/AppError.js";

export const fetchMineResources = async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 25));
  const query =
    typeof req.query.query === "string" ? req.query.query.trim() : "";
  const status = req.query.status;
  if (
    status !== undefined &&
    status !== "all" &&
    status !== "pending" &&
    status !== "approved" &&
    status !== "rejected"
  ) {
    throw new AppError("Invalid resource status", 400);
  }
  const resourceType = req.query.type;
  if (
    resourceType !== undefined &&
    resourceType !== "all" &&
    resourceType !== "note" &&
    resourceType !== "pyq" &&
    resourceType !== "syllabus"
  ) {
    throw new AppError("Invalid resource type", 400);
  }
  const sortField = req.query.sort;
  const sortFields = ["createdAt", "updatedAt", "title", "courseCode"];
  if (sortField !== undefined && !sortFields.includes(String(sortField))) {
    throw new AppError("Invalid sort field", 400);
  }
  const direction = req.query.direction;
  if (direction !== undefined && direction !== "asc" && direction !== "desc") {
    throw new AppError("Invalid sort direction", 400);
  }

  const search: Record<string, unknown> = query
    ? {
        $or: [
          { title: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { courseName: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { courseCode: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ],
      }
    : {};
  const selectedStatus = status && status !== "all" ? status : undefined;
  const selectedType = resourceType && resourceType !== "all" ? resourceType : undefined;
  if (query.length > 100) throw new AppError("Search query is too long", 400);
  const sortDirection: 1 | -1 = direction === "asc" ? 1 : -1;
  const sort: Record<string, 1 | -1> = {
    [String(sortField || "createdAt")]: sortDirection,
    _id: sortDirection,
  };
  // Each source is matched with its own indexed owner/status fields before
  // the union. `collection.name` avoids relying on Mongoose's pluralization
  // rules (notably, `syllabus` is intentionally singular in this database).
  const sourcePipeline = (type: "note" | "pyq" | "syllabus") => [
    { $match: { userId, ...(selectedStatus ? { status: selectedStatus } : {}), ...search } },
    { $set: { resourceType: type } },
  ];
  const firstType = selectedType || "pyq";
  const unionTypes = selectedType
    ? []
    : [
        { type: "note" as const, model: Note },
        { type: "syllabus" as const, model: Syllabus },
      ];

  const [aggregateResult, statusCounts] = await Promise.all([
    (selectedType === "note" ? Note : selectedType === "syllabus" ? Syllabus : Pyq).aggregate([
      { $match: { userId, ...(selectedStatus ? { status: selectedStatus } : {}), ...search } },
      { $set: { resourceType: firstType } },
      ...unionTypes.map(({ type, model }) => ({
        $unionWith: { coll: model.collection.name, pipeline: sourcePipeline(type) },
      })),
      {
        $facet: {
          items: [
            { $sort: sort },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                title: 1,
                fileUrl: 1,
                publicId: 1,
                userId: 1,
                program: 1,
                courseCode: 1,
                courseName: 1,
                semester: 1,
                year: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                resourceType: 1,
              },
            },
          ],
          totals: [{ $count: "all" }],
        },
      },
    ]),
    Promise.all([
      Pyq.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
      Note.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
      Syllabus.aggregate([
        { $match: { userId } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
    ]),
  ]);

  const result = aggregateResult[0] || { items: [], totals: [] };
  const counts = { pending: 0, approved: 0, rejected: 0, all: 0 };
  const countsByType = {
    pyq: { pending: 0, approved: 0, rejected: 0, all: 0 },
    note: { pending: 0, approved: 0, rejected: 0, all: 0 },
    syllabus: { pending: 0, approved: 0, rejected: 0, all: 0 },
  };
  const types = ["pyq", "note", "syllabus"] as const;
  for (const [index, rows] of statusCounts.entries()) {
    for (const row of rows as Array<{ _id: "pending" | "approved" | "rejected"; n: number }>) {
      counts[row._id] += row.n;
      counts.all += row.n;
      countsByType[types[index]][row._id] = row.n;
      countsByType[types[index]].all += row.n;
    }
  }
  const total = (result.totals[0]?.all as number | undefined) ?? 0;

  res.status(200).json({
    success: true,
    items: result.items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
    counts,
    countsByType,
  });
};
