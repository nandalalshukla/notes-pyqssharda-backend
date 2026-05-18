import { Request, Response } from "express";
import mongoose from "mongoose";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import { Follow } from "../../../models/social/follow.model.js";

export const getLikes = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user?.userId;

  try {
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string) || 20),
    );
    const skip = (pageNum - 1) * limitNum;

    // Verify post exists
    const postObjectId = new mongoose.Types.ObjectId(postId);
    const post = await Post.findOne({ _id: postObjectId, isDeleted: false })
      .select("_id")
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Get total count of likes
    const totalLikes = await Like.countDocuments({ post: postObjectId });

    // Get likes with user details
    const likes = await Like.find({ post: postObjectId })
      .populate({
        path: "user",
        select: "username email profilePic _id",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const userObjectIds = likes.map((like: any) => like.user._id);
    const currentUserObjectId = userId
      ? new mongoose.Types.ObjectId(userId)
      : null;

    // Get follow relationships for current user
    const followRelationships =
      currentUserObjectId && userObjectIds.length > 0
        ? await Follow.find({
            follower: currentUserObjectId,
            following: { $in: userObjectIds },
          }).lean()
        : [];

    const followingSet = new Set(
      followRelationships.map((f: any) => f.following.toString()),
    );

    const likeUsers = likes.map((like: any) => ({
      _id: like.user._id,
      username: like.user.username,
      email: like.user.email,
      profilePic: like.user.profilePic,
      isFollowedByCurrentUser: followingSet.has(like.user._id.toString()),
    }));

    return res.status(200).json({
      success: true,
      message: "Likes fetched successfully",
      data: {
        likes: likeUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalLikes,
          pages: Math.ceil(totalLikes / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("getLikes error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
