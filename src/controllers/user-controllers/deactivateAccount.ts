import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { Session } from "../../models/users/session.model.js";
import {
  clearAccessTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "../../config/cookies.js";

export const deactivateAccount = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const userId = req.user.userId;

  try {
    const result = await User.updateOne(
      { _id: userId },
      { $set: { isActive: false } },
    );
    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Deactivating only flips a flag that nothing re-checks on a still-valid
    // access token, and refreshAccessToken previously never checked
    // isActive either — so without this, a "deactivated" account kept full
    // access until its tokens happened to expire. Kill every session now.
    await Session.deleteMany({ userId });
    res.clearCookie("accessToken", clearAccessTokenCookieOptions);
    res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: "User account deactivated successfully",
    });
  } catch (error) {
    throw error;
  }
};
