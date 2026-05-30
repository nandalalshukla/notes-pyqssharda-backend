import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const globalLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || "anonymous",
  message: { success: false, message: "Too many requests, slow down." },
});

export default globalLimiter;
