// controllers/like/toggleLike.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Like } from "../../../models/social/like.model.js";
import { Post } from "../../../models/social/post.model.js";
import { Comment } from "../../../models/social/comment.model.js";
import { Notification } from "../../../models/social/notification.model.js";

export const toggleLike = async (req: Request, res: Response) => {
  const { targetId, targetType } = req.body; // targetType: "post" | "comment"
  const userId = req.user!.userId;

  console.log("🔵 [toggleLike] Request received:", {
    targetId,
    targetType,
    userId,
  });

  if (!targetId || !targetType) {
    console.log("❌ [toggleLike] Missing targetId or targetType");
    return res.status(400).json({
      success: false,
      message: "targetId and targetType are required",
    });
  }

  if (!["post", "comment"].includes(targetType)) {
    console.log("❌ [toggleLike] Invalid targetType:", targetType);
    return res
      .status(400)
      .json({ success: false, message: "targetType must be post or comment" });
  }

  try {
    // Ensure IDs are ObjectIds for proper comparison
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const targetObjectId = new mongoose.Types.ObjectId(targetId);

    const filter =
      targetType === "post"
        ? { user: userObjectId, post: targetObjectId }
        : { user: userObjectId, comment: targetObjectId };

    console.log(
      "🟡 [toggleLike] Checking for existing like with filter:",
      filter,
    );
    const existing = await Like.findOne(filter);
    console.log("🟡 [toggleLike] Existing like found:", !!existing);

    const targetLikeFilter =
      targetType === "post"
        ? { post: targetObjectId }
        : { comment: targetObjectId };

    if (existing) {
      // Unlike
      console.log("🟠 [toggleLike] Unliking...");
      await existing.deleteOne();
      
      // Count likes BEFORE incrementing
      const actualLikeCount = await Like.countDocuments(targetLikeFilter);
      console.log(
        "🟠 [toggleLike] After unlike, actual count from DB:",
        actualLikeCount,
      );

      // Update Post/Comment with correct count
      const updated = await (targetType === "post"
        ? Post.findByIdAndUpdate(targetObjectId, {
            $set: { likesCount: actualLikeCount },
          }, { new: true })
        : Comment.findByIdAndUpdate(targetObjectId, {
            $set: { likesCount: actualLikeCount },
          }, { new: true }));

      console.log(
        "🟠 [toggleLike] Updated document likesCount field:",
        updated?.likesCount,
      );

      const responseData = {
        liked: false,
        likeCount: actualLikeCount,
        targetId,
        targetType,
      };
      console.log("🟢 [toggleLike] Sending unlike response:", responseData);
      return res.status(200).json({
        success: true,
        message: "Unliked",
        data: responseData,
      });
    }

    // Like
    console.log("🟠 [toggleLike] Liking with filter:", filter);
    
    // Create Like document
    const newLike = await Like.create(filter);
    console.log("🟠 [toggleLike] Like document created:", {
      _id: newLike._id,
      user: newLike.user?.toString(),
      post: newLike.post?.toString(),
      comment: newLike.comment?.toString(),
    });

    // Verify the Like was created by fetching it back
    const verifyLike = await Like.findById(newLike._id);
    console.log("🟠 [toggleLike] Verified Like from DB:", {
      _id: verifyLike?._id,
      user: verifyLike?.user?.toString(),
      post: verifyLike?.post?.toString(),
    });

    // Find ALL likes matching filter for detailed logging
    const allLikes = await Like.find(targetLikeFilter);
    console.log("🟠 [toggleLike] All likes matching filter:", {
      filter: targetLikeFilter,
      count: allLikes.length,
      likes: allLikes.map((l) => ({
        _id: l._id,
        user: l.user?.toString(),
        post: l.post?.toString(),
        comment: l.comment?.toString(),
      })),
    });

    const actualLikeCount = allLikes.length;
    console.log(
      "🟠 [toggleLike] Like count calculated:",
      actualLikeCount,
    );

    // Update Post/Comment with correct count
    const updated = await (targetType === "post"
      ? Post.findByIdAndUpdate(targetObjectId, {
          $set: { likesCount: actualLikeCount },
        }, { new: true })
      : Comment.findByIdAndUpdate(targetObjectId, {
          $set: { likesCount: actualLikeCount },
        }, { new: true }));

    console.log(
      "🟠 [toggleLike] Updated document likesCount:",
      updated?.likesCount,
    );

    // Notify target owner (if not liking own content)
    const ownerId = updated?.author?.toString();
    if (ownerId && ownerId !== userObjectId.toString()) {
      await Notification.create({
        recipient: ownerId,
        actor: userObjectId,
        type: "like",
        post: targetType === "post" ? targetObjectId : null,
        comment: targetType === "comment" ? targetObjectId : null,
      } as any);
    }

    const responseData = {
      liked: true,
      likeCount: actualLikeCount,
      targetId,
      targetType,
    };
    console.log("🟢 [toggleLike] Sending like response:", responseData);
    return res.status(200).json({
      success: true,
      message: "Liked",
      data: responseData,
    });
  } catch (err: unknown) {
    console.error("❌ [toggleLike] Error:", err);
    // Duplicate like (race condition) - return idempotent success response
    if (err instanceof Error && "code" in err && err.code === 11000) {
      console.log("⚠️ [toggleLike] Duplicate like error (race condition)");
      const targetObjectId = new mongoose.Types.ObjectId(targetId);
      const targetLikeFilter =
        targetType === "post"
          ? { post: targetObjectId }
          : { comment: targetObjectId };

      const actualLikeCount = await Like.countDocuments(targetLikeFilter);
      await (targetType === "post"
        ? Post.findByIdAndUpdate(targetObjectId, {
            $set: { likesCount: actualLikeCount },
          })
        : Comment.findByIdAndUpdate(targetObjectId, {
            $set: { likesCount: actualLikeCount },
          }));

      const responseData = {
        liked: true,
        likeCount: actualLikeCount,
        targetId,
        targetType,
      };
      console.log(
        "🟢 [toggleLike] Sending duplicate like response:",
        responseData,
      );
      return res.status(200).json({
        success: true,
        message: "Already liked",
        data: responseData,
      });
    }
    console.error("toggleLike error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
