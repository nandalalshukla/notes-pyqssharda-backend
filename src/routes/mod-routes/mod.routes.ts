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
import {
  fetchPendingPosts,
  approvePost,
  rejectPost,
} from "../../controllers/mod-controllers/postManagement.js";
import {
  fetchReportById,
  fetchReports,
} from "../../controllers/mod-controllers/reportManagement.js";
import {
  resolveReport,
  rejectReport,
  deleteReportedPost,
  deleteReportedComment,
  suspendReportedUser,
  warnReportedUser,
  deleteReportedUser,
} from "../../controllers/mod-controllers/reportActions.js";

// Validators
import {
  rejectNoteSchema,
  noteParamsSchema,
} from "../../validators/mods-zod/notesManagement.zod.js";
import {
  rejectPYQSchema,
  pyqParamsSchema,
} from "../../validators/mods-zod/pyqsManagement.zod.js";
import {
  rejectSyllabusSchema,
  syllabusParamsSchema,
} from "../../validators/mods-zod/syllabusManagement.zod.js";
import {
  rejectPostSchema,
  postModerationParamsSchema,
} from "../../validators/mods-zod/postManagement.zod.js";
import {
  reportParamsSchema,
  reportQuerySchema,
} from "../../validators/mods-zod/reportManagement.zod.js";
import { reportActionParamsSchema } from "../../validators/mods-zod/reportActions.zod.js";

// Middlewares
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { roleMiddleware } from "../../middlewares/auth/role.middleware.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";
import { interactionLimiter } from "../../middlewares/rateLimit/index.js";
import { clampPagination } from "../../middlewares/security/pagination.middleware.js";

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
router.get("/notes/pending", interactionLimiter, fetchPendingNotes);
router.patch(
  "/notes/:noteId/approve",
  interactionLimiter,
  validateMiddleware(noteParamsSchema),
  approveNote,
);
router.patch(
  "/notes/:noteId/reject",
  interactionLimiter,
  validateMiddleware(rejectNoteSchema.merge(noteParamsSchema)),
  rejectNote,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PYQs MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/pyqs/pending", interactionLimiter, fetchPendingPyqs);
router.patch(
  "/pyqs/:pyqId/approve",
  interactionLimiter,
  validateMiddleware(pyqParamsSchema),
  approvePyq,
);
router.patch(
  "/pyqs/:pyqId/reject",
  interactionLimiter,
  validateMiddleware(rejectPYQSchema.merge(pyqParamsSchema)),
  rejectPyq,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYLLABUS MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get("/syllabus/pending", interactionLimiter, fetchPendingSyllabus);
router.patch(
  "/syllabus/:syllabusId/approve",
  interactionLimiter,
  validateMiddleware(syllabusParamsSchema),
  approveSyllabus,
);
router.patch(
  "/syllabus/:syllabusId/reject",
  interactionLimiter,
  validateMiddleware(rejectSyllabusSchema.merge(syllabusParamsSchema)),
  rejectSyllabus,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSTS MANAGEMENT ROUTES
 * Events and announcements submitted by general members, awaiting review
 * before they appear in the feed (see utils/postModeration.ts).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get(
  "/posts/pending",
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  fetchPendingPosts,
);
router.patch(
  "/posts/:postId/approve",
  interactionLimiter,
  validateMiddleware(postModerationParamsSchema),
  approvePost,
);
router.patch(
  "/posts/:postId/reject",
  interactionLimiter,
  validateMiddleware(rejectPostSchema.merge(postModerationParamsSchema)),
  rejectPost,
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REPORTS MANAGEMENT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */
router.get(
  "/reports",
  validateMiddleware(reportQuerySchema),
  clampPagination({ maxLimit: 50 }),
  interactionLimiter,
  fetchReports,
);
router.get(
  "/reports/:reportId",
  validateMiddleware(reportParamsSchema),
  interactionLimiter,
  fetchReportById,
);
router.patch(
  "/reports/:reportId/resolve",
  interactionLimiter,
  validateMiddleware(reportActionParamsSchema),
  resolveReport,
);
router.patch(
  "/reports/:reportId/reject",
  interactionLimiter,
  validateMiddleware(reportActionParamsSchema),
  rejectReport,
);
router.patch(
  "/reports/:reportId/delete-post",
  interactionLimiter,
  validateMiddleware(reportActionParamsSchema),
  deleteReportedPost,
);
router.patch(
  "/reports/:reportId/delete-comment",
  interactionLimiter,
  validateMiddleware(reportActionParamsSchema),
  deleteReportedComment,
);
router.patch(
  "/reports/:reportId/suspend-user",
  interactionLimiter,
  validateMiddleware(reportActionParamsSchema),
  suspendReportedUser,
);
router.patch(
  "/reports/:reportId/warn-user",
  interactionLimiter,
  validateMiddleware(reportActionParamsSchema),
  warnReportedUser,
);
router.patch(
  "/reports/:reportId/delete-user",
  interactionLimiter,
  validateMiddleware(reportActionParamsSchema),
  deleteReportedUser,
);

export default router;
