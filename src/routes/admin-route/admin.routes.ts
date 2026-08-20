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
  reviewModRequestCombinedSchema,
  removeModRoleCombinedSchema,
} from "../../validators/admin-zod/modManagement.zod.js";

// Middlewares
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { roleMiddleware } from "../../middlewares/auth/role.middleware.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";
import {
  interactionLimiter,
  cooldown,
} from "../../middlewares/rateLimit/index.js";
import { clampPagination } from "../../middlewares/security/pagination.middleware.js";

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
router.get("/notes", interactionLimiter, fetchApprovedNotes);
router.delete(
  "/notes/:noteId",
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(deleteNoteParamsSchema),
  deleteNote,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PYQs MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/pyqs", interactionLimiter, fetchApprovedPyqs);
router.delete(
  "/pyqs/:pyqId",
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(deletePYQParamsSchema),
  deletePyq,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYLLABUS MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/syllabus", interactionLimiter, fetchApprovedSyllabus);
router.delete(
  "/syllabus/:syllabusId",
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(deleteSyllabusParamsSchema),
  deleteSyllabus,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
// Fetch endpoints
router.get("/users", interactionLimiter, fetchAllUsers);
router.get("/users/active", interactionLimiter, fetchActiveUsers);
router.get("/users/inactive", interactionLimiter, fetchInactiveUsers);

// User operations
router.delete(
  "/users/:userId",
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(deleteUserParamsSchema),
  deleteUser,
);
router.patch(
  "/users/:userId/deactivate",
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before changing again." }),
  validateMiddleware(deleteUserParamsSchema),
  deactivateUser,
);
router.patch(
  "/users/:userId/activate",
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before changing again." }),
  validateMiddleware(deleteUserParamsSchema),
  activateUser,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODERATOR MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
// Fetch endpoints
router.get("/mods", interactionLimiter, fetchAllMods);
router.get(
  "/mods/requests",
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  fetchModRequests,
);

// Moderator operations (review/remove)
router.patch(
  "/mods/review/:userId",
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before reviewing again." }),
  validateMiddleware(reviewModRequestCombinedSchema),
  reviewModRequest,
);
router.patch(
  "/mods/remove/:userId",
  interactionLimiter,
  cooldown({ windowMs: 3000, message: "Please wait before removing again." }),
  validateMiddleware(removeModRoleCombinedSchema),
  removeModRole,
);

export default router;
