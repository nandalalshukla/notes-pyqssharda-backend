import { Request, Response } from "express";
import mongoose, { Model } from "mongoose";
import { Note } from "../../models/notes/notes.model.js";
import { Pyq } from "../../models/pyqs/pyq.model.js";
import { Syllabus } from "../../models/syllabus/syllabus.model.js";
import { BaseResourceFields } from "../../models/resource/resourceSchema.js";
import { AppError } from "../../utils/errors/AppError.js";
import { mergeResourcePage } from "../../services/resource/mergeResourcePages.js";

type ResourceType = "note" | "pyq" | "syllabus";
type Status = BaseResourceFields["status"];
type StatusCounts = Record<Status, number> & { all: number };
type ResourceRow = Record<string, any> & { _id: mongoose.Types.ObjectId; createdAt: Date; resourceType: ResourceType };

const projection =
  "_id title fileUrl publicId userId program courseCode courseName semester year school status createdAt updatedAt";
const statusValues: Status[] = ["pending", "approved", "rejected"];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emptyCounts(): StatusCounts {
  return { pending: 0, approved: 0, rejected: 0, all: 0 };
}

export const fetchMineResources = async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const page = Math.max(1, Math.trunc(Number(req.query.page) || 1));
  const limit = Math.min(50, Math.max(1, Math.trunc(Number(req.query.limit) || 25)));
  const rawQuery = req.query.query;
  if (rawQuery !== undefined && typeof rawQuery !== "string") {
    throw new AppError("Search query must be a string", 400);
  }
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
  if (query.length > 100) throw new AppError("Search query is too long", 400);

  const rawStatus = req.query.status;
  if (rawStatus !== undefined && (typeof rawStatus !== "string" || !["all", ...statusValues].includes(rawStatus))) {
    throw new AppError("Invalid resource status", 400);
  }
  const status = rawStatus && rawStatus !== "all" ? (rawStatus as Status) : undefined;

  const rawType = req.query.type;
  if (rawType !== undefined && (typeof rawType !== "string" || !["all", "note", "pyq", "syllabus"].includes(rawType))) {
    throw new AppError("Invalid resource type", 400);
  }
  const requestedType = rawType && rawType !== "all" ? (rawType as ResourceType) : undefined;

  if (req.query.sort !== undefined && typeof req.query.sort !== "string") {
    throw new AppError("Sort field must be a string", 400);
  }
  const sortField = typeof req.query.sort === "string" ? req.query.sort : "createdAt";
  const allowedSorts = ["createdAt", "updatedAt", "title", "courseCode"];
  if (!allowedSorts.includes(sortField)) throw new AppError("Invalid sort field", 400);
  const rawDirection = req.query.direction;
  if (rawDirection !== undefined && (typeof rawDirection !== "string" || (rawDirection !== "asc" && rawDirection !== "desc"))) {
    throw new AppError("Invalid sort direction", 400);
  }
  const direction: 1 | -1 = rawDirection === "asc" ? 1 : -1;
  const sort = { [sortField]: direction, _id: direction };

  const searchFilter: Record<string, unknown> = query
    ? {
        $or: [
          { title: new RegExp(escapeRegex(query), "i") },
          { courseName: new RegExp(escapeRegex(query), "i") },
          { courseCode: new RegExp(escapeRegex(query), "i") },
        ],
      }
    : {};

  const allSources: Array<{ type: ResourceType; model: Model<any> }> = [
    { type: "note", model: Note },
    { type: "pyq", model: Pyq },
    { type: "syllabus", model: Syllabus },
  ];
  const sources = allSources.filter(
    (source) => !requestedType || source.type === requestedType,
  );
  // To form a correct global page, each collection contributes at most the
  // first `skip + limit` rows in the requested order. This is enough to
  // determine the global page, keeps each read index ordered and projected,
  // and avoids sorting a $unionWith stream of full documents in MongoDB.
  const windowEnd = (page - 1) * limit + limit;

  const sourceResults = await Promise.all(
    sources.map(async ({ type, model }) => {
      const matchingFilter = {
        userId,
        ...(status ? { status } : {}),
        ...searchFilter,
      };
      const [rows, total, statusRows] = await Promise.all([
        model
          .find(matchingFilter)
          .select(projection)
          .sort(sort)
          .limit(windowEnd)
          .lean(),
        model.countDocuments(matchingFilter),
        model.aggregate<{ _id: Status; n: number }>([
          { $match: { userId } },
          { $group: { _id: "$status", n: { $sum: 1 } } },
        ]),
      ]);
      const counts = emptyCounts();
      for (const row of statusRows) {
        if (statusValues.includes(row._id)) {
          counts[row._id] = row.n;
          counts.all += row.n;
        }
      }
      return {
        rows: rows.map((row) => ({ ...row, resourceType: type }) as ResourceRow),
        total,
        counts,
      };
    }),
  );

  const countsByType = {
    note: emptyCounts(),
    pyq: emptyCounts(),
    syllabus: emptyCounts(),
  };
  for (let index = 0; index < sources.length; index += 1) {
    countsByType[sources[index].type] = sourceResults[index].counts;
  }
  // Counts intentionally describe all resource types, including when the
  // table is filtered to one type or status, so dashboard summary cards do
  // not change when the user narrows the visible page.
  if (requestedType) {
    const missingSources = allSources.filter((source) => source.type !== requestedType);
    const missingCounts = await Promise.all(
      missingSources.map(({ model }) =>
        model.aggregate<{ _id: Status; n: number }>([
          { $match: { userId } },
          { $group: { _id: "$status", n: { $sum: 1 } } },
        ]),
      ),
    );
    missingSources.forEach((source, index) => {
      for (const row of missingCounts[index]) {
        if (!statusValues.includes(row._id)) continue;
        countsByType[source.type][row._id] = row.n;
        countsByType[source.type].all += row.n;
      }
    });
  }
  const counts = emptyCounts();
  for (const type of ["note", "pyq", "syllabus"] as const) {
    for (const statusValue of statusValues) counts[statusValue] += countsByType[type][statusValue];
    counts.all += countsByType[type].all;
  }

  const total = sourceResults.reduce((sum, result) => sum + result.total, 0);
  const items = mergeResourcePage(
    sourceResults.map((result) => result.rows),
    page,
    limit,
    sortField,
    direction,
  );

  res.status(200).json({
    success: true,
    items,
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
