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
      enum: ["general", "event", "announcement", "lost_found"],
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

postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
// Covers the feed's type-filtered branch (getFeedPosts.ts) — without this,
// filtering by both isDeleted and type falls back to scanning the
// isDeleted+createdAt index and checking `type` per document.
postSchema.index({ isDeleted: 1, type: 1, createdAt: -1 });
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
