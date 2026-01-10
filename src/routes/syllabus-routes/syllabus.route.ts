import { deleteSyllabus } from "../../controllers/syllabus-controllers/deleteSyllabus";
import { editSyllabus } from "../../controllers/syllabus-controllers/editSyllabus";
import { uploadSyllabus } from "../../controllers/syllabus-controllers/uploadSyllabus";
import { searchSyllabus } from "../../controllers/syllabus-controllers/searchSyllabus";
import { fetchSpecificUserSyllabus } from "../../controllers/syllabus-controllers/specificUserSyllabus";
import { fetchAllSyllabus } from "../../controllers/syllabus-controllers/fetchAllSyllabus";
import { authMiddleware } from "../../middlewares/auth/auth.middleware";
import { uploadSyllabusMulter } from "../../config/multer";

import { Router } from "express";

const router = Router();

router.get("/my-syllabus", authMiddleware, fetchSpecificUserSyllabus);
router.get("/all-syllabus", fetchAllSyllabus);
router.post(
  "/upload-syllabus",
  authMiddleware,
  uploadSyllabusMulter.single("file"),
  uploadSyllabus
);
router.put("/edit-syllabus/:id", authMiddleware, editSyllabus);
router.delete("/delete-syllabus/:id", authMiddleware, deleteSyllabus);
router.get("/search-syllabus", searchSyllabus);

export default router;
