import { Request, Response } from "express";
import { Pyq } from "../../models/pyqs/pyq.model";
import { success } from "zod";

export const uploadPyqs = async (req: Request, res: Response) => {
  try {
    const { title, fileUrl, program, courseCode, courseName, semester } =
      req.body;
    const userId = req.user!.id;
    if (
      !title ||
      !fileUrl ||
      !program ||
      !courseCode ||
      !courseName ||
      !semester
    ) {
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
    const newPyq = new Pyq({
      title,
      fileUrl,
      userId,
      program,
      courseCode,
      courseName,
      semester,
    });
    await newPyq.save();
    res.status(201).json({
      success: true,
      message: "Pyq uploaded successfully",
      pyq: newPyq,
    });
  } catch (error) {
    console.error("Error uploading pyq:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
