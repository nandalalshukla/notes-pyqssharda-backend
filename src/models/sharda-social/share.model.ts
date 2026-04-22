import mongoose, { Schema } from "mongoose";

const ObjectId = Schema.Types.ObjectId;

const shareSchema = new Schema(
  {
    user: {
      type:ObjectId,
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

    reshareNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true },
);

export const Share = mongoose.model("Share", shareSchema);
