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

    // SHA-256 hash of the refresh token, never the raw bearer token — so a
    // DB read/leak can't be used to replay a live session.
    refreshTokenHash: {
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

sessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
// TTL index: MongoDB automatically deletes a session document once
// `expiresAt` is in the past, instead of stale rows accumulating forever.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model("Session", sessionSchema);
