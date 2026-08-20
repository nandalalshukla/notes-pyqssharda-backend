import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";

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
        return res.status(400).json({
          success: false,
          errors: error.issues,
        });
      }
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }
  };
