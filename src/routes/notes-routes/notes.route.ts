import { Router } from "express";
import { uploadNotes } from "../../controllers/notes-controllers/uploadNotes";
import { editNotes } from "../../controllers/notes-controllers/editNotes";
import { searchNotes } from "../../controllers/notes-controllers/searchNotes";
import { deleteNotes } from "../../controllers/notes-controllers/deleteNotes";
import { fetchSpecificUserNotes } from "../../controllers/notes-controllers/specificUserNotes";
import { fetchApprovedNotes } from "../../controllers/admin-controllers/notesManagement";
import { uploadNotesMulter } from "../../config/multer";
import { authMiddleware } from "../../middlewares/auth/auth.middleware";

const router = Router();

router.post(
  "/",
  authMiddleware,
  uploadNotesMulter.single("file"),
  uploadNotes
);
router.put("/:id", authMiddleware, editNotes);
router.delete("/:id", authMiddleware, deleteNotes);
router.get("/search-notes", searchNotes);
router.get("/my-notes", authMiddleware, fetchSpecificUserNotes);
router.get("/all-notes", fetchApprovedNotes);

export default router;
