//logout controller
import { User } from "../../models/users/user.model";
import { Request, Response } from "express";

export const logout = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const userId = req.user.userId;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    user.refreshToken = undefined;
    await user.save();
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default logout;
