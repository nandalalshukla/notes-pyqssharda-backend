//change password controller
import { User } from "../../models/users/user.model";
import { Request, Response } from "express";
import { hashPassword } from "../../utils/hashPassword";
import { verifyOtp } from "../../utils/Otp";

export const createNewPassword = async (req: Request, res: Response) => {
    const {token, otp, newPassword, confirmNewPassword} = req.body;
    if (!token || !otp || !newPassword|| !confirmNewPassword) {
        return res.status(400).json({   
            success: false,
            message: "Token, OTP and new password are required",
        });
    }
    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({
            success: false,
            message: "New password and confirm new password do not match",
        });
    }
    try {
        const user = await User.findById(token);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const hashedOtp = user.emailOtpHash;
        if (!hashedOtp) {
            return res.status(400).json({
                success: false,
                message: "No OTP found for this user, please request a new one",
            });
        }
        const isOtpValid = await verifyOtp(otp, hashedOtp);
        if (!isOtpValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }
        const hashedNewPassword = await hashPassword(newPassword);
        user.password = hashedNewPassword;
        user.emailOtpHash = undefined;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    }
    catch (error) {
        console.error("Error in change password:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export default createNewPassword;  