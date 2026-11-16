import mongoose from "mongoose";
import { env } from "./env.js";
import { ensureLikeIndexes } from "../models/social/like.model.js";
import { ensureNotificationIndexes } from "../models/social/notification.model.js";
import { ensureSessionIndexes } from "../models/users/session.model.js";
import { ensurePostModerationDefaults } from "../models/social/post.model.js";
import { ensureUnverifiedAccountExpiry } from "../models/users/user.model.js";

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI, {
      dbName: env.MONGO_DB_NAME,
    });
    await ensureLikeIndexes();
    await ensureNotificationIndexes();
    await ensureSessionIndexes();
    await ensurePostModerationDefaults();
    await ensureUnverifiedAccountExpiry();

    console.log("MongoDB connected and indexes are ready");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
