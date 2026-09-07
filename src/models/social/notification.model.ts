import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;

const notificationSchema = new Schema(
  {
    recipient: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actor: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "reply",
        "follow",
        "share",
        // Review verdicts on a member's event/announcement submission
        // (mod-controllers/postManagement.ts).
        "post_approved",
        "post_rejected",
      ],
      required: true,
    },

    post: {
      type: ObjectId,
      ref: "Post",
      default: null,
    },

    comment: {
      type: ObjectId,
      ref: "Comment",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

// 🔥 Fast notification feed
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
// Dedup key for createNotification()'s upsert — collapses rapid re-triggers
// of the same (recipient, actor, type, target) into a single notification
// instead of spamming duplicates (e.g. someone toggling a like on/off).
notificationSchema.index(
  { recipient: 1, actor: 1, type: 1, post: 1, comment: 1 },
  { unique: true },
);
// Auto-expire notifications 90 days after creation instead of accumulating
// forever.
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 },
);

export const Notification = mongoose.model("Notification", notificationSchema);

/**
 * Collapses any pre-existing duplicate notifications (same recipient/actor/
 * type/post/comment) down to the most recent one before syncing indexes —
 * building a unique index on a collection that already violates it would
 * otherwise fail silently and leave the dedup index missing. Mirrors the
 * pattern in like.model.ts's ensureLikeIndexes().
 */
export const ensureNotificationIndexes = async () => {
  const duplicates = await Notification.aggregate([
    {
      $group: {
        _id: {
          recipient: "$recipient",
          actor: "$actor",
          type: "$type",
          post: "$post",
          comment: "$comment",
        },
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const group of duplicates) {
    // ids are pushed in natural (insertion) order — keep the last (newest).
    const idsToDelete = group.ids.slice(0, -1);
    if (idsToDelete.length > 0) {
      await Notification.deleteMany({ _id: { $in: idsToDelete } });
    }
  }

  await Notification.syncIndexes();
};
