//all admin routes
import { Router } from "express";

// Controllers - Notes
import {
  fetchApprovedNotes,
  deleteNote,
} from "../../controllers/admin-controllers/notesManagement.js";

// Controllers - PYQs
import {
  fetchApprovedPyqs,
  deletePyq,
} from "../../controllers/admin-controllers/pyqManagement.js";

// Controllers - Syllabus
import {
  fetchApprovedSyllabus,
  deleteSyllabus,
} from "../../controllers/admin-controllers/syllabusManagement.js";

// Controllers - Users
import {
  fetchAllUsers,
  deleteUser,
  deactivateUser,
  activateUser,
  fetchActiveUsers,
  fetchInactiveUsers,
} from "../../controllers/admin-controllers/userManagement.js";

// Controllers - Moderators
import {
  fetchAllMods,
  fetchModRequests,
  removeModRole,
  reviewModRequest,
} from "../../controllers/admin-controllers/modManagement.js";

// Validators
import { deleteNoteParamsSchema } from "../../validators/admin-zod/notesManagement.zod.js";
import { deletePYQParamsSchema } from "../../validators/admin-zod/pyqsManagement.zod.js";
import { deleteSyllabusParamsSchema } from "../../validators/admin-zod/syllabusManagement.zod.js";
import { deleteUserParamsSchema } from "../../validators/admin-zod/userManagement.zod.js";
import {
  reviewModRequestSchema,
  modRequestParamsSchema,
} from "../../validators/admin-zod/modManagement.zod.js";

// Middlewares
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { roleMiddleware } from "../../middlewares/auth/role.middleware.js";

const router = Router();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ADMIN MIDDLEWARE PROTECTION
 * All routes below require admin role
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NOTES MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/notes", fetchApprovedNotes);
router.delete("/notes/:noteId", deleteNote);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PYQs MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/pyqs", fetchApprovedPyqs);
router.delete("/pyqs/:pyqId", deletePyq);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYLLABUS MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/syllabus", fetchApprovedSyllabus);
router.delete("/syllabus/:syllabusId", deleteSyllabus);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
// Fetch endpoints
router.get("/users", fetchAllUsers);
router.get("/users/active", fetchActiveUsers);
router.get("/users/inactive", fetchInactiveUsers);

// User operations
router.delete("/users/:userId", deleteUser);
router.patch("/users/:userId/deactivate", deactivateUser);
router.patch("/users/:userId/activate", activateUser);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODERATOR MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
// Fetch endpoints
router.get("/mods", fetchAllMods);
router.get("/mods/requests", fetchModRequests);

// Moderator operations (review/remove)
router.patch("/mods/:userId/review", reviewModRequest);
router.patch("/mods/:userId/remove", removeModRole);

export default router;
