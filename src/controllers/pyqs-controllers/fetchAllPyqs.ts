import { Request, Response } from "express";
import { Pyq } from "../../models/pyqs/pyq.model.js";

export const fetchAllPyqs = async (req: Request, res: Response) => {
  try {
    const pyqs = await Pyq.find().sort({ createdAt: -1 });
    console.log("all pyqs", pyqs);
    res.status(200).json({
      success: true,
      pyqs,
    });
  } catch (error) {
    console.error("Error fetching pyqs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
