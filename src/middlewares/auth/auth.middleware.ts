import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    console.log("❌ Auth failed: No access token found in cookies");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
    ) as { userId: string; userRole?: string };
    (req as Request).user = decoded;
    console.log(`✅ Auth success: User ${(decoded as any).userId}`);
    next();
  } catch (error) {
    const jwtError = error as jwt.JsonWebTokenError;

    // Log specific JWT error types for debugging
    if (jwtError.name === "TokenExpiredError") {
      console.log(`⏰ Auth failed: Token has expired`);
      console.log("ℹ️ Client will attempt automatic token refresh...");
    } else {
      console.log(`❌ Auth failed: ${jwtError.message}`);
    }

    return res.status(401).json({ message: "Invalid or expired token" });
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
