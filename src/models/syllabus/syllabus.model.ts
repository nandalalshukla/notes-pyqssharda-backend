import mongoose from "mongoose";
import { Schema } from "mongoose";
const ObjectId = Schema.Types.ObjectId;
const syllabusSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: ObjectId,
    ref: "User",
    required: true,
  },
  program: {
    type: String,
    required: true,
    trim: true,
  },
  courseCode: {
    type: String,
    required: true,
    trim: true,
  },
  courseName: {
    type: String,
    required: true,
    trim: true,
  },
  semester: {
    type: Number,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
});

export const Syllabus = mongoose.model("Syllabus", syllabusSchema, "syllabus");
