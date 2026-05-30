import mongoose from "mongoose";
import { Report } from "../../models/social/report.model.js";
import { Post } from "../../models/social/post.model.js";
import { Comment } from "../../models/social/comment.model.js";
import { User } from "../../models/users/user.model.js";

export type ReportTargetType = "post" | "comment" | "user";

type CreateReportParams = {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  message?: string;
};

type ReportListQuery = {
  page: number;
  limit: number;
  status?: string;
  targetType?: ReportTargetType;
  sortBy?: "createdAt";
  sortOrder?: "asc" | "desc";
  search?: string;
};

type ReportServiceError = Error & { status?: number; code?: string };

const createServiceError = (status: number, message: string, code: string) => {
  const error = new Error(message) as ReportServiceError;
  error.status = status;
  error.code = code;
  return error;
};

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTargetInfo = async (
  targetType: ReportTargetType,
  targetId: string,
) => {
  if (targetType === "post") {
    const post = await Post.findOne({ _id: targetId, isDeleted: false })
      .select("author")
      .lean();
    if (!post) return null;
    return { ownerId: post.author.toString() };
  }

  if (targetType === "comment") {
    const comment = await Comment.findOne({ _id: targetId, isDeleted: false })
      .select("author")
      .lean();
    if (!comment) return null;
    return { ownerId: comment.author.toString() };
  }

  const user = await User.findById(targetId).select("_id").lean();
  if (!user) return null;
  return { ownerId: user._id.toString() };
};

const getTargetsByType = async (reports: any[]) => {
  const postIds: string[] = [];
  const commentIds: string[] = [];
  const userIds: string[] = [];

  reports.forEach((report) => {
    const targetId = report.targetId?.toString();
    if (!targetId) return;
    if (report.targetType === "post") postIds.push(targetId);
    if (report.targetType === "comment") commentIds.push(targetId);
    if (report.targetType === "user") userIds.push(targetId);
  });

  const [posts, comments, users] = await Promise.all([
    postIds.length
      ? Post.find({ _id: { $in: postIds }, isDeleted: false })
          .select("_id author content media createdAt isDeleted")
          .lean()
      : [],
    commentIds.length
      ? Comment.find({ _id: { $in: commentIds }, isDeleted: false })
          .select("_id post author content createdAt isDeleted")
          .lean()
      : [],
    userIds.length
      ? User.find({ _id: { $in: userIds } })
          .select("_id username profilePic role isActive")
          .lean()
      : [],
  ]);

  return {
    post: new Map(posts.map((post) => [post._id.toString(), post])),
    comment: new Map(
      comments.map((comment) => [comment._id.toString(), comment]),
    ),
    user: new Map(users.map((user) => [user._id.toString(), user])),
  };
};

export const createReport = async ({
  reporterId,
  targetType,
  targetId,
  reason,
  message,
}: CreateReportParams) => {
  if (!mongoose.isValidObjectId(targetId)) {
    throw createServiceError(400, "Invalid target ID format", "INVALID_ID");
  }

  if (!mongoose.isValidObjectId(reporterId)) {
    throw createServiceError(400, "Invalid reporter ID", "INVALID_ID");
  }

  const target = await getTargetInfo(targetType, targetId);
  if (!target) {
    throw createServiceError(404, "Target not found", "TARGET_NOT_FOUND");
  }

  if (target.ownerId === reporterId) {
    throw createServiceError(
      400,
      "You cannot report your own content",
      "SELF_REPORT",
    );
  }

  const existing = await Report.findOne({
    reporter: reporterId,
    targetType,
    targetId,
  })
    .select("_id")
    .lean();

  if (existing) {
    throw createServiceError(
      409,
      "You have already reported this item",
      "DUPLICATE_REPORT",
    );
  }

  const sanitizedMessage = typeof message === "string" ? message.trim() : "";

  return Report.create({
    reporter: reporterId,
    targetType,
    targetId,
    targetOwner: target.ownerId,
    reason,
    message: sanitizedMessage,
  });
};

export const getReports = async ({
  page,
  limit,
  status,
  targetType,
  sortBy = "createdAt",
  sortOrder = "desc",
  search,
}: ReportListQuery) => {
  const filter: Record<string, unknown> = {};

  if (status) filter.status = status;
  if (targetType) filter.targetType = targetType;

  if (search?.trim()) {
    const term = search.trim();
    if (objectIdRegex.test(term)) {
      const objectId = new mongoose.Types.ObjectId(term);
      filter.$or = [
        { targetId: objectId },
        { reporter: objectId },
        { targetOwner: objectId },
      ];
    } else {
      const regex = new RegExp(escapeRegex(term), "i");
      filter.$or = [{ reason: regex }, { message: regex }];
    }
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .select(
        "reporter targetType targetId targetOwner reason message status createdAt updatedAt",
      )
      .populate("reporter", "_id username profilePic role")
      .populate("targetOwner", "_id username profilePic role")
      .lean(),
    Report.countDocuments(filter),
  ]);

  const targets = await getTargetsByType(reports);

  const enrichedReports = reports.map((report) => {
    const targetId = report.targetId?.toString();
    const targetEntity = targetId
      ? (targets[report.targetType as ReportTargetType]?.get(targetId) ?? null)
      : null;

    return {
      ...report,
      targetEntity,
    };
  });

  return {
    reports: enrichedReports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
};

export const getReportById = async (reportId: string) => {
  const report = await Report.findById(reportId)
    .select(
      "reporter targetType targetId targetOwner reason message status createdAt updatedAt",
    )
    .populate("reporter", "_id username profilePic role")
    .populate("targetOwner", "_id username profilePic role")
    .lean();

  if (!report) return null;

  const targets = await getTargetsByType([report]);
  const targetId = report.targetId?.toString();
  const targetEntity = targetId
    ? (targets[report.targetType as ReportTargetType]?.get(targetId) ?? null)
    : null;

  return {
    ...report,
    targetEntity,
  };
};
