//fetch all syllabus
import { Request, Response } from "express";
import { Syllabus } from "../../models/syllabus/syllabus.model";
export const fetchAllSyllabus = async (req: Request, res: Response) => {
  try {
        const syllabuses = await Syllabus.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      syllabuses,
    });
    }
    catch (error) {
        console.error("Error fetching syllabuses:", error);
        res.status(500).json({
        success: false,
        message: "Internal server error",
        });
    }
};