import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;

const followSchema = new Schema(
  {
    follower: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    following: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// 🔥 Prevent duplicate follows
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// getFollowing.ts filters by `follower` and sorts by createdAt; getFollowers.ts
// filters by `following` and sorts by createdAt — these compound indexes
// cover both directly instead of index-scanning + sorting in memory.
followSchema.index({ follower: 1, createdAt: -1 });
followSchema.index({ following: 1, createdAt: -1 });

export const Follow = mongoose.model("Follow", followSchema);
