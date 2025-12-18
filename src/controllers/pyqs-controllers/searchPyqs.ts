import { Request, Response } from "express";
import { Pyq } from "../../models/pyqs/pyq.model.js";

export const searchPyqs = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required",
      });
    }
    const regex = new RegExp(query, "i");
    const pyqs = await Pyq.find({
      $or: [
        { title: regex },
        { program: regex },
        { courseCode: regex },
        { courseName: regex },
      ],
    });
    res.status(200).json({
      pyqs,
    });
  } catch (error) {
    console.error("Error searching pyqs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
