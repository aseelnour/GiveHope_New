
const Notification = require('../model/notificationModel'); 
const User = require('../model/User'); 
const mongoose = require('mongoose');
const UserDevice = require('../model/userDeviceModel');

exports.getNotifications = async (req, res) => {
    try {
        let userId;
        if (mongoose.Types.ObjectId.isValid(req.user.id)) {
            userId = new mongoose.Types.ObjectId(req.user.id);
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID format' 
            });
        }

        const notifications = await Notification.find({ 
            user: userId, 
            'deliveryStatus.dashboard': true
        }).sort({ createdAt: -1 });
        
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('❌ Error in getNotifications:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

 