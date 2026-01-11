import {Request, Response} from 'express';
import { Note } from '../../models/notes/notes.model.js';

export const fetchAllNotes = async (req: Request, res: Response) => {
    try {
        const notes = await Note.find().sort({ createdAt: -1 });
        console.log("all note:", notes);
        res.status(200).json({
            success: true,
            notes
        });
    }
    catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};



