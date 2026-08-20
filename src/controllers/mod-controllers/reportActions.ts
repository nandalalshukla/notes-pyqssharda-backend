import { Request, Response } from "express";
import {
  applyModerationAction,
  ModerationAction,
  sendModerationActionEmails,
} from "../../services/moderation/reportModeration.service.js";
import { UnauthorizedError } from "../../utils/errors/AppError.js";

const handleModerationAction = (action: ModerationAction) => {
  return async (req: Request, res: Response) => {
    const moderatorId = req.user?.userId;
    if (!moderatorId) {
      throw new UnauthorizedError();
    }

    const moderatorRole = req.user?.userRole;

    const { reportId } = req.params;
    // Any failure here (report already reviewed, target gone, self-
    // moderation, ...) is a real AppError with a `data` payload where
    // relevant (see reportModeration.service.ts) — errorHandler.middleware.ts
    // turns it into the same response shape this used to hand-roll here.
    const report = await applyModerationAction(
      reportId,
      moderatorId,
      moderatorRole,
      action,
    );

    // Send notification emails to reporter and content owner (async, non-blocking)
    // This allows the API to respond quickly while emails are sent in the background
    setImmediate(() => {
      sendModerationActionEmails(reportId, report.actionTaken, moderatorId).catch(
        (error) => {
          console.error(
            "Failed to send moderation action emails:",
            error instanceof Error ? error.message : error,
          );
        },
      );
    });

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      data: { report },
    });
  };
};

export const resolveReport = handleModerationAction("resolve");
export const rejectReport = handleModerationAction("reject");
export const deleteReportedPost = handleModerationAction("delete_post");
export const deleteReportedComment = handleModerationAction("delete_comment");
export const suspendReportedUser = handleModerationAction("suspend_user");
export const warnReportedUser = handleModerationAction("warn_user");
export const deleteReportedUser = handleModerationAction("delete_user");
