import { Request, Response } from "express";
import { Session } from "../../models/users/session.model.js";
import {
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "../../config/cookies.js";

export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    await Session.deleteOne({ _id: req.user.sessionId, userId: req.user.userId });

    res.clearCookie("accessToken", clearAccessTokenCookieOptions);
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error in logout:", error);
    res.clearCookie("accessToken", clearAccessTokenCookieOptions);
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);
    return res.status(503).json({
      success: false,
      message: "Could not securely end the session. Please try again.",
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
    res.clearCookie("accessToken", clearAccessTokenCookieOptions);
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);
    return res.status(503).json({
      success: false,
      message: "Could not securely end all sessions. Please try again.",
    });
  }
};
