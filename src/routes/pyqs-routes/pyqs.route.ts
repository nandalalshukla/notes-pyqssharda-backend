import { Router } from "express";
import { editPyqs } from "../../controllers/pyqs-controllers/editPyqs";
import { uploadPyqs } from "../../controllers/pyqs-controllers/uploadPyqs";
import { searchPyqs } from "../../controllers/pyqs-controllers/searchPyqs";
import { deletePyqs } from "../../controllers/pyqs-controllers/deletePyqs";
import { fetchSpecificUserPyqs } from "../../controllers/pyqs-controllers/specificUserPyqs";
import { fetchAllPyqs } from "../../controllers/pyqs-controllers/fetchAllPyqs";

const router = Router();
router.get("/my-pyqs", fetchSpecificUserPyqs);
router.get("/all-pyqs", fetchAllPyqs);
router.post("/upload-pyqs", uploadPyqs);
router.put("/edit-pyqs/:id", editPyqs);
router.delete("/delete-pyqs/:id", deletePyqs);
router.get("/search-pyqs", searchPyqs);

export default router;
