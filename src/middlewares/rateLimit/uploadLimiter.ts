import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const uploadLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || "anonymous",
  message: {
    success: false,
    message: "Upload limit reached. Please try again later.",
  },
});

export default uploadLimiter;
