import {Router } from "express";
import { uploadNotes } from "../../controllers/notes-controllers/uploadNotes";
import { editNotes } from "../../controllers/notes-controllers/editNotes";
import { searchNotes } from "../../controllers/notes-controllers/searchNotes";
import { deleteNotes } from "../../controllers/notes-controllers/deleteNotes";

const router = Router();

router.post("/upload", uploadNotes);
router.put("/edit/:id", editNotes);
router.delete("/delete/:id", deleteNotes);
router.get("/search", searchNotes);

export default router;