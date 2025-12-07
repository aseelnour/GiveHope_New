

const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt= require("jsonwebtoken");

const Story =require("../model/storiesmodel.js");
const { validationResult } = require("express-validator");
const NotificationService =require("../notificationService.js");

const CC = require('currency-converter-lt');
const axios = require('axios');

/*=======================================================================================================*/

function calculateReadingTime(content) {
    try {
        let textContent = '';
        
        if (typeof content === 'string') {
            if (content.includes('<p>') || content.includes('<')) {
                const textOnly = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                textContent = textOnly;
            } else {
                textContent = content;
            }
        } else if (typeof content === 'object' && content.value) {
            textContent = content.value;
        }
        
        const words = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
        
        const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
        
        return `${readingTimeMinutes} دقائق قراءة`;
    } catch (error) {
        console.error('خطأ في حساب وقت القراءة:', error);
        return '1 دقائق قراءة';
    }
}

function getCategoryImage(category) {
    const categoryImages = {
        'صحية': 'images/dr.jpg',
        'تعليمية': 'images/university.jpg',
        'معيشية': 'images/live.PNG',
        'رعاية أيتام': 'images/ايتام.jpg',
        'طوارئ': 'images/student.jpg',
        'مشاريع': 'images/d2b45620-ede8-46e7-8fb0-6220891f8828.jpg',
        'كفالات': 'images/guara.jpg',
        'حملات': 'images/iStock-2209016591-scaled.jpg'
    };
    
    return categoryImages[category] || 'images/default-story.jpg';
}


/*=======================================================================================================*/
exports.getstories = async (req, res) => {
    console.log("i am inside the get");
    try {
          console.log("i am inside the try");
        const stories = await Story.find({ status: 'approved' });  // جلب القصص المعتمدة فقط
        if(stories.length == 0 ){
            return res.status(404).json({ message: "لا توجد قصص حالياً." }); 
        }
        res.json(stories);  

    } catch (error) {
        console.log("i am inside the catch");
        res.status(500).json({ message: error.message });
    }
};

/*=======================================================================================================*/
const allcases = require("../model/ShowAllCasessmodel.js");
const Donation = require("../model/Donationmodel");

exports.createStory = async (req, res) => {
  try {
    console.log('🔍 بيانات الطلب الكاملة:', req.body);
    console.log('👤 بيانات المستخدم:', req.user);

    const { title, category, type, content, donations, currency, authorName } = req.body;
    const userId = req.user.id || req.user._id;
    
    let userName = '';
    
    if (authorName) {
      userName = authorName;
    } else if (req.user) {
   
      userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
    }
    
  
    if (!userName || userName.trim() === '') {
      userName = req.user?.email || 'مجهول';
    }
    
    console.log('📝 الاسم المستخدم للقصة:', userName);

    if (!title || !category || !type || !content) {
      return res.status(400).json({
        success: false,
        message: "العنوان، التصنيف، النوع والمحتوى مطلوبة"
      });
    }

    const allowedTypes = ['متبرع', 'مستفيد'];
    const allowedCategories = ['تعليمية', 'صحية', 'معيشية', 'طوارئ','مشاريع','كفالات','حملات', 'رعاية أيتام'];
    
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ 
        success: false,
        message: 'نوع القصة غير صالح', 
        allowedTypes: allowedTypes,
        received: type 
      });
    }
    
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ 
        success: false,
        message: 'تصنيف القصة غير صالح', 
        allowedCategories: allowedCategories,
        received: category 
      });
    }

    // التحقق من المحتوى
    let contentText = '';
    let rawContent = '';

    if (typeof content === 'string') {
      contentText = content;
      rawContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      return res.status(400).json({
        success: false,
        message: "تنسيق المحتوى غير صحيح"
      });
    }

    // تحقق من طول المحتوى
    if (!rawContent || rawContent.length < 10) {
      return res.status(400).json({
        success: false,
        message: "محتوى القصة قصير جداً (أقل من 10 أحرف)"
      });
    }

    // التحقق إذا المستخدم مؤهل
    const [hasDonated, hasBenefitedCase] = await Promise.all([
      Donation.findOne({ author: userId }),
      allcases.findOne({ 
        author: userId,
        donated: { $gt: 0 },
        status: { $in: ['funded'] }
      })
    ]);

    console.log('✅ نتيجة التحقق:', {
      hasDonated: !!hasDonated,
      hasBenefitedCase: !!hasBenefitedCase,
      userId: userId
    });

    // التحقق من الأهلية
    if (!hasDonated && !hasBenefitedCase) {
      return res.status(403).json({
        success: false,
        message: "غير مسموح بكتابة القصص",
        requirements: [
          "يجب أن تكون متبرع سابق في المنصة",
          "أو صاحب حالة مكتملة استفادت من التبرعات"
        ]
      });
    }

    // تحديد نوع المستخدم للقصة
    let userRole = '';
    if (hasDonated && hasBenefitedCase) {
      userRole = 'donor_and_beneficiary';
    } else if (hasDonated) {
      userRole = 'donor';
    } else {
      userRole = 'beneficiary';
    }

    // إعداد بيانات القصة
    const storyData = {
      title: title,
      category: category,
      type: type,
      content: contentText,
      donations: donations || 0,
      currency: currency || 'ILS',
      author: userId,
      authorName: userName,
      userRole: userRole
    };

    console.log('📤 بيانات القصة للإرسال:', storyData);
console.log('🔍 فحص نهائي للبيانات:', {
  storyData: storyData,
  fieldsCheck: {
    title: !!storyData.title,
    category: !!storyData.category,
    type: !!storyData.type,
    content: !!storyData.content,
    author: !!storyData.author,
    authorName: !!storyData.authorName,
    authorNameValue: storyData.authorName,
    authorNameType: typeof storyData.authorName
  }
});

if (!storyData.authorName || storyData.authorName === undefined) {
  console.error('❌ authorName is undefined! Using fallback');
  storyData.authorName = 'مجهول';
}

// تحقق من أن جميع الحقول المطلوبة موجودة
const requiredFields = ['title', 'category', 'type', 'content', 'author', 'authorName'];
for (const field of requiredFields) {
  if (!storyData[field]) {
    console.error(`❌ حقل ${field} مفقود:`, storyData[field]);
  }
}
    // إنشاء القصة
    const newStory = new Story(storyData);
    const savedStory = await newStory.save();
    
    console.log('✅ تم إنشاء القصة بنجاح:', savedStory._id);

    res.status(201).json({
      success: true,
      message: "تم إنشاء القصة بنجاح، جاري مراجعتها",
      data: savedStory
    });

  } catch (error) {
    console.error('❌ خطأ في إنشاء القصة:', error);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      
      console.error('🔍 تفاصيل أخطاء التحقق:', errors);
      
      return res.status(400).json({ 
        success: false,
        message: 'خطأ في التحقق من البيانات',
        errors: errors
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message
    });
  }
};

/*======================================================================================================*/

exports.approveStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);

        if (!story) return res.status(404).json({ message: 'القصة غير موجودة' });

        story.status = 'approved';  
        await story.save();


    await NotificationService.createNotification({
      user: story.author,
      title: 'تمت الموافقة على قصتك',
      message: `مبروك! تمت الموافقة على قصتك "${story.title}"`,
      type: 'story_approved',
      channels: ['dashboard', 'push'], // داشبورد + push
      referenceId: story._id,
      link: `/stories/${story._id}`,
      metadata: {
        storyTitle: story.title,
        category: story.category,
        authorId: story.author, 
    }
    });


        res.json(story);  


    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}; 

/*=======================================================================================================*/
exports.deleteAdminStory = async (req, res) => {
    try {
        const story = await Story.findByIdAndDelete(req.params.id);
        
        if (!story) {
            return res.status(404).json({ message: 'القصة غير موجودة' });
        }
        await NotificationService.createNotification({
            user: story.author,
            title: '❌ تم حذف قصتك من قِبل المشرف!',
            message: `نعتذر، تم حذف قصتك "${story.title}" لمخالفتها شروط النشر.`,
            type: 'story_rejected',
            channels: ['dashboard', 'push'],
            referenceId: story._id,
            link: '/stories', 
            metadata: {
                storyTitle: story.title,
                deletionReason: 'مخالفة شروط النشر (تعديل حسب الحاجة)',
            }
        });
        res.json({ message: 'تم حذف القصة بنجاح', story });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*=======================================================================================================*/

// للمستخدم العادي - يحذف فقط قصصه pending
exports.deleteUserStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        
        if (!story) {
            return res.status(404).json({ message: 'القصة غير موجودة' });
        }

         if (story.author !== req.user.id) {
            return res.status(403).json({ message: 'ليس لديك صلاحية لحذف هذه القصة' });
        }

        if (story.status !== 'pending') {
            return res.status(400).json({ message: 'يمكن حذف القصص pending فقط' });
        }

        await Story.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم حذف القصة بنجاح' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*=======================================================================================================*/
exports.getUserStories = async (req, res) => {
    try {
        const stories = await Story.find({ user: req.user.id });
      console.log( req.user.id);
        if (stories.length === 0) {
            return res.status(404).json({ message: 'ما في قصص لعرضها' });
        }

        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/*=======================================================================================================*/
exports.getPendingStories = async (req, res) => {

    try {

        const stories = await Story.find({ status: 'pending' }); 

        if (stories.length === 0) {
            return res.status(404).json({ message: 'ما في قصص قيد المراجعة حالياً' });
        }

        res.json(stories);
    } catch (error) {
        
        res.status(500).json({ message: error.message });
    }
};

/*=======================================================================================================*/
exports.getStoryById = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story || story.status !== 'approved') {
      return res.status(404).json({ message: 'القصة غير موجودة أو لم تتم الموافقة عليها.' });
    }

    
    story.views = story.views ? story.views + 1 : 1;

    await story.save();
    res.json(story);

  } catch (error) {
    console.error("Error fetching story:", error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'تنسيق رقم القصة (ID) غير صحيح.' });
    }
    res.status(500).json({ message: error.message });
  }
};



/*=======================================================================================================*/

const getExchangeRates = async () => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/ILS');
    const rates = response.data.rates;
    return {
      ILS: 1, 
      USD: rates.USD || 3.75, 
      JOD: rates.JOD || 5.3,
      AED: rates.AED || 1.02,
    };
  } catch (error) { 
    console.error('فشل في جلب أسعار الصرف:', error);
    return {
      ILS: 1,
      USD: 3.75,
      JOD: 5.3,
      AED: 1.02,
    };
  }
};

exports.getStats = async (req, res) => {
    try {
        const exchangeRates = await getExchangeRates();
        
        const totalStories = await Story.countDocuments({ status: 'approved' });

        const totalViewsResult = await Story.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$views' } } }
        ]);
        const totalViews = totalViewsResult[0]?.total || 0;

        const donationsResult = await Story.aggregate([
            { $match: { status: 'approved' } },
            { $group: { 
                _id: '$currency', 
                total: { $sum: '$donations' } 
            }}
        ]);

        const totalDonationsResult = await Story.aggregate([
            { $match: { status: 'approved' } },
            { $addFields: {
                exchangeRate: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$currency', 'USD'] }, then: exchangeRates.USD },
                            { case: { $eq: ['$currency', 'JOD'] }, then: exchangeRates.JOD },
                            { case: { $eq: ['$currency', 'AED'] }, then: exchangeRates.AED },
                            { case: { $eq: ['$currency', 'ILS'] }, then: exchangeRates.ILS }
                        ],
                        default: 0
                    }
                }
            }},
            // حساب المبلغ المحول إلى ILS
            { $addFields: {
                donationsInILS: { $round: [{ $multiply: ['$donations', '$exchangeRate'] }, 2] }
            }},
            { $group: { 
                _id: null, 
                total: { $sum: '$donationsInILS' } 
            }}
        ]);

        const totalDonations = totalDonationsResult[0]?.total || 0;
        console.log("totalDonations in ILS:" + totalDonations);

        res.json({
            totalStories,
            totalViews,
            totalDonations, 
            donationsByCurrency: donationsResult, 
            exchangeRatesUsed: exchangeRates 
        });
        
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ message: error.message });
    }
};
