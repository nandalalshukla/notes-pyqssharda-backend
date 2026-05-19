import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
    ) as { userId: string; userRole?: string };
    (req as Request).user = decoded;
    next();
  } catch (error) {
    const jwtError = error as jwt.JsonWebTokenError;
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
export default authMiddleware;

export const optionalAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  console.log("COOKIES:", req.cookies); // ← add this
  const token = req.cookies?.accessToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
    ) as { userId: string; userRole?: string };
    req.user = decoded;
  } catch {
    req.user = undefined;
  }

  next();
};
