//all admin routes
import { Router } from "express";
import {
  fetchApprovedNotes,
  deleteNote,
} from "../../controllers/admin-controllers/notes.Management";
import {
  fetchApprovedPyqs,
  deletePyq,
} from "../../controllers/admin-controllers/pyqManagement";
import {
  fetchApprovedSyllabus,
  deleteSyllabus,
} from "../../controllers/admin-controllers/syllabusManagement";
import {
  fetchAllUsers,
  deleteUser,
  deactivateUser,
  activateUser,
} from "../../controllers/admin-controllers/userManagement";
import {
  fetchAllMods,
  fetchModRequests,
  removeModRole,
  reviewModRequest,
} from "../../controllers/admin-controllers/modManagement";
import { authMiddleware } from "../../middlewares/auth/auth.middleware";
import { roleMiddleware } from "../../middlewares/auth/role.middleware";
import { fetchAllNotes } from "../../controllers/notes-controllers/fetchAllNotes";

const router = Router();

//all routes here will be protected and will start with /admin
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

//notes management routes
router.get("/notes", fetchAllNotes);
router.delete("/notes/:noteId", deleteNote);

//pyq management routes
router.get("/pyqs", fetchApprovedPyqs);
router.delete("/pyqs/:pyqId", deletePyq);

//syllabus management routes
router.get("/syllabus", fetchApprovedSyllabus);
router.delete("/syllabus/:syllabusId", deleteSyllabus);

//user management routes
router.get("/users", fetchAllUsers);
router.delete("/users/:userId", deleteUser);
router.patch("/users/deactivate/:userId", deactivateUser);
router.patch("/users/activate/:userId", activateUser);

//moderator management routes
router.get("/mods", fetchAllMods);
router.get("/mods/requests", fetchModRequests);
router.post("/mods/review/:userId", reviewModRequest);
router.patch("/mods/remove/:userId", removeModRole);

export default router;
