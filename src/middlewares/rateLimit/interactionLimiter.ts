import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const interactionLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || "anonymous",
  message: { success: false, message: "Too many actions, slow down." },
});

export default interactionLimiter;
