// controllers/comment/editComment.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";

export const editComment = async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;
  const { text, content } = req.body;
  const userId = req.user!.userId;

  // Support both 'text' and 'content' fields for flexibility
  const commentContent = (text || content)?.trim();

  try {
    if (
      !mongoose.isValidObjectId(postId) ||
      !mongoose.isValidObjectId(commentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid post or comment ID",
      });
    }

    if (!commentContent) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment || comment.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    if (comment.post.toString() !== postId) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found on this post" });
    }

    if (comment.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this comment",
      });
    }

    comment.content = commentContent.trim();
    await comment.save();

    // Populate and get like data
    const populated = await comment.populate(
      "author",
      "_id username profilePic role",
    );

    // Use stored likesCount field for performance
    const likeCount = comment.likesCount || 0;

    const userLiked = await Like.exists({
      comment: comment._id,
      user: userId,
    });

    const author = populated.author as any;

    return res.status(200).json({
      success: true,
      message: "Comment updated",
      data: {
        comment: {
          _id: populated._id,
          text: populated.content,
          author: {
            _id: author._id,
            username: author.username || "Anonymous",
            avatar: author.profilePic?.url || "",
            profilePic: author.profilePic,
            role: author.role,
          },
          post: populated.post,
          likes: likeCount,
          likedByCurrentUser: !!userLiked,
          createdAt: populated.createdAt,
          updatedAt: populated.updatedAt,
        },
      },
    });
  } catch (err) {
    console.error("editComment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
