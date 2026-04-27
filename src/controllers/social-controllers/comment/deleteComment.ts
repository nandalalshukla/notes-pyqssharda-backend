// controllers/comment/deleteComment.ts
import { Request, Response } from "express";
import { Comment } from "../../../models/social/comment.model.js";
import { Post } from "../../../models/social/post.model.js";

export const deleteComment = async (req: Request, res: Response) => {
  const { commentId } = req.params;

  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const userId = req.user.userId;
  const userRole = req.user.userRole;

  try {
    const comment = await Comment.findById(commentId);

    if (!comment || comment.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    // Allow author or mod/admin to delete
    const isAuthor = comment.author.toString() === userId;
    const isMod = userRole && ["mod", "admin"].includes(userRole);

    if (!isAuthor && !isMod) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Soft delete
    comment.isDeleted = true;
    await comment.save();

    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    return res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
