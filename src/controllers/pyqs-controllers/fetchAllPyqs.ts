import { pyqsControllers } from "./pyqs.config.js";

export const fetchAllPyqs = pyqsControllers.fetchAll;

/** Paginated + filtered browse, for the PYQs library page. */
export const browsePyqs = pyqsControllers.browse;

/** Distinct programs / schools / years / semesters among approved PYQs. */
export const pyqFilterOptions = pyqsControllers.filterOptions;
