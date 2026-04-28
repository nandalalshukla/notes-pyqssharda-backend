// controllers/follow/toggleFollow.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";
import { User } from "../../../models/users/user.model.js";
import { Notification } from "../../../models/social/notification.model.js";

export const toggleFollow = async (req: Request, res: Response) => {
  const { userId: targetId } = req.params;
  const userId = req.user!.userId;

  if (userId === targetId) {
    return res
      .status(400)
      .json({ success: false, message: "You can't follow yourself" });
  }

  try {
    const target = await User.findById(targetId);
    if (!target || !target.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const existing = await Follow.findOne({
      follower: userId,
      following: targetId,
    });

    if (existing) {
      // Unfollow
      await existing.deleteOne();
      await User.findByIdAndUpdate(userId, { $inc: { followingCount: -1 } });
      await User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } });

      return res.status(200).json({
        success: true,
        message: "Unfollowed",
        data: { following: false },
      });
    }

    // Follow
    await Follow.create({ follower: userId, following: targetId });
    await User.findByIdAndUpdate(userId, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } });

    await Notification.create({
      recipient: targetId,
      actor: userId,
      type: "follow",
    });

    return res
      .status(200)
      .json({ success: true, message: "Followed", data: { following: true } });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Already following" });
    }
    console.error("toggleFollow error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
