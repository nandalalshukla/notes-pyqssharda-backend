import { Request, Response } from "express";
import {
  applyModerationAction,
  ModerationAction,
} from "../../services/moderation/reportModeration.service.js";

const handleModerationAction = (action: ModerationAction) => {
  return async (req: Request, res: Response) => {
    try {
      const moderatorId = req.user?.userId;
      if (!moderatorId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const moderatorRole = req.user?.userRole;

      const { reportId } = req.params;
      const report = await applyModerationAction(
        reportId,
        moderatorId,
        moderatorRole,
        action,
      );

      return res.status(200).json({
        success: true,
        message: "Report updated successfully",
        data: { report },
      });
    } catch (error: unknown) {
      const typedError = error as {
        status?: number;
        message?: string;
        report?: unknown;
      };
      if (typedError?.status && typedError?.message) {
        return res.status(typedError.status).json({
          success: false,
          message: typedError.message,
          data: typedError.report ? { report: typedError.report } : undefined,
        });
      }

      console.error("report moderation error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  };
};

export const resolveReport = handleModerationAction("resolve");
export const rejectReport = handleModerationAction("reject");
export const deleteReportedPost = handleModerationAction("delete_post");
export const deleteReportedComment = handleModerationAction("delete_comment");
export const suspendReportedUser = handleModerationAction("suspend_user");
export const warnReportedUser = handleModerationAction("warn_user");
