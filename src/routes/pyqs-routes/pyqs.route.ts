import { Router } from "express";

// Controllers
import { editPyqs } from "../../controllers/pyqs-controllers/editPyqs.js";
import { uploadPyqs } from "../../controllers/pyqs-controllers/uploadPyqs.js";
import { searchPyqs } from "../../controllers/pyqs-controllers/searchPyqs.js";
import { deletePyqs } from "../../controllers/pyqs-controllers/deletePyqs.js";
import { fetchSpecificUserPyqs } from "../../controllers/pyqs-controllers/specificUserPyqs.js";
import { fetchAllPyqs, browsePyqs, pyqFilterOptions, fetchPyqById } from "../../controllers/pyqs-controllers/fetchAllPyqs.js";

// Validators
import {
  pyqsUploadSchema,
  updatePYQsSchema,
  pyqsQuerySchema,
} from "../../validators/pyqs-zod/pyqs.zod.js";
import { idParamSchema } from "../../validators/shared/objectId.zod.js";

// Multer & Middlewares
import { uploadPyqsMulter } from "../../config/multer.js";
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

// Search PYQs
router.get(
  "/search-pyqs",
  interactionLimiter,
  validateMiddleware(pyqsQuerySchema),
  clampPagination({ maxLimit: 50 }),
  searchPyqs,
);

// Fetch all approved PYQs
router.get("/all-pyqs", interactionLimiter, fetchAllPyqs);

// Paginated, filtered browse for the PYQs library page. Separate from
// /all-pyqs (a flat top-N) so that endpoint's existing callers are
// unaffected.
router.get(
  "/browse-pyqs",
  interactionLimiter,
  clampPagination({ maxLimit: 100 }),
  browsePyqs,
);

// Options for the browse filters — only values that actually match something.
router.get("/pyq-filters", interactionLimiter, pyqFilterOptions);

// One paper, for its own page on the site. Mounted under a literal
// "/paper/" prefix rather than a bare "/:pyqId" so it can never shadow the
// named routes above ("/all-pyqs" would otherwise match as an id).
router.get("/paper/:pyqId", interactionLimiter, fetchPyqById);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROTECTED ROUTES (Auth Required)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Upload new PYQs
router.post(
  "/upload-pyqs",
  authMiddleware,
  uploadLimiter,
  cooldown({ windowMs: 5000, message: "Please wait before uploading again." }),
  uploadPyqsMulter.single("file"),
  validateMiddleware(pyqsUploadSchema),
  uploadPyqs,
);

// Update PYQs — a replacement file is optional; when sent, it arrives via
// multer just like upload does.
router.put(
  "/edit-pyqs/:id",
  authMiddleware,
  uploadLimiter,
  cooldown({ windowMs: 5000, message: "Please wait before updating again." }),
  uploadPyqsMulter.single("file"),
  validateMiddleware(updatePYQsSchema.merge(idParamSchema)),
  editPyqs,
);

// Delete PYQs
router.delete(
  "/delete-pyqs/:id",
  authMiddleware,
  cooldown({ windowMs: 3000, message: "Please wait before deleting again." }),
  validateMiddleware(idParamSchema),
  deletePyqs,
);

// Fetch current user's PYQs
router.get(
  "/my-pyqs",
  authMiddleware,
  interactionLimiter,
  fetchSpecificUserPyqs,
);

export default router;
