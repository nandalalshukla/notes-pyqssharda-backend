import { Router } from "express";
import { uploadNotes } from "../../controllers/notes-controllers/uploadNotes";
import { editNotes } from "../../controllers/notes-controllers/editNotes";
import { searchNotes } from "../../controllers/notes-controllers/searchNotes";
import { deleteNotes } from "../../controllers/notes-controllers/deleteNotes";
import { fetchSpecificUserNotes } from "../../controllers/notes-controllers/specificUserNotes";
import { fetchAllNotes } from "../../controllers/notes-controllers/fetchAllNotes";
import { uploadNotesMulter } from "../../config/multer";
import { authMiddleware } from "../../middlewares/auth/auth.middleware";

const router = Router();

router.post(
  "/upload-notes",
  authMiddleware,
  uploadNotesMulter.single("file"),
  uploadNotes
);
router.put("/edit-notes/:id", authMiddleware, editNotes);
router.delete("/delete-notes/:id", authMiddleware, deleteNotes);
router.get("/search-notes", searchNotes);
router.get("/my-notes", authMiddleware, fetchSpecificUserNotes);
router.get("/all-notes", fetchAllNotes);

export default router;
