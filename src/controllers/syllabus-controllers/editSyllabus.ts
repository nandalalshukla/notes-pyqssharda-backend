import { Request, Response } from "express";
import { Syllabus } from "../../models/syllabus/syllabus.model";

export const editSyllabus = async (req: Request, res: Response) => {
  try {
    const syllabusId = req.params.id;
    const { title, fileUrl, program, courseCode, courseName, semester } =
      req.body;
    const userId = req.user!.userId;
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
        message: "All fields are required",
      });
    }
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const syllabus = await Syllabus.findById(syllabusId);
    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: "Syllabus not found",
      });
    }
    syllabus.title = title;
    syllabus.fileUrl = fileUrl;
    syllabus.program = program;
    syllabus.courseCode = courseCode;
    syllabus.courseName = courseName;
    syllabus.semester = semester;
    await syllabus.save();
    res.status(200).json({
      success: true,
      message: "Syllabus updated successfully",
      syllabus,
    });
  } catch (error) {
    console.error("Error editing syllabus:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
