import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async route handler so a thrown/rejected error is forwarded to
 * Express's error-handling middleware instead of becoming an unhandled
 * rejection.
 *
 * Express 5 (this project's version) actually does this automatically for
 * async handlers — you technically don't *need* catchAsync for correctness
 * here. It still earns its keep stylistically: it's what lets a controller
 * be written as `throw new NotFoundError(...)` with no surrounding
 * try/catch, which is the whole point of the AppError pattern — one
 * central place (errorHandler.middleware.ts) decides how each error type
 * becomes an HTTP response, instead of every controller hand-rolling its
 * own catch block and status code.
 */
export const catchAsync =
  (handler: AsyncRouteHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export default catchAsync;
