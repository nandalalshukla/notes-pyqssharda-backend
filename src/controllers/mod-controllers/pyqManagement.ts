import { Request, Response } from "express";
import { Pyq } from "../../models/pyqs/pyq.model";
import { User } from "../../models/users/user.model";
import { contentRejectionMail, contentApprovalMail } from "../../utils/email";

//fetch pending pyqs for moderator review
export const fetchPendingPyqs = async (req: Request, res: Response) => {
  try {
    const pyqs = await Pyq.find({ status: "pending" })
      .populate("userId", "name email username")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, pyqs });
  } catch (error) {
    console.error("Error fetching pending pyqs:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch pending pyqs" });
  }
};

//reject a pyq pending approval
export const rejectPyq = async (req: Request, res: Response) => {
  const { pyqId } = req.params;
  const { rejectionReason } = req.body;
  try {
    const pyq = await Pyq.findOne({ status: "pending", _id: pyqId });
    if (!pyq) {
      return res.status(404).json({ success: false, message: "Pyq not found" });
    }
    if (!rejectionReason) {
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
    }
    const user = await User.findById(pyq.userId.toString());
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await contentRejectionMail(
      user.email,
      user.name,
      "pyq",
      rejectionReason || "No reason provided"
    );
    pyq.status = "rejected";
    pyq.rejectionReason = rejectionReason;
    pyq.rejectedAt = new Date();
    await pyq.save();
    return res
      .status(200)
      .json({ success: true, message: "Pyq rejected successfully" });
  } catch (error) {
    console.error("Error in rejecting pyq:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const approvePyq = async (req: Request, res: Response) => {
  const { pyqId } = req.params;
  try {
    const pyq = await Pyq.findById(pyqId);
    if (!pyq) {
      return res.status(404).json({ success: false, message: "Pyq not found" });
    }
    pyq.status = "approved";
    pyq.approvedAt = new Date();
    await pyq.save();
    const user = await User.findById(pyq.userId.toString());
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    await contentApprovalMail(user.email, user.name, "pyq");

    return res
      .status(200)
      .json({ success: true, message: "Pyq approved successfully" });
  } catch (error) {
    console.error("Error in approving pyq:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
