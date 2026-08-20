// controllers/post/getPost.ts
import { Request, Response } from "express";
import { Post } from "../../../models/social/post.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Follow } from "../../../models/social/follow.model.js";
import mongoose from "mongoose";
import type { PopulatedUserSummary } from "../../../types/social.types.js";

export const getPost = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.user?.userId; // Optional - handle both authenticated and non-authenticated users

  // Validate postId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid post ID",
    });
  }

  try {
    const post = await Post.findOne({
      _id: postId,
      isDeleted: false,
    })
      .select(
        "type content author media likesCount commentsCount createdAt updatedAt",
      )
      .populate<{ author: PopulatedUserSummary }>(
        "author",
        "_id username profilePic role",
      )
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const [userLike, isFollowing] = await Promise.all([
      userObjectId
        ? Like.findOne({ user: userObjectId, post: postId }).lean()
        : Promise.resolve(null),
      userObjectId
        ? Follow.findOne({
            follower: userObjectId,
            following: post.author._id,
          }).lean()
        : Promise.resolve(null),
    ]);

    const files = post.media?.map((m) => m.url) || [];
    const publicIds = post.media?.map((m) => m.publicId) || [];

    const postData = {
      _id: post._id,
      type: post.type || "general",
      content: post.content,
      author: {
        _id: post.author._id,
        username: post.author.username || "Anonymous",
        avatar: post.author.profilePic?.url || "",
        profilePic: post.author.profilePic,
        role: post.author.role,
        isFollowedByCurrentUser: !!isFollowing,
      },
      files,
      publicIds,
      likes: post.likesCount || 0,
      likedByCurrentUser: !!userLike,
      commentCount: post.commentsCount || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: {
        post: postData,
      },
    });
  } catch (err) {
    throw err;
  }
};
