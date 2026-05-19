import { Request, Response } from "express";
import mongoose from "mongoose";
import { createReport } from "../../../services/social/report.service.js";

export const createReportController = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
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
      message: "Report submitted successfully",
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

    if (typedError?.status && typedError?.message) {
      return res
        .status(typedError.status)
        .json({ success: false, message: typedError.message });
    }

    if (typeof typedError?.code === "number" && typedError.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this item",
      });
    }

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        message: "Invalid target ID format",
      });
    }

    console.error("createReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
