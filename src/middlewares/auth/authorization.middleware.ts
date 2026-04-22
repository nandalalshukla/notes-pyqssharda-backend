import { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to continue",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};

/**
 * Middleware to check if user is moderator (mod or admin)
 */
export const isModerator = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to continue",
      });
    }

    if (!["mod", "admin"].includes(user.userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only moderators can access this",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }
};

/**
 * Middleware to check if user is admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to continue",
      });
    }

    if (user.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can access this",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }
};

/**
 * Middleware to check if user's email is verified
 */
export const isEmailVerified = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to continue",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }
};

export default { isAuthenticated, isModerator, isAdmin, isEmailVerified };
