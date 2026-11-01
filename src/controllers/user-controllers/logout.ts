import { Request, Response } from "express";
import { Session } from "../../models/users/session.model.js";
import { hashToken } from "../../utils/hashToken.js";
import { getRefreshToken } from "../../utils/clientTokens.js";
import {
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "../../config/cookies.js";

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = getRefreshToken(req);

    if (refreshToken) {
      await Session.deleteOne({ refreshTokenHash: hashToken(refreshToken) });
    }

    res.clearCookie("accessToken", clearAccessTokenCookieOptions);
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error in logout:", error);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
};

export const logoutAll = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.userId;
    await Session.deleteMany({ userId });

    res.clearCookie("accessToken", clearAccessTokenCookieOptions);
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (error) {
    console.error("Error in logoutAll:", error);

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices",
    });
  }
};
