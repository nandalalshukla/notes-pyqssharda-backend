import { notesControllers } from "../notes-controllers/notes.config.js";

export const fetchPendingNotes = notesControllers.fetchPending;
export const approveNote = notesControllers.approve;
export const rejectNote = notesControllers.reject;
