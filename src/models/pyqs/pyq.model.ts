import mongoose, { Schema } from "mongoose";
import {
  buildResourceSchema,
  addResourceIndexes,
  BaseResourceFields,
} from "../resource/resourceSchema.js";

export type PyqFields = BaseResourceFields & {
  // Academic year the paper is from, e.g. "2024-25".
  year: string;

  // The school that set the paper, e.g. "School of Engineering/ Basic
  // Sciences/ Agriculture Science". One level above `program`: a school
  // runs many degrees, and students browse by both.
  school: string | null;

  // Provenance for papers pulled from the university's DSpace repository
  // (scripts/pyq-import). Absent on hand-uploaded papers.
  source: {
    system: string;
    handle: string;
    bitstream: string;
  } | null;
};

const pyqSchema = buildResourceSchema({
  year: {
    type: String,
    required: true,
  },

  // Nullable rather than required: papers uploaded through the site's own
  // form don't ask for a school, and back-filling one for them would mean
  // inventing data.
  school: {
    type: String,
    trim: true,
    default: null,
    index: true,
  },

  // Lets a re-import find what it already brought in, and lets anyone
  // trace a paper back to the record it came from.
  source: {
    type: new Schema(
      {
        system: { type: String, required: true },
        handle: { type: String, required: true },
        bitstream: { type: String, required: true },
      },
      { _id: false },
    ),
    default: null,
  },
});

// The public list endpoint filters on these and sorts by recency; without
// them a filtered browse of ~6k papers is a collection scan plus an
// in-memory sort.
pyqSchema.index({ status: 1, program: 1, semester: 1, year: 1, createdAt: -1 });
pyqSchema.index({ status: 1, school: 1, createdAt: -1 });
// One imported paper per source bitstream — makes a concurrent or repeated
// import physically unable to double-insert, rather than relying on the
// importer checking first.
pyqSchema.index(
  { "source.bitstream": 1 },
  { unique: true, partialFilterExpression: { "source.bitstream": { $type: "string" } } },
);
addResourceIndexes(pyqSchema);

export const Pyq = mongoose.model<PyqFields>("Pyq", pyqSchema, "pyqs");
