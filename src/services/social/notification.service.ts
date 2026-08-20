import { Notification } from "../../models/social/notification.model.js";
import { publishToUser } from "./notificationStream.service.js";

export type NotificationType = "like" | "comment" | "reply" | "follow" | "share";

type CreateNotificationParams = {
  recipient: string;
  actor: string;
  type: NotificationType;
  post?: string | null;
  comment?: string | null;
};

/**
 * Creates (or refreshes) a notification and pushes it to the recipient's
 * live connections in real time. This is a side effect of some primary
 * action (liking a post, following someone, ...) and must never be able to
 * fail that primary action — every error is caught and logged here, never
 * thrown, so callers can safely `await` this without try/catch and without
 * risking a notification bug turning into a broken like/follow/comment.
 *
 * "like" notifications upsert on the (recipient, actor, type, post/comment)
 * key — rapidly toggling a like on and off no longer spams the recipient
 * with duplicate notifications; it just refreshes the one notification's
 * timestamp and unread state. "comment" notifications are never deduped
 * this way since each comment is naturally a distinct event (different
 * `comment` id), and "follow" naturally collapses to one per relationship.
 */
export async function createNotification({
  recipient,
  actor,
  type,
  post = null,
  comment = null,
}: CreateNotificationParams): Promise<void> {
  if (recipient === actor) return; // never notify yourself

  try {
    const now = new Date();
    // timestamps:false + explicit createdAt/updatedAt: on both insert AND
    // update we want createdAt bumped to "now" — re-triggering a deduped
    // notification (e.g. unlike then like again) should surface it as
    // recent again, not leave it buried at its original creation time in
    // the recency-sorted feed. Managing both fields explicitly here avoids
    // any ambiguity with Mongoose's own $setOnInsert-vs-$set timestamp
    // handling on upsert.
    const doc = await Notification.findOneAndUpdate(
      { recipient, actor, type, post, comment },
      { $set: { isRead: false, createdAt: now, updatedAt: now } },
      { upsert: true, new: true, setDefaultsOnInsert: true, timestamps: false },
    )
      .populate({ path: "actor", select: "username profilePic role _id" })
      .lean();

    if (!doc) return;

    publishToUser(recipient, "notification", {
      _id: doc._id,
      type: doc.type,
      actor: doc.actor,
      post: doc.post,
      comment: doc.comment,
      isRead: doc.isRead,
      createdAt: doc.createdAt,
    });

    const unreadCount = await Notification.countDocuments({
      recipient,
      isRead: false,
    });
    publishToUser(recipient, "unread-count", { unreadCount });
  } catch (error) {
    console.error("createNotification failed (non-fatal):", error);
  }
}
