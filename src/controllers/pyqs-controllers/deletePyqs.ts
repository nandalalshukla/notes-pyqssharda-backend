import { Request, Response } from "express";
import { Pyq } from "../../models/pyqs/pyq.model.js";

export const deletePyqs = async (req: Request, res: Response) => {
  try {
    const pyqId = req.params.id;
    const userId = req.user!.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const pyq = await Pyq.findById(pyqId);
    if (!pyq) {
      return res.status(404).json({
        success: false,
        message: "Pyq not found",
      });
    }
    await pyq.deleteOne();
    res.status(200).json({
      success: true,
      message: "Pyq deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting pyq:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
