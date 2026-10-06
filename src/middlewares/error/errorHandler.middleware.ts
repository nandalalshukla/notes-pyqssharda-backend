import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import multer from "multer";
import jwt from "jsonwebtoken";
import { AppError } from "../../utils/errors/AppError.js";
import { flattenZodError } from "../../utils/errors/flattenZodError.js";

const GENERIC_MESSAGE = "Something went wrong on our end. Please try again.";

/**
 * A response shape every error path in the app now sends, success or
 * failure — the frontend's error handling (lib/utils/errorHandler.ts) is
 * built against this exact contract:
 *   { success: false, message: string, code?: string, errors?: Record<string,string> }
 * `message` is ALWAYS safe to show a user directly, for every error that
 * reaches the client — never a raw driver/library message.
 */
function sendError(
  res: Response,
  statusCode: number,
  message: string,
  extra?: { code?: string; errors?: Record<string, unknown>; data?: unknown },
) {
  res.status(statusCode).json({
    success: false,
    message,
    ...(extra?.code && { code: extra.code }),
    ...(extra?.errors && { errors: extra.errors }),
    ...(extra?.data !== undefined && { data: extra.data }),
  });
}

/**
 * Translates any thrown value into a safe (statusCode, message, extras)
 * triple. This is the single place in the app that decides what a given
 * error type is allowed to say to a client — every known error class we
 * might reasonably throw or encounter (our own AppError, Mongoose, Zod,
 * Multer, JWT) is handled explicitly; anything else is treated as an
 * unexpected bug and reduced to a generic message, in every environment.
 */
function translateError(err: unknown): {
  statusCode: number;
  message: string;
  code?: string;
  errors?: Record<string, unknown>;
  data?: unknown;
  logLevel: "operational" | "unexpected";
} {
  // Our own thrown errors — message was written to be shown as-is.
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
      errors: err.details,
      data: err.data,
      logLevel: "operational",
    };
  }

  // Zod validation (belt-and-suspenders — validateMiddleware normally
  // catches this itself, but any schema.parse() called directly elsewhere
  // funnels through here with the same flattened, frontend-friendly shape).
  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      message: "Some of the submitted information isn't valid.",
      code: "VALIDATION_FAILED",
      errors: flattenZodError(err),
      logLevel: "operational",
    };
  }

  // Malformed ObjectId in a route param/query (e.g. GET /posts/not-an-id).
  // `err.path` (a field name a developer wrote, e.g. "postId") is safe to
  // surface; `err.value` (the raw attacker-controlled input) deliberately
  // is not reflected back into the response.
  if (err instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      message: `${err.path} is not valid.`,
      code: "INVALID_ID",
      logLevel: "operational",
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message]),
    );
    const firstMessage = Object.values(errors)[0] as string | undefined;
    return {
      statusCode: 400,
      message: firstMessage || "Some of the submitted information isn't valid.",
      code: "VALIDATION_FAILED",
      errors,
      logLevel: "operational",
    };
  }

  // MongoDB duplicate-key error (E11000) — surfaced by the driver, not a
  // Mongoose class, so it's detected structurally instead of by instanceof.
  if (
    err instanceof Error &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    const keyPattern = (err as { keyPattern?: Record<string, unknown> })
      .keyPattern;
    const field = keyPattern ? Object.keys(keyPattern)[0] : undefined;
    return {
      statusCode: 409,
      message: field
        ? `This ${field} is already in use.`
        : "This already exists.",
      code: "DUPLICATE",
      logLevel: "operational",
    };
  }

  if (err instanceof multer.MulterError) {
    const messages: Partial<Record<multer.MulterError["code"], string>> = {
      LIMIT_FILE_SIZE: "That file is too large. Notes can be up to 100 MB.",
      LIMIT_FILE_COUNT: "Too many files — please upload fewer at once.",
      LIMIT_UNEXPECTED_FILE: "That file wasn't expected here.",
    };
    return {
      statusCode: 400,
      message: messages[err.code] || "That file couldn't be uploaded.",
      code: "UPLOAD_FAILED",
      logLevel: "operational",
    };
  }

  // Auth middlewares normally catch these themselves with a clean message
  // (see middlewares/auth/auth.middleware.ts) — this is a safety net for
  // any jwt.verify() call outside that path.
  if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError
  ) {
    return {
      statusCode: 401,
      message: "Your session has expired. Please sign in again.",
      code: "SESSION_EXPIRED",
      logLevel: "operational",
    };
  }

  // Unknown: a programming bug, a DB connection drop, a third-party
  // library throwing something we didn't anticipate. Never show its
  // message to the client — only the full details in the server log.
  return {
    statusCode: 500,
    message: GENERIC_MESSAGE,
    logLevel: "unexpected",
  };
}

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err);
  }

  const { statusCode, message, code, errors, data, logLevel } = translateError(err);

  // Always log full detail server-side, regardless of what the client
  // sees — operational errors at a quieter level since they're expected
  // traffic (a bad password, a duplicate email), unexpected ones loudly
  // since those are the ones that need investigating.
  const context = `${req.method} ${req.originalUrl} — user:${req.user?.userId ?? "anon"}`;
  if (logLevel === "unexpected") {
    console.error(`[ERROR] ${context}`, err);
  } else {
    console.warn(`[HANDLED] ${context} — ${message}`);
  }

  sendError(res, statusCode, message, { code, errors, data });
}

export default errorHandlerMiddleware;
