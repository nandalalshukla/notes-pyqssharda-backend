import { Router } from "express";

// Controllers
import { editPyqs } from "../../controllers/pyqs-controllers/editPyqs.js";
import { uploadPyqs } from "../../controllers/pyqs-controllers/uploadPyqs.js";
import { searchPyqs } from "../../controllers/pyqs-controllers/searchPyqs.js";
import { deletePyqs } from "../../controllers/pyqs-controllers/deletePyqs.js";
import { fetchSpecificUserPyqs } from "../../controllers/pyqs-controllers/specificUserPyqs.js";
import { fetchAllPyqs } from "../../controllers/pyqs-controllers/fetchAllPyqs.js";

// Validators
import {
  pyqsSchema,
  updatePYQsSchema,
  pyqsQuerySchema,
} from "../../validators/pyqs-zod/pyqs.zod.js";

// Multer & Middlewares
import { uploadPyqsMulter } from "../../config/multer.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { validateMiddleware } from "../../middlewares/auth/validate.middleware.js";

const router = Router();

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PUBLIC ROUTES (No Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Search PYQs
router.get("/search-pyqs", validateMiddleware(pyqsQuerySchema), searchPyqs);

// Fetch all approved PYQs
router.get("/all-pyqs", fetchAllPyqs);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROTECTED ROUTES (Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Upload new PYQs
router.post(
  "/upload-pyqs",
  authMiddleware,
  uploadPyqsMulter.single("file"),
  validateMiddleware(pyqsSchema),
  uploadPyqs,
);

// Update PYQs
router.put(
  "/edit-pyqs/:id",
  authMiddleware,
  validateMiddleware(updatePYQsSchema),
  editPyqs,
);

// Delete PYQs
router.delete("/delete-pyqs/:id", authMiddleware, deletePyqs);

// Fetch current user's PYQs
router.get("/my-pyqs", authMiddleware, fetchSpecificUserPyqs);

export default router;
