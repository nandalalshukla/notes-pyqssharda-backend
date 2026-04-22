import { Request, Response } from "express";
import { User } from "../../models/sharda-social/user.model.js";
import { Follow } from "../../models/sharda-social/follow.model.js";
import { Post } from "../../models/sharda-social/post.model.js";
import mongoose from "mongoose";

/**
 * Get user profile by username or ID
 * Includes: basic info, follow counts, post count
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { usernameOrId } = req.params;

    // Find user by username or ID
    let user = await User.findOne(
      mongoose.Types.ObjectId.isValid(usernameOrId)
        ? { _id: usernameOrId }
        : { username: usernameOrId },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get post count
    const postCount = await Post.countDocuments({
      author: user._id,
      isDeleted: false,
    });

    // Check if current user follows this user
    const currentUserId = (req as any).user?.userId;
    let isFollowing = false;

    if (currentUserId && currentUserId !== user._id.toString()) {
      const followExists = await Follow.findOne({
        follower: currentUserId,
        following: user._id,
      });
      isFollowing = !!followExists;
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePic: user.profilePic?.url,
          course: user.course,
          contactNo: user.contactNo,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          postCount,
          isFollowing,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      message: "Profile fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get current user's profile (authenticated user)
 */
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const postCount = await Post.countDocuments({
      author: user._id,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePic: user.profilePic.url,
          course: user.course,
          contactNo: user.contactNo,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          postCount,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
      },
      message: "Profile fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching my profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update user profile (bio, course, contact number, profile picture)
 */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { bio, course, contactNo, profilePicUrl, profilePicPublicId } =
      req.body;

    // Build update object with only provided fields
    const updateData: any = {};

    if (bio !== undefined) {
      if (bio.length > 200) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 200 characters",
        });
      }
      updateData.bio = bio.trim();
    }

    if (course !== undefined) {
      updateData.course = course.trim();
    }

    if (contactNo !== undefined) {
      updateData.contactNo = contactNo.trim();
    }

    if (profilePicUrl !== undefined) {
      updateData.profilePic = {
        url: profilePicUrl,
        publicId: profilePicPublicId || null,
      };
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePic: user.profilePic.url,
          course: user.course,
          contactNo: user.contactNo,
        },
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get user's followers list with pagination
 */
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const { usernameOrId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    // Find user
    let user = await User.findOne(
      mongoose.Types.ObjectId.isValid(usernameOrId)
        ? { _id: usernameOrId }
        : { username: usernameOrId },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get followers
    const followers = await Follow.find({ following: user._id })
      .select("follower")
      .populate("follower", "name username profilePic")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Follow.countDocuments({ following: user._id });

    return res.status(200).json({
      success: true,
      data: {
        followers: followers.map((f) => ({
          id: (f.follower as any)._id,
          name: (f.follower as any).name,
          username: (f.follower as any).username,
          profilePic: (f.follower as any).profilePic?.url,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Followers fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching followers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get user's following list with pagination
 */
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const { usernameOrId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    // Find user
    let user = await User.findOne(
      mongoose.Types.ObjectId.isValid(usernameOrId)
        ? { _id: usernameOrId }
        : { username: usernameOrId },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get following
    const following = await Follow.find({ follower: user._id })
      .select("following")
      .populate("following", "name username profilePic")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Follow.countDocuments({ follower: user._id });

    return res.status(200).json({
      success: true,
      data: {
        following: following.map((f) => ({
          id: (f.following as any)._id,
          name: (f.following as any).name,
          username: (f.following as any).username,
          profilePic: (f.following as any).profilePic?.url,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Following list fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching following:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
