import { Router } from "express";

// Controllers
import { uploadNotes } from "../../controllers/notes-controllers/uploadNotes.js";
import { editNotes } from "../../controllers/notes-controllers/editNotes.js";
import { searchNotes } from "../../controllers/notes-controllers/searchNotes.js";
import { deleteNotes } from "../../controllers/notes-controllers/deleteNotes.js";
import { fetchSpecificUserNotes } from "../../controllers/notes-controllers/specificUserNotes.js";
import { fetchAllNotes } from "../../controllers/notes-controllers/fetchNotes.js";

// Validators
import {
  notesSchema,
  updateNotesSchema,
  notesQuerySchema,
} from "../../validators/notes-zod/notes.zod.js";

// Multer & Middlewares
import { uploadNotesMulter } from "../../config/multer.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";

const router = Router();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PUBLIC ROUTES (No Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Search notes
router.get("/search-notes", validateMiddleware(notesQuerySchema), searchNotes);

// Fetch all approved notes
router.get("/all-notes", fetchAllNotes);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROTECTED ROUTES (Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Upload new notes
router.post(
  "/",
  authMiddleware,
  uploadNotesMulter.single("file"),
  validateMiddleware(notesSchema),
  uploadNotes,
);

// Update notes
router.put(
  "/:id",
  authMiddleware,
  validateMiddleware(updateNotesSchema),
  editNotes,
);

// Delete notes
router.delete("/:id", authMiddleware, deleteNotes);

// Fetch current user's notes
router.get("/my-notes", authMiddleware, fetchSpecificUserNotes);

export default router;
