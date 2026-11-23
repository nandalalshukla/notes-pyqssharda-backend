import { syllabusControllers } from "./syllabus.config.js";

export const fetchAllSyllabus = syllabusControllers.fetchAll;

/** Paginated, filtered browse for the public syllabus library. */
export const browseSyllabus = syllabusControllers.browse;

/** Distinct programs, years and semesters among approved syllabus. */
export const syllabusFilterOptions = syllabusControllers.filterOptions;

/** One approved syllabus, for its detail page. */
export const fetchSyllabusById = syllabusControllers.fetchOne;
