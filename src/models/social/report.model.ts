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

    targetType: {
      type: String,
      enum: ["post", "comment", "user"],
      required: true,
      index: true,
    },

    targetId: {
      type: ObjectId,
      required: true,
      index: true,
    },

    targetOwner: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    reporterEmail: {
      type: String,
      required: true,
    },

    reporterName: {
      type: String,
      required: true,
    },

    targetOwnerEmail: {
      type: String,
      required: true,
    },

    targetOwnerName: {
      type: String,
      required: true,
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
        "comment_deleted",
        "warning_sent",
        "user_suspended",
        "user_deleted",
        "ignored",
      ],
      default: "none",
    },
  },
  {
    timestamps: true,
  },
);

reportSchema.index(
  { reporter: 1, targetType: 1, targetId: 1 },
  { unique: true },
);
reportSchema.index({ createdAt: -1 });
// The moderator dashboard (report.service.ts) filters by status and sorts
// by createdAt together — this compound index covers that query directly
// instead of index-scanning on `status` alone and sorting in memory.
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model("Report", reportSchema);
