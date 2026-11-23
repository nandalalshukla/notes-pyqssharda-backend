import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;

/**
 * Structured details for `type: "lost_found"` posts. Kept in its own
 * sub-document (rather than flattened onto Post) so every other post type
 * stores nothing extra, and so a single `lostFound: undefined` check tells
 * a reader whether a post carries these fields at all.
 *
 * `_id: false` — this is a value object, not an addressable sub-resource;
 * nothing ever looks it up by its own id.
 */
const lostFoundSchema = new Schema(
  {
    // Whether the author LOST the item (asking for help finding it) or
    // FOUND one (looking for its owner). Drives the whole card's wording.
    kind: {
      type: String,
      enum: ["lost", "found"],
      required: true,
    },

    itemName: {
      type: String,
      trim: true,
      required: true,
      maxlength: [120, "Item name too long"],
    },

    category: {
      type: String,
      enum: [
        "electronics",
        "documents",
        "stationery",
        "clothing",
        "accessories",
        "keys",
        "wallet",
        "id_card",
        "other",
      ],
      default: "other",
    },

    location: {
      type: String,
      trim: true,
      maxlength: [200, "Location too long"],
      default: "",
    },

    // When the item was lost / found — not when the post was created.
    dateOccurred: {
      type: Date,
      default: null,
    },

    // Optional free-text handoff instructions ("DM me", "at the CSE
    // department office"). Deliberately not auto-filled from the author's
    // profile: an anonymous post must not leak its author's contact
    // details, so anything shown here is what the author explicitly typed.
    contactInfo: {
      type: String,
      trim: true,
      maxlength: [200, "Contact details too long"],
      default: "",
    },

    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const mentionSchema = new Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    usernameSnapshot: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 20,
    },
  },
  { _id: false },
);

const postSchema = new Schema(
  {
    author: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["general", "event", "announcement", "opportunity", "lost_found"],
      default: "general",
      required: true,
      index: true,
    },

    content: {
      type: String,
      trim: true,
      maxlength: [2000, "Post content too long"],
      default: "",
    },

    mentions: {
      type: [mentionSchema],
      default: [],
    },

    mentionEveryone: {
      type: Boolean,
      default: false,
      index: true,
    },

    // When true the author is masked out of every read path for everyone
    // except the author themselves (see utils/socialSerializers.ts). The
    // `author` ref is still stored — moderation, ownership checks and
    // orphan cleanup all depend on it — it is simply never serialized to
    // other viewers.
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    // Only populated for `type: "lost_found"` posts.
    lostFound: {
      type: lostFoundSchema,
      default: undefined,
    },

    // 🔹 Publication review (see utils/postModeration.ts for the rule)
    //
    // Events and announcements written by a general member wait here as
    // "pending" until a moderator or admin approves them; everything else
    // is created "approved" and behaves exactly as it always has.
    //
    // `default: "approved"` is what keeps this backwards-compatible: every
    // post that existed before this field was added reads back as approved
    // and stays visible.
    //
    // Named `moderationStatus` rather than `status` (the name the
    // notes/PYQ/syllabus resources use for the same concept) because
    // `lostFound.status` already means something entirely different on
    // this model — open vs. resolved — and two neighbouring `status`
    // fields would be a standing invitation to read the wrong one.
    moderationStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      required: true,
      index: true,
    },

    // Who last approved or rejected this post, and when. A single
    // reviewer/timestamp pair rather than the separate approvedBy/rejectedBy
    // pairs the resource schema keeps: a post can cycle through review
    // repeatedly (every edit re-submits it), so separate pairs would leave
    // a rejected post still advertising a stale `approvedAt`.
    reviewedBy: {
      type: ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    // Kept after a re-submission so the author can still see why their
    // previous attempt was turned down while they rewrite it.
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason too long"],
      default: null,
    },

    media: [
      {
        type: {
          type: String,
          enum: ["image", "video", "raw"],
        },
        url: {
          type: String,
          required: true,
        },
        thumbnail: {
          type: String,
          default: null,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// The public feed's two shapes. Both lead with the visibility predicates
// every public read applies (isDeleted + moderationStatus) so the sort can
// be served straight off the index.
//
// The feed also ORs in "...or the post is mine", so an author can see their
// own pending post; that branch is served by the author index below.
//
// These two replace narrower isDeleted-only versions. Post has no
// syncIndexes() call at boot (unlike Like/Notification/Session — see
// config/db.ts), so the superseded indexes linger on an existing database
// until someone drops them by hand; they're redundant, not harmful.
postSchema.index({ isDeleted: 1, moderationStatus: 1, createdAt: -1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
// Covers the feed's type-filtered branch (getFeedPosts.ts) — without this,
// filtering by isDeleted, moderationStatus and type falls back to scanning
// the index above and checking `type` per document.
postSchema.index({ isDeleted: 1, moderationStatus: 1, type: 1, createdAt: -1 });
// Covers the lost & found board's "open only" / "resolved only" filter,
// which narrows on type + lostFound.status together.
//
// `partialFilterExpression` (rather than `sparse`) is what actually keeps
// this index small: a compound index is only sparse when a document is
// missing EVERY indexed field, and `isDeleted`/`type`/`createdAt` are
// always present — so a sparse flag here would index the whole collection.
// The partial filter restricts it to the lost_found posts that are the
// only ones this query shape ever asks about, and the query qualifies to
// use it because it always pins `type` to that same value.
postSchema.index(
  { isDeleted: 1, "lostFound.status": 1, createdAt: -1 },
  { partialFilterExpression: { type: "lost_found" } },
);

export const Post = mongoose.model("Post", postSchema);

/**
 * Backfills `moderationStatus` onto posts that predate the field.
 *
 * A Mongoose `default` is applied when a document is *written*, never to
 * documents already in the collection — so without this, every post
 * created before review existed would have no `moderationStatus` at all
 * and would stop matching the `{ moderationStatus: "approved" }` filter
 * that now guards every public read. The entire existing feed would
 * silently disappear.
 *
 * Runs at boot alongside the other ensure*() migrations (see config/db.ts)
 * and is idempotent: once the backfill has happened the filter matches
 * nothing and the call is a no-op.
 */
export const ensurePostModerationDefaults = async () => {
  const result = await Post.updateMany(
    { moderationStatus: { $exists: false } },
    { $set: { moderationStatus: "approved" } },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `Backfilled moderationStatus on ${result.modifiedCount} existing post(s)`,
    );
  }
};
