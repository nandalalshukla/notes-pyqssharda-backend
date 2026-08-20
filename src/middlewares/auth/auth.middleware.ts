import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env.js";
import { JWT_ALGORITHM } from "../../utils/generateJwtTokens.js";

function verifyAccessToken(token: string) {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    algorithms: [JWT_ALGORITHM],
  }) as { userId: string; userRole?: string };
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
export default authMiddleware;

export const optionalAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return next();
  }

  try {
    req.user = verifyAccessToken(token);
  } catch {
    req.user = undefined;
  }

  next();
};
