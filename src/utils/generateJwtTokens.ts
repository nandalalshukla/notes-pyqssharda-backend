import jwt from "jsonwebtoken";

// Lifetimes are the single source of truth — cookie maxAge (config/cookies.ts)
// and Session.expiresAt (models/users/session.model.ts) must match these, or
// the cookie/DB session outlives (or dies before) the token it's meant to
// track, which previously caused random forced logouts.
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const JWT_ALGORITHM = "HS256" as const;

export function generateAccessToken(userId: string, userRole: string) {
  return jwt.sign({ userId, userRole }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "15m",
    algorithm: JWT_ALGORITHM,
  });
}

export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "30d",
    algorithm: JWT_ALGORITHM,
  });
}

export function generateEmailVerifyToken(userId: string) {
  return jwt.sign({ userId }, process.env.VERIFY_EMAIL_TOKEN_SECRET!, {
    expiresIn: "30m",
    algorithm: JWT_ALGORITHM,
  });
}
