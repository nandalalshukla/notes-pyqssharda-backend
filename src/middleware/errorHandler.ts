import { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";
import { sendError } from "../utils/apiResponse.js";

const isProduction = process.env.NODE_ENV === "production";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.code, (err as any).errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return sendError(res, 400, "Invalid identifier", "INVALID_ID");
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return sendError(res, 400, "Validation failed", "VALIDATION_ERROR", err.errors);
  }

  if ((err as any)?.code === 11000) {
    return sendError(res, 409, "Duplicate key error", "DUPLICATE_KEY");
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return sendError(res, 401, "Invalid token", "INVALID_TOKEN");
  }

  if (err instanceof jwt.TokenExpiredError) {
    return sendError(res, 401, "Token expired", "TOKEN_EXPIRED");
  }

  const message = isProduction ? "Internal server error" : err.message || "Internal server error";
  return sendError(res, 500, message, "INTERNAL_SERVER_ERROR");
};
