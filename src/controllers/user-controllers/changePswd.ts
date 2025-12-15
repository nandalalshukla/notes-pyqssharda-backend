//change password controller
import { User } from "../../models/users/user.model";
import { Request, Response } from "express";
import { hashPassword, comparePassword } from "../../utils/hashPassword";

export const changePassword = async (req: Request, res: Response) => {
    const{email, currentPassword, newPassword, confirmNewPassword} = req.body;
    if (!email || !currentPassword || !newPassword|| !confirmNewPassword) {
        return res.status(400).json({   
            success: false,
            message: "Email, current password and new password are required",
        });
    }
    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({
            success: false,
            message: "New password and confirm new password do not match",
        });
    }   
    try {
        const user = await User.findOne({email});
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const isMatch = await comparePassword(currentPassword, user.password!);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect",
            });
        }
        const hashedNewPassword = await hashPassword(newPassword);
        user.password = hashedNewPassword;
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

export default changePassword;

