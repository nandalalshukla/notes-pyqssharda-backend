import { Request, Response } from "express";
import { Post } from "../../../models/social/post.model.js";
import { mapFilesToMedia } from "../../../utils/mapFilesToMedia.js";

export const createPost = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];

    if (!content?.trim() && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A post must have text content or at least one media file.",
      });
    }

    const media = mapFilesToMedia(files);

    const post = await Post.create({
      author: req.user!.userId,
      content: content?.trim() ?? "",
      media,
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      data: { post },
    });
  } catch (err) {
    console.error("createPost error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
