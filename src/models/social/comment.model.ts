import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;
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

const commentSchema = new Schema(
  {
    post: {
      type: ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    author: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    parentComment: {
      type: ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    mentions: {
      type: [mentionSchema],
      default: [],
    },

    likesCount: {
      type: Number,
      default: 0,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// 🔥 For fetching comments efficiently
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", commentSchema);
