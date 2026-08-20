/**
 * Base class for every intentional, expected error a controller/service
 * throws — "a user submitted a bad password", "that post doesn't exist",
 * "you already reported this". These are OPERATIONAL errors: the app is
 * working correctly, a specific known condition just occurred, and the
 * `message` on this class is written to be shown to the end user as-is.
 *
 * This is deliberately distinct from a programming bug (a null pointer, a
 * bad DB query, a typo) — those throw plain `Error`s (or things like
 * Mongoose's own error classes) that were NOT written with an end user in
 * mind and must never reach the client verbatim. The global error handler
 * (middlewares/error/errorHandler.middleware.ts) uses `isOperational` to
 * tell the two apart: AppErrors are trusted and sent through; anything
 * else is logged in full server-side and replaced with a generic message
 * before it reaches the client.
 *
 * `code` is an optional stable, machine-readable identifier (e.g.
 * "ACCOUNT_DEACTIVATED") a frontend can switch on for behavior beyond
 * "show this string" (redirect, disable a button, etc.) without parsing
 * the human-readable message. `details` carries field-level validation
 * errors as `{ field: message }`. `data` is for the rarer case of an error
 * that needs to hand back a real payload alongside the message — e.g. "this
 * report was already reviewed" wants to return the report as it now stands
 * so the client can update its view instead of just showing red text.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;
  public readonly data?: unknown;

  constructor(
    message: string,
    statusCode: number,
    options?: {
      code?: string;
      details?: Record<string, unknown>;
      data?: unknown;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = options?.code;
    this.details = options?.details;
    this.data = options?.data;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(
    message = "The request could not be understood.",
    options?: { code?: string; details?: Record<string, unknown> },
  ) {
    super(message, 400, options);
  }
}

export class ValidationFailedError extends AppError {
  constructor(
    message = "Some of the submitted information isn't valid.",
    details?: Record<string, unknown>,
  ) {
    super(message, 400, { code: "VALIDATION_FAILED", details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.", code = "UNAUTHENTICATED") {
    super(message, 401, { code });
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = "You don't have permission to do that.",
    code = "FORBIDDEN",
  ) {
    super(message, 403, { code });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "The resource you're looking for", code = "NOT_FOUND") {
    super(`${resource} couldn't be found.`, 404, { code });
  }
}

export class ConflictError extends AppError {
  constructor(
    message = "This conflicts with something that already exists.",
    options?: { code?: string; data?: unknown },
  ) {
    super(message, 409, { code: options?.code ?? "CONFLICT", data: options?.data });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "You're doing that too much — please slow down.") {
    super(message, 429, { code: "RATE_LIMITED" });
  }
}

/**
 * For a dependency that's known to be flaky/unavailable right now (email
 * provider down, third-party API timeout) rather than a bug in this app —
 * still safe to describe to the user, just framed as "try again shortly"
 * rather than "you did something wrong".
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = "This is temporarily unavailable. Please try again shortly.") {
    super(message, 503, { code: "SERVICE_UNAVAILABLE" });
  }
}
