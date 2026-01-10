//admin will manage all the syllabus via this controller

import { Request, Response } from "express";
import { Syllabus } from "../../models/syllabus/syllabus.model";

//fetch all syllabus
export const fetchAllSyllabus = async (req: Request, res: Response) => {
    try {
        const syllabus = await Syllabus.find({}).lean();
        res.status(200).json({ success: true, syllabus });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch syllabus" });
    }
};

//delete a syllabus
export const deleteSyllabus = async (req: Request, res: Response) => {
    const { syllabusId } = req.params;

    try {
        const syllabus = await Syllabus.findOneAndDelete({status: 'approved', _id: syllabusId});
        if (!syllabus) {
            return res.status(404).json({ success: false, message: 'Syllabus not found' });
        }
        return res.status(200).json({ success: true, message: 'Syllabus deleted successfully' });
    } catch (error) {
        console.error('Error in deleting syllabus:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};