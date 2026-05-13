import { Router } from "express";

// Controllers
import { deleteSyllabus } from "../../controllers/syllabus-controllers/deleteSyllabus.js";
import { editSyllabus } from "../../controllers/syllabus-controllers/editSyllabus.js";
import { uploadSyllabus } from "../../controllers/syllabus-controllers/uploadSyllabus.js";
import { searchSyllabus } from "../../controllers/syllabus-controllers/searchSyllabus.js";
import { fetchSpecificUserSyllabus } from "../../controllers/syllabus-controllers/specificUserSyllabus.js";
import { fetchAllSyllabus } from "../../controllers/syllabus-controllers/fetchAllSyllabus.js";

// Validators
import {
  syllabusSchema,
  updateSyllabusSchema,
  syllabusQuerySchema,
} from "../../validators/syllabus-zod/syllabus.zod.js";

// Multer & Middlewares
import { uploadSyllabusMulter } from "../../config/multer.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";

const router = Router();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PUBLIC ROUTES (No Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Search Syllabus
router.get(
  "/search-syllabus",
  validateMiddleware(syllabusQuerySchema),
  searchSyllabus,
);

// Fetch all approved Syllabus
router.get("/all-syllabus", fetchAllSyllabus);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROTECTED ROUTES (Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Upload new Syllabus
router.post(
  "/upload-syllabus",
  authMiddleware,
  uploadSyllabusMulter.single("file"),
  validateMiddleware(syllabusSchema),
  uploadSyllabus,
);

// Update Syllabus
router.put(
  "/edit-syllabus/:id",
  authMiddleware,
  validateMiddleware(updateSyllabusSchema),
  editSyllabus,
);

// Delete Syllabus
router.delete("/delete-syllabus/:id", authMiddleware, deleteSyllabus);

// Fetch current user's Syllabus
router.get("/my-syllabus", authMiddleware, fetchSpecificUserSyllabus);

export default router;
