
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const mongoose = require('mongoose');
const allcases = require("../model/ShowAllCasessmodel.js");
const { validationResult } = require("express-validator");

const NotificationService = require("../notificationService.js");

const Donation = require('../model/Donationmodel.js');
/*=======================================================================================================*/

const axios = require('axios');
const convertToILS = async (amount, fromCurrency) => {
  if (fromCurrency === 'ILS') return amount;
  const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
  const rate = response.data.rates.ILS;
  return amount * rate;
};
/*=======================================================================================================*/

function gettypeImage(type) {
  const typeImages = {
    'health': 'images/operation.png',
    'education': 'images/student.jpg',
    'living': 'images/homes.jpg',
    'orphans': 'images/fatherAndSon.jpg',
    'Emergency': 'images/تنزيل.jpg',

  };

  return typeImages[type] || 'images/live.PNG';
}
/*=======================================================================================================*/

exports.getAllCases = async (req, res) => {
    try {

        const allCases = await allcases.find()
           
            .where('status').equals('approved') 
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: allCases.length, data: allCases });

    } catch (error) {
        console.error("❌ Error fetching all cases:", error);
        res.status(500).json({ message: 'Error fetching all cases', error });
    }
};
/*=======================================================================================================*/

exports.createCase = async (req, res) => {
  //.ممنوع يقدم كمان طلب وهو لسا عنده طلب تاني ما انتهى  

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, type, total, description, deadline ,email} = req.body;
  const otherDescription = "تم معاينه جميع الاوراق الرسميه والتاكد من صحه الحاله";

  if (!title || !type || !total || !deadline || !description || !email) {
    return res.status(400).json({ message: "جميع الحقول مطلوبة" });
  }

  const validTypes = ['health', 'education', 'living', 'orphans', 'Emergency'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: "نوع الحالة غير صالح" });
  }

  let deadlineDate;
  try {
    const [year, month, day] = deadline.split('-').map(Number);

    deadlineDate = new Date(year, month - 1, day);

    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ message: "التاريخ غير صالح" });
    }

    deadlineDate = new Date(Date.UTC(year, month - 1, day));

  } catch (err) {
    return res.status(400).json({ message: "التاريخ غير صالح" });
  }

  const userId = req.user.id || req.user._id;
const userName = `${req.user.firstName} ${req.user.lastName}`;
  const image = gettypeImage(type);
  const currency = 'ILS';

  try {

    //  التحقق من وجود حالات سابقة غير مكتملة
    const existingCase = await allcases.findOne({
      author: userId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingCase) {
      return res.status(400).json({
        message: "لا يمكنك إضافة حالة جديدة قبل انتهاء حالتك الحالية (إما انتظار أو قيد الموافقة)."
      });
    }


    const newCase = new allcases({
      title,
      type,
      image,
      total,
      email,
      currency,
      deadline: deadlineDate,
      description,
      otherDescription,
      author: userId,
      authorName: userName
    });

    await newCase.save();
    res.status(201).json({ message: 'تم إرسال طلب الحالة بنجاح، في انتظار موافقة الأدمن' });

  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

/*=======================================================================================================*/

exports.getCaseById = async (req, res) => {
  try {
    const c = await allcases.findById(req.params.id);
    if (!c) {
      return res.status(404).json({ message: 'الحالة غير موجودة' });
    }
    res.json(c);
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الحالة', error });
  }
};

/*=======================================================================================================*/

// موافقة على الحالة (أدمن فقط)
exports.approveCase = async (req, res) => {
  const { id } = req.params;
  try {
    const caseItem = await allcases.findById(id);
    if (!caseItem) return res.status(404).json({ message: 'الحالة غير موجودة' });
    caseItem.status = 'approved';

    caseItem.publishDate = new Date();

    await caseItem.save();

    await NotificationService.createNotification({
      user: caseItem.author,
      title: 'تمت الموافقة على حالتك',
      message: `مبروك! تمت الموافقة على حالتك "${caseItem.title}"`,
      type: 'case_approved',
      channels: ['dashboard', 'push', 'email' ], // داشبورد + push
      referenceId: caseItem._id, 
      link: `/casedetails/${caseItem._id}`,
      metadata: {
       caseId: caseItem._id,
        caseItemTitle: caseItem.title,
        category: caseItem.category,
        authorId: caseItem.author,
        publishDate: caseItem.publishDate,
      }
    });
    res.json({ message: 'تم الموافقة على الحالة', publishDate: caseItem.publishDate });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الموافقة', error });
  }
};

/*=======================================================================================================*/

// حذف حالة (أدمن فقط)
exports.deleteCase = async (req, res) => {
  const { id } = req.params;
  try {
    await allcases.findByIdAndDelete(id);


    await NotificationService.createNotification({
      user: caseItem.author,
      title: 'تمت حذف حالتك',
      message: `تم حذف حالتك من الموقع ل سبب ما- للاستفسار ارقام التواصل اسفل الصفحه"${caseItem.title}"`,
      type: 'case_deleted',
      channels: ['dashboard', 'push', 'email' ], // داشبورد + push
      referenceId: caseItem._id,
      link: '/contact-us',
      metadata: {
       caseId: caseItem._id, 
        caseItemTitle: caseItem.title,
        category: caseItem.category,
        authorId: caseItem.author,
      }
    });

    res.json({ message: 'تم حذف الحالة' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في الحذف', error });
  }
};


/*=======================================================================================================*/

// رفض حالة (أدمن فقط)
exports.rejectCase = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body; 

  try {
    const caseItem = await allcases.findById(id);
    if (!caseItem) {
      return res.status(404).json({ message: 'الحالة غير موجودة' });
    }

    caseItem.status = 'rejected';
    caseItem.rejectionReason = reason || 'لم يتم ذكر السبب';
    await caseItem.save();

    await NotificationService.createNotification({
      user: caseItem.author,
      title: ' نأسف ل عدم قبول طلبك',
      message: `!  سبب الرفض  "${caseItem.rejectionReason}" عالج المشكله وقدم طلبك مره اخرى , على الرحب والسعه`,
      type: 'case_rejected',
      channels: ['dashboard', 'push' , 'email' ],
      referenceId: caseItem._id,
      link: `/dashboard/edit-case/${caseItem._id}`, 
      metadata: {
      caseId: caseItem._id,
        caseItemTitle: caseItem.title,
        caseType: caseItem.type,
        rejectionReason: caseItem.rejectionReason, 
        authorId: caseItem.author,
      }
    });

    res.json({ message: 'تم رفض الحالة مع توضيح السبب', case: caseItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء رفض الحالة', error });
  }
};


/*=======================================================================================================*/

exports.getUserCases = async (req, res) => {
  try {
    console.log("✅ user inside controller:", req.user);

    let query = {};
        if (req.user.role === 'needy') {
     
      query = { author: req.user.id };
    } else if (req.user.role === 'admin') {
       query = {};
    } else {
      return res.status(200).json([]);
    }

    const userCases = await allcases.find(query); 
    console.log("📦 found cases:", userCases);

    res.status(200).json(userCases);
  } catch (error) {
    console.error("❌ Error fetching user cases:", error);
    res.status(500).json({ message: 'Error fetching user cases', error });
  }
};

