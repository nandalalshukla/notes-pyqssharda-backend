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
  syllabusUploadSchema,
  updateSyllabusSchema,
  syllabusQuerySchema,
} from "../../validators/syllabus-zod/syllabus.zod.js";
import { idParamSchema } from "../../validators/shared/objectId.zod.js";

// Multer & Middlewares
import { uploadSyllabusMulter } from "../../config/multer.js";
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

// Search Syllabus
router.get(
  "/search-syllabus",
  interactionLimiter,
  validateMiddleware(syllabusQuerySchema),
  clampPagination({ maxLimit: 50 }),
  searchSyllabus,
);

// Fetch all approved Syllabus
router.get("/all-syllabus", interactionLimiter, fetchAllSyllabus);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROTECTED ROUTES (Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Upload new Syllabus
router.post(
  "/upload-syllabus",
  authMiddleware,
  uploadLimiter,
  cooldown({ windowMs: 5000, message: "Please wait before uploading again." }),
  uploadSyllabusMulter.single("file"),
  validateMiddleware(syllabusUploadSchema),
  uploadSyllabus,
);

// Update Syllabus — a replacement file is optional; when sent, it arrives
// via multer just like upload does.
router.put(
  "/edit-syllabus/:id",
  authMiddleware,
  uploadLimiter,
  cooldown({ windowMs: 5000, message: "Please wait before updating again." }),
  uploadSyllabusMulter.single("file"),
  validateMiddleware(updateSyllabusSchema.merge(idParamSchema)),
  editSyllabus,
);

// Delete Syllabus
router.delete(
  "/delete-syllabus/:id",
  authMiddleware,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(idParamSchema),
  deleteSyllabus,
);

// Fetch current user's Syllabus
router.get(
  "/my-syllabus",
  authMiddleware,
  interactionLimiter,
  fetchSpecificUserSyllabus,
);

export default router;
