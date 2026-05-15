import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;

const reportSchema = new Schema(
  {
    reporter: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    post: {
      type: ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    postOwner: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reason: {
      type: String,
      enum: [
        "spam",
        "harassment",
        "hate",
        "nudity",
        "violence",
        "fake_information",
        "scam",
        "other",
      ],
      required: true,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    actionTaken: {
      type: String,
      enum: [
        "none",
        "post_deleted",
        "warning_sent",
        "user_suspended",
        "ignored",
      ],
      default: "none",
    },
  },
  {
    timestamps: true,
  },
);

reportSchema.index({ reporter: 1, post: 1 }, { unique: true });

export const Report = mongoose.model("Report", reportSchema);
