import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { Session } from "../../models/users/session.model.js";
import {
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "../../config/cookies.js";

export const deleteAccount = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const userId = req.user.userId;

  try {
    const result = await User.deleteOne({ _id: userId });
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Clean up sessions left pointing at a now-deleted user, and clear this
    // browser's cookies immediately rather than leaving a still-valid
    // (if short-lived) access token in place after "delete account".
    await Session.deleteMany({ userId });
    res.clearCookie("accessToken", clearAccessTokenCookieOptions);
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

    return res
      .status(200)
      .json({ success: true, message: "User account deleted successfully" });
  } catch (error) {
    throw error;
  }
};
