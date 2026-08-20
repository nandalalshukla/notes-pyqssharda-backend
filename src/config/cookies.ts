import { CookieOptions } from "express";
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from "../utils/generateJwtTokens.js";

// maxAge here MUST match the corresponding JWT's `expiresIn` in
// generateJwtTokens.ts. If the cookie outlives the token, the browser keeps
// sending a JWT that `jwt.verify` will reject as expired well before the
// cookie itself disappears — which surfaced as random forced logouts.
export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none", // Cross-origin: frontend and backend are separate origins
  maxAge: ACCESS_TOKEN_TTL_MS,
  path: "/",
};

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/",
};

export const verifyEmailCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 10 * 60 * 1000, // 10 minutes
  path: "/api/auth",
};

// clearCookie() must be called with the SAME name/domain/path/secure/sameSite
// attributes the cookie was set with, or some browsers (notably Safari) will
// silently fail to remove it, leaving a stale token behind after "logout".
// `maxAge`/`expires` are omitted here — Express's clearCookie sets its own
// past `expires` date.
export const clearAccessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
};

export const clearRefreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
};
