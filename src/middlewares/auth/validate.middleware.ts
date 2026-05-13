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
      schema.parse(dataToValidate);
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
