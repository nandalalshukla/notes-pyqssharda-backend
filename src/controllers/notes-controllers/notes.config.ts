import { Note, NoteFields } from "../../models/notes/notes.model.js";
import {
  createResourceControllers,
  ResourceControllerConfig,
} from "../resource/resource.controller.factory.js";

export const notesResourceConfig: ResourceControllerConfig<NoteFields> = {
  model: Note,
  displayName: "Note",
  pluralDisplayName: "notes",
  emailContentType: "note",
  hasYearField: false,
  managementIdParam: "noteId",
  responseKeys: {
    singular: "note",
    publicList: "notes",
    myList: "notes",
    adminList: "notes",
    modList: "notes",
  },
};

export const notesControllers = createResourceControllers(notesResourceConfig);
