import { Router } from "express";
import { editPyqs } from "../../controllers/pyqs-controllers/editPyqs";
import { uploadPyqs } from "../../controllers/pyqs-controllers/uploadPyqs";
import { searchPyqs } from "../../controllers/pyqs-controllers/searchPyqs";
import { deletePyqs } from "../../controllers/pyqs-controllers/deletePyqs";

const router = Router();
router.post("/upload", uploadPyqs);
router.put("/edit/:id", editPyqs);
router.delete("/delete/:id", deletePyqs);
router.get("/search", searchPyqs);
export default router;
