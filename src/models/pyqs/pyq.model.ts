import mongoose from "mongoose";
import {
  buildResourceSchema,
  addResourceIndexes,
  BaseResourceFields,
} from "../resource/resourceSchema.js";

export type PyqFields = BaseResourceFields & {
  // Academic year the paper is from, e.g. "2024-25".
  year: string;
};

const pyqSchema = buildResourceSchema({
  year: {
    type: String,
    required: true,
  },
});
addResourceIndexes(pyqSchema);

export const Pyq = mongoose.model<PyqFields>("Pyq", pyqSchema, "pyqs");
