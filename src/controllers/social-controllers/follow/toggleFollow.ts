// controllers/follow/toggleFollow.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";
import { User } from "../../../models/users/user.model.js";
import { Notification } from "../../../models/social/notification.model.js";

export const toggleFollow = async (req: Request, res: Response) => {
  const { userId: targetUserId } = req.params;
  const currentUserId = req.user!.userId;

  if (currentUserId === targetUserId) {
    return res
      .status(400)
      .json({ success: false, message: "You can't follow yourself" });
  }

  try {
    const target = await User.findById(targetUserId).select("+isActive").lean();
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!target.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "User is not active" });
    }

    const existing = await Follow.findOne({
      follower: currentUserId,
      following: targetUserId,
    })
      .select("_id")
      .lean();

    let isFollowing = false;
    let updatedTarget;

    if (existing) {
      // Unfollow
      await Follow.deleteOne({ _id: existing._id });
      const [nextTarget] = await Promise.all([
        User.findByIdAndUpdate(
          targetUserId,
          { $inc: { followersCount: -1 } },
          { new: true, select: "followersCount followingCount" },
        ).lean(),
        User.updateOne(
          { _id: currentUserId },
          { $inc: { followingCount: -1 } },
        ),
      ]);
      updatedTarget = nextTarget;
      isFollowing = false;
    } else {
      // Follow
      await Follow.create({ follower: currentUserId, following: targetUserId });
      const [nextTarget] = await Promise.all([
        User.findByIdAndUpdate(
          targetUserId,
          { $inc: { followersCount: 1 } },
          { new: true, select: "followersCount followingCount" },
        ).lean(),
        User.updateOne({ _id: currentUserId }, { $inc: { followingCount: 1 } }),
        Notification.create({
          recipient: targetUserId,
          actor: currentUserId,
          type: "follow",
        }),
      ]);
      updatedTarget = nextTarget;
      isFollowing = true;
    }

    return res.status(200).json({
      success: true,
      message: isFollowing ? "Followed" : "Unfollowed",
      data: {
        following: isFollowing,
        followStats: {
          followerCount: updatedTarget?.followersCount || 0,
          followingCount: updatedTarget?.followingCount || 0,
          isFollowedByCurrentUser: isFollowing,
        },
      },
    });
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
