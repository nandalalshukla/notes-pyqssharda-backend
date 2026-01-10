import { Request, Response } from "express";
import { Note } from '../../models/notes/notes.model.js';

//fetch all notes pending approval
export const fetchPendingNotes = async (req: Request, res: Response) => {
    try {
        const notes = await Note.find({ status: 'pending' }).lean();
        res.status(200).json({ success: true, notes });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch pending notes" });
    }
};

//reject a note pending approval
export const rejectNote = async (req: Request, res: Response) => {
    const { noteId } = req.params;
    const { rejectionReason } = req.body;
    try {
        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        note.status = 'rejected';
        note.rejectionReason = rejectionReason;
        note.rejectedAt = new Date();
        await note.save();
        return res.status(200).json({ success: true, message: 'Note rejected successfully' });
    } catch (error) {
        console.error('Error in rejecting note:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

//approve a note pending approval
export const approveNote = async (req: Request, res: Response) => {
    const { noteId } = req.params;
    try {
        const note = await Note.findOne({status: 'pending', _id: noteId});
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        note.status = 'approved';
        note.approvedAt = new Date();
        await note.save();
        return res.status(200).json({ success: true, message: 'Note approved successfully' });
    } catch (error) {
        console.error('Error in approving note:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

