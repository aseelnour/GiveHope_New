



const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const NotificationService = require("../notificationService.js");
const axios = require('axios');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const Donation = require('../model/Donationmodel.js');

const ShowAllCases = require('../model/ShowAllCasessmodel.js'); 
const Campaign = require('./backend/models/Campaign'); 
 const Zakat = require('./backend/models/zakat.js'); 
 const Sponsorship = require('./models/Sponsorship'); 
 const projects = require('../../../DB/models/project.model.js'); 


const ReceiptService = require('../ReceiptService.js');
const crypto = require('crypto'); 
const { encrypt } = require('../encryption.js');
/*=================================================================================================*/

exports.generateCSRFToken = (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    return csrfToken;
};

// middleware للتحقق من CSRF token
exports.verifyCSRFToken = (req, res, next) => {
    const tokenFromHeader = req.headers['x-csrf-token'];
    const tokenFromCookie = req.cookies['csrf-token'];
    
    if (!tokenFromHeader || !tokenFromCookie || tokenFromHeader !== tokenFromCookie) {
        return res.status(403).json({ message: 'CSRF token validation failed' });
    }
    next();
};


/*=======================================================================================================*/
/*=======================================================================================================*/
const exchangeRateCache = new Map();

async function getExchangeRate(baseCurrency, targetCurrency, retries = 3) {
    const cacheKey = `${baseCurrency}-${targetCurrency}`;
    const cached = exchangeRateCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) {
        console.log(`✅ استخدام الكاش لسعر الصرف ${cacheKey}: ${cached.rate}`);
        return cached.rate;
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const apiUrl = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data.rates && data.rates[targetCurrency]) {
                const rate = data.rates[targetCurrency];
                console.log(`✅ سعر الصرف ${baseCurrency}/${targetCurrency}: ${rate} (المحاولة ${attempt})`);
                
                // حفظ في الكاش
                exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() });
                return rate;
            } else {
                throw new Error('Rate not found');
            }
        } catch (error) {
            console.error(`❌ فشل المحاولة ${attempt} لسعر الصرف:`, error.message);
            
            if (attempt === retries) {
                console.error(`❌ فشل جميع المحاولات لسعر الصرف ${baseCurrency}/${targetCurrency}`);
                return null;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

const MIN_DONATION = 1;
const MAX_DONATION = 10000;

const SUPPORTED_CURRENCIES = ['ILS', 'JOD', 'USD', 'AED'];
const TARGET_CURRENCY = 'ILS'; // العملة التي يتم التوحيد عليها

/*=======================================================================================================*/



/*********************************************************** */
exports.createDonation = async (req, res) => {
    const { caseId, amount, currency, donorInfo, paymentMethod, transactionId, anonymous, author, authorName, category = 'cases' } = req.body;

    const originalCurrency = currency ? currency.toUpperCase() : TARGET_CURRENCY; 
    const originalAmount = parseFloat(amount); 
    const isAnonymous = !!anonymous;
    const user = req.user; 
    
    // =================== التحقق الأساسي ===================
    if (!caseId || !originalAmount || !donorInfo || !paymentMethod || !transactionId || originalAmount <= 0) {
        return res.status(400).json({ message: 'بيانات التبرع غير كاملة أو المبلغ غير صالح' });
    }

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
        return res.status(400).json({ message: 'معرّف العنصر (caseId) غير صالح' });
    }

    if (!SUPPORTED_CURRENCIES.includes(originalCurrency)) {
        return res.status(400).json({ message: `العملة ${originalCurrency} غير مدعومة حاليًا` });
    }
    
    // =================== فحص تطابق البريد الإلكتروني ===================
    const donorEmail = donorInfo.email;
    const userEmail = user ? user.email : null;
    
    console.log('🔍 فحص تطابق البريد الإلكتروني:', {
        donorEmail,
        userEmail,
        userExists: !!user,
        isAnonymous,
        isLoggedIn: !!req.user
    });

    if (user && userEmail) {
        if (donorEmail !== userEmail) {
            return res.status(400).json({ 
                message: 'البريد الإلكتروني لا يتطابق مع حسابك',
                details: {
                    enteredEmail: donorEmail,
                    registeredEmail: userEmail
                },
                code: 'EMAIL_MISMATCH'
            });
        }
        console.log('✅ البريد الإلكتروني متطابق مع حساب المستخدم');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!donorEmail || !emailRegex.test(donorEmail)) {
        return res.status(400).json({ 
            message: 'البريد الإلكتروني غير صالح',
            details: 'يرجى إدخال بريد إلكتروني صحيح',
            code: 'INVALID_EMAIL'
        });
    }

    let amountInILS = originalAmount;
    
    if (originalCurrency !== TARGET_CURRENCY) {
        const rate = await getExchangeRate(originalCurrency, TARGET_CURRENCY);
        if (rate === null) {
            return res.status(503).json({ 
                message: `فشل في جلب سعر الصرف للعملة ${originalCurrency}. يرجى المحاولة لاحقًا.`,
            }); 
        }
        amountInILS = parseFloat((originalAmount * rate).toFixed(2));
    }

    try {
        // =================== تحديد النموذج بناءً على الفئة ===================
        let Model;
        let modelName;
        let titleField;
        let totalField;
        let donatedField;
        let emailField;
        let authorField;
        let statusField;
        let donationsCountField;

        switch(category) {
            case 'cases':
                Model = ShowAllCases;
                modelName = 'Case';
                titleField = 'title';
                totalField = 'total';
                donatedField = 'donated';
                emailField = 'email';
                authorField = 'author';
                statusField = 'status';
                donationsCountField = 'donationsCount';
                break;
                
            case 'campaigns':
                Model = Campaign;
                modelName = 'Campaign';
                titleField = 'title' in Campaign.schema.paths ? 'title' : 'name';
                totalField = 'target_amount' in Campaign.schema.paths ? 'target_amount' : 'total';
                donatedField = 'collected_amount' in Campaign.schema.paths ? 'collected_amount' : 'donated';
                emailField = 'email' in Campaign.schema.paths ? 'email' : 'creator_email';
                authorField = 'creator' in Campaign.schema.paths ? 'creator' : 'author';
                statusField = 'status' in Campaign.schema.paths ? 'status' : 'is_active';
                donationsCountField = 'donations_count' in Campaign.schema.paths ? 'donations_count' : 'donationsCount';
                break;
                
            case 'zakat':
                Model = Zakat;
                modelName = 'Zakat';
                titleField = 'title' in Zakat.schema.paths ? 'title' : 'name';
                totalField = 'target_amount' in Zakat.schema.paths ? 'target_amount' : 'amount';
                donatedField = 'collected_amount' in Zakat.schema.paths ? 'collected_amount' : 'raised';
                emailField = 'email' in Zakat.schema.paths ? 'email' : 'admin_email';
                authorField = 'admin' in Zakat.schema.paths ? 'admin' : 'author';
                statusField = 'status' in Zakat.schema.paths ? 'status' : 'is_active';
                donationsCountField = 'donations_count' in Zakat.schema.paths ? 'donations_count' : 'donationsCount';
                break;
                
            case 'sponsorships':
                Model = Sponsorship;
                modelName = 'Sponsorship';
                titleField = 'title' in Sponsorship.schema.paths ? 'title' : 'name';
                totalField = 'target_amount' in Sponsorship.schema.paths ? 'target_amount' : 'amount';
                donatedField = 'collected_amount' in Sponsorship.schema.paths ? 'collected_amount' : 'donated';
                emailField = 'email' in Sponsorship.schema.paths ? 'email' : 'sponsor_email';
                authorField = 'sponsor' in Sponsorship.schema.paths ? 'sponsor' : 'author';
                statusField = 'status' in Sponsorship.schema.paths ? 'status' : 'is_active';
                donationsCountField = 'donations_count' in Sponsorship.schema.paths ? 'donations_count' : 'donationsCount';
                break;
                
            case 'projects':
                Model = projects;
                modelName = 'Project';
                titleField = 'title' in projects.schema.paths ? 'title' : 'project_name';
                totalField = 'budget' in projects.schema.paths ? 'budget' : 'total_amount';
                donatedField = 'raised_amount' in projects.schema.paths ? 'raised_amount' : 'collected';
                emailField = 'email' in projects.schema.paths ? 'email' : 'project_manager_email';
                authorField = 'manager' in projects.schema.paths ? 'manager' : 'author';
                statusField = 'status' in projects.schema.paths ? 'status' : 'project_status';
                donationsCountField = 'donations_count' in projects.schema.paths ? 'donations_count' : 'donationsCount';
                break;
                
            default:
                return res.status(400).json({ 
                    message: 'فئة غير معروفة',
                    details: `الفئة "${category}" غير مدعومة`,
                    code: 'INVALID_CATEGORY'
                });
        }

        console.log(`📁 استخدام النموذج: ${modelName} (الفئة: ${category})`);
        console.log(`📊 حقول النموذج:`, {
            titleField,
            totalField,
            donatedField,
            emailField,
            authorField,
            statusField,
            donationsCountField
        });

        // البحث عن العنصر في النموذج المناسب
        const itemData = await Model.findById(caseId);
        
        if (!itemData) {
            return res.status(404).json({ 
                message: `${modelName} غير موجود`,
                details: `لم يتم العثور على ${modelName} بالمعرّف ${caseId}`,
                code: 'ITEM_NOT_FOUND'
            });
        }

        // التحقق من حالة العنصر
        let isValidStatus = true;
        if (statusField && itemData[statusField]) {
            if (category === 'cases') {
                isValidStatus = itemData[statusField] === 'approved';
            } else {
                // للأنواع الأخرى، نتحقق من الحالة الفعالة
                if (statusField === 'is_active') {
                    isValidStatus = itemData[statusField] === true;
                } else if (statusField === 'status') {
                    isValidStatus = itemData[statusField] === 'active' || itemData[statusField] === 'approved';
                }
            }
        }

        if (!isValidStatus) {
            return res.status(400).json({ 
                message: `${modelName} غير نشط أو غير معتمد`,
                details: `حالة ${modelName}: ${itemData[statusField]}`,
                code: 'ITEM_NOT_ACTIVE'
            });
        }
        
        let itemOwnerId = null;
        let itemOwnerEmail = itemData[emailField];

        if (authorField && itemData[authorField] && itemData[authorField].toString() !== 'undefined') {
            itemOwnerId = itemData[authorField];
            console.log('✅ استخدام author كـ itemOwnerId:', getUserIdForNotification(itemOwnerId, itemOwnerEmail));
        } 
        else if (itemOwnerEmail) {
            itemOwnerId = `email_${itemOwnerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
            console.log('✅ إنشاء معرف من البريد الإلكتروني:', itemOwnerId);
        }

        console.log('🔍 معلومات صاحب العنصر:', {
            modelName,
            itemOwnerId,
            itemOwnerEmail,
            authorExistsInDB: !!(authorField && itemData[authorField])
        });

        console.log('🔍 تفاصيل العنصر من DB:', {
            itemId: itemData._id,
            itemTitle: itemData[titleField],
            itemOwnerId: itemOwnerId ? getUserIdForNotification(itemOwnerId, itemOwnerEmail) : null,
            itemOwnerEmail,
            authorName: itemData.authorName,
            isEmailValid: itemOwnerEmail && emailRegex.test(itemOwnerEmail)
        });

        // تحقق من صحة بريد صاحب العنصر
        if (itemOwnerEmail && !emailRegex.test(itemOwnerEmail)) {
            console.error('❌ بريد صاحب العنصر غير صالح:', itemOwnerEmail);
        }

        // التحقق من أن transactionId غير مكرر
        const existingDonation = await Donation.findOne({ transactionId });
        if (existingDonation) {
            return res.status(400).json({ 
                message: 'رقم المعاملة مكرر، يرجى المحاولة مرة أخرى',
                code: 'DUPLICATE_TRANSACTION'
            });
        }

        // حساب المبالغ
        const requiredAmount = parseFloat(itemData[totalField]) || 0;
        const donatedAmount = parseFloat(itemData[donatedField]) || 0; 
        const remainingAmount = requiredAmount - donatedAmount;

        if (remainingAmount <= 0) {
            return res.status(400).json({ 
                message: `عذراً، هذا ${modelName} اكتمل بالكامل بفضل المتبرعين.`,
                status: 'completed'
            });
        }
        
        if (amountInILS > remainingAmount) {
            const maxAllowed = remainingAmount.toFixed(2);
            return res.status(400).json({ 
                message: `عذراً، المبلغ المتبرع به (${amountInILS} ${TARGET_CURRENCY}) يتجاوز المبلغ المتبقي. الحد الأقصى المسموح به هو ${maxAllowed} ${TARGET_CURRENCY}.`,
                maxAllowed,
                remainingAmount
            });
        }

        if (amountInILS < MIN_DONATION || amountInILS > MAX_DONATION) {
            return res.status(400).json({ 
                message: `سياسه الموقع المبلغ يجب أن يكون بين ${MIN_DONATION} و ${MAX_DONATION} ${TARGET_CURRENCY}` 
            });
        }

        const donationAuthorId = (user && (user._id || user.id)) || author;
        const donationAuthorName = (user && user.name) || authorName;

        if (!donationAuthorId || !donationAuthorName) {
            return res.status(400).json({ 
                message: 'خطأ: معرّف الكاتب واسمه مفقودان.',
                details: 'لم يتم توفيرهما عبر التوكن أو الـ request body.'
            });
        }
        
        // =================== حفظ البيانات الأصلية غير المشفرة ===================
        const originalDonorData = {
            name: donorInfo.name,
            email: donorInfo.email,
            phone: donorInfo.phone,
            idcard: donorInfo.idcard
        };

        console.log('📝 البيانات الأصلية غير المشفرة:', originalDonorData);
        
        // =================== التشفير دائماً في قاعدة البيانات ===================
        const donorDataToSave = {
            name: encrypt(donorInfo.name),
            email: encrypt(donorInfo.email),
            phone: encrypt(donorInfo.phone),
            idcard: encrypt(donorInfo.idcard),
            anonymous: isAnonymous 
        };

        // =================== إنشاء التبرع ===================
        const newDonation = new Donation({
            caseId,
            category, // حفظ الفئة في التبرع
            title: itemData[titleField],
            amount: amountInILS,
            originalAmount,
            originalCurrency,
            currency: TARGET_CURRENCY,
            donorInfo: donorDataToSave,
            paymentMethod,
            transactionId,
            author: donationAuthorId,
            authorName: donationAuthorName,
            modelType: modelName // حفظ نوع النموذج
        });

        await newDonation.save();

        console.log('✅ التبرع تم حفظه بنجاح:', {
            donationId: newDonation._id,
            isAnonymous,
            donorEmail: originalDonorData.email,
            encrypted: true,
            category,
            modelType: modelName
        });

        // =================== إشعار للمتبرع (باستخدام البيانات الأصلية) ===================
        const notificationUserId = getUserIdForNotification(
            (user && (user._id || user.id)) || donationAuthorId, 
            originalDonorData.email
        );

        // إشعار للمتبرع (باستخدام البيانات الأصلية غير المشفرة)
        await NotificationService.createNotification({
            user: notificationUserId,
            title: '🎉 تم التبرع بنجاح! شكراً لك.',
            message: `شكرا لدعمك ${modelName} "${itemData[titleField]}" بمبلغ ${amountInILS} شيكل. سيصلك إيصال عبر البريد.`,
            type: 'donation_thanks',
            channels: ['dashboard', 'push','email'],
            referenceId: itemData._id,
            metadata: {
                donationId: newDonation._id,
                itemId: caseId,
                category: category,
                modelType: modelName,
                amount: amountInILS,
                originalAmount: originalAmount,
                originalCurrency: originalCurrency,
                currency: TARGET_CURRENCY,
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                createdAt: new Date(),
                
                // ⭐️ البيانات الأصلية غير المشفرة للمتبرع
                donorInfo: originalDonorData,
                
                // ⭐️ بيانات العنصر
                itemData: {
                    _id: itemData._id,
                    title: itemData[titleField],
                    status: itemData[statusField],
                    email: itemData[emailField]
                },
                
                // ⭐️ بيانات إضافية
                userEmail: originalDonorData.email,
                itemOwnerEmail: itemOwnerEmail,
                itemTitle: itemData[titleField],
                isAnonymous: isAnonymous,
                donatedAmount: amountInILS,
                category: category
            }
        });

        console.log('📧 إشعار الشكر تم إرساله إلى المتبرع:', originalDonorData.email);

        // =================== إشعار لصاحب العنصر ===================
        if (itemOwnerEmail) {
            const safeUserId = getUserIdForNotification(itemOwnerId, itemOwnerEmail);
            
            if (itemOwnerEmail !== originalDonorData.email) {
                await NotificationService.createNotification({
                    user: safeUserId,
                    title: `📬 وصلك تبرع جديد لـ ${modelName} الخاص بك!`,
                    message: `قام شخص ${isAnonymous ? 'مجهول' : ''} بالتبرع لـ ${modelName} "${itemData[titleField]}" بمبلغ ${amountInILS} شيكل.`,
                    type: 'new_donation',
                    channels: ['dashboard', 'push', 'email'],
                    referenceId: itemData._id,
                    link: `/itemdetails/${caseId}?category=${category}`,
                    metadata: {
                        // ⭐️ بريد صاحب العنصر
                        itemOwnerEmail: itemOwnerEmail,
                        
                        // ⭐️ بيانات المتبرع حسب المجهولية
                        donorInfo: isAnonymous ? {
                            name: 'مجهول',
                            email: 'مجهول'
                        } : originalDonorData,
                        
                        // ⭐️ بيانات العنصر
                        itemData: {
                            _id: itemData._id,
                            title: itemData[titleField],
                            email: itemData[emailField]
                        },
                        
                        // ⭐️ معلومات التبرع
                        donation: {
                            _id: newDonation._id,
                            amount: amountInILS,
                            currency: TARGET_CURRENCY
                        },
                        
                        // ⭐️ بيانات إضافية
                        itemTitle: itemData[titleField],
                        isAnonymous: isAnonymous,
                        category: category,
                        donatedAmount: amountInILS,
                        userEmail: itemOwnerEmail,
                        modelType: modelName
                    }
                });
                
                console.log(`📧 إشعار جديد للتبرع أرسل لصاحب ${modelName}: ${itemOwnerEmail}`);
            } else {
                console.log(`ℹ️ صاحب ${modelName} هو نفس المتبرع، لا حاجة لإرسال إشعار منفصل`);
            }
        } else {
            console.warn(`⚠️ لا يمكن إرسال إشعار لصاحب ${modelName}: itemOwnerEmail غير موجود`);
        }

        // =================== تحديث العنصر ===================
        const updateData = {};
        updateData[donatedField] = (parseFloat(itemData[donatedField]) || 0) + amountInILS;
        
        if (donationsCountField) {
            updateData[donationsCountField] = (itemData[donationsCountField] || 0) + 1;
        }

        await Model.findByIdAndUpdate(caseId, { $set: updateData });

        // التحقق إذا اكتمل العنصر
        const updatedItem = await Model.findById(caseId);
        const currentDonated = parseFloat(updatedItem[donatedField]) || 0;
        const currentTotal = parseFloat(updatedItem[totalField]) || 0;

        if (currentDonated >= currentTotal) {
            let statusUpdate = {};
            
            if (category === 'cases') {
                statusUpdate = { 
                    status: 'funded',
                    completedAt: new Date()
                };
            } else {
                // للأنواع الأخرى، نضع حالة completed أو نقوم بإغلاق العنصر
                if (statusField === 'status') {
                    statusUpdate[statusField] = 'completed';
                } else if (statusField === 'is_active') {
                    statusUpdate[statusField] = false;
                }
                statusUpdate.completedAt = new Date();
            }

            await Model.findByIdAndUpdate(caseId, statusUpdate);

            // إشعار لصاحب العنصر بإكمال التمويل
            if (itemOwnerEmail) {
                const safeUserId = getUserIdForNotification(itemOwnerId, itemOwnerEmail);
                await NotificationService.createNotification({
                    user: safeUserId,
                    title: `🎉 اكتمل تمويل ${modelName} الخاص بك!`,
                    message: `مبروك! اكتمل تمويل ${modelName} "${itemData[titleField]}" بالكامل.`,
                    type: 'item_completed',
                    channels: ['dashboard', 'push', 'email'],
                    referenceId: itemData._id,
                    link: `/itemdetails/${caseId}?category=${category}`,
                    metadata: {
                        itemOwnerEmail: itemOwnerEmail,
                        itemData: {
                            _id: itemData._id,
                            title: itemData[titleField]
                        },
                        donation: {
                            _id: newDonation._id,
                            amount: amountInILS
                        },
                        itemTitle: itemData[titleField],
                        donatedAmount: amountInILS,
                        userEmail: itemOwnerEmail,
                        modelType: modelName
                    }
                });
                
                console.log(`🎉 إشعار اكتمال التمويل أرسل لصاحب ${modelName}: ${itemOwnerEmail}`);
            }
        }

        res.status(201).json({ 
            message: 'تم التبرع بنجاح', 
            donation: {
                _id: newDonation._id,
                caseId: newDonation.caseId,
                category: newDonation.category,
                modelType: newDonation.modelType,
                amount: newDonation.amount,
                anonymous: isAnonymous,
                createdAt: newDonation.createdAt
            },
            convertedAmount: amountInILS,
            receiptEmail: originalDonorData.email,
            itemOwnerNotified: itemOwnerEmail && itemOwnerEmail !== originalDonorData.email,
            category: category,
            modelName: modelName
        });

    } catch (error) {
        console.error('Donation creation error:', error);
        if (error.message.includes('toString')) {
            console.error('❌ الخطأ في toString() - تحقق من:', {
                itemOwnerId: itemOwnerId,
                itemData: itemData ? {
                    _id: itemData._id,
                    author: authorField ? itemData[authorField] : undefined,
                    email: emailField ? itemData[emailField] : undefined
                } : 'itemData is null'
            });
        }
        res.status(500).json({ 
            message: 'خطأ في إنشاء التبرع', 
            error: error.message,
            category: category
        });
    }
};



const getUserIdForNotification = (userId, userEmail) => {
    // إذا كان userId موجوداً وصالحاً
    if (userId && userId !== 'undefined') {
        // إذا كان userId سلسلة نصية (string)، ارجعها كما هي
        if (typeof userId === 'string' && userId.trim() !== '') {
            return userId;
        }
        // إذا كان userId ObjectId، حوله إلى سلسلة
        else if (mongoose.Types.ObjectId.isValid(userId)) {
            return userId.toString();
        }
        // إذا كان userId كائناً يحتوي على toString
        else if (userId && typeof userId.toString === 'function') {
            return userId.toString();
        }
    }
    
    // إذا لم يكن userId صالحاً، استخدم البريد الإلكتروني مع بادئة
    if (userEmail) {
        return `email_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    
    // إذا لم يكن هناك أي معرف، استخدم معرف مؤقت
    return `temp_${Date.now()}`;
};


/*=======================================================================================================*/
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find().populate('caseId').sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب التبرعات', error });
  }
};

/*=======================================================================================================*/

exports.getDonationsByCase = async (req, res) => {
  try {
    const caseId = req.params.caseId;

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ message: 'الحالة غير موجودة' });
    }

    if (req.user.role === 'needy') {
      if (caseData.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'ليس لديك صلاحية لمشاهدة تبرعات هذه الحالة' });
      }
    }

    const donations = await Donation.find({ caseId })
    .populate('caseId', 'title type currency')
    .sort({ createdAt: -1 });

    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب تبرعات الحالة', error });
  }
};

/*=======================================================================================================*/

exports.getDonationsByUser = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'معرّف المستخدم غير صالح' });
    }
 if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
        return res.status(403).json({ message: 'غير مصرح لك بعرض هذه التبرعات' });
    }
    try {
        const donations = await Donation.find({ 'donorInfo.userId': userId })
                                        .populate('caseId', 'title category') 
                                        .sort({ createdAt: -1 });

        if (donations.length === 0) {
            return res.status(404).json({ message: 'لا توجد تبرعات لهذا المستخدم' });
        }

        const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
        const donationsCount = donations.length;

        const donationsWithCaseName = donations.map(d => ({
            _id: d._id,
            amount: d.amount,
            originalAmount: d.originalAmount,
            originalCurrency: d.originalCurrency,
            currency: d.currency,
            donorInfo: d.donorInfo,
            paymentMethod: d.paymentMethod,
            transactionId: d.transactionId,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            case: {
                id: d.caseId._id,
                title: d.caseId.title,
                category: d.caseId.category
            }
        }));

        res.status(200).json({
            userId,
            donationsCount,
            totalAmount,
            donations: donationsWithCaseName
        });

    } catch (error) {
        console.error('Error fetching donations by user:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء جلب التبرعات', error: error.message });
    }
};


