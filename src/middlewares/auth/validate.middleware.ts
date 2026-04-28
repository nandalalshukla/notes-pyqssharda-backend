import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";

export const validateMiddleware =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
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
