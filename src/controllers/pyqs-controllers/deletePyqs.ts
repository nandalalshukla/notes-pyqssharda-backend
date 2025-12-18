import { Request, Response } from "express";
import { Pyq } from "../../models/pyqs/pyq.model.js";
import { success } from "zod";

export const editPyqs = async (req: Request, res: Response) => {
    try {
        const pyqId = req.params.id;
        const userId = req.user!.id;
        const { title, fileUrl, program, courseCode, courseName, semester } = req.body;
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
        const pyq = await Pyq.findById(pyqId);
        if (!pyq) {
            return res.status(404).json({
                success: false,
                message: "Pyq not found"
            });
        }
        if (pyq.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You can only edit your own pyqs"
            });
        }
        pyq.title = title;
        pyq.fileUrl = fileUrl;
        pyq.program = program;
        pyq.courseCode = courseCode;
        pyq.courseName = courseName;
        pyq.semester = semester;
        await pyq.save();
        res.status(200).json({
            success: true,
            message: "Pyq updated successfully", pyq
        });
    }
    catch (error) {
        console.error("Error editing pyq:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};