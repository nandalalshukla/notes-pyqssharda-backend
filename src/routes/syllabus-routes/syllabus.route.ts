import { deleteSyllabus } from "../../controllers/syllabus-controllers/deleteSyllabus";
import { editSyllabus } from "../../controllers/syllabus-controllers/editSyllabus";
import { uploadSyllabus } from "../../controllers/syllabus-controllers/uploadSyllabus";
import { searchSyllabus } from "../../controllers/syllabus-controllers/searchSyllabus";
import { fetchSpecificUserPyqs } from "../../controllers/syllabus-controllers/specificUserSyllabus";
import { fetchAllPyqs } from "../../controllers/syllabus-controllers/fetchAllSyllabus";

import { Router } from "express";

const router = Router();

router.get("/my-syllabus", fetchSpecificUserPyqs);
router.get("/all-syllabus", fetchAllPyqs);
router.post("/upload-syllabus", uploadSyllabus);
router.put("/edit-syllabus/:id", editSyllabus);
router.delete("/delete-syllabus/:id", deleteSyllabus);
router.get("/search-syllabus", searchSyllabus);

export default router;

