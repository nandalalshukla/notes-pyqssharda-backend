import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";

export const deleteComment = async (req: Request, res: Response) => {
  const { postId, commentId } = req.params;

  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const userId = req.user.userId;
  const userRole = req.user?.userRole;

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

    // Allow author or mod/admin to delete
    const isAuthor = comment.author.toString() === userId;
    const isMod = userRole && ["mod", "admin"].includes(userRole);

    if (!isAuthor && !isMod) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const idsToDelete = [comment._id];
    let parentIds = [comment._id];

    while (parentIds.length > 0) {
      const children = await Comment.find({
        post: postId,
        parentComment: { $in: parentIds },
        isDeleted: false,
      }).select("_id");

      parentIds = children.map((child) => child._id);
      idsToDelete.push(...parentIds);
    }

    // Delete likes for the comment and all its replies
    await Like.deleteMany({ comment: { $in: idsToDelete } });

    // Soft delete the comment and all its replies
    await Comment.updateMany(
      { _id: { $in: idsToDelete } },
      { $set: { isDeleted: true } },
    );

    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -idsToDelete.length },
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted",
      data: { deletedCount: idsToDelete.length },
    });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
