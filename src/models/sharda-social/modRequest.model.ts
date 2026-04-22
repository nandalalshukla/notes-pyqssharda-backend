import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;

const modRequestSchema = new Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    motivation: {
      type: String,
      required: [true, "Motivation is required"],
      trim: true,
      minlength: [10, "Explain properly why you want to be a moderator"],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
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

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const ModRequest = mongoose.model("ModRequest", modRequestSchema);
