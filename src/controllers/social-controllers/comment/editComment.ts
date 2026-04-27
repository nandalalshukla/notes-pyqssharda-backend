// controllers/comment/editComment.ts
import { Request, Response } from "express";
import { Comment } from "../../../models/social/comment.model.js";

export const editComment = async (req: Request, res: Response) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user!.userId;

  if (!content?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Content is required" });
  }

  try {
    const comment = await Comment.findById(commentId);

    if (!comment || comment.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    if (comment.author.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    comment.content = content;
    await comment.save();

    return res.status(200).json({
      success: true,
      message: "Comment updated",
      data: { comment },
    });
  } catch (err) {
    console.error("editComment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
