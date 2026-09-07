import { Request, Response } from "express";
import { Post } from "../../../models/social/post.model.js";
import { mapFilesToMedia } from "../../../utils/mapFilesToMedia.js";
import type { PopulatedUserSummary } from "../../../types/social.types.js";
import {
  serializeLostFound,
  serializePostAuthor,
} from "../../../utils/socialSerializers.js";
import { buildLostFoundFromBody } from "./lostFound.helpers.js";

export const createPost = async (req: Request, res: Response) => {
  try {
    const { content, type = "general", isAnonymous = false } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];

    if (!content?.trim() && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A post must have text content or at least one media file.",
      });
    }

    const media = mapFilesToMedia(files);
    const invalidFile = media.find((item) => !item.url || !item.publicId);
    if (invalidFile) {
      return res.status(400).json({
        success: false,
        message: "One or more files failed to upload. Please try again.",
      });
    }

    // Only lost & found posts carry the sub-document; for every other type
    // it stays `undefined` so nothing empty is persisted. The validator has
    // already guaranteed kind + itemName are present when type is
    // "lost_found", so this can't produce a half-filled sub-document.
    const lostFound =
      type === "lost_found" ? buildLostFoundFromBody(req.body) : undefined;

    const post = await Post.create({
      author: req.user!.userId,
      type,
      content: content?.trim() ?? "",
      isAnonymous: Boolean(isAnonymous),
      ...(lostFound ? { lostFound } : {}),
      media,
    });

    const populated = await post.populate(
      "author",
      "_id username profilePic role",
    );

    const mediaFiles = populated.media?.map((m) => m.url) || [];
    const publicIds = populated.media?.map((m) => m.publicId) || [];
    const author = populated.author as unknown as PopulatedUserSummary;
    const responsePost = {
      _id: populated._id,
      type: populated.type,
      content: populated.content,
      // The creator is always the viewer here, so they see their real
      // profile back even on an anonymous post — `isAnonymous` below is
      // what tells the UI to show the "Posted anonymously" marker.
      author: serializePostAuthor(author, {
        isAnonymous: populated.isAnonymous,
        viewerId: req.user!.userId,
        isFollowedByCurrentUser: false,
      }),
      isAnonymous: Boolean(populated.isAnonymous),
      lostFound: serializeLostFound(populated.lostFound),
      files: mediaFiles,
      publicIds,
      likes: populated.likesCount || 0,
      likedByCurrentUser: false,
      commentCount: populated.commentsCount || 0,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    };

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      data: { post: responsePost },
    });
  } catch (err: unknown) {
    // mongoose.Error.ValidationError is now translated centrally (see
    // middlewares/error/errorHandler.middleware.ts) — no need to special-case
    // it here too.
    throw err;
  }
};
