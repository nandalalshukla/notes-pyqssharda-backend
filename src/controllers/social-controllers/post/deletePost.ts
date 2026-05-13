import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../../../models/social/post.model.js";
import { Comment } from "../../../models/social/comment.model.js";
import { Like } from "../../../models/social/like.model.js";
import { destroyCloudinaryAssets } from "../../../utils/destroyCloudinaryAssets.js";

export const deletePost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid post ID." });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    }

    const isOwner = post.author.toString() === req.user.userId.toString();
    const isPrivileged =
      req.user.userRole && ["admin", "mod"].includes(req.user.userRole);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({
        success: false,
        message: "You are not authorised to delete this post.",
      });
    }

    // Destroy Cloudinary assets in parallel before soft-deleting
    if ((post.media as any[]).length > 0) {
      await destroyCloudinaryAssets(post.media as any);
    }

    // Get all comment IDs for this post before deleting
    const commentsToDelete = await Comment.find({
      post: postId,
      isDeleted: false,
    }).select("_id");
    const commentIds = commentsToDelete.map((c) => c._id);

    // Delete likes for the post
    await Like.deleteMany({ post: postId });

    // Delete likes for all comments of this post
    if (commentIds.length > 0) {
      await Like.deleteMany({ comment: { $in: commentIds } });
    }

    // Soft delete all comments and replies for this post
    await Comment.updateMany({ post: postId }, { $set: { isDeleted: true } });

    // Soft delete the post
    post.isDeleted = true;
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (err) {
    console.error("deletePost error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
