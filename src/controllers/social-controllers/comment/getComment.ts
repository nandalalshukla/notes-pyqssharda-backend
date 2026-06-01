// controllers/comment/getComment.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";

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
      .populate("author", "_id username profilePic role")
      .lean();

    if (!comment) {
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
      text: (comment as any).content,
      author: {
        _id: ((comment as any).author as any)._id,
        username: ((comment as any).author as any).username || "Anonymous",
        avatar: ((comment as any).author as any).profilePic?.url || "",
        profilePic: ((comment as any).author as any).profilePic,
        role: ((comment as any).author as any).role,
      },
      post: (comment as any).post,
      likes: (comment as any).likesCount || 0,
      likedByCurrentUser: !!userLike,
      createdAt: (comment as any).createdAt,
      updatedAt: (comment as any).updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: {
        comment: commentData,
      },
    });
  } catch (err) {
    console.error("getComment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
