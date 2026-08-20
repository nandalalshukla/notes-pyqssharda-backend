import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

/**
 * Each auth endpoint (login, register, forgot-password, verify-email, ...)
 * needs its OWN limiter instance. A single shared `rateLimit()` instance
 * keeps one in-memory counter per IP regardless of which route hit it, so a
 * user who mistypes their password a few times could also find themselves
 * unable to request a password-reset OTP or verify their email — unrelated
 * actions sharing one quota. `createAuthLimiter()` gives every route its own
 * independent bucket while keeping the same limits/response shape.
 */
export function createAuthLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 10, // 10 attempts per IP per route
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || "anonymous",
    message: {
      success: false,
      message: "Too many attempts, please try again later.",
    },
  });
}

// Default instance kept for any existing non-auth-critical callers.
export const authLimiter: RequestHandler = createAuthLimiter();

export default authLimiter;
