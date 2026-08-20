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
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "../../config/cookies.js";
import { Session } from "../../models/users/session.model.js";
import { hashToken } from "../../utils/hashToken.js";

export const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    // Verify the refresh token JWT
    const payload = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET, {
      algorithms: [JWT_ALGORITHM],
    }) as { userId: string };

    // Find the SPECIFIC session by userId + refresh token hash (not expired)
    const session = await Session.findOne({
      userId: payload.userId,
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

    // Rotate — replace old refresh token with a new one
    const newAccessToken = generateAccessToken(payload.userId, user.role);
    const newRefreshToken = generateRefreshToken(payload.userId);

    session.refreshTokenHash = hashToken(newRefreshToken);
    session.expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await session.save();

    res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    return res.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (err) {
    return res
      .status(403)
      .json({ message: "Refresh token expired or invalid" });
  }
};
