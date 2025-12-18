import { Request, Response } from "express";
import { Note } from "../../models/notes/notes.model.js";

export const searchNotes = async (req: Request, res: Response) => {
  try {
        const { query } = req.query;
        if (!query || typeof query !== "string") {
            return res.status(400).json({ message: "Query parameter is required" });
        }
        const regex = new RegExp(query, "i");
        const notes = await Note.find({
            $or: [
                { title: regex },
                { program: regex },
                { courseCode: regex },
                { courseName: regex },
            ],
        });
        res.status(200).json({ notes });
    } catch (error) {
        console.error("Error searching notes:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};