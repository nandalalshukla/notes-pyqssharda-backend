import {Request, Response} from 'express';
import { User } from '../../models/users/user.model.js';

export const deactivateAccount = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userId = req.user.userId;
    
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }   
        user.isActive = false;
        await user.save();
        return res.status(200).json({ success: true, message: 'User account deactivated successfully' });
    } catch (error) {
        console.error('Error in deactivate user:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};