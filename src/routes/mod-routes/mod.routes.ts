//all moderator routes
import { Router } from "express";

// Controllers
import {
  fetchPendingNotes,
  approveNote,
  rejectNote,
} from "../../controllers/mod-controllers/notesManagement.js";
import {
  fetchPendingPyqs,
  approvePyq,
  rejectPyq,
} from "../../controllers/mod-controllers/pyqManagement.js";
import {
  fetchPendingSyllabus,
  approveSyllabus,
  rejectSyllabus,
} from "../../controllers/mod-controllers/syllabusManagement.js";

// Validators
import { rejectNoteSchema } from "../../validators/mods-zod/notesManagement.zod.js";
import { rejectPYQSchema } from "../../validators/mods-zod/pyqsManagement.zod.js";
import { rejectSyllabusSchema } from "../../validators/mods-zod/syllabusManagement.zod.js";

// Middlewares
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { roleMiddleware } from "../../middlewares/auth/role.middleware.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";

const router = Router();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODERATOR MIDDLEWARE PROTECTION
 * Routes require moderator or admin role
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.use(authMiddleware, roleMiddleware("mod", "admin"));

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NOTES MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/notes/pending", fetchPendingNotes);
router.patch("/notes/:noteId/approve", approveNote);
router.patch(
  "/notes/:noteId/reject",
  validateMiddleware(rejectNoteSchema),
  rejectNote,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PYQs MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/pyqs/pending", fetchPendingPyqs);
router.patch("/pyqs/:pyqId/approve", approvePyq);
router.patch(
  "/pyqs/:pyqId/reject",
  validateMiddleware(rejectPYQSchema),
  rejectPyq,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYLLABUS MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/syllabus/pending", fetchPendingSyllabus);
router.patch("/syllabus/:syllabusId/approve", approveSyllabus);
router.patch(
  "/syllabus/:syllabusId/reject",
  validateMiddleware(rejectSyllabusSchema),
  rejectSyllabus,
);

export default router;
