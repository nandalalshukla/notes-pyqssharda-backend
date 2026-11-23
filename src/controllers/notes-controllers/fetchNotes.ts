import { notesControllers } from "./notes.config.js";

export const fetchAllNotes = notesControllers.fetchAll;

/** Paginated, filtered browse for the public notes library. */
export const browseNotes = notesControllers.browse;

/** Distinct programs, years and semesters among approved notes. */
export const noteFilterOptions = notesControllers.filterOptions;

/** One approved note, for its detail page. */
export const fetchNoteById = notesControllers.fetchOne;
