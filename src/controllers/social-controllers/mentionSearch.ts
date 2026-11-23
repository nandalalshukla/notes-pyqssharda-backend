import { Request, Response } from "express";
import { User } from "../../models/users/user.model.js";
import { AppError } from "../../utils/errors/AppError.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const mentionSearch = async (req: Request, res: Response) => {
  const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
  const query = rawQuery.trim().toLowerCase().replace(/^@/, "").slice(0, 20);
  if (!query) {
    return res.status(200).json({ success: true, users: [] });
  }
  if (!/^[a-z0-9._]*$/.test(query)) {
    throw new AppError("Invalid username search", 400);
  }

  const users = await User.find({
    username: { $regex: `^${escapeRegex(query)}`, $options: "i" },
    isActive: true,
    isEmailVerified: true,
    _id: { $ne: req.user!.userId },
  })
    .select("_id username name profilePic")
    .sort({ username: 1 })
    .limit(10)
    .lean();

  return res.status(200).json({
    success: true,
    users: users.map((user) => ({
      id: user._id,
      username: user.username,
      name: user.name,
      profilePicture: user.profilePic?.url || null,
    })),
  });
};
