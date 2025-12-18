import { Note } from "../../models/notes/notes.model.js";
import { Request, Response } from "express";

export const uploadNotes = async (req: Request, res: Response) => {
  try {
    const { title, fileUrl, program, courseCode, courseName, semester } =
      req.body;
    const userId = req.user!.id;
    if (
      !title ||
      !fileUrl ||
      !program ||
      !courseCode ||
      !courseName ||
      !semester
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const newNote = new Note({
      title,
      fileUrl,
      userId,
      program,
      courseCode,
      courseName,
      semester,
    });
    await newNote.save();
    res
      .status(201)
      .json({ message: "Note uploaded successfully", note: newNote });
  } catch (error) {
    console.error("Error uploading note:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
