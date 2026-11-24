//to manage all the users

import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { NotFoundError } from "../../utils/errors/AppError.js";

//fetch all users
export const fetchAllUsers = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  const filter: Record<string, unknown> = {};
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [{ name: regex }, { username: regex }, { email: regex }];
  }
  if (req.query.isActive === "true") filter.isActive = true;
  if (req.query.isActive === "false") filter.isActive = false;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(
        "name email username role contributions isEmailVerified isActive createdAt modRequest",
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  res.status(200).json({
    success: true,
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
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
