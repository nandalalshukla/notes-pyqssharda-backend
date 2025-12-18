import { Request, Response } from "express";
import { Syllabus } from "../../models/syllabus/syllabus.model";

export const uploadSyllabus = async (req: Request, res: Response) => {
  try {
        const { title, fileUrl, program, courseCode, courseName, semester } =
            req.body;
        const userId = req.user!.id;
        if (!title || !fileUrl || !program || !courseCode || !courseName || !semester) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }   
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }
        const newSyllabus = new Syllabus({
            title,
            fileUrl,
            userId,
            program,
            courseCode,
            courseName,
            semester,
        });
        await newSyllabus.save();
        res.status(201).json({
            success: true,
            message: "Syllabus uploaded successfully", syllabus: newSyllabus
        });
    } catch (error) {
        console.error("Error uploading syllabus:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
