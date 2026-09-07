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

// Controllers - Content (notes / pyqs / syllabus, all through one set)
import {
  listContent,
  contentCounts,
  approveContent,
  rejectContent,
  deleteContent,
} from "../../controllers/admin-controllers/contentManagement.js";

// Validators
import {
  listContentSchema,
  contentCountsSchema,
  contentActionSchema,
  rejectContentSchema,
} from "../../validators/admin-zod/contentManagement.zod.js";
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
 * CONTENT MANAGEMENT ROUTES
 *
 * One parameterised set covering notes, pyqs and syllabus — `:type` is
 * validated against the resource map in contentManagement.ts, so the route
 * and the controller can't disagree about which types exist.
 *
 * These sit alongside the older per-resource routes below rather than
 * replacing them, so nothing already calling those breaks.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Per-status totals, for the console's tab badges.
router.get(
  "/content/:type/counts",
  interactionLimiter,
  validateMiddleware(contentCountsSchema),
  contentCounts,
);

// Paginated list; ?status=pending|approved|rejected|all
router.get(
  "/content/:type",
  interactionLimiter,
  clampPagination({ maxLimit: 100 }),
  validateMiddleware(listContentSchema),
  listContent,
);

// Publish a pending upload.
//
// No `cooldown` on the review actions: working through a queue means
// clicking approve repeatedly, and a per-action cooldown blocks the second
// click. `interactionLimiter` still caps the overall rate, and this mirrors
// the moderator routes, which have never had one either.
router.patch(
  "/content/:type/:id/approve",
  interactionLimiter,
  validateMiddleware(contentActionSchema),
  approveContent,
);

// Decline a pending upload. A reason is required — the uploader is emailed it.
router.patch(
  "/content/:type/:id/reject",
  interactionLimiter,
  validateMiddleware(rejectContentSchema),
  rejectContent,
);

// Remove a resource at any status, including its Cloudinary asset.
router.delete(
  "/content/:type/:id",
  interactionLimiter,
  cooldown({ windowMs: 2000, message: "Please wait before deleting again." }),
  validateMiddleware(contentActionSchema),
  deleteContent,
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
