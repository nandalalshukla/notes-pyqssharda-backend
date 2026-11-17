import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

// Heartbeats are sent every 45 seconds from active clients. This allowance
// leaves ample room for normal browsing while limiting public counter abuse.
export const siteAnalyticsLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many analytics updates." },
});
