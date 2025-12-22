import { deleteSyllabus } from "../../controllers/syllabus-controllers/deleteSyllabus";
import { editSyllabus } from "../../controllers/syllabus-controllers/editSyllabus";
import { uploadSyllabus } from "../../controllers/syllabus-controllers/uploadSyllabus";
import { searchSyllabus } from "../../controllers/syllabus-controllers/searchSyllabus";
import { fetchSpecificUserPyqs } from "../../controllers/syllabus-controllers/specificUserSyllabus";
import { fetchAllPyqs } from "../../controllers/syllabus-controllers/fetchAllSyllabus";
import { authMiddleware } from "../../middlewares/auth/auth.middleware";
import { upload } from "../../config/multer";

import { Router } from "express";

const router = Router();

router.get("/my-syllabus", authMiddleware, fetchSpecificUserPyqs);
router.get("/all-syllabus", fetchAllPyqs);
router.post(
  "/upload-syllabus",
  authMiddleware,
  upload.single("file"),
  uploadSyllabus
);
router.put("/edit-syllabus/:id", authMiddleware, editSyllabus);
router.delete("/delete-syllabus/:id", authMiddleware, deleteSyllabus);
router.get("/search-syllabus", searchSyllabus);

export default router;
