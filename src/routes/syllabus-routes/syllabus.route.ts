import { deleteSyllabus } from "../../controllers/syllabus-controllers/deleteSyllabus";
import { editSyllabus } from "../../controllers/syllabus-controllers/editSyllabus";
import { uploadSyllabus } from "../../controllers/syllabus-controllers/uploadSyllabus";
import { searchSyllabus } from "../../controllers/syllabus-controllers/searchSyllabus";

import { Router } from "express";

const router = Router();

router.post("/upload", uploadSyllabus);
router.put("/edit/:id", editSyllabus);
router.delete("/delete/:id", deleteSyllabus);
router.get("/search", searchSyllabus);

export default router;

