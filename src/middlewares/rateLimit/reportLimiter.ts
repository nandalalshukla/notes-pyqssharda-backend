import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Smart Report Rate Limiter
 * - Allows different report targets (different items) without cooldown
 * - Only applies cooldown to the SAME target (duplicate check)
 * - Prevents abuse while allowing legitimate reporting of different content
 */

type ReportRequest = Request & {
  body?: {
    targetType?: string;
    targetId?: string;
  };
};

type UserReportHistory = {
  // Timestamp of the most recent report, keyed by target — used for the
  // same-item cooldown check.
  lastByTarget: Map<string, number>;
  // Timestamps of every report made within the current window — its length
  // is the actual "reports per window" count.
  timestamps: number[];
};

const reportStore = new Map<string, UserReportHistory>();

const getTargetKey = (
  targetType: string | undefined,
  targetId: string | undefined,
) => `${targetType}:${targetId}`;

export const reportLimiter = (options: {
  windowMs?: number;
  maxReportsPerWindow?: number;
}): RequestHandler => {
  const windowMs = options.windowMs ?? 600000; // 1 minute
  const maxReportsPerWindow = options.maxReportsPerWindow ?? 3; // 3 reports per minute

  return (req: ReportRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    const targetType = req.body?.targetType;
    const targetId = req.body?.targetId;

    if (!targetType || !targetId) {
      return next(); // Let validation handle missing fields
    }

    const now = Date.now();
    const targetKey = getTargetKey(targetType, targetId);

    let history = reportStore.get(userId);
    if (!history) {
      history = { lastByTarget: new Map(), timestamps: [] };
      reportStore.set(userId, history);
    }

    // Same item reported too recently — the backend also enforces this with
    // a 409 duplicate-report check, but rejecting here saves the round trip.
    const lastReportOnTarget = history.lastByTarget.get(targetKey);
    if (lastReportOnTarget !== undefined && now - lastReportOnTarget < windowMs) {
      const cooldownRemaining = Math.ceil(
        (windowMs - (now - lastReportOnTarget)) / 1000,
      );
      return res.status(429).json({
        success: false,
        code: "REPORT_COOLDOWN",
        message: `Please wait ${cooldownRemaining} second${cooldownRemaining > 1 ? "s" : ""} before reporting this item again`,
        retryAfter: cooldownRemaining,
      });
    }

    // Drop timestamps outside the window, then check the actual count of
    // distinct reports made within it.
    history.timestamps = history.timestamps.filter((t) => now - t < windowMs);
    if (history.timestamps.length >= maxReportsPerWindow) {
      const retryAfter = Math.ceil(
        (windowMs - (now - history.timestamps[0])) / 1000,
      );
      return res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: `You're reporting too many items. Please wait ${retryAfter} seconds before reporting again`,
        retryAfter,
      });
    }

    history.timestamps.push(now);
    history.lastByTarget.set(targetKey, now);

    // Cleanup users with no activity in the last two windows (every ~1% of
    // requests) so the map doesn't grow unbounded.
    if (Math.random() < 0.01) {
      for (const [key, entry] of reportStore.entries()) {
        const mostRecent = Math.max(
          entry.timestamps[entry.timestamps.length - 1] ?? 0,
          ...entry.lastByTarget.values(),
        );
        if (now - mostRecent > windowMs * 2) {
          reportStore.delete(key);
        }
      }
    }

    next();
  };
};

export default reportLimiter;
