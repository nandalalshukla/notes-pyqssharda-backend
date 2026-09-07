import { QueryFilter, Model } from "mongoose";
import { BaseResourceFields } from "../../models/resource/resourceSchema.js";
import cloudinary from "../../config/cloudinary.js";
import { getResourceType } from "../../config/multer.js";
import { AppError } from "../../utils/errors/AppError.js";
import {
  incrementContribution,
  decrementContribution,
} from "../../utils/incrementContribution.js";

/**
 * Notes, PYQs, and Syllabus are the same "uploaded file + metadata, subject
 * to moderation" resource shape with a couple of resource-specific fields
 * and endpoint-specific response envelopes. This config is what a resource
 * (see controllers/resource/notes.config.ts and friends) supplies so this
 * file's functions — the actual list/search/create/update/delete/moderate
 * logic — only need to be written once.
 */
export interface ResourceConfig<TDoc extends BaseResourceFields> {
  model: Model<TDoc>;
  /** e.g. "Note" — used in error messages ("Note not found"). */
  displayName: string;
  /** e.g. "notes" — used in ownership messages ("your own notes"). */
  pluralDisplayName: string;
  /** e.g. "note" — passed to the moderation email templates. */
  emailContentType: string;
  /** Only PYQs carry a `year` field. */
  hasYearField: boolean;
  /** The exact top-level JSON key each endpoint responds with — these vary
   * per resource *and* per endpoint in the existing API (e.g. syllabus
   * lists come back under `syllabuses` in some endpoints and `syllabus` in
   * others), so every one is spelled out rather than derived. */
  responseKeys: {
    singular: string;
    publicList: string;
    myList: string;
    adminList: string;
    modList: string;
  };
}

export interface ResourceFilePayload {
  path: string; // Cloudinary secure_url, set by multer-storage-cloudinary
  filename: string; // Cloudinary public_id, set by multer-storage-cloudinary
  mimetype: string;
}

export interface SearchParams {
  query?: string;
  program?: string;
  courseCode?: string;
  semester?: string;
  year?: string;
}

const MAX_SEARCH_RESULTS = 100;

// User-supplied search text is interpolated into a RegExp — without
// escaping, a query containing regex metacharacters (e.g. `(a+)+$`) is
// interpreted as a pattern instead of literal text, which at best returns
// wrong results and at worst is a catastrophic-backtracking DoS vector on a
// public, unauthenticated endpoint.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRegex(value: string): RegExp {
  return new RegExp(escapeRegex(value), "i");
}

/**
 * A course-code matcher that tolerates how people actually type codes.
 *
 * Codes are stored with a space ("CSE 252") but users type "cse252",
 * "CSE-252" or "cse 2" interchangeably. So the separator is normalised
 * away on both sides and re-inserted as optional.
 *
 * Anchored where possible: a code search means "starts with", and an
 * anchored prefix can use the courseCode index, whereas a floating
 * /CSE2/ forces a scan of every document.
 */
function courseCodePattern(input: string): RegExp {
  const cleaned = input.replace(/[^A-Za-z0-9]/g, "");
  const split = /^([A-Za-z]+)(\d*)$/.exec(cleaned);

  if (split) {
    const [, letters, digits] = split;
    // "\\s*" — a literal backslash-s reaching the RegExp, not the string
    // escape "\s" (which JavaScript would collapse to a plain "s" and quietly
    // turn "CSE 252" into a search for "CSEs252").
    return new RegExp(
      "^" + escapeRegex(letters) + "\\s*" + escapeRegex(digits),
      "i",
    );
  }

  // Digits only, or something mixed — fall back to a contains match, which
  // can't use the index but is the only thing that can match at all.
  return new RegExp(escapeRegex(cleaned || input), "i");
}

async function destroyAsset(
  publicId: string,
  resourceType: BaseResourceFields["resourceType"],
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    // The DB write this accompanies already succeeded (or is about to) —
    // an orphaned Cloudinary asset is a cheaper failure mode than blocking
    // a user's delete/replace on a third-party API hiccup. Logged so it can
    // be cleaned up manually if it ever happens.
    console.error(`Failed to destroy Cloudinary asset ${publicId}:`, error);
  }
}

async function creditContributionOnRemoval(doc: {
  status: BaseResourceFields["status"];
  userId: BaseResourceFields["userId"];
}): Promise<void> {
  // Only approved uploads were ever credited (see approve() below) — only
  // those need the credit reversed when the upload goes away.
  if (doc.status === "approved") {
    await decrementContribution(doc.userId.toString());
  }
}

export async function listApproved<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  limit: number,
) {
  return config.model
    .find({ status: "approved" } as QueryFilter<TDoc>)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("userId", "username")
    .lean();
}

export interface PublicListParams {
  page?: number;
  limit?: number;
  program?: string;
  school?: string;
  semester?: string;
  year?: string;
  courseCode?: string;
  query?: string;
}

/**
 * The browsable, filtered, paginated view of approved resources.
 *
 * `listApproved` above returns a flat top-N and is what the old
 * "latest uploads" strip uses. It stopped being enough once the PYQ
 * collection went from a handful of hand-uploaded papers to thousands
 * imported from the university repository: without paging and
 * server-side filters, browsing means shipping the entire collection to
 * the browser and filtering it there.
 */
export async function listPublic<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  params: PublicListParams,
) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 24));

  const filter: Record<string, unknown> = { status: "approved" };
  if (params.program) filter.program = params.program;
  if (params.school) filter.school = params.school;
  if (params.year) filter.year = params.year;
  if (params.semester && !Number.isNaN(Number(params.semester))) {
    filter.semester = Number(params.semester);
  }
  if (params.courseCode) {
    filter.courseCode = courseCodePattern(params.courseCode);
  }
  if (params.query) {
    const regex = toRegex(params.query);
    filter.$or = [
      { courseName: regex },
      { courseCode: regex },
      { title: regex },
    ];
  }

  const [docs, total] = await Promise.all([
    config.model
      .find(filter as QueryFilter<TDoc>)
      // Newest academic year first, then by course code so a semester's
      // papers read in a predictable order rather than upload order.
      .sort({ year: -1, semester: 1, courseCode: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "username")
      .lean(),
    config.model.countDocuments(filter as QueryFilter<TDoc>),
  ]);

  return {
    docs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Filter options are identical for every visitor and only change when new
 * resources are approved or imported, yet the browse page asks for them on
 * every load. Four `distinct()` calls per page view is pure waste, so the
 * answer is held for a short while.
 *
 * Deliberately a plain in-process Map rather than Redis: the data is tiny,
 * regenerating it is cheap, and a stale entry is harmless for a minute.
 */
const filterOptionsCache = new Map<
  string,
  { value: FilterOptions; expiresAt: number }
>();
const FILTER_OPTIONS_TTL_MS = 60_000;

export interface FilterOptions {
  programs: string[];
  schools: string[];
  years: string[];
  semesters: number[];
}

/** Drops the cached options so the next read rebuilds them. */
export function invalidateFilterOptions(displayName?: string) {
  if (displayName) filterOptionsCache.delete(displayName);
  else filterOptionsCache.clear();
}

/**
 * The distinct values present among approved resources, so the browse
 * filters offer only options that will actually return something.
 */
export async function listFilterOptions<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
): Promise<FilterOptions> {
  const cached = filterOptionsCache.get(config.displayName);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const base = { status: "approved" } as QueryFilter<TDoc>;
  const [programs, schools, years, semesters] = await Promise.all([
    config.model.distinct("program", base),
    config.model.distinct("school", base),
    config.model.distinct("year", base),
    config.model.distinct("semester", base),
  ]);

  const clean = (values: unknown[]) =>
    values.filter((v) => v !== null && v !== undefined && v !== "");

  const value: FilterOptions = {
    programs: (clean(programs) as string[]).sort(),
    schools: (clean(schools) as string[]).sort(),
    // Newest academic year first — that's the order people look in.
    years: (clean(years) as string[]).sort().reverse(),
    semesters: (clean(semesters) as number[]).sort((a, b) => a - b),
  };

  filterOptionsCache.set(config.displayName, {
    value,
    expiresAt: Date.now() + FILTER_OPTIONS_TTL_MS,
  });
  return value;
}

export async function search<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  params: SearchParams,
) {
  const filter: Record<string, unknown> = { status: "approved" };

  if (params.query) {
    const regex = toRegex(params.query);
    const or: Record<string, unknown>[] = [
      { title: regex },
      { program: regex },
      { courseCode: regex },
      { courseName: regex },
    ];
    const numQuery = parseInt(params.query, 10);
    if (!Number.isNaN(numQuery)) {
      or.push({ semester: numQuery });
    }
    filter.$or = or;
  }

  if (params.program) filter.program = toRegex(params.program);
  if (params.courseCode) filter.courseCode = toRegex(params.courseCode);

  if (params.semester) {
    const semesterNum = parseInt(params.semester, 10);
    if (!Number.isNaN(semesterNum)) filter.semester = semesterNum;
  }

  // Only meaningful for PYQs — Notes/Syllabus don't have a `year` field, so
  // filtering by it would previously silently return zero results instead
  // of just being ignored.
  if (config.hasYearField && params.year) {
    filter.year = toRegex(params.year);
  }

  return config.model
    .find(filter as QueryFilter<TDoc>)
    .sort({ createdAt: -1 })
    .limit(MAX_SEARCH_RESULTS)
    .populate("userId", "username")
    .lean();
}

export async function listForUser<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  userId: string,
) {
  return config.model
    .find({ userId } as QueryFilter<TDoc>)
    .sort({ createdAt: -1 })
    .lean();
}

export async function create<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  {
    body,
    file,
    userId,
  }: { body: Record<string, unknown>; file: ResourceFilePayload; userId: string },
) {
  const doc = new config.model({
    ...body,
    fileUrl: file.path,
    publicId: file.filename,
    resourceType: getResourceType(file.mimetype),
    userId,
  });
  await doc.save();
  return doc;
}

export async function update<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  {
    id,
    userId,
    body,
    file,
  }: {
    id: string;
    userId: string;
    body: Record<string, unknown>;
    file: ResourceFilePayload | undefined;
  },
) {
  const doc = await config.model.findById(id);
  if (!doc) {
    throw new AppError(`${config.displayName} not found`, 404);
  }
  if (doc.userId.toString() !== userId) {
    throw new AppError(
      `Forbidden: You can only edit your own ${config.pluralDisplayName}`,
      403,
    );
  }

  Object.assign(doc, body);

  if (file) {
    const oldPublicId = doc.publicId;
    const oldResourceType = doc.resourceType;
    doc.fileUrl = file.path;
    doc.publicId = file.filename;
    doc.resourceType = getResourceType(file.mimetype);
    // The new file is already uploaded (multer-storage-cloudinary uploads
    // during request parsing, before this handler runs) — only the old one
    // needs cleaning up now, and only after the doc change is queued.
    await destroyAsset(oldPublicId, oldResourceType);
  }

  await doc.save();
  return doc;
}

export async function remove<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  { id, userId }: { id: string; userId: string },
) {
  const doc = await config.model.findById(id);
  if (!doc) {
    throw new AppError(`${config.displayName} not found`, 404);
  }
  if (doc.userId.toString() !== userId) {
    throw new AppError(
      `Forbidden: You can only delete your own ${config.pluralDisplayName}`,
      403,
    );
  }

  await destroyAsset(doc.publicId, doc.resourceType);
  await doc.deleteOne();
  await creditContributionOnRemoval(doc);
}

// ── Admin ──────────────────────────────────────────────────────────────

export async function listApprovedAdmin<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
) {
  return config.model.find({ status: "approved" } as QueryFilter<TDoc>).lean();
}

export async function removeAdmin<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  id: string,
) {
  const doc = await config.model.findById(id);
  if (!doc) {
    throw new AppError(`${config.displayName} not found`, 404);
  }
  await destroyAsset(doc.publicId, doc.resourceType);
  await doc.deleteOne();
  await creditContributionOnRemoval(doc);
}

// ── Moderation ─────────────────────────────────────────────────────────

export async function listPending<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
) {
  return config.model
    .find({ status: "pending" } as QueryFilter<TDoc>)
    .populate("userId", "name email username")
    .sort({ createdAt: -1 })
    .lean();
}

interface UploaderInfo {
  email: string;
  name: string;
}

export async function approve<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  {
    id,
    approverId,
    getUploader,
  }: {
    id: string;
    approverId: string;
    getUploader: (userId: string) => Promise<UploaderInfo | null>;
  },
) {
  const doc = await config.model.findOne({
    status: "pending",
    _id: id,
  } as QueryFilter<TDoc>);
  if (!doc) {
    throw new AppError(`${config.displayName} not found`, 404);
  }

  const uploader = await getUploader(doc.userId.toString());
  if (!uploader) {
    throw new AppError("User not found", 404);
  }

  await config.model.findByIdAndUpdate(id, {
    status: "approved",
    approvedAt: new Date(),
    approvedBy: approverId,
  });
  // A newly approved resource can introduce a program, year or semester the
  // filter dropdowns don't list yet.
  invalidateFilterOptions(config.displayName);
  await incrementContribution(doc.userId.toString());

  return uploader;
}

export async function reject<TDoc extends BaseResourceFields>(
  config: ResourceConfig<TDoc>,
  {
    id,
    rejecterId,
    rejectionReason,
    getUploader,
  }: {
    id: string;
    rejecterId: string;
    rejectionReason: string;
    getUploader: (userId: string) => Promise<UploaderInfo | null>;
  },
) {
  const doc = await config.model.findOne({
    status: "pending",
    _id: id,
  } as QueryFilter<TDoc>);
  if (!doc) {
    throw new AppError(`${config.displayName} not found`, 404);
  }

  const uploader = await getUploader(doc.userId.toString());
  if (!uploader) {
    throw new AppError("User not found", 404);
  }

  await config.model.findByIdAndUpdate(id, {
    status: "rejected",
    rejectionReason,
    rejectedAt: new Date(),
    rejectedBy: rejecterId,
  });

  return uploader;
}
