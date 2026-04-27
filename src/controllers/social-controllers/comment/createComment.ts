// controllers/comment/createComment.ts
import { Request, Response } from "express";
import { Comment } from "../../../models/social/comment.model.js";
import { Post } from "../../../models/social/post.model.js";
import { Notification } from "../../../models/social/notification.model.js";

export const createComment = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { content, parentComment } = req.body;
  const userId = req.user!.userId;

  if (!content?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Comment content is required" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // If reply, verify parent comment exists and belongs to this post
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.post.toString() !== postId) {
        return res
          .status(404)
          .json({ success: false, message: "Parent comment not found" });
      }
    }

    const comment = await Comment.create({
      post: postId,
      author: userId,
      content,
      parentComment: parentComment || null,
    });

    // Increment post commentsCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    // Notify post author (if not commenting on own post)
    if (post.author.toString() !== userId) {
      await Notification.create({
        recipient: post.author,
        actor: userId,
        type: "comment",
        post: postId,
        comment: comment._id,
      });
    }

    const populated = await comment.populate(
      "author",
      "name username profilePic",
    );

    return res.status(201).json({
      success: true,
      message: "Comment created",
      data: { comment: populated },
    });
  } catch (err) {
    console.error("createComment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
