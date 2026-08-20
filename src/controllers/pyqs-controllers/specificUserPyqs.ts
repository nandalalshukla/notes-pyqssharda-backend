import { Request, Response } from "express";
import { Pyq } from "../../models/pyqs/pyq.model.js";

export const fetchSpecificUserPyqs = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const pyqs = await Pyq.find({ userId }).sort({ createdAt: -1 });
    console.log("specific user pyqs", pyqs);
    res.status(200).json({
      success: true,
      pyqs,
    });
  } catch (error) {
    throw error;
  }
};
