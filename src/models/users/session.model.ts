import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;
const sessionSchema = new Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refreshToken: {
      type: String,
      required: true,
      select: false,
    },

    deviceInfo: {
      type: String,
    },

    ipAddress: {
      type: String,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ refreshToken: 1 }, { unique: true });
sessionSchema.index({ expiresAt: 1 });

export const Session = mongoose.model("Session", sessionSchema);
