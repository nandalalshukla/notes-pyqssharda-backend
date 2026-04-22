import { Request, Response } from "express";
import { Post } from "../../models/sharda-social/post.model.js";
import { User } from "../../models/sharda-social/user.model.js";
import { Like } from "../../models/sharda-social/like.model.js";
import { Comment } from "../../models/sharda-social/comment.model.js";
import { Notification } from "../../models/sharda-social/notification.model.js";
import mongoose from "mongoose";
import {
  extractMediaFromRequest,
  validateMedia,
  validateFileSize,
} from "../../utils/postMediaUtils.js";

/**
 * Create a new post with file uploads
 * Handles both text content and media files (images/videos)
 * @route POST /api/v1/social/posts
 */
export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { content } = req.body;
    const files = (req as any).files; // From multer middleware

    // Extract and process uploaded files
    const media = extractMediaFromRequest(files);

    // Validate that post has either content or media
    if (!content && media.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Post must have content or media",
      });
    }

    // Validate content if provided
    if (content && content.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "Post content cannot exceed 500 characters",
      });
    }

    // Validate media
    const mediaValidation = validateMedia(media);
    if (!mediaValidation.valid) {
      return res.status(400).json({
        success: false,
        message: "Media validation failed",
        errors: mediaValidation.errors,
      });
    }

    // Validate file sizes
    const fileSizeValidation = validateFileSize(
      files,
      50, // 50 MB per file
      200, // 200 MB total
    );
    if (!fileSizeValidation.valid) {
      return res.status(400).json({
        success: false,
        message: "File size validation failed",
        errors: fileSizeValidation.errors,
      });
    }

    // Create post with media
    const post = new Post({
      author: userId,
      content: content?.trim() || "",
      media, // Processed media from Cloudinary
    });

    await post.save();
    await post.populate("author", "name username profilePic");

    return res.status(201).json({
      success: true,
      data: {
        post: {
          id: post._id,
          author: {
            id: (post.author as any)._id,
            name: (post.author as any).name,
            username: (post.author as any).username,
            profilePic: (post.author as any).profilePic?.url,
          },
          content: post.content,
          media: post.media,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          createdAt: post.createdAt,
        },
      },
      message: "Post created successfully",
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get post by ID
 * @route GET /api/v1/posts/:postId
 */
export const getPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const currentUserId = (req as any).user?.userId;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(postId).populate(
      "author",
      "name username profilePic",
    );

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if current user liked this post
    let isLiked = false;
    if (currentUserId) {
      const likeExists = await Like.findOne({
        user: currentUserId,
        post: postId,
      });
      isLiked = !!likeExists;
    }

    return res.status(200).json({
      success: true,
      data: {
        post: {
          id: post._id,
          author: {
            id: (post.author as any)._id,
            name: (post.author as any).name,
            username: (post.author as any).username,
            profilePic: (post.author as any).profilePic?.url,
          },
          content: post.content,
          media: post.media,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          isLiked,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        },
      },
      message: "Post fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all posts (feed) with pagination
 * @route GET /api/v1/posts?page=1&limit=20
 */
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const currentUserId = (req as any).user?.userId;

    const posts = await Post.find({ isDeleted: false })
      .populate("author", "name username profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Post.countDocuments({ isDeleted: false });

    // Check which posts current user liked
    let likedPostIds: string[] = [];
    if (currentUserId) {
      const likes = await Like.find({
        user: currentUserId,
        post: { $in: posts.map((p) => p._id) },
      }).select("post");
      likedPostIds = likes.map((l) => l.post!.toString());
    }

    return res.status(200).json({
      success: true,
      data: {
        posts: posts.map((post) => ({
          id: post._id,
          author: {
            id: (post.author as any)._id,
            name: (post.author as any).name,
            username: (post.author as any).username,
            profilePic: (post.author as any).profilePic?.url,
          },
          content: post.content,
          media: post.media,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          isLiked: likedPostIds.includes(post._id.toString()),
          createdAt: post.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "Posts fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get user's posts
 * @route GET /api/v1/posts/user/:usernameOrId
 */
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const { usernameOrId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const currentUserId = (req as any).user?.userId;

    // Find user
    let user = await User.findOne(
      mongoose.Types.ObjectId.isValid(usernameOrId)
        ? { _id: usernameOrId }
        : { username: usernameOrId },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const posts = await Post.find({ author: user._id, isDeleted: false })
      .populate("author", "name username profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Post.countDocuments({
      author: user._id,
      isDeleted: false,
    });

    // Check likes
    let likedPostIds: string[] = [];
    if (currentUserId) {
      const likes = await Like.find({
        user: currentUserId,
        post: { $in: posts.map((p) => p._id) },
      }).select("post");
      likedPostIds = likes.map((l) => l.post!.toString());
    }

    return res.status(200).json({
      success: true,
      data: {
        posts: posts.map((post) => ({
          id: post._id,
          author: {
            id: (post.author as any)._id,
            name: (post.author as any).name,
            username: (post.author as any).username,
            profilePic: (post.author as any).profilePic?.url,
          },
          content: post.content,
          media: post.media,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          isLiked: likedPostIds.includes(post._id.toString()),
          createdAt: post.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: "User posts fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update post content
 * @route PUT /api/v1/posts/:postId
 */
export const updatePost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { postId } = req.params;
    const { content } = req.body;

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
        message: "Content cannot be empty",
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Post content cannot exceed 500 characters",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Authorization check
    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own posts",
      });
    }

    post.content = content.trim();
    await post.save();
    await post.populate("author", "name username profilePic");

    return res.status(200).json({
      success: true,
      data: {
        post: {
          id: post._id,
          content: post.content,
          updatedAt: post.updatedAt,
        },
      },
      message: "Post updated successfully",
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Delete post (soft delete)
 * @route DELETE /api/v1/posts/:postId
 */
export const deletePost = async (req: Request, res: Response) => {
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

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Authorization check: user can delete own post or admin/mod can delete any post
    const userRole = (req as any).user?.userRole;
    const isOwner = post.author.toString() === userId;
    const isModerator = ["admin", "mod"].includes(userRole);

    if (!isOwner && !isModerator) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this post",
      });
    }

    post.isDeleted = true;
    await post.save();

    return res.status(200).json({
      success: true,
      data: {},
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
