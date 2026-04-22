import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  { timestamps: true },
);

//🔥Prevent duplicate likes
likeSchema.index({ user: 1, post: 1 }, { unique: true, sparse: true });
likeSchema.index({ user: 1, comment: 1 }, { unique: true, sparse: true });

//These create two compound unique indexes in MongoDB. Think of them as a constraint that says "no two documents in this collection can have the same combination of these fields" 

export const Like = mongoose.model("Like", likeSchema);
