import { pyqsControllers } from "../pyqs-controllers/pyqs.config.js";

export const fetchPendingPyqs = pyqsControllers.fetchPending;
export const approvePyq = pyqsControllers.approve;
export const rejectPyq = pyqsControllers.reject;
