import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../../../models/social/post.model.js";
import { destroyCloudinaryAssets } from "../../../utils/destroyCloudinaryAssets.js";
import { mapFilesToMedia } from "../../../utils/mapFilesToMedia.js";

export const editPost = async (req: Request, res: Response) => {
  try {
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

    // Only the original author can edit
    if (post.author.toString() !== req.user!.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorised to edit this post.",
      });
    }

    let removePublicIds: string[] = [];

    if (req.body.removePublicIds) {
      try {
        removePublicIds = JSON.parse(req.body.removePublicIds);
        if (!Array.isArray(removePublicIds)) removePublicIds = [];
      } catch {
        return res.status(400).json({
          success: false,
          message: "removePublicIds must be a valid JSON array of strings.",
        });
      }
    }

    if (removePublicIds.length > 0) {
      // Find the matching media items so we know their resource_type for Cloudinary
      const toRemove = (post.media as any[]).filter((m) =>
        removePublicIds.includes(m.publicId),
      );

      if (toRemove.length > 0) {
        await destroyCloudinaryAssets(toRemove);
      }

      // Strip removed items from the media array
      post.media = (post.media as any[]).filter(
        (m) => !removePublicIds.includes(m.publicId),
      ) as any;
    }

    const newFiles = (req.files as Express.Multer.File[]) ?? [];
    if (newFiles.length > 0) {
      const newMedia = mapFilesToMedia(newFiles);
      post.media = [...(post.media as any[]), ...newMedia] as any;
    }

    if (req.body.content !== undefined) {
      post.content = req.body.content.trim();
    }

    if (!post.content && (post.media as any[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: "A post must have text content or at least one media file.",
      });
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      data: { post },
    });
  } catch (err) {
    console.error("editPost error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
