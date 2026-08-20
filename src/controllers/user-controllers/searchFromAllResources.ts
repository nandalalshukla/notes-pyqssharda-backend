// Cross-resource search (notes/pyqs/syllabus) driven by a query + optional
// `type` filter.
import { Request, Response } from "express";
import { Note } from "../../models/notes/notes.model.js";
import { Pyq } from "../../models/pyqs/pyq.model.js";
import { Syllabus } from "../../models/syllabus/syllabus.model.js";
import { AppError } from "../../utils/errors/AppError.js";

const MAX_RESULTS_PER_RESOURCE = 50;

// See resource.service.ts's escapeRegex for why this is necessary — raw
// user input goes straight into `new RegExp()` below.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchFromAllResources = async (req: Request, res: Response) => {
  const { query, type } = req.query;
  if (!query || typeof query !== "string") {
    throw new AppError("Query parameter is required", 400);
  }

  const regex = new RegExp(escapeRegex(query), "i");

  const buildSearchQuery = (includeYear: boolean) => {
    const searchConditions: Record<string, unknown>[] = [
      { title: regex },
      { program: regex },
      { courseCode: regex },
      { courseName: regex },
    ];
    if (includeYear) searchConditions.push({ year: regex });

    const numQuery = parseInt(query, 10);
    if (!Number.isNaN(numQuery)) {
      searchConditions.push({ semester: numQuery });
    }

    // Only ever surface moderator-approved content publicly — this was
    // previously missing, so pending/rejected uploads (including ones
    // awaiting review for policy violations) were searchable by anyone.
    return { status: "approved", $or: searchConditions };
  };

  const wantsType = (t: string) => !type || type === "all" || type === t;

  const [notes, pyqs, syllabus] = await Promise.all([
    wantsType("notes")
      ? Note.find(buildSearchQuery(false))
          .limit(MAX_RESULTS_PER_RESOURCE)
          .lean()
      : Promise.resolve([]),
    wantsType("pyqs")
      ? Pyq.find(buildSearchQuery(true)).limit(MAX_RESULTS_PER_RESOURCE).lean()
      : Promise.resolve([]),
    wantsType("syllabus")
      ? Syllabus.find(buildSearchQuery(false))
          .limit(MAX_RESULTS_PER_RESOURCE)
          .lean()
      : Promise.resolve([]),
  ]);

  res.status(200).json({
    results: [...notes, ...pyqs, ...syllabus],
  });
};
