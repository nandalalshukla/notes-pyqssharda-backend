import { Router } from "express";
import { editPyqs } from "../../controllers/pyqs-controllers/editPyqs";
import { uploadPyqs } from "../../controllers/pyqs-controllers/uploadPyqs";
import { searchPyqs } from "../../controllers/pyqs-controllers/searchPyqs";
import { deletePyqs } from "../../controllers/pyqs-controllers/deletePyqs";
import { fetchSpecificUserPyqs } from "../../controllers/pyqs-controllers/specificUserPyqs";
import { fetchAllPyqs } from "../../controllers/pyqs-controllers/fetchAllPyqs";
import { authMiddleware } from "../../middlewares/auth/auth.middleware";
import { upload } from "../../config/multer";

const router = Router();
router.get("/my-pyqs", authMiddleware, fetchSpecificUserPyqs);
router.get("/all-pyqs", fetchAllPyqs);
router.post("/upload-pyqs", authMiddleware, upload.single("file"), uploadPyqs);
router.put("/edit-pyqs/:id", authMiddleware, editPyqs);
router.delete("/delete-pyqs/:id", authMiddleware, deletePyqs);
router.get("/search-pyqs", searchPyqs);

export default router;
