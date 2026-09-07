import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../../../models/social/post.model.js";
import type { StoredLostFound } from "../../../types/social.types.js";
import { serializeLostFound } from "../../../utils/socialSerializers.js";

/**
 * Flips a lost & found post between "open" and "resolved".
 *
 * This exists separately from editPost so the one-tap "I got it back"
 * control on the card is a plain JSON PATCH: editPost is a multipart route
 * behind the upload rate limiter, and making a status toggle pay that cost
 * (and re-send the whole composer payload) would be wrong on both counts.
 */
export const updateLostFoundStatus = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { status } = req.body as { status: "open" | "resolved" };

  if (!mongoose.isValidObjectId(postId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid post ID." });
  }

  const post = await Post.findOne({ _id: postId, isDeleted: false });

  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found." });
  }

  if (post.author.toString() !== req.user!.userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "You are not authorised to update this post.",
    });
  }

  if (post.type !== "lost_found" || !post.lostFound) {
    return res.status(400).json({
      success: false,
      message: "This is not a lost & found post.",
    });
  }

  const existing = post.lostFound as unknown as StoredLostFound;
  const wasResolved = existing.status === "resolved";

  existing.status = status;
  // Keep the original timestamp when the status isn't actually changing,
  // so a repeated "resolve" tap doesn't keep moving the date forward.
  existing.resolvedAt =
    status === "resolved"
      ? wasResolved
        ? (existing.resolvedAt ?? new Date())
        : new Date()
      : null;

  post.markModified("lostFound");
  await post.save();

  return res.status(200).json({
    success: true,
    message:
      status === "resolved"
        ? "Marked as resolved. Glad it worked out!"
        : "Reopened — it's back on the board.",
    data: {
      postId: post._id,
      lostFound: serializeLostFound(post.lostFound),
    },
  });
};
