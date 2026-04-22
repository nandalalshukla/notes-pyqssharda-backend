import { AnyZodObject } from "zod";
import { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/apiResponse.js";

export const validateRequest = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return sendError(
        res,
        400,
        "Validation failed",
        "VALIDATION_ERROR",
        result.error.flatten().fieldErrors,
      );
    }

    req.body = result.data.body;
    req.params = result.data.params;
    req.query = result.data.query;
    return next();
  };
};
