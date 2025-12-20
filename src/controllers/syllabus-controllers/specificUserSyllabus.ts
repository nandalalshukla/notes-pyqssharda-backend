import {Request, Response} from 'express';
import { Note } from '../../models/notes/notes.model.js';

export const specificUserPyqs = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        const pyqs = await Note.find({ userId }).sort({ createdAt: -1 });   
        res.status(200).json({
            success: true,
            pyqs
        });
    }
    catch (error) {
        console.error("Error fetching user pyqs:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};