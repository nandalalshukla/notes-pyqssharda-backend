import jwt from "jsonwebtoken";
import { User } from "../../models/sharda-social/user.model.js";
import { Session } from "../../models/sharda-social/session.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateJwtTokens.js";
import { Request, Response } from "express";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookies.js";

export const refreshAccessToken = async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token missing",
    });
  }

  try {
    // Verify and decode the refresh token
    const payload = jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
    ) as { userId: string };

    // Find session with matching refresh token
    const session = await Session.findOne({
      userId: payload.userId,
      refreshToken: oldRefreshToken,
    });

    if (!session) {
      return res.status(403).json({
        success: false,
        message: "Session not found or token revoked",
      });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await session.deleteOne();
      return res.status(403).json({
        success: false,
        message: "Session expired, please login again",
      });
    }

    // Verify user still exists and is active
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      await session.deleteOne();
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id.toString(), user.role);
    const newRefreshToken = generateRefreshToken(user._id.toString());

    // Update session with new refresh token and extended expiry
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();

    // Set new cookies
    res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
      message: "Tokens refreshed successfully",
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};
