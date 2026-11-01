import type { Request, Response } from "express";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../config/cookies.js";

/**
 * Native-app support.
 *
 * The website authenticates with httpOnly cookies, which is the right thing
 * for a browser. A React Native client has no equivalent it can rely on:
 * the OS cookie jar is shared with nothing, doesn't reliably survive an app
 * restart, and gives the app no way to see or rotate a token. So the app
 * identifies itself with `X-Client-Platform: mobile` and is given the tokens
 * in the response body instead, then sends them back as
 * `Authorization: Bearer <access>` and `X-Refresh-Token: <refresh>`.
 *
 * Everything here is additive — a request without that header is treated
 * exactly as before, cookies in and cookies out.
 */

export const isMobileClient = (req: Request): boolean =>
  req.headers["x-client-platform"] === "mobile";

/** Access token from the Authorization header, falling back to the cookie. */
export const getAccessToken = (req: Request): string | undefined => {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) return token;
  }
  return req.cookies?.accessToken;
};

/** Refresh token from the X-Refresh-Token header, falling back to the cookie. */
export const getRefreshToken = (req: Request): string | undefined => {
  const header = req.headers["x-refresh-token"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return req.cookies?.refreshToken;
};

/**
 * Hands a freshly issued token pair to whichever kind of client asked.
 * Returns the body fragment to merge into the JSON response: `{ tokens }`
 * for the app, `{}` for the website (which got them as cookies instead).
 *
 * The app deliberately gets no cookies: a stale cookie in the OS jar would
 * otherwise ride along on every request next to the Bearer header.
 */
export const deliverTokens = (
  req: Request,
  res: Response,
  accessToken: string,
  refreshToken: string,
): { tokens?: { accessToken: string; refreshToken: string } } => {
  if (isMobileClient(req)) {
    return { tokens: { accessToken, refreshToken } };
  }

  res.cookie("accessToken", accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
  return {};
};
