import { Router } from "express";

// Controllers
import { uploadNotes } from "../../controllers/notes-controllers/uploadNotes.js";
import { editNotes } from "../../controllers/notes-controllers/editNotes.js";
import { searchNotes } from "../../controllers/notes-controllers/searchNotes.js";
import { deleteNotes } from "../../controllers/notes-controllers/deleteNotes.js";
import { fetchSpecificUserNotes } from "../../controllers/notes-controllers/specificUserNotes.js";
import {
  browseNotes,
  fetchAllNotes,
  fetchNoteById,
  noteFilterOptions,
} from "../../controllers/notes-controllers/fetchNotes.js";

// Validators
import {
  notesUploadSchema,
  updateNotesSchema,
  notesQuerySchema,
} from "../../validators/notes-zod/notes.zod.js";
import { idParamSchema } from "../../validators/shared/objectId.zod.js";

// Multer & Middlewares
import { uploadNotesMulter } from "../../config/multer.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";
import {
  interactionLimiter,
  uploadLimiter,
  cooldown,
} from "../../middlewares/rateLimit/index.js";
import { clampPagination } from "../../middlewares/security/pagination.middleware.js";

const router = Router();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PUBLIC ROUTES (No Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Search notes
router.get(
  "/search-notes",
  interactionLimiter,
  validateMiddleware(notesQuerySchema),
  clampPagination({ maxLimit: 50 }),
  searchNotes,
);

// Fetch all approved notes
router.get(
  "/all-notes",
  interactionLimiter,
  clampPagination({ maxLimit: 100 }),
  fetchAllNotes,
);

router.get(
  "/browse-notes",
  interactionLimiter,
  clampPagination({ maxLimit: 100 }),
  browseNotes,
);

router.get("/note-filters", interactionLimiter, noteFilterOptions);

router.get("/note/:noteId", interactionLimiter, fetchNoteById);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROTECTED ROUTES (Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Upload new notes
router.post(
  "/",
  authMiddleware,
  uploadLimiter,
  cooldown({ windowMs: 5000, message: "Please wait before uploading again." }),
  uploadNotesMulter.single("file"),
  validateMiddleware(notesUploadSchema),
  uploadNotes,
);

// Update notes — a replacement file is optional; when sent, it arrives via
// multer just like upload does (previously this route had no multer
// middleware at all, so the "replace the file" flow described in the zod
// schema/frontend form couldn't actually work).
router.put(
  "/:id",
  authMiddleware,
  uploadLimiter,
  cooldown({ windowMs: 5000, message: "Please wait before updating again." }),
  uploadNotesMulter.single("file"),
  validateMiddleware(updateNotesSchema.merge(idParamSchema)),
  editNotes,
);

// Delete notes
router.delete(
  "/:id",
  authMiddleware,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(idParamSchema),
  deleteNotes,
);

// Fetch current user's notes
router.get(
  "/my-notes",
  authMiddleware,
  interactionLimiter,
  clampPagination({ maxLimit: 50 }),
  fetchSpecificUserNotes,
);

export default router;
