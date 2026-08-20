import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;

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
      enum: ["general", "event", "announcement"],
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

export const Post = mongoose.model("Post", postSchema);
