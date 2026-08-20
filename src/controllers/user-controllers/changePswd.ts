//change password controller
import { User } from "../../models/users/user.model.js";
import { Session } from "../../models/users/session.model.js";
import { Request, Response } from "express";
import { hashPassword, comparePassword } from "../../utils/hashPassword.js";
import { hashToken } from "../../utils/hashToken.js";

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  // This route is mounted behind authMiddleware, so the target account is
  // always the authenticated caller — never a client-supplied identifier.
  // (Previously this accepted an `email` field and looked that user up
  // instead, letting any authenticated caller attempt to change a
  // *different* account's password.)
  if (!req.user?.userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required",
    });
  }

  try {
    const user = await User.findById(req.user.userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await comparePassword(currentPassword, user.password!);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedNewPassword = await hashPassword(newPassword);
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Changing the password should invalidate every other logged-in
    // session/device — otherwise a stolen session survives the very action
    // meant to secure the account. Keep the current session so the caller
    // isn't logged out by their own request.
    const currentRefreshToken = req.cookies?.refreshToken;
    await Session.deleteMany({
      userId: user._id,
      ...(currentRefreshToken && {
        refreshTokenHash: { $ne: hashToken(currentRefreshToken) },
      }),
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    throw error;
  }
};

export default changePassword;
