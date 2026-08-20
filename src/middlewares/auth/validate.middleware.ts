import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import { flattenZodError } from "../../utils/errors/flattenZodError.js";

export const validateMiddleware =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    try {
      // Merge body, params, and query for comprehensive validation
      const dataToValidate = {
        ...req.body,
        ...req.params,
        ...req.query,
      };
      // Use the parsed result (not the raw input) so schema transforms —
      // e.g. email .trim().toLowerCase() — actually reach the controller.
      // Without this, a mixed-case/whitespace-padded email passes validation
      // but the controller still queries the DB with the untransformed value.
      const parsed = schema.parse(dataToValidate) as Record<string, unknown>;
      req.body = { ...req.body, ...parsed };
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        // Same { success, message, code, errors } contract as every other
        // error response in the app (see errorHandler.middleware.ts) —
        // `errors` is a flat { field: message } map, not Zod's raw
        // internal issue format, so the frontend has one predictable shape
        // to read field-level errors from regardless of what failed.
        const errors = flattenZodError(error);
        return res.status(400).json({
          success: false,
          message: Object.values(errors)[0] || "Some of the submitted information isn't valid.",
          code: "VALIDATION_FAILED",
          errors,
        });
      }
      return res.status(400).json({
        success: false,
        message: "Some of the submitted information isn't valid.",
        code: "VALIDATION_FAILED",
      });
    }
  };
