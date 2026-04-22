import { Request, Response } from "express";
import { Comment } from "../../models/sharda-social/comment.model.js";
import { Post } from "../../models/sharda-social/post.model.js";
import { Notification } from "../../models/sharda-social/notification.model.js";
import { Like } from "../../models/sharda-social/like.model.js";
import mongoose from "mongoose";

/**
 * Create a comment on a post
 * @route POST /api/v1/comments/post/:postId
 */
export const createComment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment content cannot be empty",
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 1000 characters",
      });
    }

    // Check if post exists
    const post = await Post.findById(postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // If parentCommentId is provided, validate it
    let parentComment = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent comment ID",
        });
      }

      parentComment = await Comment.findById(parentCommentId);

      if (!parentComment || parentComment.isDeleted) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }

      // Only allow one level of nesting (reply to comment, not reply to reply)
      if (parentComment.parentComment) {
        return res.status(400).json({
          success: false,
          message: "Cannot reply to a reply",
        });
      }
    }

    // Create comment
    const comment = new Comment({
      post: postId,
      author: userId,
      content: content.trim(),
      parentComment: parentCommentId || null,
    });

    await comment.save();
    await comment.populate("author", "name username profilePic");

    // Update post comments count
    post.commentsCount += 1;
    await post.save();

    // Create notification for post author (only if not replying to comment)
    if (!parentCommentId && post.author.toString() !== userId) {
      const notification = new Notification({
        recipient: post.author,
        actor: userId,
        type: "comment",
        post: postId,
        comment: comment._id,
      });
      await notification.save();
    }

    // Create notification for parent comment author (if replying)
    if (parentComment && parentComment.author.toString() !== userId) {
      const notification = new Notification({
        recipient: parentComment.author,
        actor: userId,
        type: "comment",
        post: postId,
        comment: comment._id,
      });
      await notification.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        comment: {
          id: comment._id,
          author: {
            id: (comment.author as any)._id,
            name: (comment.author as any).name,
            username: (comment.author as any).username,
            profilePic: (comment.author as any).profilePic?.url,
          },
          content: comment.content,
          likesCount: comment.likesCount,
          createdAt: comment.createdAt,
        },
      },
      message: "Comment created successfully",
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get comments for a post with pagination
 * @route GET /api/v1/comments/post/:postId
 */
export const getPostComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const currentUserId = (req as any).user?.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Get top-level comments (not replies)
    const comments = await Comment.find({
      post: postId,
      parentComment: null,
      isDeleted: false,
    })
      .populate("author", "name username profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      isDeleted: false,
    });

    // Get likes for comments
    const commentIds = comments.map((c) => c._id);
    let likedCommentIds: string[] = [];
    if (currentUserId) {
      const likes = await Like.find({
        user: currentUserId,
        comment: { $in: commentIds },
      }).select("comment");
      likedCommentIds = likes.map((l) => l.comment!.toString());
    }

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentComment: comment._id,
          isDeleted: false,
        })
          .populate("author", "name username profilePic")
          .sort({ createdAt: 1 })
          .limit(5);

        // Get likes for replies
        let likedReplyIds: string[] = [];
        if (currentUserId) {
          const likes = await Like.find({
            user: currentUserId,
            comment: { $in: replies.map((r) => r._id) },
          }).select("comment");
          likedReplyIds = likes.map((l) => l.comment!.toString());
        }

        return {
          id: comment._id,
          author: {
            id: (comment.author as any)._id,
            name: (comment.author as any).name,
            username: (comment.author as any).username,
            profilePic: (comment.author as any).profilePic?.url,
          },
          content: comment.content,
          likesCount: comment.likesCount,
          isLiked: likedCommentIds.includes(comment._id.toString()),
          replies: replies.map((reply) => ({
            id: reply._id,
            author: {
              id: (reply.author as any)._id,
              name: (reply.author as any).name,
              username: (reply.author as any).username,
              profilePic: (reply.author as any).profilePic?.url,
            },
            content: reply.content,
            likesCount: reply.likesCount,
            isLiked: likedReplyIds.includes(reply._id.toString()),
            createdAt: reply.createdAt,
          })),
          replyCount: await Comment.countDocuments({
            parentComment: comment._id,
            isDeleted: false,
          }),
          createdAt: comment.createdAt,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: {
        comments: commentsWithReplies,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Comments fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all replies to a comment
 * @route GET /api/v1/comments/:commentId/replies
 */
export const getCommentReplies = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const currentUserId = (req as any).user?.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const parentComment = await Comment.findById(commentId);
    if (!parentComment || parentComment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const replies = await Comment.find({
      parentComment: commentId,
      isDeleted: false,
    })
      .populate("author", "name username profilePic")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Comment.countDocuments({
      parentComment: commentId,
      isDeleted: false,
    });

    // Get likes
    let likedReplyIds: string[] = [];
    if (currentUserId) {
      const likes = await Like.find({
        user: currentUserId,
        comment: { $in: replies.map((r) => r._id) },
      }).select("comment");
      likedReplyIds = likes.map((l) => l.comment!.toString());
    }

    return res.status(200).json({
      success: true,
      data: {
        replies: replies.map((reply) => ({
          id: reply._id,
          author: {
            id: (reply.author as any)._id,
            name: (reply.author as any).name,
            username: (reply.author as any).username,
            profilePic: (reply.author as any).profilePic?.url,
          },
          content: reply.content,
          likesCount: reply.likesCount,
          isLiked: likedReplyIds.includes(reply._id.toString()),
          createdAt: reply.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Replies fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching comment replies:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update a comment
 * @route PUT /api/v1/comments/:commentId
 */
export const updateComment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { commentId } = req.params;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment content cannot be empty",
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 1000 characters",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Authorization check
    if (comment.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    comment.content = content.trim();
    await comment.save();
    await comment.populate("author", "name username profilePic");

    return res.status(200).json({
      success: true,
      data: {
        comment: {
          id: comment._id,
          content: comment.content,
          updatedAt: comment.updatedAt,
        },
      },
      message: "Comment updated successfully",
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete a comment (soft delete)
 * @route DELETE /api/v1/comments/:commentId
 */
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { commentId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Authorization check
    const userRole = (req as any).user?.userRole;
    const isOwner = comment.author.toString() === userId;
    const isModerator = ["admin", "mod"].includes(userRole);

    if (!isOwner && !isModerator) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this comment",
      });
    }

    comment.isDeleted = true;
    await comment.save();

    // Update post comments count
    const post = await Post.findById(comment.post);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    // Delete related notifications
    await Notification.deleteMany({ comment: commentId });

    return res.status(200).json({
      success: true,
      data: {},
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
