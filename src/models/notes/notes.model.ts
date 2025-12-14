import mongoose from "mongoose";
import { Schema } from "mongoose";    
const pyqSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
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
});
export const Note = mongoose.model("Note", pyqSchema, "notes");