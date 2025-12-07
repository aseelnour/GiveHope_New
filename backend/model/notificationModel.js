const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
  type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  title: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  
  type: {
    type: String,
    enum: [
      'story_approved',      // موافقة قصة            //done
      'story_rejected',      // رفض قصة             //done
 
      'case_approved',       // موافقة حالة       //done
      'case_rejected',       // رفض حالة             //done
      'case_deleted',       // رفض حالة         //done
      'case_completed' ,                       //done

      'payment_received',    // استلام دفعة   //done
      'new_donation',        // تبرع جديد  //done
       'donation_thanks',                  //done
      'system_alert'
    ],
    required: true
  },
  
  channels: [{
    type: String,
    enum: ['dashboard', 'push', 'email'],
    default: ['dashboard']
  }],
  
  deliveryStatus: {
    dashboard: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    email: { type: Boolean, default: false }
  },
  
  referenceId: mongoose.Schema.Types.ObjectId, 
  metadata: Object,
  
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});


module.exports = mongoose.model("notification", notificationSchema);
