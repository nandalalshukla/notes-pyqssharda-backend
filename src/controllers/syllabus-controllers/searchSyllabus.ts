import {Request, Response} from "express";
import { Syllabus } from "../../models/syllabus/syllabus.model.js";

export const searchSyllabus = async (req: Request, res: Response) => {
  try {
        const { query } = req.query;    
        if (!query || typeof query !== "string") {
            return res.status(400).json({
                success: false,
                message: "Query parameter is required"
            });
        }
        const regex = new RegExp(query, "i");
        const syllabuses = await Syllabus.find({
            $or: [
                { title: regex },
                { program: regex },
                { courseCode: regex },
                { courseName: regex },
            ],
        });
        res.status(200).json({
            syllabuses,
        });
    }
    catch (error) {
        console.error("Error searching syllabuses:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};