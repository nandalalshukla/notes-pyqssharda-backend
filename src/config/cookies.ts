import { CookieOptions } from "express";

export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax", // Changed from "strict" to allow cross-origin requests
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/",
};

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax", // Changed from "strict" to allow cross-origin requests
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

export const verifyEmailCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax", // Changed from "strict" to allow cross-origin requests
  maxAge: 10 * 60 * 1000, // 10 minutes
  path: "/api/auth",
};
