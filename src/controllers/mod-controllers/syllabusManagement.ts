import { syllabusControllers } from "../syllabus-controllers/syllabus.config.js";

export const fetchPendingSyllabus = syllabusControllers.fetchPending;
export const approveSyllabus = syllabusControllers.approve;
export const rejectSyllabus = syllabusControllers.reject;
