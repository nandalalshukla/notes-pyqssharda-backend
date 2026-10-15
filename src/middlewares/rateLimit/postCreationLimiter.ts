import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const postCreationLimiter: RequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || "anonymous",
  message: {
    success: false,
    message: "Post creation limit reached. Try again soon.",
  },
});

export default postCreationLimiter;
