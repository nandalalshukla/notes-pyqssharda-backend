import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env.js";
import { JWT_ALGORITHM } from "../../utils/generateJwtTokens.js";
import { getAccessToken } from "../../utils/clientTokens.js";
import { Session } from "../../models/users/session.model.js";
import { User } from "../../models/users/user.model.js";

function verifyAccessToken(token: string) {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    algorithms: [JWT_ALGORITHM],
  }) as { userId: string; userRole?: string; sid?: string };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = getAccessToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }

  if (!payload.sid) {
    return res.status(401).json({ success: false, message: "Session expired" });
  }

  const [session, user] = await Promise.all([
    Session.findOne({ _id: payload.sid, userId: payload.userId, expiresAt: { $gt: new Date() } }).select("_id").lean(),
    User.findById(payload.userId).select("role +isActive").lean(),
  ]);
  if (!session || !user || !user.isActive) {
    return res.status(401).json({ success: false, message: "Session expired" });
  }

  req.user = { userId: payload.userId, userRole: user.role, sessionId: payload.sid };
  return next();
};
export default authMiddleware;

export const optionalAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = getAccessToken(req);

  if (!token) {
    return next();
  }

  try {
    // Optional auth must still honor revocation; accepting only a valid JWT
    // here would let logged-out users retain privileges on optional routes.
    const payload = verifyAccessToken(token);
    if (!payload.sid) return next();
    Promise.all([
      Session.findOne({ _id: payload.sid, userId: payload.userId, expiresAt: { $gt: new Date() } }).select("_id").lean(),
      User.findById(payload.userId).select("role +isActive").lean(),
    ]).then(([session, user]) => {
      if (session && user?.isActive) {
        req.user = { userId: payload.userId, userRole: user.role, sessionId: payload.sid! };
      }
      next();
    }).catch(next);
    return;
  } catch {
    req.user = undefined;
  }

  next();
};
