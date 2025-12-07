const mongoose = require('mongoose');

const userDeviceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['web', 'android', 'ios'],
    default: 'web'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index لمنع تكرار التوكن لنفس المستخدم
userDeviceSchema.index({ user: 1, token: 1 }, { unique: true });

module.exports = mongoose.model('UserDevice', userDeviceSchema);