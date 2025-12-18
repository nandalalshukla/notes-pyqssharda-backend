import { Request, Response } from "express";
import { Note } from "../../models/notes/notes.model.js";

export const deleteNotes = async (req: Request, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user!.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    if (note.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only delete your own notes" });
    }
    await Note.findByIdAndDelete(noteId);
    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
