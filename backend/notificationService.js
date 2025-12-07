
const Notification = require('./model/notificationModel');
const UserDevice = require('./model/userDeviceModel');
const ReceiptService = require('../backend/ReceiptService');
const User = require('./model/User');
const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const serviceAccount = require('./givehope-ef489-firebase-adminsdk-fbsvc-7b015e1d5f.json');
const mongoose = require('mongoose');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

class NotificationService {

    // ========================
    // إنشاء إشعار
    // ========================
    static async createNotification(notificationData) {
        try {
            const notification = new Notification(notificationData);
            await notification.save();
            await this.sendToChannels(notification);
            return notification;
        } catch (error) {
            console.error('❌ Error creating notification:', error);
        }
    }

    // ========================
    // إرسال الإشعار لجميع القنوات
    // ========================
    static async sendToChannels(notification) {
        const { channels, user: userId, _id } = notification;
        const notificationId = _id.toString();

        if (!notification.deliveryStatus) notification.deliveryStatus = {};

        for (const channel of channels) {
            try {
                switch (channel) {
                    case 'push':
                        console.log(`🚀 إرسال push للمستخدم: ${userId}`);
                        const pushResult = await this.sendPushNotification(
                            userId,
                            notificationId,
                            notification.link,
                            notification.title,
                            notification.message
                        );
                        notification.deliveryStatus.push = pushResult?.success || false;
                        break;

                    case 'dashboard':
                        notification.deliveryStatus.dashboard = true;
                        break;

                    case 'email':
                        const emailResult = await this.sendEmailNotification(notification);
                        notification.deliveryStatus.email = emailResult || false;
                        break;
                }
            } catch (error) {
                console.error(`❌ Error in channel ${channel}:`, error);
                notification.deliveryStatus[channel] = false;
                notification.deliveryStatus[`${channel}Error`] = error.message;
            }
        }

        await notification.save();
    }

    // ========================
    // إرسال الإيميل
    // ========================
 static async sendEmailNotification(notification) {
  const { user, title, message, type, metadata } = notification;
  
  console.log('🔔 بدء إرسال الإشعار:', { 
    type, 
    user: user?.toString ? user.toString() : user 
  });

  // =================== تحديد البريد الإلكتروني ===================
  let targetEmail = null;
  let emailSource = 'unknown';

  // استراتيجية تحديد البريد حسب نوع الإشعار
  if (type === 'donation_thanks' || type === 'payment_received') {
    // إشعارات للمتبرع
    if (metadata?.donorInfo?.email && metadata.donorInfo.email !== 'مجهول') {
      targetEmail = metadata.donorInfo.email;
      emailSource = 'donorInfo.email';
    }
    else if (metadata?.userEmail && metadata.userEmail !== 'مجهول') {
      targetEmail = metadata.userEmail;
      emailSource = 'userEmail';
    }
  }
  else if (type === 'new_donation' || type === 'case_completed') {
    // إشعارات لصاحب الحالة
    if (metadata?.caseOwnerEmail) {
      targetEmail = metadata.caseOwnerEmail;
      emailSource = 'caseOwnerEmail';
    }
    else if (metadata?.caseData?.email) {
      targetEmail = metadata.caseData.email;
      emailSource = 'caseData.email';
    }
    else if (metadata?.userEmail) {
      targetEmail = metadata.userEmail;
      emailSource = 'userEmail';
    }
  }
  
  else {
    // أنواع أخرى
    if (metadata?.userEmail) {
      targetEmail = metadata.userEmail;
      emailSource = 'userEmail';
    }
  }

  // =================== الاحتياطي: البحث في User model ===================
  if (!targetEmail && user) {
    try {
      const userString = user.toString ? user.toString() : user;
      // تحقق إذا كان string يشبه ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(userString)) {
        const userDoc = await User.findById(userString);
        if (userDoc && userDoc.email) {
          targetEmail = userDoc.email;
          emailSource = 'User model';
        }
      }
    } catch (error) {
      console.error('خطأ في جلب User:', error);
    }
  }

  // =================== التحقق النهائي ===================
  console.log(`📧 البريد المستهدف (${emailSource}):`, targetEmail);

  if (!targetEmail || typeof targetEmail !== 'string') {
    console.error('❌ لا يوجد بريد إلكتروني');
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(targetEmail)) {
    console.error('❌ بريد إلكتروني غير صالح:', targetEmail);
    return false;
  }

  // =================== إرسال البريد ===================
  try {
    let emailResult = null;

    if (type === 'donation_thanks' || type === 'payment_received') {
      console.log(`📤 إرسال إيصال للمتبرع: ${targetEmail}`);
      emailResult = await ReceiptService.sendDonationReceipt({
        metadata,
        targetEmail,
        type
      });
    }
    else if (type === 'new_donation' || type === 'case_completed') {
      console.log(`📤 إرسال إشعار لصاحب الحالة: ${targetEmail}`);
      emailResult = await ReceiptService.sendCaseOwnerReceipt(metadata, targetEmail);
    }
    else {
      console.log(`📤 إرسال إشعار عام: ${targetEmail}`);
      emailResult = await ReceiptService.sendGeneralEmail(targetEmail, title, message);
    }

    return emailResult?.success || false;
    
  } catch (error) {
    console.error('💥 خطأ حرج في إرسال البريد:', error);
    return false;
  }
}

// الدالة المساعدة    
static getUserIdForNotification = (userId, userEmail) => {
  if (userId && userId !== '') {
    if (typeof userId === 'string' && userId.trim() !== '') {
      return userId;
    } else if (mongoose.Types.ObjectId.isValid(userId)) {
      return userId.toString();
    } else if (userId && typeof userId.toString === 'function') {
      return userId.toString();
    }
  }
  if (userEmail) {
    return `email_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
  return `temp_${Date.now()}`;
};


// 🔴 دالة مساعدة لتسجيل أخطاء البريد
static async logEmailError(error, context) {
    try {
        // يمكنك هنا حفظ الخطأ في قاعدة البيانات أو نظام التسجيل
        console.error('[EMAIL_ERROR_LOG]', {
            timestamp: new Date().toISOString(),
            error: error.message,
            context,
            stack: error.stack.substring(0, 200) // جزء من stack trace
        });
    } catch (logError) {
        console.error('فشل في تسجيل خطأ البريد:', logError);
    }
}

// دالة مساعدة للتحقق من الإشعارات
static async debugNotification(email) {
  try {
    const notifications = await Notification.find({
      'metadata.donorInfo.email': email
    }).sort({ createdAt: -1 }).limit(5);
    
    console.log('🔍 آخر 5 إشعارات للمتبرع:', email);
    notifications.forEach((notif, index) => {
      console.log(`\n[${index + 1}] ${notif.type} - ${notif.createdAt.toISOString()}`);
      console.log('Delivery Status:', notif.deliveryStatus);
      console.log('Metadata donor email:', notif.metadata?.donorInfo?.email);
      console.log('Channels:', notif.channels);
    });
    
    return notifications;
  } catch (error) {
    console.error('❌ خطأ في debugNotification:', error);
    return null;
  }
}
    // ========================
    // إرسال Push بدون أي فحص للتوكن
    // ========================
    static async sendPushNotification(userId, notificationId, link, title, message) {
        try {
            const devices = await UserDevice.find({ user: userId, isActive: true });
            if (!devices.length) return { success: false, error: 'No devices' };

            const tokens = devices
                .map(d => d.token)
                .filter(token => token && token.trim() !== '');

            if (!tokens.length) return { success: false, error: 'No tokens' };

            console.log(`📱 إرسال push إلى ${tokens.length} جهاز`);

            const response = await getMessaging().sendMulticast({
                tokens,
                notification: { title, body: message },
                data: { notificationId, link: link || '', type: 'notification' }
            });

            return {
                success: response.failureCount === 0,
                sentCount: response.successCount,
                failedCount: response.failureCount,
                response
            };

        } catch (error) {
            console.error('❌ Push error:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================
    // تسجيل جهاز بدون فحص
    // ========================
    static async registerDevice(userId, token, platform = 'web') {
        try {
            const device = await UserDevice.findOneAndUpdate(
                { token },
                { user: userId, platform, isActive: true },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return device;
        } catch (error) {
            console.error('❌ Error registering device:', error);
            return null;
        }
    }
}

module.exports = NotificationService;