import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

// Lifetimes are the single source of truth — cookie maxAge (config/cookies.ts)
// and Session.expiresAt (models/users/session.model.ts) must match these, or
// the cookie/DB session outlives (or dies before) the token it's meant to
// track, which previously caused random forced logouts.
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const JWT_ALGORITHM = "HS256" as const;

export function generateAccessToken(userId: string, userRole: string) {
  return jwt.sign({ userId, userRole }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
    algorithm: JWT_ALGORITHM,
  });
}

// `jti` is what makes two refresh tokens for the same user distinct. HS256 is
// deterministic and `iat`/`exp` only have one-second resolution, so without it
// a user signing in on two devices within the same second — or rotating a
// token twice in one second — would get byte-identical tokens, which collide
// on the unique `refreshTokenHash` index and would also let one device's
// logout silently kill the other's session.
export function generateRefreshToken(userId: string) {
  return jwt.sign(
    { userId, jti: crypto.randomUUID() },
    env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "30d",
      algorithm: JWT_ALGORITHM,
    },
  );
}

export function generateEmailVerifyToken(userId: string) {
  return jwt.sign({ userId }, env.VERIFY_EMAIL_TOKEN_SECRET, {
    expiresIn: "30m",
    algorithm: JWT_ALGORITHM,
  });
}
