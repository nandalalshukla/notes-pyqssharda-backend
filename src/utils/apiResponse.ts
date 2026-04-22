import { Response } from "express";
import { ApiErrorResponse, ApiResponse, ApiSuccessResponse, PaginationMeta } from "../types/api.js";

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T | null,
  meta?: PaginationMeta,
): Response<ApiSuccessResponse<T>> => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };

  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  errors?: ApiErrorResponse["errors"],
): Response<ApiErrorResponse> => {
  const payload: ApiErrorResponse = {
    success: false,
    message,
    code,
    ...(errors ? { errors } : {}),
  };

  return res.status(statusCode).json(payload);
};
