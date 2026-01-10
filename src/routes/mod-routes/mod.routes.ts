//all moderator routes
import { Router } from "express";
import {
  fetchPendingNotes,
  approveNote,
  rejectNote,
} from "../../controllers/mod-controllers/notesManagement";
import {
    fetchPendingPyqs,
  approvePyq,
  rejectPyq,
} from "../../controllers/mod-controllers/pyqManagement";
import { fetchPendingSyllabus, approveSyllabus, rejectSyllabus } from "../../controllers/mod-controllers/syllabusManagement";
import { authMiddleware } from "../../middlewares/auth/auth.middleware";
import { roleMiddleware } from "../../middlewares/auth/role.middleware";


const router = Router();

//apply auth and mod role middleware to all routes
router.use(authMiddleware, roleMiddleware("mod", "admin"));
//notes management routes
router.get("/notes/pending", fetchPendingNotes);
router.post("/notes/:noteId/approve", approveNote);
router.post("/notes/:noteId/reject", rejectNote);

//pyq management routes
router.get("/pyqs/pending", fetchPendingPyqs);
router.post("/pyqs/:pyqId/approve", approvePyq);
router.post("/pyqs/:pyqId/reject", rejectPyq);

//syllabus management routes
router.get("/syllabus/pending", fetchPendingSyllabus);
router.post("/syllabus/:syllabusId/approve", approveSyllabus);
router.post("/syllabus/:syllabusId/reject", rejectSyllabus);

export default router;