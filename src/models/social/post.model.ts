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
      enum: ["random", "event", "announcement"],
      default: "random",
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

export const Post = mongoose.model("Post", postSchema);
