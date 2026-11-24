import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/errors/AppError.js";

type PaginationOptions = {
  maxLimit?: number;
};

export const clampPagination = ({ maxLimit = 50 }: PaginationOptions = {}) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const asPositiveInteger = (value: unknown, fallback: number) => {
      if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
    };

    const page = asPositiveInteger(req.query.page, 1);
    const limit = Math.min(maxLimit, asPositiveInteger(req.query.limit, 25));
    // Offset pagination is intentionally capped. Reject an offset beyond
    // this bound instead of silently returning a different page or asking
    // MongoDB to walk an unbounded number of index entries.
    const maxPage = Math.floor(100_000 / limit) + 1;
    if (page > maxPage) {
      next(new AppError(`Page exceeds the supported offset of ${100_000} rows`, 400));
      return;
    }
    req.query.page = String(page);
    req.query.limit = String(limit);

    next();
  };
};

export default clampPagination;
