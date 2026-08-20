// controllers/follow/toggleFollow.ts
import { Request, Response } from "express";
import { Follow } from "../../../models/social/follow.model.js";
import { User } from "../../../models/users/user.model.js";
import { createNotification } from "../../../services/social/notification.service.js";
import { ConflictError } from "../../../utils/errors/AppError.js";

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
      // Notification creation is intentionally NOT in this Promise.all: it
      // never throws (see notification.service.ts), but keeping it out of
      // the all-or-nothing batch makes that guarantee explicit rather than
      // relying on it — a follow succeeding must never depend on how the
      // notification side effect goes.
      const [nextTarget] = await Promise.all([
        User.findByIdAndUpdate(
          targetUserId,
          { $inc: { followersCount: 1 } },
          { new: true, select: "followersCount followingCount" },
        ).lean(),
        User.updateOne({ _id: currentUserId }, { $inc: { followingCount: 1 } }),
      ]);
      await createNotification({
        recipient: targetUserId,
        actor: currentUserId,
        type: "follow",
      });
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
    // "Already following" reads better than the generic duplicate-key
    // message errorHandler.middleware.ts would derive from the compound
    // index's field names, so this one case still special-cases 11000.
    if (err instanceof Error && "code" in err && err.code === 11000) {
      throw new ConflictError("Already following");
    }
    throw err;
  }
};
