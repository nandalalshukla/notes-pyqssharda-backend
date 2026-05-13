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
    const target = await User.findById(targetUserId).select("+isActive");
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
    });

    let isFollowing = false;

    if (existing) {
      // Unfollow
      await existing.deleteOne();
      await User.findByIdAndUpdate(targetUserId, {
        $inc: { followersCount: -1 },
      });
      await User.findByIdAndUpdate(currentUserId, {
        $inc: { followingCount: -1 },
      });
      isFollowing = false;
    } else {
      // Follow
      await Follow.create({ follower: currentUserId, following: targetUserId });
      await User.findByIdAndUpdate(targetUserId, {
        $inc: { followersCount: 1 },
      });
      await User.findByIdAndUpdate(currentUserId, {
        $inc: { followingCount: 1 },
      });
      isFollowing = true;

      // Create notification
      await Notification.create({
        recipient: targetUserId,
        actor: currentUserId,
        type: "follow",
      });
    }

    // Fetch updated user to get latest counts
    const updatedTarget = await User.findById(targetUserId);

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
