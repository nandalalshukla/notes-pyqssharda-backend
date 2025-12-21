import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("you reached auth middleware");
  console.log("All cookies:", req.cookies); // Debug: see all cookies
  console.log("Cookie header:", req.headers.cookie); // Debug: raw cookie header
  const token = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;
  console.log("Access Token from cookie:", token ? "exists" : "MISSING");
  console.log(
    "Refresh Token from cookie:",
    refreshToken ? "exists" : "MISSING"
  );

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    );
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
export default authMiddleware;
