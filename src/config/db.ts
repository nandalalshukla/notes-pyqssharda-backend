import mongoose from "mongoose";
import { ensureLikeIndexes } from "../models/social/like.model.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      dbName: process.env.MONGO_DB_NAME,
    });
    await ensureLikeIndexes();

    console.log("MongoDB connected and like indexes are ready");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
