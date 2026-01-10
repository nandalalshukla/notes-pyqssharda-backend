import { Request, Response } from "express";
import { Syllabus } from "../../models/syllabus/syllabus.model";

export const rejectSyllabus = async (req: Request, res: Response) => {
    const { syllabusId } = req.params;
    const { rejectionReason } = req.body;
    try {
        const syllabus = await Syllabus.findById(syllabusId);
        if (!syllabus) {
            return res.status(404).json({ success: false, message: 'Syllabus not found' });
        }
        syllabus.status = 'rejected';
        syllabus.rejectionReason = rejectionReason;
        syllabus.rejectedAt = new Date();
        await syllabus.save();
        return res.status(200).json({ success: true, message: 'Syllabus rejected successfully' });
    } catch (error) {
        console.error('Error in rejecting syllabus:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const approveSyllabus = async (req: Request, res: Response) => {
    const { syllabusId } = req.params;
    try {
        const syllabus = await Syllabus.findOne({status: 'pending', _id: syllabusId});
        if (!syllabus) {
            return res.status(404).json({ success: false, message: 'Syllabus not found' });
        }
        syllabus.status = 'approved';
        syllabus.approvedAt = new Date();
        await syllabus.save();
        return res.status(200).json({ success: true, message: 'Syllabus approved successfully' });
    }
    catch (error) {
        console.error('Error in approving syllabus:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};          