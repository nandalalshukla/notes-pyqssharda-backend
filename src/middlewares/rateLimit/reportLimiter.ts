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

const reportStore = new Map<string, { timestamp: number; targetKey: string }>();

const getReportKey = (userId: string) => `report:${userId}`;
const getTargetKey = (
  targetType: string | undefined,
  targetId: string | undefined,
) => `${targetType}:${targetId}`;

export const reportLimiter = (options: {
  windowMs?: number;
  maxReportsPerWindow?: number;
}): RequestHandler => {
  const windowMs = options.windowMs ?? 60000; // 1 minute
  const maxReportsPerWindow = options.maxReportsPerWindow ?? 3; // 3 reports per minute

  return (req: ReportRequest, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.userId;
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
    const reportKey = getReportKey(userId);
    const targetKey = getTargetKey(targetType, targetId);

    // Get or initialize user's report history
    let reportEntry = reportStore.get(reportKey);

    if (!reportEntry) {
      reportStore.set(reportKey, { timestamp: now, targetKey });
      return next();
    }

    // Check if enough time has passed since last report
    const timeSinceLastReport = now - reportEntry.timestamp;

    if (timeSinceLastReport < windowMs) {
      // If it's a report on the SAME item, the backend will catch it with a 409
      // If it's a DIFFERENT item, allow it even if within cooldown window
      if (reportEntry.targetKey === targetKey) {
        // Same item reported too recently
        const cooldownRemaining = Math.ceil(
          (windowMs - timeSinceLastReport) / 1000,
        );
        return res.status(429).json({
          success: false,
          code: "REPORT_COOLDOWN",
          message: `Please wait ${cooldownRemaining} second${cooldownRemaining > 1 ? "s" : ""} before reporting this item again`,
          retryAfter: cooldownRemaining,
        });
      }

      // Different item - check if under max reports per window
      const userReports = Array.from(reportStore.entries()).filter(
        ([key]) =>
          key.startsWith("report:") && key === reportKey && key !== reportKey,
      ).length;

      if (userReports >= maxReportsPerWindow) {
        const retryAfter = Math.ceil(windowMs / 1000);
        return res.status(429).json({
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          message: `You're reporting too many items. Please wait ${retryAfter} seconds before reporting again`,
          retryAfter,
        });
      }
    }

    // Update the report timestamp for this user
    reportStore.set(reportKey, { timestamp: now, targetKey });

    // Cleanup old entries (every 10 minutes)
    if (Math.random() < 0.01) {
      for (const [key, entry] of reportStore.entries()) {
        if (now - entry.timestamp > windowMs * 2) {
          reportStore.delete(key);
        }
      }
    }

    next();
  };
};

export default reportLimiter;
