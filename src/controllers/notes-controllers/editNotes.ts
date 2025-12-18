import { Request, Response } from "express";
import { Note } from "../../models/notes/notes.model.js";

export const editNotes = async (req: Request, res: Response) => {
    try {
        const noteId = req.params.id;
        const { title, fileUrl, program, courseCode, courseName, semester } = req.body;
        const userId = req.user!.id;
        if(!title || !fileUrl || !program || !courseCode || !courseName || !semester) {
            return  res.status(400).json({ message: "All fields are required" });
        }
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }
        if (note.userId.toString() !== userId) {
            return res.status(403).json({ message: "Forbidden: You can only edit your own notes" });
        }
        note.title = title;
        note.fileUrl = fileUrl;
        note.program = program;
        note.courseCode = courseCode;
        note.courseName = courseName;
        note.semester = semester;
        await note.save();
        res.status(200).json({ message: "Note updated successfully", note });
    }
    catch (error) {
        console.error("Error editing note:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
