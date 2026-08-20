import { Request, Response } from "express";
import {
  getReportById,
  getReports,
  type ReportTargetType,
} from "../../services/social/report.service.js";

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined =>
  typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : undefined;

const allowedTargetTypes = ["post", "comment", "user"] as const;
const allowedSortBy = ["createdAt"] as const;
const allowedSortOrder = ["asc", "desc"] as const;

export const fetchReports = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseNumber(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, parseNumber(req.query.limit, 20)));

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const targetType = parseEnum(req.query.targetType, allowedTargetTypes) as
      | ReportTargetType
      | undefined;
    const sortBy = parseEnum(req.query.sortBy, allowedSortBy);
    const sortOrder = parseEnum(req.query.sortOrder, allowedSortOrder);
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
    throw error;
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
    throw error;
  }
};
