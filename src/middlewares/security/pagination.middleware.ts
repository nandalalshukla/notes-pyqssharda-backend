import { Request, Response, NextFunction } from "express";

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
    // Keep skip arithmetic safe and reject pathological offsets that can
    // otherwise force MongoDB to walk millions of index entries.
    const safePage = Math.min(page, 1_000_000);
    const limit = Math.min(maxLimit, asPositiveInteger(req.query.limit, 25));
    req.query.page = String(safePage);
    req.query.limit = String(limit);

    next();
  };
};

export default clampPagination;
