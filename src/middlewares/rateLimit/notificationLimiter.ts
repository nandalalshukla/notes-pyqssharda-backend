import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

/**
 * Dedicated bucket for notification reads (list/unread-count/mark-read).
 * These previously shared `interactionLimiter` with 17 unrelated write
 * routes (likes, comments, follows, ...) — a burst of normal engagement
 * (liking a few posts, opening comment threads) could exhaust that shared
 * 60/min budget and take notification polling down with it, surfacing as
 * "Failed to load notifications" for reasons that had nothing to do with
 * notifications. This limiter only governs notification traffic, and is
 * sized generously since the client polls as a fallback alongside a live
 * SSE stream.
 */
export const notificationLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || "anonymous",
  message: { success: false, message: "Too many requests, slow down." },
});

/**
 * The SSE stream endpoint holds one long-lived connection per device rather
 * than firing repeated requests, so it needs a much smaller allowance —
 * this only needs to tolerate reconnect storms (e.g. a flaky network
 * retrying), not sustained request volume.
 */
export const notificationStreamLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || "anonymous",
  message: { success: false, message: "Too many reconnect attempts, slow down." },
});

export default notificationLimiter;
