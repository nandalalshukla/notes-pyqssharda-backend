import { Request, Response } from "express";
import { Share } from "../../models/sharda-social/share.model.js";
import { Post } from "../../models/sharda-social/post.model.js";
import { Notification } from "../../models/sharda-social/notification.model.js";
import mongoose from "mongoose";

/**
 * Share a post
 * @route POST /api/v1/share/:postId
 */
export const sharePost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { postId } = req.params;
    const { reshareNote } = req.body;

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

    // Check if already shared
    const existingShare = await Share.findOne({
      user: userId,
      post: postId,
    });

    if (existingShare) {
      return res.status(409).json({
        success: false,
        message: "You have already shared this post",
      });
    }

    // Validate reshare note
    if (reshareNote && reshareNote.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Reshare note cannot exceed 500 characters",
      });
    }

    // Create share
    const share = new Share({
      user: userId,
      post: postId,
      reshareNote: reshareNote || "",
    });

    await share.save();

    // Create notification if post author is different from sharer
    if (post.author.toString() !== userId) {
      const notification = new Notification({
        recipient: post.author,
        actor: userId,
        type: "share",
        post: postId,
      });
      await notification.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        share: {
          id: share._id,
          postId: share.post,
        },
      },
      message: "Post shared successfully",
    });
  } catch (error) {
    console.error("Error sharing post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Unshare a post
 * @route DELETE /api/v1/share/:postId
 */
export const unsharePost = async (req: Request, res: Response) => {
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

    const share = await Share.findOneAndDelete({
      user: userId,
      post: postId,
    });

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share not found",
      });
    }

    // Delete related notification
    await Notification.deleteOne({
      actor: userId,
      post: postId,
      type: "share",
    });

    return res.status(200).json({
      success: true,
      data: {},
      message: "Post unshared successfully",
    });
  } catch (error) {
    console.error("Error unsharing post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get post shares
 * @route GET /api/v1/share/:postId
 */
export const getPostShares = async (req: Request, res: Response) => {
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

    const shares = await Share.find({ post: postId })
      .populate("user", "name username profilePic")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Share.countDocuments({ post: postId });

    return res.status(200).json({
      success: true,
      data: {
        shares: shares.map((share) => ({
          id: (share.user as any)._id,
          name: (share.user as any).name,
          username: (share.user as any).username,
          profilePic: (share.user as any).profilePic?.url,
          reshareNote: share.reshareNote,
          sharedAt: share.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Shares fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching shares:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get user's shares
 * @route GET /api/v1/share/user/:usernameOrId
 */
export const getUserShares = async (req: Request, res: Response) => {
  try {
    const { usernameOrId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    // Find user
    let userId: string | null = null;
    if (mongoose.Types.ObjectId.isValid(usernameOrId)) {
      userId = usernameOrId;
    } else {
      const user = await Post.findOne({ username: usernameOrId }).select("_id");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      userId = user._id.toString();
    }

    const shares = await Share.find({ user: userId })
      .populate("post", "content author")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Share.countDocuments({ user: userId });

    return res.status(200).json({
      success: true,
      data: {
        shares: shares.map((share) => ({
          id: share._id,
          post: {
            id: (share.post as any)._id,
            content: (share.post as any).content,
            author: (share.post as any).author,
          },
          reshareNote: share.reshareNote,
          sharedAt: share.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "User shares fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching user shares:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
