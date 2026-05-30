import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const authLimiter: RequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (half of original 10)
  limit: 10, // 10 attempts (doubled from 5)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || "anonymous",
  message: {
    success: false,
    message: "Too many auth attempts, please try again later.",
  },
});

export default authLimiter;
