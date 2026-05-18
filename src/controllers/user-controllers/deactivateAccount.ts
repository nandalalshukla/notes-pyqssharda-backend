import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";

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
    return res
      .status(200)
      .json({
        success: true,
        message: "User account deactivated successfully",
      });
  } catch (error) {
    console.error("Error in deactivate user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
