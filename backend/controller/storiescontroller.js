

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

const Campaign = require('./backend/models/Campaign'); 
 const Zakat = require('./backend/models/zakat.js'); 
 const Sponsorship = require('./models/Sponsorship'); 
 const projects = require('../../../DB/models/project.model.js'); 

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

    // ================ التعديل: التحقق من جميع النماذج ================
    console.log('🔍 التحقق من أهلية المستخدم عبر جميع النماذج...');

    // 1. التحقق من التبرعات في نموذج Donation
    const hasDonated = await Donation.findOne({ 
      $or: [
        { author: userId },
        { authorId: userId },
        { 'donorInfo.email': req.user?.email }
      ]
    });

    // 2. التحقق من الحالات في allcases
    const hasBenefitedCase = await allcases.findOne({ 
      $or: [
        { author: userId },
        { email: req.user?.email }
      ],
      donated: { $gt: 0 },
      status: { $in: ['funded', 'completed'] }
    });

    // 3. التحقق من الحملات في Campaign
    const hasBenefitedCampaign = await Campaign.findOne({
      $or: [
        { creator: userId },
        { creatorId: userId },
        { email: req.user?.email }
      ],
      $or: [
        { collected_amount: { $gt: 0 } },
        { donated: { $gt: 0 } },
        { raised: { $gt: 0 } }
      ],
      $or: [
        { status: { $in: ['completed', 'funded', 'successful'] } },
        { is_active: false }
      ]
    });

    // 4. التحقق من الزكاة في Zakat
    const hasBenefitedZakat = await Zakat.findOne({
      $or: [
        { admin: userId },
        { adminId: userId },
        { email: req.user?.email }
      ],
      $or: [
        { collected_amount: { $gt: 0 } },
        { donated: { $gt: 0 } },
        { raised: { $gt: 0 } }
      ],
      $or: [
        { status: { $in: ['completed', 'funded', 'successful'] } },
        { is_active: false }
      ]
    });

    // 5. التحقق من الكفالات في Sponsorship
    const hasBenefitedSponsorship = await Sponsorship.findOne({
      $or: [
        { sponsor: userId },
        { sponsorId: userId },
        { email: req.user?.email }
      ],
      $or: [
        { collected_amount: { $gt: 0 } },
        { donated: { $gt: 0 } },
        { raised: { $gt: 0 } }
      ],
      $or: [
        { status: { $in: ['completed', 'funded', 'successful'] } },
        { is_active: false }
      ]
    });

    // 6. التحقق من المشاريع في projects
    const hasBenefitedProject = await projects.findOne({
      $or: [
        { manager: userId },
        { managerId: userId },
        { email: req.user?.email }
      ],
      $or: [
        { raised_amount: { $gt: 0 } },
        { collected: { $gt: 0 } },
        { donated: { $gt: 0 } }
      ],
      $or: [
        { status: { $in: ['completed', 'funded', 'successful'] } },
        { project_status: { $in: ['completed', 'finished'] } }
      ]
    });

    console.log('✅ نتائج التحقق من الأهلية:', {
      hasDonated: !!hasDonated,
      hasBenefitedCase: !!hasBenefitedCase,
      hasBenefitedCampaign: !!hasBenefitedCampaign,
      hasBenefitedZakat: !!hasBenefitedZakat,
      hasBenefitedSponsorship: !!hasBenefitedSponsorship,
      hasBenefitedProject: !!hasBenefitedProject,
      userId: userId,
      userEmail: req.user?.email
    });

    // التحقق من الأهلية (أي شرط يفي بالمتطلبات)
    const isEligible = hasDonated || 
                      hasBenefitedCase || 
                      hasBenefitedCampaign || 
                      hasBenefitedZakat || 
                      hasBenefitedSponsorship || 
                      hasBenefitedProject;

    if (!isEligible) {
      return res.status(403).json({
        success: false,
        message: "غير مسموح بكتابة القصص",
        requirements: [
          "يجب أن تكون متبرع سابق في المنصة في أي من الأقسام (حالات، حملات، زكاة، كفالات، مشاريع)",
          "أو صاحب حالة/حملة/مشروع مكتمل استفاد من التبرعات"
        ],
        userInfo: {
          userId: userId,
          email: req.user?.email,
          checkedModels: ['Donation', 'Cases', 'Campaigns', 'Zakat', 'Sponsorships', 'Projects']
        }
      });
    }

    // تحديد نوع و دور المستخدم للقصة
    let userRole = '';
    let relatedModels = [];

    if (hasDonated) {
      userRole = 'donor';
      relatedModels.push('donation');
    }

    // تحديد النماذج التي استفاد منها المستخدم
    if (hasBenefitedCase) {
      userRole = userRole ? 'donor_and_beneficiary' : 'beneficiary';
      relatedModels.push('case');
    }
    
    if (hasBenefitedCampaign) {
      userRole = userRole ? 'donor_and_beneficiary' : 'beneficiary';
      relatedModels.push('campaign');
    }
    
    if (hasBenefitedZakat) {
      userRole = userRole ? 'donor_and_beneficiary' : 'beneficiary';
      relatedModels.push('zakat');
    }
    
    if (hasBenefitedSponsorship) {
      userRole = userRole ? 'donor_and_beneficiary' : 'beneficiary';
      relatedModels.push('sponsorship');
    }
    
    if (hasBenefitedProject) {
      userRole = userRole ? 'donor_and_beneficiary' : 'beneficiary';
      relatedModels.push('project');
    }

    // حفظ معلومات النماذج المتعلقة
    const relatedData = {
      models: relatedModels,
      details: {}
    };

    // حفظ تفاصيل التبرعات إذا وجدت
    if (hasDonated) {
      relatedData.details.donation = {
        id: hasDonated._id,
        amount: hasDonated.amount,
        date: hasDonated.createdAt
      };
    }

    // حفظ تفاصيل الحالات/الحملات/المشاريع المستفادة
    if (hasBenefitedCase) {
      relatedData.details.case = {
        id: hasBenefitedCase._id,
        title: hasBenefitedCase.title,
        totalAmount: hasBenefitedCase.total,
        donatedAmount: hasBenefitedCase.donated
      };
    }

    if (hasBenefitedCampaign) {
      relatedData.details.campaign = {
        id: hasBenefitedCampaign._id,
        title: hasBenefitedCampaign.title || hasBenefitedCampaign.name,
        targetAmount: hasBenefitedCampaign.target_amount || hasBenefitedCampaign.total,
        collectedAmount: hasBenefitedCampaign.collected_amount || hasBenefitedCampaign.donated
      };
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
      userRole: userRole,
      relatedModels: relatedData,
      userEmail: req.user?.email || null,
      eligibilityProof: {
        hasDonated: !!hasDonated,
        hasBenefited: {
          case: !!hasBenefitedCase,
          campaign: !!hasBenefitedCampaign,
          zakat: !!hasBenefitedZakat,
          sponsorship: !!hasBenefitedSponsorship,
          project: !!hasBenefitedProject
        }
      }
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
      console.warn('⚠️ authorName is undefined! Using fallback');
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

    // إضافة القصة للنماذج المستفادة (اختياري)
    if (hasBenefitedCase) {
      await allcases.findByIdAndUpdate(
        hasBenefitedCase._id,
        { $push: { stories: savedStory._id } }
      );
    }

    if (hasBenefitedCampaign) {
      await Campaign.findByIdAndUpdate(
        hasBenefitedCampaign._id,
        { $push: { stories: savedStory._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: "تم إنشاء القصة بنجاح، جاري مراجعتها",
      data: {
        ...savedStory.toObject(),
        eligibility: {
          isEligible: true,
          role: userRole,
          relatedModels: relatedModels,
          hasDonated: !!hasDonated,
          hasBenefitedFrom: relatedModels.filter(m => m !== 'donation')
        }
      }
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
    const userId = req.user.id || req.user._id;
    
    // البحث عن القصص الخاصة بالمستخدم
    const stories = await Story.find({ author: userId })
      .sort({ createdAt: -1 })
      .select('title category type content donations currency status createdAt');
    
    // البحث عن جميع النشاطات للمستخدم
    const [userDonations, userCases, userCampaigns, userZakat, userSponsorships, userProjects] = await Promise.all([
      // التبرعات
      Donation.find({ 
        $or: [
          { author: userId },
          { authorId: userId },
          { 'donorInfo.email': req.user?.email }
        ]
      }).select('amount currency createdAt'),
      
      // الحالات
      allcases.find({ 
        $or: [
          { author: userId },
          { email: req.user?.email }
        ]
      }).select('title total donated status'),
      
      // الحملات
      Campaign.find({
        $or: [
          { creator: userId },
          { creatorId: userId },
          { email: req.user?.email }
        ]
      }).select('title target_amount collected_amount status'),
      
      // الزكاة
      Zakat.find({
        $or: [
          { admin: userId },
          { adminId: userId },
          { email: req.user?.email }
        ]
      }).select('title target_amount collected_amount status'),
      
      // الكفالات
      Sponsorship.find({
        $or: [
          { sponsor: userId },
          { sponsorId: userId },
          { email: req.user?.email }
        ]
      }).select('title target_amount collected_amount status'),
      
      // المشاريع
      projects.find({
        $or: [
          { manager: userId },
          { managerId: userId },
          { email: req.user?.email }
        ]
      }).select('title budget raised_amount status')
    ]);

    res.status(200).json({
      success: true,
      data: {
        stories: stories,
        userActivity: {
          donations: userDonations,
          cases: userCases,
          campaigns: userCampaigns,
          zakat: userZakat,
          sponsorships: userSponsorships,
          projects: userProjects
        },
        eligibility: {
          canCreateStory: userDonations.length > 0 || 
                         userCases.some(c => c.donated > 0) ||
                         userCampaigns.some(c => c.collected_amount > 0) ||
                         userZakat.some(z => z.collected_amount > 0) ||
                         userSponsorships.some(s => s.collected_amount > 0) ||
                         userProjects.some(p => p.raised_amount > 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب قصص المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error.message
    });
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






