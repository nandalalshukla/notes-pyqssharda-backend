import mongoose from "mongoose";
import {
  buildResourceSchema,
  addResourceIndexes,
  BaseResourceFields,
} from "../resource/resourceSchema.js";

export type NoteFields = BaseResourceFields;

const noteSchema = buildResourceSchema();
addResourceIndexes(noteSchema);

export const Note = mongoose.model<NoteFields>("Note", noteSchema, "notes");
