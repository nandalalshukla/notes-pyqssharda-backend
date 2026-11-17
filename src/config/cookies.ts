import { CookieOptions } from "express";
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from "../utils/generateJwtTokens.js";

// Browser traffic is same-origin through the frontend's /api/proxy rewrite.
// Lax cookies block cross-site POST/iframe requests while supporting normal
// top-level navigation. Keep Secure in production and allow local HTTP dev.
const secure = process.env.NODE_ENV === "production";

// maxAge here MUST match the corresponding JWT's `expiresIn` in
// generateJwtTokens.ts. If the cookie outlives the token, the browser keeps
// sending a JWT that `jwt.verify` will reject as expired well before the
// cookie itself disappears — which surfaced as random forced logouts.
export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite: "lax",
  maxAge: ACCESS_TOKEN_TTL_MS,
  path: "/",
};

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite: "lax",
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/",
};

export const verifyEmailCookieOptions: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite: "lax",
  maxAge: 10 * 60 * 1000, // 10 minutes
  path: "/api/v1/auth",
};

// clearCookie() must be called with the SAME name/domain/path/secure/sameSite
// attributes the cookie was set with, or some browsers (notably Safari) will
// silently fail to remove it, leaving a stale token behind after "logout".
// `maxAge`/`expires` are omitted here — Express's clearCookie sets its own
// past `expires` date.
export const clearAccessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite: "lax",
  path: "/",
};

export const clearRefreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure,
  sameSite: "lax",
  path: "/",
};
