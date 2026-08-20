//to manage all the users

import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { NotFoundError } from "../../utils/errors/AppError.js";

//fetch all users
export const fetchAllUsers = async (req: Request, res: Response) => {
  const users = await User.find()
    .select(
      "name email username role contributions isEmailVerified isActive createdAt modRequest",
    )
    .lean();
  res.status(200).json({ success: true, users });
};

export const fetchActiveUsers = async (req: Request, res: Response) => {
  const users = await User.find({ isActive: true })
    .select(
      "name email username role contributions isEmailVerified isActive createdAt modRequest",
    )
    .lean();
  res.status(200).json({ success: true, users });
};

export const fetchInactiveUsers = async (req: Request, res: Response) => {
  const users = await User.find({ isActive: false })
    .select(
      "name email username role contributions isEmailVerified isActive createdAt modRequest",
    )
    .lean();
  res.status(200).json({ success: true, users });
};

//deactivate a user account
export const deactivateUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User");
  }
  user.isActive = false;
  await user.save();
  return res.status(200).json({
    success: true,
    message: "User account deactivated successfully",
  });
};

//activate a user account
export const activateUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User");
  }
  user.isActive = true;
  await user.save();
  return res
    .status(200)
    .json({ success: true, message: "User account activated successfully" });
};

//delete a user account
export const deleteUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new NotFoundError("User");
  }
  return res
    .status(200)
    .json({ success: true, message: "User account deleted successfully" });
};
