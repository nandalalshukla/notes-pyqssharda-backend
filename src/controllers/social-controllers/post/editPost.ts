import { Request, Response } from "express";
import mongoose from "mongoose";
import { Post } from "../../../models/social/post.model.js";
import { Like } from "../../../models/social/like.model.js";
import { destroyCloudinaryAssets } from "../../../utils/destroyCloudinaryAssets.js";
import { mapFilesToMedia } from "../../../utils/mapFilesToMedia.js";
import type {
  PopulatedUserSummary,
  StoredLostFound,
} from "../../../types/social.types.js";
import {
  serializeLostFound,
  serializePostAuthor,
} from "../../../utils/socialSerializers.js";
import { mergeLostFoundFromBody } from "./lostFound.helpers.js";
import { resolveModerationStatus } from "../../../utils/postModeration.js";

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
      const toRemove = post.media.filter((m) =>
        removePublicIds.includes(m.publicId),
      );

      if (toRemove.length > 0) {
        // `media.type` isn't marked `required` in the schema, so Mongoose
        // infers it as optional — but every write path (mapFilesToMedia)
        // always sets it, which is the invariant destroyCloudinaryAssets
        // relies on. Narrowing here (rather than loosening
        // destroyCloudinaryAssets's signature) keeps that assumption local.
        await destroyCloudinaryAssets(
          toRemove as unknown as {
            publicId: string;
            type: "image" | "video" | "raw";
          }[],
        );
      }

      // Strip removed items from the media array. `.filter()` on a Mongoose
      // DocumentArray returns a plain array, which isn't structurally a
      // DocumentArray — cast back to the property's own type to assign it.
      post.media = post.media.filter(
        (m) => !removePublicIds.includes(m.publicId),
      ) as unknown as typeof post.media;
    }

    const newFiles = (req.files as Express.Multer.File[]) ?? [];
    if (newFiles.length > 0) {
      const newMedia = mapFilesToMedia(newFiles);
      post.media = [...post.media, ...newMedia] as unknown as typeof post.media;
    }

    if (req.body.content !== undefined) {
      post.content = req.body.content.trim();
    }

    if (req.body.type !== undefined) {
      post.type = req.body.type;
    }

    if (req.body.isAnonymous !== undefined) {
      post.isAnonymous = Boolean(req.body.isAnonymous);
    }

    if (post.type === "lost_found") {
      const merged = mergeLostFoundFromBody(
        post.lostFound as StoredLostFound | null | undefined,
        req.body,
      );

      // A post being switched *into* lost & found mid-edit has nothing to
      // merge onto, so the two fields the card can't render without have
      // to be supplied by this request.
      if (!merged.kind || !merged.itemName) {
        return res.status(400).json({
          success: false,
          message:
            "A lost & found post needs an item name and whether it was lost or found.",
        });
      }

      post.lostFound = merged as unknown as typeof post.lostFound;
    } else if (req.body.type !== undefined) {
      // Switched away from lost & found — drop the now-meaningless details
      // rather than leaving them to resurface if it's switched back.
      post.lostFound = undefined;
    }

    if (!post.content && post.media.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A post must have text content or at least one media file.",
      });
    }

    // Re-run the publication rule against the post's *new* type. An edit is
    // a re-submission: a member rewriting an announcement that was already
    // approved sends it back to the queue, and one that switches a general
    // post over to "event" enters the queue for the first time. Otherwise
    // approval could be sidestepped by editing after the fact.
    //
    // Going the other way (a member switching an announcement back to a
    // general post) clears the review state, since general posts were never
    // subject to it.
    const previousStatus = post.moderationStatus;
    // Only ever "pending" or "approved" — a rejection is a reviewer's
    // verdict, never something an edit can reinstate.
    const nextStatus = resolveModerationStatus(post.type, req.user!.userRole);
    post.moderationStatus = nextStatus;

    // The edited post is a fresh submission and carries no verdict yet, so
    // the previous reviewer, timestamp and reason all go — otherwise a
    // rewritten post would still show "rejected because..." for content
    // that no longer exists.
    //
    // Written through `.set()` rather than by assignment: the schema
    // declares these `default: null`, but Mongoose's inferred document type
    // reads them as non-nullable, so a plain `post.reviewedBy = null` is a
    // type error even though null is exactly what the schema stores.
    post.set({ reviewedBy: null, reviewedAt: null, rejectionReason: null });

    await post.save();

    const populated = await post.populate(
      "author",
      "_id username profilePic role",
    );

    const files = populated.media?.map((m) => m.url) || [];
    const publicIds = populated.media?.map((m) => m.publicId) || [];
    const author = populated.author as unknown as PopulatedUserSummary;
    const userLiked = await Like.exists({
      post: populated._id,
      user: req.user!.userId,
    });

    const responsePost = {
      _id: populated._id,
      type: populated.type,
      content: populated.content,
      // Editing is author-only, so the viewer is by definition the author
      // and sees their real profile back even on an anonymous post.
      author: serializePostAuthor(author, {
        isAnonymous: populated.isAnonymous,
        viewerId: req.user!.userId,
      }),
      isAnonymous: Boolean(populated.isAnonymous),
      moderationStatus: populated.moderationStatus,
      rejectionReason: populated.rejectionReason ?? null,
      lostFound: serializeLostFound(populated.lostFound),
      files,
      publicIds,
      likes: populated.likesCount || 0,
      likedByCurrentUser: !!userLiked,
      commentCount: populated.commentsCount || 0,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message:
        nextStatus === "pending"
          ? previousStatus === "approved"
            ? "Updated and sent back for review — it'll return to the feed once approved."
            : "Updated and sent for review."
          : "Post updated successfully.",
      data: { post: responsePost },
    });
  } catch (err) {
    throw err;
  }
};
