const express = require('express');
const router = express.Router();
const Notification = require('../model/notificationModel');
const UserDevice = require('../model/userDeviceModel');
const NotificationService = require('../notificationService');
const { protect } = require('./middleware/authMiddleware'); 

router.post('/', protect, async (req, res) => {
  try {
    const notification = await NotificationService.createNotification(req.body);
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/register-device', protect, async (req, res) => {
  try {
    const { deviceToken, platform } = req.body;
    
    if (!deviceToken || deviceToken.trim() === '') {
      return res.status(400).json({ error: 'Invalid device token' });
    }
    const device = await UserDevice.findOneAndUpdate(
      { user: req.user.id, platform: platform || 'web' },
      {
        user: req.user.id,
        token: deviceToken,    
        platform: platform || 'web',
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Device token registered/updated for user ${req.user.id}`);
    
    res.status(201).json({ message: 'Device registered', deviceId: device._id });
  } catch (error) {
    console.error('❌ Error in /register-device:', error);
    res.status(500).json({ error: error.message });
  }
});




module.exports = router;
