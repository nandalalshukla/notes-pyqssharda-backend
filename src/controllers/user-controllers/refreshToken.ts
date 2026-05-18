import jwt from "jsonwebtoken";
import { User } from "../../models/users/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateJwtTokens.js";
import { Request, Response } from "express";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookies.js";
import { Session } from "../../models/users/session.model.js";

export const refreshAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    // Verify the refresh token JWT
    const payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
    ) as { userId: string };

    // Find the SPECIFIC session by userId + refreshToken (not expired)
    const session = await Session.findOne({
      userId: payload.userId,
      refreshToken: refreshToken, // Include refresh token in query
      expiresAt: { $gt: new Date() }, // not expired
    }).select("+refreshToken");

    if (!session) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Get the user to access their role
    const user = await User.findById(payload.userId).select("role");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Rotate — replace old refresh token with a new one
    const newAccessToken = generateAccessToken(payload.userId, user.role);
    const newRefreshToken = generateRefreshToken(payload.userId);

    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await session.save();

    res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    return res.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (err) {
    const jwtError = err as jwt.JsonWebTokenError;
    return res
      .status(403)
      .json({ message: "Refresh token expired or invalid" });
  }
};
