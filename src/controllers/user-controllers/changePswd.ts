//change password controller
import { User } from "../../models/users/user.model.js";
import { Request, Response } from "express";
import { hashPassword, comparePassword } from "../../utils/hashPassword.js";

export const changePassword = async (req: Request, res: Response) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required",
    });
  }
  try {
    let user = null;
    if (email) {
      user = await User.findOne({ email }).select("+password");
    } else if (req.user?.userId) {
      user = await User.findById(req.user.userId).select("+password");
    } else {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
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
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error in change password:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default changePassword;
