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
    },

    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
  },
  { timestamps: true },
);

likeSchema.index(
  { user: 1, post: 1 },
  {
    unique: true,
    partialFilterExpression: { post: { $type: "objectId" } },
  },
);

likeSchema.index(
  { user: 1, comment: 1 },
  {
    unique: true,
    partialFilterExpression: { comment: { $type: "objectId" } },
  },
);

export const Like = mongoose.model("Like", likeSchema);

export const ensureLikeIndexes = async () => {
  const indexes = await Like.collection.indexes();

  for (const index of indexes) {
    const name = index.name;
    if (
      name &&
      name !== "_id_" &&
      (name === "user_1_post_1" || name === "user_1_comment_1") &&
      !index.partialFilterExpression
    ) {
      await Like.collection.dropIndex(name);
    }
  }

  await Like.syncIndexes();
};
