import mongoose from "mongoose";
import {
  buildResourceSchema,
  addResourceIndexes,
  BaseResourceFields,
} from "../resource/resourceSchema.js";

export type SyllabusFields = BaseResourceFields;

const syllabusSchema = buildResourceSchema();
addResourceIndexes(syllabusSchema);

export const Syllabus = mongoose.model<SyllabusFields>(
  "Syllabus",
  syllabusSchema,
  "syllabus",
);
