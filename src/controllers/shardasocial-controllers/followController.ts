import { Request, Response } from "express";
import { Follow } from "../../models/sharda-social/follow.model.js";
import { User } from "../../models/sharda-social/user.model.js";
import { Notification } from "../../models/sharda-social/notification.model.js";
import mongoose from "mongoose";

/**
 * Follow a user
 * @route POST /api/v1/follow/:usernameOrId
 */
export const followUser = async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user?.userId;
    const { usernameOrId } = req.params;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Find the user to follow
    let targetUser = await User.findOne(
      mongoose.Types.ObjectId.isValid(usernameOrId)
        ? { _id: usernameOrId }
        : { username: usernameOrId },
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent self-follow
    if (targetUser._id.toString() === followerId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: targetUser._id,
    });

    if (existingFollow) {
      return res.status(409).json({
        success: false,
        message: "You are already following this user",
      });
    }

    // Create follow relationship
    const follow = new Follow({
      follower: followerId,
      following: targetUser._id,
    });

    await follow.save();

    // Update user counts
    const followerUser = await User.findById(followerId);
    if (followerUser) {
      followerUser.followingCount += 1;
      await followerUser.save();
    }

    targetUser.followersCount += 1;
    await targetUser.save();

    // Create notification
    const notification = new Notification({
      recipient: targetUser._id,
      actor: followerId,
      type: "follow",
    });

    await notification.save();

    return res.status(201).json({
      success: true,
      data: {
        follow: {
          id: follow._id,
          followingId: targetUser._id,
        },
      },
      message: "User followed successfully",
    });
  } catch (error) {
    console.error("Error following user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Unfollow a user
 * @route DELETE /api/v1/follow/:usernameOrId
 */
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user?.userId;
    const { usernameOrId } = req.params;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Find the user to unfollow
    let targetUser = await User.findOne(
      mongoose.Types.ObjectId.isValid(usernameOrId)
        ? { _id: usernameOrId }
        : { username: usernameOrId },
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find and delete follow relationship
    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: targetUser._id,
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: "You are not following this user",
      });
    }

    // Update user counts
    const followerUser = await User.findById(followerId);
    if (followerUser) {
      followerUser.followingCount = Math.max(
        0,
        followerUser.followingCount - 1,
      );
      await followerUser.save();
    }

    targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
    await targetUser.save();

    // Delete follow notification
    await Notification.deleteOne({
      actor: followerId,
      recipient: targetUser._id,
      type: "follow",
    });

    return res.status(200).json({
      success: true,
      data: {},
      message: "User unfollowed successfully",
    });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Check if current user follows another user
 * @route GET /api/v1/follow/check/:usernameOrId
 */
export const checkFollowStatus = async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user?.userId;
    const { usernameOrId } = req.params;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Find the target user
    let targetUser = await User.findOne(
      mongoose.Types.ObjectId.isValid(usernameOrId)
        ? { _id: usernameOrId }
        : { username: usernameOrId },
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check follow status
    const follow = await Follow.findOne({
      follower: followerId,
      following: targetUser._id,
    });

    return res.status(200).json({
      success: true,
      data: {
        isFollowing: !!follow,
      },
      message: "Follow status retrieved",
    });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get suggested users to follow (users not already followed)
 * @route GET /api/v1/follow/suggestions
 */
export const getSuggestedUsers = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user?.userId;
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get list of users already followed by current user
    const following = await Follow.find({ follower: currentUserId }).select(
      "following",
    );
    const followingIds = following.map((f) => f.following.toString());

    // Get suggested users (not following, not self)
    const suggestedUsers = await User.find({
      _id: {
        $nin: [currentUserId, ...followingIds],
      },
      role: "user", // Only suggest regular users
    })
      .select("name username profilePic bio followersCount")
      .limit(limit)
      .sort({ followersCount: -1 });

    return res.status(200).json({
      success: true,
      data: {
        suggestedUsers: suggestedUsers.map((user) => ({
          id: user._id,
          name: user.name,
          username: user.username,
          profilePic: user.profilePic.url,
          bio: user.bio,
          followersCount: user.followersCount,
        })),
      },
      message: "Suggested users fetched successfully",
    });
  } catch (error) {
    console.error("Error getting suggested users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
