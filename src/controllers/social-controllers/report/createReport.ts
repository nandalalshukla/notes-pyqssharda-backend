import { Request, Response } from "express";
import mongoose from "mongoose";
import { createReport } from "../../../services/social/report.service.js";

export const createReportController = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "You must be logged in to submit a report",
      });
    }

    const { targetType, targetId, reason, message } = req.body;

    const report = await createReport({
      reporterId: req.user.userId,
      targetType,
      targetId,
      reason,
      message,
    });

    return res.status(201).json({
      success: true,
      code: "REPORT_SUBMITTED",
      message: "Thank you for your report. Our team will review it shortly.",
      data: {
        report: {
          id: report._id,
          targetType: report.targetType,
          targetId: report.targetId,
          status: report.status,
          createdAt: report.createdAt,
        },
      },
    });
  } catch (error: unknown) {
    const typedError = error as {
      status?: number;
      code?: string | number;
      message?: string;
    };

    // Handle custom service errors with status
    if (typedError?.status && typedError?.message) {
      let code = "ERROR";
      let friendlyMessage = typedError.message;

      // Map error messages to codes
      if (typedError.message.includes("already reported")) {
        code = "DUPLICATE_REPORT";
        friendlyMessage =
          "You've already reported this item. Our team is reviewing it.";
      } else if (typedError.message.includes("own content")) {
        code = "SELF_REPORT";
        friendlyMessage = "You cannot report your own content.";
      } else if (typedError.message.includes("not found")) {
        code = "TARGET_NOT_FOUND";
        friendlyMessage =
          "The item you're trying to report no longer exists or has been removed.";
      }

      return res.status(typedError.status).json({
        success: false,
        code,
        message: friendlyMessage,
      });
    }

    // Handle MongoDB duplicate key errors
    if (typeof typedError?.code === "number" && typedError.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_REPORT",
        message: "You've already reported this item. Our team is reviewing it.",
      });
    }

    // Handle invalid ObjectId format
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        code: "INVALID_TARGET",
        message: "Invalid target ID format.",
      });
    }

    console.error("createReport error:", error);
    return res.status(500).json({
      success: false,
      code: "INTERNAL_ERROR",
      message:
        "We couldn't process your report. Please try again later. If the problem persists, contact support.",
    });
  }
};
