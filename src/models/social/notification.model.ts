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
      enum: ["like", "comment", "follow", "share"],
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

export const Notification = mongoose.model("Notification", notificationSchema);
