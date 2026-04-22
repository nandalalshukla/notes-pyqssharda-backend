import { Request, Response } from "express";
import { Like } from "../../models/sharda-social/like.model.js";
import { Post } from "../../models/sharda-social/post.model.js";
import { Comment } from "../../models/sharda-social/comment.model.js";
import { Notification } from "../../models/sharda-social/notification.model.js";
import mongoose from "mongoose";

/**
 * Like a post
 * @route POST /api/v1/likes/post/:postId
 */
export const likePost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { postId } = req.params;

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

    const post = await Post.findById(postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if already liked
    const existingLike = await Like.findOne({
      user: userId,
      post: postId,
    });

    if (existingLike) {
      return res.status(409).json({
        success: false,
        message: "You have already liked this post",
      });
    }

    // Create like
    const like = new Like({
      user: userId,
      post: postId,
    });

    await like.save();

    // Update post likesCount
    post.likesCount += 1;
    await post.save();

    // Create notification if post author is different from liker
    if (post.author.toString() !== userId) {
      const notification = new Notification({
        recipient: post.author,
        actor: userId,
        type: "like",
        post: postId,
      });
      await notification.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        like: {
          id: like._id,
          postId: like.post,
        },
      },
      message: "Post liked successfully",
    });
  } catch (error) {
    console.error("Error liking post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Unlike a post
 * @route DELETE /api/v1/likes/post/:postId
 */
export const unlikePost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { postId } = req.params;

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

    const like = await Like.findOneAndDelete({
      user: userId,
      post: postId,
    });

    if (!like) {
      return res.status(404).json({
        success: false,
        message: "Like not found",
      });
    }

    // Update post likesCount
    const post = await Post.findById(postId);
    if (post) {
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();
    }

    // Delete related notifications
    await Notification.deleteOne({
      actor: userId,
      post: postId,
      type: "like",
    });

    return res.status(200).json({
      success: true,
      data: {},
      message: "Post unliked successfully",
    });
  } catch (error) {
    console.error("Error unliking post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Like a comment
 * @route POST /api/v1/likes/comment/:commentId
 */
export const likeComment = async (req: Request, res: Response) => {
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

    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if already liked
    const existingLike = await Like.findOne({
      user: userId,
      comment: commentId,
    });

    if (existingLike) {
      return res.status(409).json({
        success: false,
        message: "You have already liked this comment",
      });
    }

    // Create like
    const like = new Like({
      user: userId,
      comment: commentId,
    });

    await like.save();

    // Update comment likesCount
    comment.likesCount += 1;
    await comment.save();

    // Create notification if comment author is different from liker
    if (comment.author.toString() !== userId) {
      const notification = new Notification({
        recipient: comment.author,
        actor: userId,
        type: "like",
        comment: commentId,
      });
      await notification.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        like: {
          id: like._id,
          commentId: like.comment,
        },
      },
      message: "Comment liked successfully",
    });
  } catch (error) {
    console.error("Error liking comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Unlike a comment
 * @route DELETE /api/v1/likes/comment/:commentId
 */
export const unlikeComment = async (req: Request, res: Response) => {
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

    const like = await Like.findOneAndDelete({
      user: userId,
      comment: commentId,
    });

    if (!like) {
      return res.status(404).json({
        success: false,
        message: "Like not found",
      });
    }

    // Update comment likesCount
    const comment = await Comment.findById(commentId);
    if (comment) {
      comment.likesCount = Math.max(0, comment.likesCount - 1);
      await comment.save();
    }

    // Delete related notifications
    await Notification.deleteOne({
      actor: userId,
      comment: commentId,
      type: "like",
    });

    return res.status(200).json({
      success: true,
      data: {},
      message: "Comment unliked successfully",
    });
  } catch (error) {
    console.error("Error unliking comment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get post likes
 * @route GET /api/v1/likes/post/:postId
 */
export const getPostLikes = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

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

    const likes = await Like.find({ post: postId })
      .populate("user", "name username profilePic")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Like.countDocuments({ post: postId });

    return res.status(200).json({
      success: true,
      data: {
        likes: likes.map((like) => ({
          id: (like.user as any)._id,
          name: (like.user as any).name,
          username: (like.user as any).username,
          profilePic: (like.user as any).profilePic?.url,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Likes fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching post likes:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get comment likes
 * @route GET /api/v1/likes/comment/:commentId
 */
export const getCommentLikes = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

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

    const likes = await Like.find({ comment: commentId })
      .populate("user", "name username profilePic")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Like.countDocuments({ comment: commentId });

    return res.status(200).json({
      success: true,
      data: {
        likes: likes.map((like) => ({
          id: (like.user as any)._id,
          name: (like.user as any).name,
          username: (like.user as any).username,
          profilePic: (like.user as any).profilePic?.url,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Likes fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching comment likes:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
