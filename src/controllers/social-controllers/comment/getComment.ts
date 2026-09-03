// controllers/comment/getComment.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import type { PopulatedUserSummary } from "../../../types/social.types.js";
import {
  hasPopulatedUserSummary,
  serializeUserSummary,
} from "../../../utils/socialSerializers.js";

export const getComment = async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;
  const userId = req.user?.userId; // Optional for non-authenticated users

  // Validate IDs are valid MongoDB ObjectIds
  if (
    !mongoose.Types.ObjectId.isValid(postId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid post or comment ID",
    });
  }

  try {
    const comment = await Comment.findOne({
      _id: commentId,
      post: postId,
      isDeleted: false,
    })
      .select("content author post likesCount createdAt updatedAt")
      .populate<{ author: PopulatedUserSummary | null }>(
        "author",
        "_id username profilePic role",
      )
      .lean();

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (!hasPopulatedUserSummary(comment.author)) {
      await Promise.all([
        Comment.updateOne({ _id: comment._id }, { $set: { isDeleted: true } }),
        Like.deleteMany({ comment: comment._id }),
        Post.updateOne({ _id: comment.post }, { $inc: { commentsCount: -1 } }),
      ]);
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const userLike = userObjectId
      ? await Like.findOne({ user: userObjectId, comment: commentId }).lean()
      : null;

    const commentData = {
      _id: comment._id,
      text: comment.content,
      author: serializeUserSummary(comment.author),
      post: comment.post,
      likes: comment.likesCount || 0,
      likedByCurrentUser: !!userLike,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: {
        comment: commentData,
      },
    });
  } catch (err) {
    throw err;
  }
};
