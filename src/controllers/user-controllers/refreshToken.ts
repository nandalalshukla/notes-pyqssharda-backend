import jwt from "jsonwebtoken";
import { User } from "../../models/users/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  JWT_ALGORITHM,
} from "../../utils/generateJwtTokens.js";
import { env } from "../../config/env.js";
import { Request, Response } from "express";
import { deliverTokens, getRefreshToken } from "../../utils/clientTokens.js";
import {
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "../../config/cookies.js";
import { Session } from "../../models/users/session.model.js";
import { hashToken } from "../../utils/hashToken.js";

export const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshToken = getRefreshToken(req);

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    // Verify the refresh token JWT
    const payload = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET, {
      algorithms: [JWT_ALGORITHM],
    }) as { userId: string; sid?: string };

    // Find the SPECIFIC session by userId + refresh token hash (not expired)
    // Legacy tokens issued before session binding have no sid, but remain
    // bound to exactly one persisted session by their unguessable hash.
    // A successful rotation upgrades them to a sid-bound token pair.
    const session = await Session.findOne({
      userId: payload.userId,
      ...(payload.sid && { _id: payload.sid }),
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: { $gt: new Date() }, // not expired
    });

    if (!session) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Get the user to access their role, and confirm the account is still
    // active — otherwise a deactivated account could keep refreshing
    // indefinitely since access tokens alone never re-check this.
    const user = await User.findById(payload.userId).select("role +isActive");

    if (!user || !user.isActive) {
      // Clean up the now-pointless session so it can't be used again.
      await Session.deleteOne({ _id: session._id });
      res.clearCookie("accessToken", clearAccessTokenCookieOptions);
      res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);
      return res.status(401).json({ message: "User not found" });
    }

    // Rotate atomically. Without the old hash in the update predicate, two
    // concurrent refreshes could both succeed and leave one response holding
    // a token that was invalidated by the other response.
    const newAccessToken = generateAccessToken(payload.userId, user.role, session.id);
    const newRefreshToken = generateRefreshToken(payload.userId, session.id);
    const rotatedSession = await Session.findOneAndUpdate(
      {
        _id: session._id,
        userId: payload.userId,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          refreshTokenHash: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      },
      { new: true },
    ).select("_id");
    if (!rotatedSession) {
      return res.status(403).json({ message: "Refresh token already used" });
    }

    const tokenPayload = deliverTokens(
      req,
      res,
      newAccessToken,
      newRefreshToken,
    );

    return res.json({
      success: true,
      message: "Token refreshed successfully",
      ...(tokenPayload.tokens && { data: tokenPayload }),
    });
  } catch (err) {
    return res
      .status(403)
      .json({ message: "Refresh token expired or invalid" });
  }
};
