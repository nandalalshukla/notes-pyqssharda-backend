import { Request, Response, NextFunction } from "express";

type PaginationOptions = {
  maxLimit?: number;
};

export const clampPagination = ({ maxLimit = 50 }: PaginationOptions = {}) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const pageValue = req.query.page;
    const limitValue = req.query.limit;

    const page = typeof pageValue === "string" ? Number(pageValue) : undefined;
    const limit =
      typeof limitValue === "string" ? Number(limitValue) : undefined;

    if (Number.isFinite(page) && page !== undefined) {
      req.query.page = String(Math.max(1, page));
    }

    if (Number.isFinite(limit) && limit !== undefined) {
      const clamped = Math.min(maxLimit, Math.max(1, limit));
      req.query.limit = String(clamped);
    }

    next();
  };
};

export default clampPagination;
