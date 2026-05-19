import mongoose from "mongoose";
import { Report } from "../../models/social/report.model.js";
import { Post } from "../../models/social/post.model.js";
import { Comment } from "../../models/social/comment.model.js";
import { User } from "../../models/users/user.model.js";

export type ModerationAction =
  | "resolve"
  | "reject"
  | "delete_post"
  | "delete_comment"
  | "suspend_user"
  | "warn_user";

type ModerationError = Error & { status?: number; code?: string };

const createModerationError = (
  status: number,
  message: string,
  code: string,
) => {
  const error = new Error(message) as ModerationError;
  error.status = status;
  error.code = code;
  return error;
};

const ensurePendingReport = async (
  reportId: string,
  session: mongoose.ClientSession,
) => {
  const report = await Report.findById(reportId)
    .select("status targetType targetId")
    .session(session);

  if (!report) {
    throw createModerationError(404, "Report not found", "REPORT_NOT_FOUND");
  }

  if (report.status !== "pending") {
    throw createModerationError(
      409,
      "Report has already been reviewed",
      "REPORT_ALREADY_REVIEWED",
    );
  }

  return report;
};

const requireTargetType = (targetType: string, expected: string) => {
  if (targetType !== expected) {
    throw createModerationError(
      400,
      `Report target type must be ${expected}`,
      "TARGET_TYPE_MISMATCH",
    );
  }
};

const markReport = async (
  reportId: string,
  moderatorId: string,
  status: string,
  actionTaken: string,
  session: mongoose.ClientSession,
) => {
  const reviewedAt = new Date();

  return Report.findByIdAndUpdate(
    reportId,
    {
      status,
      actionTaken,
      reviewedBy: moderatorId,
      reviewedAt,
    },
    { new: true, session },
  )
    .select(
      "targetType targetId status actionTaken reviewedBy reviewedAt createdAt",
    )
    .lean();
};

export const applyModerationAction = async (
  reportId: string,
  moderatorId: string,
  action: ModerationAction,
) => {
  const session = await mongoose.startSession();
  let updatedReport: any;

  try {
    await session.withTransaction(async () => {
      const report = await ensurePendingReport(reportId, session);

      switch (action) {
        case "resolve": {
          updatedReport = await markReport(
            reportId,
            moderatorId,
            "resolved",
            "none",
            session,
          );
          return;
        }
        case "reject": {
          updatedReport = await markReport(
            reportId,
            moderatorId,
            "rejected",
            "ignored",
            session,
          );
          return;
        }
        case "delete_post": {
          requireTargetType(report.targetType, "post");
          const post = await Post.findOneAndUpdate(
            { _id: report.targetId, isDeleted: false },
            { isDeleted: true },
            { new: true, session },
          )
            .select("_id")
            .lean();

          if (!post) {
            throw createModerationError(
              404,
              "Post not found or already deleted",
              "TARGET_NOT_FOUND",
            );
          }

          updatedReport = await markReport(
            reportId,
            moderatorId,
            "resolved",
            "post_deleted",
            session,
          );
          return;
        }
        case "delete_comment": {
          requireTargetType(report.targetType, "comment");
          const comment = await Comment.findOneAndUpdate(
            { _id: report.targetId, isDeleted: false },
            { isDeleted: true },
            { new: true, session },
          )
            .select("_id")
            .lean();

          if (!comment) {
            throw createModerationError(
              404,
              "Comment not found or already deleted",
              "TARGET_NOT_FOUND",
            );
          }

          updatedReport = await markReport(
            reportId,
            moderatorId,
            "resolved",
            "comment_deleted",
            session,
          );
          return;
        }
        case "suspend_user": {
          requireTargetType(report.targetType, "user");
          const user = await User.findOneAndUpdate(
            { _id: report.targetId, isActive: true },
            { isActive: false },
            { new: true, session },
          )
            .select("_id")
            .lean();

          if (!user) {
            throw createModerationError(
              404,
              "User not found or already suspended",
              "TARGET_NOT_FOUND",
            );
          }

          updatedReport = await markReport(
            reportId,
            moderatorId,
            "resolved",
            "user_suspended",
            session,
          );
          return;
        }
        case "warn_user": {
          requireTargetType(report.targetType, "user");
          const user = await User.findById(report.targetId)
            .select("_id")
            .session(session)
            .lean();

          if (!user) {
            throw createModerationError(
              404,
              "User not found",
              "TARGET_NOT_FOUND",
            );
          }

          updatedReport = await markReport(
            reportId,
            moderatorId,
            "resolved",
            "warning_sent",
            session,
          );
          return;
        }
        default:
          throw createModerationError(
            400,
            "Unsupported moderation action",
            "ACTION_NOT_SUPPORTED",
          );
      }
    });

    return updatedReport;
  } finally {
    session.endSession();
  }
};
