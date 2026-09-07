// controllers/comment/createComment.ts
import { Request, Response } from "express";
import { Comment } from "../../../models/social/comment.model.js";
import { Post } from "../../../models/social/post.model.js";
import { createNotification } from "../../../services/social/notification.service.js";
import type { PopulatedUserSummary } from "../../../types/social.types.js";

export const createComment = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { text, content, parentComment } = req.body;
  const userId = req.user!.userId;

  // Support both 'text' and 'content' fields for flexibility
  const commentContent = (text || content)?.trim();

  try {
    if (!commentContent) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty",
      });
    }
    const post = await Post.findById(postId);
    // An unapproved post is not published yet — nobody can see it to
    // comment on it, and its author shouldn't be able to build a comment
    // thread under something that may never go live.
    if (
      !post ||
      post.isDeleted ||
      (post.moderationStatus || "approved") !== "approved"
    ) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // If reply, verify parent comment exists and belongs to this post
    let parent: InstanceType<typeof Comment> | null = null;
    if (parentComment) {
      parent = await Comment.findById(parentComment);
      if (!parent || parent.isDeleted || parent.post.toString() !== postId) {
        return res
          .status(404)
          .json({ success: false, message: "Parent comment not found" });
      }
    }

    const comment = await Comment.create({
      post: postId,
      author: userId,
      content: commentContent.trim(),
      parentComment: parentComment || null,
    });

    // Increment post commentsCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    // Notify the post author about the new comment...
    await createNotification({
      recipient: post.author.toString(),
      actor: userId,
      type: "comment",
      post: postId,
      comment: comment._id.toString(),
    });

    // ...and, for a reply, separately notify whoever wrote the comment
    // being replied to — previously only the post author was ever
    // notified, so replying to someone else's comment never reached them.
    const parentAuthorId = parent?.author?.toString();
    if (parentAuthorId && parentAuthorId !== post.author.toString()) {
      await createNotification({
        recipient: parentAuthorId,
        actor: userId,
        type: "reply",
        post: postId,
        comment: comment._id.toString(),
      });
    }

    const populated = await comment.populate(
      "author",
      "_id username profilePic role",
    );

    // Format response to match frontend expectations
    const likeCount = 0; // New comment has no likes
    const userLiked = false;
    const author = populated.author as unknown as PopulatedUserSummary;

    return res.status(201).json({
      success: true,
      message: "Comment created",
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
          parentComment: populated.parentComment,
          likes: likeCount,
          likedByCurrentUser: userLiked,
          createdAt: populated.createdAt,
          updatedAt: populated.updatedAt,
        },
      },
    });
  } catch (err) {
    throw err;
  }
};
