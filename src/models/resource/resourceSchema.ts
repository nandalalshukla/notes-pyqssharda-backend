import mongoose, { Schema, SchemaDefinition } from "mongoose";

/**
 * Notes, PYQs, and Syllabus are all "uploaded file with metadata, subject to
 * moderation" — the same shape with a couple of resource-specific fields
 * (e.g. PYQs also carry `year`). This builder is the single source of truth
 * for that shared shape so the three models (and their indexes) can't drift
 * from each other the way the old hand-copied schemas did.
 */
export interface BaseResourceFields {
  title: string;
  fileUrl: string;
  publicId: string;
  // The Cloudinary resource type the file was actually uploaded as
  // ("image" | "video" | "raw"), so it can be deleted/replaced with the
  // matching type later — Cloudinary's destroy call is a silent no-op if
  // the resource_type doesn't match what the asset was stored as.
  resourceType: "image" | "video" | "raw";
  userId: mongoose.Types.ObjectId;
  program: string;
  courseCode: string;
  courseName: string;
  semester: number;
  status: "pending" | "approved" | "rejected";
  approvedBy: mongoose.Types.ObjectId | null;
  approvedAt: Date | null;
  rejectedBy: mongoose.Types.ObjectId | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function buildResourceSchema(extraFields: SchemaDefinition = {}) {
  return new Schema<BaseResourceFields>(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      fileUrl: {
        type: String,
        required: true,
      },

      publicId: {
        type: String,
        required: true,
      },

      // Legacy documents predate this field — they were always destroyed
      // with resource_type "raw", so that's the safe default for them too.
      resourceType: {
        type: String,
        enum: ["image", "video", "raw"],
        default: "raw",
      },

      userId: {
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

      ...extraFields,

      // ── Moderation ────────────────────────────────────────────────────
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },

      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      rejectedAt: {
        type: Date,
        default: null,
      },

      rejectionReason: {
        type: String,
        default: null,
      },
    },
    {
      timestamps: true, // createdAt, updatedAt
    },
  );
}

/**
 * Every list endpoint across notes/pyqs/syllabus filters by `status` and/or
 * `userId`, sorted by `createdAt` — these compound indexes cover both
 * without falling back to a collection scan + in-memory sort.
 */
export function addResourceIndexes(schema: Schema) {
  schema.index({ status: 1, createdAt: -1 });
  schema.index({ userId: 1, createdAt: -1 });
  schema.index({ courseCode: 1 });
}
