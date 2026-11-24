import { Request, Response } from "express";
import mongoose from "mongoose";
import { Note } from "../../models/notes/notes.model.js";
import { Pyq } from "../../models/pyqs/pyq.model.js";
import { Syllabus } from "../../models/syllabus/syllabus.model.js";

export const fetchMineResources = async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 25));
  const query =
    typeof req.query.query === "string" ? req.query.query.trim() : "";
  const search: Record<string, unknown> = query
    ? {
        $or: [
          { title: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { courseName: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { courseCode: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ],
      }
    : {};

  const [aggregateResult, statusCounts] = await Promise.all([
    Pyq.aggregate([
      { $match: { userId, ...search } },
      { $set: { resourceType: "pyq" } },
      {
        $unionWith: {
          coll: "notes",
          pipeline: [
            { $match: { userId, ...search } },
            { $set: { resourceType: "note" } },
          ],
        },
      },
      {
        $unionWith: {
          coll: "syllabus",
          pipeline: [
            { $match: { userId, ...search } },
            { $set: { resourceType: "syllabus" } },
          ],
        },
      },
      {
        $facet: {
          items: [
            { $sort: { createdAt: -1 } },
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
  for (const rows of statusCounts) {
    for (const row of rows as Array<{ _id: "pending" | "approved" | "rejected"; n: number }>) {
      counts[row._id] += row.n;
      counts.all += row.n;
    }
  }
  const total =
    (result.totals[0]?.all as number) ||
    (counts.all as number);

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
  });
};
