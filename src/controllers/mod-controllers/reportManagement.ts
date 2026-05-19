import { Request, Response } from "express";
import {
  getReportById,
  getReports,
} from "../../services/social/report.service.js";

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const fetchReports = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseNumber(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, parseNumber(req.query.limit, 20)));

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const targetType =
      typeof req.query.targetType === "string"
        ? req.query.targetType
        : undefined;
    const sortBy =
      typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
    const sortOrder =
      typeof req.query.sortOrder === "string" ? req.query.sortOrder : undefined;
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    const { reports, pagination } = await getReports({
      page,
      limit,
      status,
      targetType,
      sortBy,
      sortOrder,
      search,
    });

    return res.status(200).json({
      success: true,
      data: {
        reports,
        pagination,
      },
    });
  } catch (error) {
    console.error("fetchReports error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const fetchReportById = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const report = await getReportById(reportId);

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    return res.status(200).json({
      success: true,
      data: { report },
    });
  } catch (error) {
    console.error("fetchReportById error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
