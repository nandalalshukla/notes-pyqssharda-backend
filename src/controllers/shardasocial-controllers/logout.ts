import { Request, Response } from "express";
import { Session } from "../../models/sharda-social/session.model.js";

export const logout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const refreshToken = req.cookies?.refreshToken;

    // Delete the session from database
    if (userId && refreshToken) {
      await Session.deleteOne({
        userId,
        refreshToken,
      });
    }

    // Clear cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during logout:", error);

    // Still clear cookies even if DB operation fails
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
};

export default logout;
