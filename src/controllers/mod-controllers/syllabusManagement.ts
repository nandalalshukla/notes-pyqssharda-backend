import { Request, Response } from "express";
import { Syllabus } from "../../models/syllabus/syllabus.model.js";
import { contentApprovalMail } from "../../utils/email.js";
import { contentRejectionMail } from "../../utils/email.js";
import { User } from "../../models/users/user.model.js";
//fetch pending syllabus
export const fetchPendingSyllabus = async (req: Request, res: Response) => {
  try {
    const syllabus = await Syllabus.find({ status: "pending" })
      .populate("userId", "name email username")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, syllabus });
  } catch (error) {
    throw error;
  }
};

//reject a syllabus pending approval
export const rejectSyllabus = async (req: Request, res: Response) => {
  const { syllabusId } = req.params;
  const { rejectionReason } = req.body;

  try {
    if (!rejectionReason || rejectionReason.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
    }

    const syllabus = await Syllabus.findOne({
      status: "pending",
      _id: syllabusId,
    });

    if (!syllabus) {
      return res
        .status(404)
        .json({ success: false, message: "Syllabus not found" });
    }

    const user = await User.findById(syllabus.userId.toString());
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Use findByIdAndUpdate to avoid validation errors on unchanged fields
    await Syllabus.findByIdAndUpdate(syllabusId, {
      status: "rejected",
      rejectionReason: rejectionReason,
      rejectedAt: new Date(),
      rejectedBy: req.user!.userId,
    });

    // Send email asynchronously (non-blocking) - don't await
    contentRejectionMail(user.email, user.name, "syllabus", rejectionReason)
      .then((result) => {
        if (!result.success)
          console.error("Failed to send rejection email:", result.error);
      })
      .catch((err) => {
        console.error("Failed to execute send rejection email task:", err);
      });

    return res
      .status(200)
      .json({ success: true, message: "Syllabus rejected successfully" });
  } catch (error) {
    throw error;
  }
};

export const approveSyllabus = async (req: Request, res: Response) => {
  const { syllabusId } = req.params;
  try {
    const syllabus = await Syllabus.findOne({
      status: "pending",
      _id: syllabusId,
    });
    if (!syllabus) {
      return res
        .status(404)
        .json({ success: false, message: "Syllabus not found" });
    }

    const user = await User.findById(syllabus.userId.toString());
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Use findByIdAndUpdate to avoid validation errors on unchanged fields
    await Syllabus.findByIdAndUpdate(syllabusId, {
      status: "approved",
      approvedAt: new Date(),
      approvedBy: req.user!.userId,
    });

    // Send email asynchronously (non-blocking) - don't await
    contentApprovalMail(user.email, user.name, "syllabus")
      .then((result) => {
        if (!result.success)
          console.error("Failed to send approval mail:", result.error);
      })
      .catch((err) => {
        console.error("Failed to send approval mail task:", err);
      });

    return res
      .status(200)
      .json({ success: true, message: "Syllabus approved successfully" });
  } catch (error) {
    throw error;
  }
};
