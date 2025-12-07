const nodemailer = require('nodemailer');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

class ReceiptService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    // دالة لإنشاء توقيع إلكتروني
    generateDigitalSignature(donationId, amount, timestamp) {
        const secret = process.env.RECEIPT_SECRET;
        if (!secret) {
            throw new Error('RECEIPT_SECRET غير مضبوط في البيئة');
        }
        const signatureData = `${donationId}-${amount}-${timestamp}-${secret}`;
        return crypto.createHmac('sha256', secret)
                     .update(signatureData)
                     .digest('hex')
                     .substring(0, 16)
                     .toUpperCase();
    }

    // دالة لإنشاء محتوى الإيصال HTML
    generateReceiptContent(donation, caseData) {
        const donationDate = new Date(donation.createdAt).toLocaleDateString('ar-EG');
        const receiptId = `RCP-${donation._id.toString().substring(0, 8).toUpperCase()}`;
        const signature = this.generateDigitalSignature(donation._id, donation.amount, donation.createdAt);

         return `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>إيصال تبرع - GiveHope</title>
                <style>
                    body { 
                        font-family: 'Arial', 'Segoe UI', sans-serif; 
                        line-height: 1.6; 
                        color: #333; 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .receipt-container {
                        background: white;
                        border-radius: 15px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        border: 2px solid #4CAF50;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 3px double #4CAF50;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        color: #2E7D32;
                        margin: 0;
                        font-size: 28px;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 16px;
                    }
                    .receipt-info {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .info-section {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 10px;
                        border-right: 4px solid #4CAF50;
                    }
                    .info-section h3 {
                        color: #2E7D32;
                        margin-top: 0;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 8px;
                    }
                    .info-item {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                    }
                    .info-label {
                        font-weight: bold;
                        color: #555;
                    }
                    .info-value {
                        color: #333;
                    }
                    .amount-section {
                        background: linear-gradient(135deg, #4CAF50, #2E7D32);
                        color: white;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        margin: 20px 0;
                    }
                    .amount {
                        font-size: 32px;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                    .signature-section {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 2px dashed #ddd;
                    }
                    .signature {
                        font-family: monospace;
                        background: #f1f1f1;
                        padding: 10px;
                        border-radius: 5px;
                        display: inline-block;
                        margin: 10px 0;
                        font-weight: bold;
                        color: #2E7D32;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 14px;
                        border-top: 1px solid #ddd;
                        padding-top: 20px;
                    }
                    .thank-you {
                        background: #E8F5E8;
                        padding: 15px;
                        border-radius: 10px;
                        text-align: center;
                        margin: 20px 0;
                        border-right: 4px solid #4CAF50;
                    }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="header">
                        <h1>🕌 إيصال تبرع - GiveHope</h1>
                        <div class="subtitle">شكراً لدعمك الأعمال الخيرية</div>
                    </div>

                    <div class="receipt-info">
                        <div class="info-section">
                            <h3>📋 معلومات التبرع</h3>
                            <div class="info-item">
                                <span class="info-label">رقم الإيصال:</span>
                                <span class="info-value">${ receiptId}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">تاريخ التبرع:</span>
                                <span class="info-value">${ donationDate}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">طريقة الدفع:</span>
                                <span class="info-value">${ donation.paymentMethod}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">رقم المعاملة:</span>
                                <span class="info-value">${ donation.transactionId}</span>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>👤 معلومات المتبرع</h3>
                            <div class="info-item">
                                <span class="info-label">الاسم:</span>
                                <span class="info-value">${ donation.donorInfo.anonymous ? 'تبرع مجهول' : donation.donorInfo.name}</span>
                            </div>
                        
                            ${ !donation.donorInfo.anonymous ? `
                            <div class="info-item">
                                <span class="info-label">الهاتف:</span>
                                <span class="info-value">${ donation.donorInfo.phone}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>🎯 معلومات الحالة</h3>
                        <div class="info-item">
                            <span class="info-label">عنوان الحالة:</span>
                            <span class="info-value">${ caseData.title}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">رقم الحالة:</span>
                            <span class="info-value">${ caseData._id}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">الحالة:</span>
                            <span class="info-value">${ caseData.status === 'approved' ? 'معتمدة ✅' : caseData.status}</span>
                        </div>
                    </div>

                    <div class="amount-section">
                        <div>المبلغ المتبرع به</div>
                        <div class="amount">
                            ${donation.originalAmount} ${donation.originalCurrency}
                            ${donation.originalCurrency !== 'ILS' ? 
                              `(${donation.amount} ${donation.currency})` : ''}
                        </div>
                        <div>شكراً لدعمك الإنسان</div>
                    </div>

                    <div class="thank-you">
                        <h3>🙏 شكراً لك</h3>
                        <p>تبرعك سيحدث فرقاً حقيقياً في حياة المحتاجين. جزاك الله خيراً</p>
                    </div>

                    <div class="signature-section">
                        <div>التوقيع الإلكتروني للموقع</div>
                        <div class="signature">SIG-${signature}</div>
                        <div style="font-size: 12px; color: #666;">
                            هذا توقيع إلكتروني معتمد من GiveHope Foundation
                        </div>
                    </div>

                    <div class="footer">
                        <p>هذا الإيصال صادر من GiveHope Foundation - رقم الترخيص: CH-12345</p>
                        <p>📧 info@givehope.org | 🌐 www.givehope.org | 📞 +972599999999</p>
                        <p>© ${new Date().getFullYear()} GiveHope Foundation. جميع الحقوق محفوظة.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // دالة إنشاء PDF
    async generatePdfReceipt(donation, caseData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, autoFirstPage: true

                });
                const buffers = [];

                doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // استخدام خطوط افتراضية تدعم العربية بشكل أفضل
            this.addReceiptContent(doc, donation, caseData);
            doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    // دالة إضافة المحتوى المعدلة
addReceiptContent(doc, donation, caseData) {
    // التأكد من وجود البيانات المطلوبة
    if (!donation?._id || !caseData?._id) {
        throw new Error('بيانات التبرع أو الحالة غير مكتملة');
    }
    doc.registerFont('ArabicFont', './AmiriQuran-Regular.ttf');

    const receiptId = `RCP-${donation._id.toString().substring(0, 8).toUpperCase()}`;
    const donationDate = new Date(donation.createdAt).toLocaleDateString('ar-EG');
    
    // إعدادات الخط
      doc.font('ArabicFont');
    
    // العنوان الرئيسي
   doc.fontSize(18)
       .fillColor('#2E7D32')
       .text('إيصال تبرع - GiveHope', { align: 'center' });
    
    doc.moveDown(1);
    
    // معلومات التبرع
    doc.fontSize(10)
       .fillColor('#333');
    
    // استخدام جدول بسيط للمعلومات
    const leftX = 50;
    const rightX = 400;
    let y = doc.y;
    
    // معلومات التبرع
    doc.text('رقم الإيصال:', leftX, y)
       .text(receiptId, rightX, y, { align: 'right' });
    y += 20;
    
    doc.text('تاريخ التبرع:', leftX, y)
       .text(donationDate, rightX, y, { align: 'right' });
    y += 20;
    
    doc.text('طريقة الدفع:', leftX, y)
       .text(donation.paymentMethod, rightX, y, { align: 'right' });
    y += 20;
    
    doc.text('رقم المعاملة:', leftX, y)
       .text(donation.transactionId || 'غير متوفر', rightX, y, { align: 'right' });
    y += 30;
    
    // معلومات المتبرع
    doc.text('معلومات المتبرع:', leftX, y, { underline: true });
    y += 20;
    
    const donorName = donation.donorInfo?.anonymous ? 'تبرع مجهول' : (donation.donorInfo?.name || 'غير معروف');
    doc.text('الاسم:', leftX, y)
       .text(donorName, rightX, y, { align: 'right' });
    y += 20;
    
    doc.text('البريد الإلكتروني:', leftX, y)
       .text(donation.donorInfo?.email || 'غير متوفر', rightX, y, { align: 'right' });
    y += 20;
    
    if (!donation.donorInfo?.anonymous && donation.donorInfo?.phone) {
        doc.text('الهاتف:', leftX, y)
           .text(donation.donorInfo.phone, rightX, y, { align: 'right' });
        y += 20;
    }
    
    y += 10;
    
    // معلومات الحالة
    doc.text('معلومات الحالة:', leftX, y, { underline: true });
    y += 20;
    
    doc.text('عنوان الحالة:', leftX, y)
       .text(caseData.title, rightX, y, { align: 'right' });
    y += 20;
    
    doc.text('رقم الحالة:', leftX, y)
       .text(caseData._id.toString(), rightX, y, { align: 'right' });
    y += 30;
    
    // المبلغ
    doc.fontSize(14)
       .fillColor('#4CAF50')
       .text('المبلغ المتبرع به:', leftX, y);
    
    const amountText = `${donation.originalAmount} ${donation.originalCurrency}` +
                      (donation.originalCurrency !== 'ILS' ? 
                       ` (${donation.amount} ${donation.currency})` : '');
    
    doc.text(amountText, rightX, y, { align: 'right' });
    y += 40;
    
    // رسالة الشكر
    doc.fontSize(10)
       .fillColor('#666')
       .text('شكراً لدعمك الأعمال الخيرية. تبرعك سيحدث فرقاً حقيقياً في حياة المحتاجين.', 
             { align: 'center', width: 500 });
    
    y += 30;
    
    // التوقيع
    const signature = this.generateDigitalSignature(donation._id, donation.amount, donation.createdAt);
    doc.fontSize(9)
       .fillColor('#333')
       .text(`التوقيع الإلكتروني: SIG-${signature}`, { align: 'center' });
    
    // التذييل
    doc.y = doc.page.height - 50;
    doc.fontSize(8)
       .fillColor('#999')
       .text(`© ${new Date().getFullYear()} GiveHope Foundation. جميع الحقوق محفوظة.`, 
             { align: 'center' });
}



 // 🎯 دالة إرسال الإيصال الرئيسية (مع إضافة البريد الإلكتروني)

async sendDonationReceipt({ metadata, targetEmail, type }) {
    try {
        console.log('📬 ReceiptService - إرسال إيصال التبرع:', {
            targetEmail: targetEmail,
            type: type,
            hasMetadata: !!metadata,
            donorEmail: metadata?.donorInfo?.email,
            // ⭐️ تحقق من وجود الحقول مباشرة
            paymentMethodExists: !!metadata?.paymentMethod,
            transactionIdExists: !!metadata?.transactionId,
            donationMetadataExists: !!metadata?.donation
        });
        
        // =================== استخراج البيانات من metadata ===================
        const paymentMethod = 
            metadata?.donation?.paymentMethod || 
            metadata?.paymentMethod || 
            'بطاقة ائتمان';
            
        const transactionId = 
            metadata?.donation?.transactionId || 
            metadata?.transactionId || 
            'N/A';
            
        const donationId = 
            metadata?.donationId || 
            metadata?.donation?._id || 
            'temp-' + Date.now();
            
        const amount = 
            metadata?.donatedAmount || 
            metadata?.amount || 
            metadata?.donation?.amount || 
            0;
            
        const originalAmount = 
            metadata?.originalAmount || 
            metadata?.donation?.originalAmount || 
            amount;
            
        const originalCurrency = 
            metadata?.originalCurrency || 
            metadata?.donation?.originalCurrency || 
            'ILS';
            
        const currency = 
            metadata?.currency || 
            metadata?.donation?.currency || 
            'ILS';

        // إنشاء كائن donation مبسط للإيصال
        const receiptDonation = {
            _id: donationId,
            createdAt: metadata?.createdAt || metadata?.donation?.createdAt || new Date(),
            amount: amount,
            originalAmount: originalAmount,
            originalCurrency: originalCurrency,
            currency: currency,
            // ⭐️ الآن سيحصل على القيم الصحيحة
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            donorInfo: {
                name: metadata?.donorInfo?.name || 'مجهول',
                email: metadata?.donorInfo?.email || targetEmail,
                phone: metadata?.donorInfo?.phone || 'غير متوفر',
                idcard: metadata?.donorInfo?.idcard || 'غير متوفر',
                anonymous: metadata?.isAnonymous || false
            }
        };

        // إنشاء كائن caseData مبسط
        const receiptCaseData = {
            _id: metadata?.caseId || metadata?.caseData?._id || metadata?.donation?.caseId || 'N/A',
            title: metadata?.caseItemTitle || metadata?.caseData?.title || metadata?.caseTitle || 'حالة غير معروفة',
            status: metadata?.caseData?.status || 'approved',
            email: metadata?.caseData?.email || metadata?.caseOwnerEmail
        };

          console.log('✅ البيانات المعدة للإيصال:', {
            receiptDonation: {
                id: receiptDonation._id,
                amount: receiptDonation.amount,
                paymentMethod: receiptDonation.paymentMethod,
                transactionId: receiptDonation.transactionId,
                donorName: receiptDonation.donorInfo.name,
                anonymous: receiptDonation.donorInfo.anonymous
            },
            receiptCaseData: {
                title: receiptCaseData.title
            }
        });

        // =================== التحقق من صحة البريد ===================
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!targetEmail || !emailRegex.test(targetEmail)) {
            console.error('❌ بريد إلكتروني غير صالح:', targetEmail);
            throw new Error('البريد الإلكتروني غير صالح: ' + targetEmail);
        }

        // =================== إنشاء وإرسال PDF ===================
        const receiptPdfBuffer = await this.generatePdfReceipt(receiptDonation, receiptCaseData);
        
        if (!receiptPdfBuffer || receiptPdfBuffer.length === 0) {
            throw new Error('فشل في إنشاء ملف PDF');
        }

        // =================== إعداد وإرسال البريد ===================
        const receiptId = `RCP-${receiptDonation._id.toString().substring(0, 8).toUpperCase()}`;
        const mailOptions = {
            from: `"GiveHope Foundation" <${process.env.SMTP_USER}>`,
            to: targetEmail,
            subject: `إيصال تبرعك - ${receiptCaseData.title}`,
            html: this.generateReceiptContent(receiptDonation, receiptCaseData),
            attachments: [
                {
                    filename: `receipt-${receiptId}.pdf`,
                    content: receiptPdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        console.log('📤 إعدادات إرسال البريد:', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            receiptId: receiptId
        });

        // التحقق من إعدادات البريد
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('إعدادات البريد الإلكتروني غير مكتملة');
        }

        // إرسال البريد
        const result = await this.transporter.sendMail(mailOptions);
        console.log('✅ تم إرسال إيصال التبرع بنجاح إلى:', targetEmail);
        
        return { 
            success: true, 
            messageId: result.messageId,
            receiptId: receiptId,
            email: targetEmail
        };
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إيصال التبرع:', error);
        return { 
            success: false, 
            error: error.message,
            step: 'send_receipt'
        };
    }
}


// دالة مساعدة لتسجيل الأخطاء
async logError(service, error, donationId) {
    try {
        // يمكنك استخدام نموذج تسجيل الأخطاء الخاص بك هنا
        console.error(`[${service}] الخطأ:`, {
            donationId,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    } catch (logError) {
        console.error('فشل في تسجيل الخطأ:', logError);
    }
}



// دالة لإنشاء محتوى إيصال صاحب الحالة (HTML)
generateCaseOwnerReceiptContent(donation, caseData) {
    const donationDate = new Date(donation.createdAt).toLocaleDateString('ar-EG');
    const receiptId = `RCP-${donation._id.toString().substring(0, 8).toUpperCase()}`;
    const signature = this.generateDigitalSignature(donation._id, donation.amount, donation.createdAt);

    // تحديد اسم المتبرع (مجهول لو لازم)
    const donorDisplay = donation.donorInfo.anonymous ? 'تبرع مجهول' : (donation.donorInfo.name || 'غير معروف');

    return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>إشعار تبرع جديد - GiveHope</title>
            <style>
                body { 
                    font-family: 'Arial', 'Segoe UI', sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .receipt-container {
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    border: 2px solid #FF9800; /* لون مختلف لصاحب الحالة */
                }
                .header {
                    text-align: center;
                    border-bottom: 3px double #FF9800;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #E65100;
                    margin: 0;
                    font-size: 28px;
                }
                .header .subtitle {
                    color: #666;
                    font-size: 16px;
                }
                .info-section {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 10px;
                    border-right: 4px solid #FF9800;
                    margin-bottom: 20px;
                }
                .info-section h3 {
                    color: #E65100;
                    margin-top: 0;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 8px;
                }
                .info-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .info-label {
                    font-weight: bold;
                    color: #555;
                }
                .info-value {
                    color: #333;
                }
                .amount-section {
                    background: linear-gradient(135deg, #FF9800, #E65100);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    margin: 20px 0;
                }
                .amount {
                    font-size: 32px;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 14px;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                .congrats {
                    background: #FFF3E0;
                    padding: 15px;
                    border-radius: 10px;
                    text-align: center;
                    margin: 20px 0;
                    border-right: 4px solid #FF9800;
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <h1>🎉 إشعار تبرع جديد لحالتك</h1>
                    <div class="subtitle">وصل تبرع جديد لحالتك على GiveHope</div>
                </div>

                <div class="info-section">
                    <h3>📋 تفاصيل التبرع</h3>
                    <div class="info-item">
                        <span class="info-label">رقم الإيصال:</span>
                        <span class="info-value">${receiptId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">تاريخ التبرع:</span>
                        <span class="info-value">${donationDate}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">المتبرع:</span>
                        <span class="info-value">${donorDisplay}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">طريقة الدفع:</span>
                        <span class="info-value">${donation.paymentMethod}</span>
                    </div>
                </div>

                <div class="info-section">
                    <h3>🎯 معلومات الحالة</h3>
                    <div class="info-item">
                        <span class="info-label">عنوان الحالة:</span>
                        <span class="info-value">${caseData.title}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">رقم الحالة: </span>
                        <span class="info-value">${caseData._id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label"> المبلغ الكلي: </span>
                        <span class="info-value">${caseData.total} ${caseData.currency}</span>
                    </div>
        
<div class="info-item">
    <span class="info-label">المجموع بعد التبرع:</span>
    <span class="info-value">${caseData.donated + donation.amount} ${caseData.currency}</span>
</div>

<div class="info-item">
    <span class="info-label">المتبقي بعد التبرع الحالي : </span>
    <span class="info-value">${ caseData.total - (caseData.donated + donation.amount )} ${caseData.currency}</span>
</div>

                </div>

                <div class="amount-section">
                    <div>المبلغ المتبرع به</div>
                    <div class="amount">
                        ${donation.originalAmount} ${donation.originalCurrency}
                        ${donation.originalCurrency !== 'ILS' ? `(${donation.amount} ${donation.currency})` : ''}
                    </div>
                    <div>مبروك! حالتك تقترب من التمويل الكامل</div>
                </div>

                <div class="congrats">
                    <h3>🙏نحن هنا لمساعدتك</h3>
                    <p>تتم إضافة تبرع لحالتك بنجاح.  تابع تقدم حالتك في لوحة التحكم</p>
                </div>

                <div class="footer">
                    <p>هذا الإشعار صادر من GiveHope Foundation - رقم الترخيص: CH-12345</p>
                    <p>📧 info@givehope.org | 🌐 www.givehope.org | 📞 +972599999999</p>
                    <p>© ${new Date().getFullYear()} GiveHope Foundation. جميع الحقوق محفوظة.</p>
                </div>
            </div>
        </body>
        </html>
    `;
} 

// دالة إنشاء PDF لصاحب الحالة
async generateCaseOwnerPdfReceipt(donation, caseData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            this.addCaseOwnerReceiptContent(doc, donation, caseData);
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

// دالة إضافة محتوى PDF لصاحب الحالة
addCaseOwnerReceiptContent(doc, donation, caseData) {
    if (!donation?._id || !caseData?._id) {
        throw new Error('بيانات التبرع أو الحالة غير مكتملة');
    }
    doc.registerFont('ArabicFont', './AmiriQuran-Regular.ttf');

    const receiptId = `RCP-${donation._id.toString().substring(0, 8).toUpperCase()}`;
    const donationDate = new Date(donation.createdAt).toLocaleDateString('ar-EG');
    const donorDisplay = donation.donorInfo.anonymous ? 'تبرع مجهول' : (donation.donorInfo.name || 'غير معروف');

    doc.font('ArabicFont');

    // العنوان
    doc.fontSize(18)
       .fillColor('#E65100')
       .text('إشعار تبرع جديد لحالتك', { align: 'center' });
    doc.moveDown(1);

    // تفاصيل التبرع
    doc.fontSize(10).fillColor('#333');
    let y = doc.y;
    doc.text('رقم الإيصال:', 50, y).text(receiptId, 400, y, { align: 'right' });
    y += 20;
    doc.text('تاريخ التبرع:', 50, y).text(donationDate, 400, y, { align: 'right' });
    y += 20;
    doc.text('المتبرع:', 50, y).text(donorDisplay, 400, y, { align: 'right' });
    y += 30;

    // معلومات الحالة
    doc.text('عنوان الحالة:', 50, y).text(caseData.title, 400, y, { align: 'right' });
    y += 30;

    // المبلغ
    doc.fontSize(14).fillColor('#FF9800').text('المبلغ المتبرع به:', 50, y);
    const amountText = `${donation.originalAmount} ${donation.originalCurrency}` +
                      (donation.originalCurrency !== 'ILS' ? ` (${donation.amount} ${donation.currency})` : '');
    doc.text(amountText, 400, y, { align: 'right' });
    y += 40;

    // رسالة
    doc.fontSize(10).fillColor('#666')
       .text('مبروك! وصل تبرع جديد لحالتك. تابع التقدم في لوحة التحكم.', { align: 'center', width: 500 });

    // التذييل
    doc.y = doc.page.height - 50;
    doc.fontSize(8).fillColor('#999')
       .text(`© ${new Date().getFullYear()} GiveHope Foundation. جميع الحقوق محفوظة.`, { align: 'center' });
}

// دالة إرسال إيصال صاحب الحالة
// 🎯 دالة إرسال إشعار لصاحب الحالة - المعدلة
async sendCaseOwnerReceipt(metadata, targetEmail) {
    try {
        console.log('📬 ReceiptService - إرسال إشعار لصاحب الحالة:', {
            targetEmail: targetEmail,
            hasMetadata: !!metadata,
            caseTitle: metadata?.caseItemTitle || metadata?.caseData?.title
        });

        if (!targetEmail) {
            throw new Error('بريد صاحب الحالة غير متوفر');
        }

        // التحقق من صحة البريد
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(targetEmail)) {
            throw new Error('بريد صاحب الحالة غير صالح: ' + targetEmail);
        }

        // استخراج البيانات من metadata
        const isAnonymous = metadata?.isAnonymous || false;
        const donorName = isAnonymous ? 'شخص مجهول' : (metadata?.donorInfo?.name || 'متبرع');
        const caseTitle = metadata?.caseItemTitle || metadata?.caseData?.title || 'حالتك';
        const amount = metadata?.donatedAmount || metadata?.amount || metadata?.donation?.amount || 0;
        const currency = metadata?.currency || metadata?.donation?.currency || 'شيكل';

        // إنشاء محتوى البريد
        const mailOptions = {
            from: `"GiveHope Foundation" <${process.env.SMTP_USER}>`,
            to: targetEmail,
            subject: `📬 تبرع جديد لحالتك - ${caseTitle}`,
            html: `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>إشعار تبرع جديد</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
                        h2 { color: #4CAF50; }
                        .amount { font-size: 24px; color: #2E7D32; font-weight: bold; margin: 20px 0; }
                        .footer { margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>🎉 وصلك تبرع جديد!</h2>
                        <p>قام <strong>${donorName}</strong> بالتبرع لحالتك:</p>
                        <h3>"${caseTitle}"</h3>
                        <div class="amount">المبلغ: ${amount} ${currency}</div>
                        <p>شكراً لك على نشر الخير 🌟</p>
                        <p>يمكنك متابعة حالة تبرعاتك من خلال لوحة التحكم.</p>
                        <div class="footer">
                            <p>📧 info@givehope.org | 🌐 www.givehope.org</p>
                            <p>© ${new Date().getFullYear()} GiveHope Foundation</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        console.log('📤 إعدادات إرسال البريد لصاحب الحالة:', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            donorName: donorName,
            amount: amount
        });

        // التحقق من إعدادات البريد
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('إعدادات البريد الإلكتروني غير مكتملة');
        }

        // إرسال البريد
        const result = await this.transporter.sendMail(mailOptions);
        console.log('✅ تم إرسال إشعار لصاحب الحالة بنجاح إلى:', targetEmail);
        
        return { 
            success: true, 
            messageId: result.messageId,
            email: targetEmail
        };
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار لصاحب الحالة:', error);
        return { 
            success: false, 
            error: error.message,
            email: targetEmail
        };
    }
}
async sendGeneralEmail(targetEmail, subject, message) {
    try {
        console.log('📬 إرسال إشعار عام:', { targetEmail, subject });

        if (!targetEmail) {
            throw new Error('البريد الإلكتروني غير متوفر');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(targetEmail)) {
            throw new Error('بريد إلكتروني غير صالح: ' + targetEmail);
        }

        const mailOptions = {
            from: `"GiveHope Foundation" <${process.env.SMTP_USER}>`,
            to: targetEmail,
            subject: subject || 'إشعار من GiveHope',
            html: `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>إشعار</title>
                </head>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                        ${message || 'هذا إشعار من نظام GiveHope Foundation.'}
                    </div>
                </body>
                </html>
            `
        };

        const result = await this.transporter.sendMail(mailOptions);
        console.log('✅ تم إرسال الإشعار العام بنجاح');
        
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار عام:', error);
        return { success: false, error: error.message };
    }
}




}
module.exports = new ReceiptService();