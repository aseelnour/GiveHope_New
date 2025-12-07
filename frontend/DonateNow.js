
    
    

/*========================================================================================================*/     
     async function loadHTML(file, elementId) {
            try {
                const response = await fetch(file);
                const data = await response.text();
                const container = document.getElementById(elementId);
                container.innerHTML = data;
                
                if (file === 'navbar.html') {
                    initNavbar();
                }
                
                return true;
            } catch (error) {
                console.error('Error loading HTML:', error);
                return false;
            }
        }

        function initNavbar() {
            const menuToggle = document.getElementById('menuToggle');
            const navLinks = document.getElementById('navLinks');
            
            if (!menuToggle || !navLinks) return;
            
            menuToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                navLinks.classList.toggle('active');
            });
            
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.navbar')) {
                    navLinks.classList.remove('active');
                    document.querySelectorAll('.dropdown').forEach(dropdown => {
                        dropdown.classList.remove('active');
                    });
                }
            });
            
            if (navLinks) {
                navLinks.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }
            
            document.querySelectorAll('.dropdown-toggle').forEach(item => {
                item.addEventListener('click', function(e) {
                    if (window.innerWidth <= 992) {
                        e.preventDefault();
                        const dropdown = this.parentNode;
                        dropdown.classList.toggle('active');
                        
                        document.querySelectorAll('.dropdown').forEach(d => {
                            if (d !== dropdown) {
                                d.classList.remove('active');
                            }
                        });
                    }
                });
            });
            
            window.addEventListener('resize', function() {
                if (window.innerWidth > 992) {
                    if (navLinks) navLinks.classList.remove('active');
                    document.querySelectorAll('.dropdown').forEach(dropdown => {
                        dropdown.classList.remove('active');
                    }); 
                }
            });
        }

        window.addEventListener('DOMContentLoaded', function() {
            loadHTML('navbar.html', 'navbar-placeholder');
            loadHTML('footer.html', 'footer-placeholder');
            
          
        });
        

  /*========================================================================================================*/
document.addEventListener('DOMContentLoaded', function() {
    // 1. **التحقق من تسجيل الدخول فور تحميل الصفحة**
    const token = localStorage.getItem('token');
    function getAuthToken() {
    return localStorage.getItem('token');
}
    const previousUrl = document.referrer || 'index.html';

    if (!token) {
        Swal.fire({
            icon: 'warning',
            title: 'يجب تسجيل الدخول',
            text: 'يرجى تسجيل الدخول أولاً للوصول إلى صفحة التبرع.',
            confirmButtonText: 'تسجيل الدخول',
            showCancelButton: true,
            cancelButtonText: 'إلغاء / العودة',
            allowOutsideClick: true,
            allowEscapeKey: true
        }).then((result) => {
            if (result.isConfirmed) {
               localStorage.setItem('redirectUrl', window.location.href);
            window.location.href = 'login.html';
            } else {
                window.history.back();
            }
        });
        return;
    }

    // دالة CSRF Token
    async function getCSRFToken() {
        try {
            const response = await fetch('http://localhost:5003/api/csrf-token', {
                credentials: 'include'
            });
            const data = await response.json();
            return data.csrfToken;
        } catch (error) {
            console.error('Error getting CSRF token:', error);
            return null;
        }
    }

    // الحصول على معرف الحالة من URL
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get('id');
    
    // عناصر DOM
    const caseTitle = document.getElementById('caseTitle');
    const totalAmount = document.getElementById('totalAmount');
    const donatedAmount = document.getElementById('donatedAmount');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const thankMessage = document.getElementById('thankMessage');
    const donateBtn = document.getElementById('donate-btn');
    const customAmountInput = document.getElementById('custom-amount');
    const donationForm = document.getElementById('donationForm');
    const currencySelect = document.getElementById('currency');

    // دوال التحقق من صحة البيانات
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validatePhone(phone) {
        return /^[\+]?[0-9\s\-\(\)]{8,}$/.test(phone);
    }

    function validateIdCard(idcard) {
        return /^\d{5,20}$/.test(idcard);
    }

async function validateToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await fetch('http://localhost:5003/api/auth/validate-token', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            // توكن منتهي
            return false;
        } else if (!response.ok) {
            // مشكلة مؤقتة بالسيرفر، لا نحذف التوكن
            console.warn('Server error or network issue. Keeping token.');
            return true; // نعتبره صالح مؤقتًا
        }
        return true;
    } catch (err) {
        console.error('Network error while validating token:', err);
        return true; // نعتبره صالح مؤقتًا
    }
}

    // التحقق من صحة التوكن عند تحميل الصفحة
    validateToken().then(isValid => {
        if (!isValid) {
            Swal.fire({
                icon: 'error',
                title: 'انتهت الجلسة',
                text: 'يرجى تسجيل الدخول مرة أخرى',
                confirmButtonText: 'تسجيل الدخول',
                allowOutsideClick: false
            }).then((result) => {
                localStorage.removeItem('token');
                 localStorage.setItem('redirectUrl', window.location.href);
            window.location.href = 'login.html';
            });
        }
    });

    let selectedAmount = 0;
    let currency = currencySelect.value;
    let csrfToken = '';

    // جلب CSRF token عند تحميل الصفحة
    getCSRFToken().then(token => {
        csrfToken = token;
    });

    // دالة تحديث نص زر التبرع
    function updateDonateButtonText() {
        const displayAmount = selectedAmount > 0 ? selectedAmount : '...';
        const displayCurrency = currency;
        if (donateBtn) { 
            donateBtn.innerHTML = `<i class="fas fa-heart"></i> تبرع الآن (${displayAmount} ${displayCurrency})`;
        }
    }

    // زر الرجوع
    document.getElementById('backButton').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = `casedetails.html?id=${caseId}`;
    });

    // تحديث العملة عند تغيير الاختيار
    currencySelect.addEventListener('change', function() {
        currency = this.value;
        updateDonateButtonText(); 
    });
 
    // جلب بيانات الحالة
 // جلب بيانات الحالة
fetch('http://localhost:5003/api/ShowAllCases/')  // تأكدي من / في النهاية
    .then(response => {
        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            // إذا كان فيه خطأ، جربي بدون /api/
            console.warn('⚠️ First attempt failed, trying alternative...');
            return fetch('http://localhost:5003/ShowAllCases/');
        }
        return response;
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // تحقق من نوع المحتوى
        const contentType = response.headers.get('content-type');
        console.log('📄 Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ Response is not JSON, trying to parse anyway...');
        }
        
        return response.json();
    })
    .then(data => {
        console.group('🔍 API Response Analysis');
        console.log('📊 Raw data:', data);
        console.log('📈 Type:', typeof data);
        console.log('📈 Is Array?', Array.isArray(data));
        
        if (!Array.isArray(data)) {
            console.log('🔑 Keys:', Object.keys(data));
            
            // تحليل كل key
            Object.keys(data).forEach(key => {
                const value = data[key];
                console.log(`   Key "${key}":`, {
                    type: typeof value,
                    isArray: Array.isArray(value),
                    length: Array.isArray(value) ? value.length : 'N/A',
                    isObject: value && typeof value === 'object',
                    sample: Array.isArray(value) ? value[0] : 
                           (value && typeof value === 'object') ? 'Object' : value
                });
            });
        }
        console.groupEnd();
        
        // تحويل لأي شكل - النسخة المحسنة
        let casesArray = [];
        const commonArrayKeys = ['cases', 'data', 'results', 'items', 'list', 'donations'];
        
        if (Array.isArray(data)) {
            // إذا الـ data نفسه array
            casesArray = data;
            console.log('✅ Using data directly as array');
        } else {
            // ابحثي عن array في الخصائص الشائعة
            for (const key of commonArrayKeys) {
                if (data[key] && Array.isArray(data[key])) {
                    casesArray = data[key];
                    console.log(`✅ Found array in key: "${key}"`);
                    break;
                }
            }
            
            // إذا ما لقينا، ابحثي في كل الخصائص
            if (casesArray.length === 0) {
                for (const key in data) {
                    if (Array.isArray(data[key])) {
                        casesArray = data[key];
                        console.log(`✅ Found array in key: "${key}"`);
                        break;
                    }
                }
            }
        }
        
        console.log(`📊 Final cases array length: ${casesArray.length}`);
        
        // إذا ما في array نهائياً
        if (casesArray.length === 0 && data && typeof data === 'object') {
            console.warn('⚠️ No array found, using object values as array');
            casesArray = Object.values(data).filter(item => 
                item && typeof item === 'object' && (item._id || item.id)
            );
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const caseId = urlParams.get('id');
        console.log('🔍 Looking for case ID:', caseId);
        
        if (!caseId) {
            console.error('❌ No case ID in URL');
            caseTitle.textContent = 'لم يتم تحديد حالة';
            return;
        }
        
        if (casesArray.length === 0) {
            console.error('❌ No cases available');
            caseTitle.textContent = 'لا توجد حالات متاحة';
            return;
        }
        
        const caseData = casesArray.find(item => {
            const itemId = item._id || item.id;
            return itemId === caseId || 
                   (itemId && itemId.toString() === caseId);
        });
        
        if (caseData) {
            console.log('✅ Found case:', caseData);
            
            caseTitle.textContent = `أنت الآن تتبرع لصالح حالة - ${caseData.title || 'غير معروف'}`;
            
            const total = parseFloat(caseData.total) || 0;
            const donated = parseFloat(caseData.donated) || 0;
            const progressPercentage = total > 0 ? (donated / total) * 100 : 0;
            
            totalAmount.textContent = `الهدف: ${total} ₪`;
            donatedAmount.textContent = `تم جمعه: ${donated} ₪`;
            progressBar.style.width = `${progressPercentage}%`;
            progressText.textContent = `${Math.round(progressPercentage)}%`;
            
            // بدء التحديث التلقائي
            startProgressUpdater(caseId);
            
        } else {
            console.error('❌ Case not found. Available IDs:', 
                casesArray.map(c => c._id || c.id || 'N/A'));
            
            // إذا ما لقينا الحالة، نعرض أول حالة
            const firstCase = casesArray[0];
            if (firstCase) {
                console.warn('⚠️ Using first case as fallback');
                caseTitle.textContent = `أنت الآن تتبرع لصالح حالة - ${firstCase.title || 'عام'}`;
                const total = parseFloat(firstCase.total) || 0;
                const donated = parseFloat(firstCase.donated) || 0;
                const progressPercentage = total > 0 ? (donated / total) * 100 : 0;
                
                totalAmount.textContent = `الهدف: ${total} ₪`;
                donatedAmount.textContent = `تم جمعه: ${donated} ₪`;
                progressBar.style.width = `${progressPercentage}%`;
                progressText.textContent = `${Math.round(progressPercentage)}%`;
                
                // تحديث الـ URL ليشمل الـ ID الصحيح
                window.history.replaceState({}, '', `?id=${firstCase._id || firstCase.id}`);
                startProgressUpdater(firstCase._id || firstCase.id);
            } else {
                caseTitle.textContent = 'الحالة غير موجودة';
            }
        }
    })
    .catch(error => {
        console.error('❌ Error loading case data:', error);
        caseTitle.textContent = 'خطأ في تحميل البيانات';
        
        // بيانات افتراضية للطوارئ
        const caseId = new URLSearchParams(window.location.search).get('id');
        if (caseId) {
            caseTitle.textContent = `أنت الآن تتبرع لصالح حالة - ${caseId}`;
            totalAmount.textContent = 'الهدف: 10000 ₪';
            donatedAmount.textContent = 'تم جمعه: 3500 ₪';
            progressBar.style.width = '35%';
            progressText.textContent = '35%';
        }
    });

    // دالة التحديث التلقائي
   function startProgressUpdater(caseId) {
    console.log(`🔄 بدأ التحديث التلقائي للحالة: ${caseId}`);
    
    const interval = setInterval(async () => {
        try {
            console.log('🔄 جاري تحديث بيانات التقدم...');
            
            // 1. جلب البيانات من الـ API
            const response = await fetch('http://localhost:5003/api/ShowAllCases/');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 API Response for update:', data);
            
            // 2. تحويل الـ response إلى array
            let allCases = [];
            
            if (Array.isArray(data)) {
                // إذا الـ response نفسه array
                allCases = data;
            } else if (data.cases && Array.isArray(data.cases)) {
                // إذا فيه property اسمها cases
                allCases = data.cases;
            } else if (data.data && Array.isArray(data.data)) {
                // إذا فيه property اسمها data
                allCases = data.data;
            } else {
                // إذا كان object، ابحثي عن أي array فيه
                for (const key in data) {
                    if (Array.isArray(data[key])) {
                        allCases = data[key];
                        break;
                    }
                }
            }
            
            console.log(`📊 Found ${allCases.length} cases`);
            
            // 3. البحث عن الحالة المطلوبة
            if (allCases.length > 0) {
                const caseData = allCases.find(item => {
                    // تأكدي من تطابق الـ ID
                    return item._id === caseId || 
                           item.id === caseId ||
                           (item._id && item._id.toString() === caseId);
                });
                
                if (caseData) {
                    console.log('✅ Found case:', caseData);
                    
                    // حساب النسبة
                    const total = parseFloat(caseData.total) || 1;
                    const donated = parseFloat(caseData.donated) || 0;
                    const progressPercentage = (donated / total) * 100;
                    
                    // تحديث الواجهة
                    if (donatedAmount) {
                        donatedAmount.textContent = `تم جمعه: ${donated} ₪`;
                    }
                    if (progressBar) {
                        progressBar.style.width = `${progressPercentage}%`;
                    }
                    if (progressText) {
                        progressText.textContent = `${Math.round(progressPercentage)}%`;
                    }
                    
                    console.log('✅ تم تحديث بيانات التقدم:', {
                        donated,
                        total,
                        percentage: progressPercentage
                    });
                } else {
                    console.warn('⚠️ Case not found in update. Case ID:', caseId);
                    console.log('Available IDs:', allCases.map(c => c._id || c.id));
                }
            } else {
                console.warn('⚠️ No cases found in response');
            }
            
        } catch (error) {
            console.log('❌ تحديث التقدم فشل:', error.message || error);
        }
    }, 30000); // كل 30 ثانية

    // تنظيف المؤقت عند مغادرة الصفحة
    window.addEventListener('beforeunload', () => {
        clearInterval(interval);
        console.log('🧹 تم تنظيف مؤقت التحديث التلقائي');
    });
    
    return interval;
}

    // أزرار مبلغ التبرع
    const amountButtons = document.querySelectorAll('.amount-buttons button');
    
    amountButtons.forEach(button => {
        button.addEventListener('click', function() {
            amountButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            if (this.dataset.amount === 'custom') {
                customAmountInput.style.display = 'block';
                customAmountInput.focus();
                selectedAmount = parseFloat(customAmountInput.value) || 0;
            } else {
                customAmountInput.style.display = 'none';
                selectedAmount = parseFloat(this.dataset.amount);
            }
            updateDonateButtonText(); 
        });
    });

    // تحديث المبلغ المختار من الحقل المخصص
    customAmountInput.addEventListener('input', function() {
        selectedAmount = parseFloat(this.value) || 0;
        updateDonateButtonText(); 
    });

    // معالجة التبرع عند submit الفورم
    donationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
   
        // التحقق من صحة التوكن مرة أخرى قبل الإرسال
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            Swal.fire({
                icon: 'error',
                title: 'انتهت الجلسة',
                text: 'يرجى تسجيل الدخول مرة أخرى',
                confirmButtonText: 'تسجيل الدخول'
            }).then(() => {
                window.location.href = 'login.html';
            });
            return;
        }

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const idcard = document.getElementById('idcard').value.trim();
        const paymentMethod = document.querySelector('input[name="payment"]:checked');

        // التحقق من الحقول المطلوبة
        if (!name || !email || !phone || !idcard || !paymentMethod) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ تنبيه',
                text: 'يرجى ملء جميع الحقول المطلوبة واختيار طريقة الدفع'
            });
            return;
        }

        // التحقق من المبلغ
        if (!selectedAmount || selectedAmount <= 0) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ تنبيه',
                text: 'الرجاء إدخال مبلغ صحيح للتبرع'
            });
            return;
        }

        // التحقق من صحة البيانات
        if (!validateEmail(email)) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ بريد إلكتروني غير صحيح',
                text: 'يرجى إدخال بريد إلكتروني صحيح'
            });
            return;
        }

        if (!validatePhone(phone)) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ رقم هاتف غير صحيح',
                text: 'يرجى إدخال رقم هاتف صحيح'
            });
            return;
        }

        if (!validateIdCard(idcard)) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ رقم هوية غير صحيح',
                text: 'يرجى إدخال رقم هوية صحيح (أرقام فقط)'
            });
            return;
        }

        // تعطيل الزر أثناء المعالجة
        donateBtn.disabled = true;
        donateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';

        try {
            // معالجة الدفع
            const paymentResult = await handlePayment(paymentMethod.value, selectedAmount, currency, { 
                name, email, phone, idcard
            });

            if (paymentResult.success) {
                thankMessage.style.display = 'block';
                thankMessage.scrollIntoView({ behavior: 'smooth' });

                // تحديث حالة التبرع
                await updateDonationStatus(caseId, selectedAmount, { 
                    name, email, phone, idcard,
                    anonymous: document.getElementById('anonymous').checked,
                    paymentMethod: paymentMethod.value,
                    transactionId: paymentResult.transactionId,
                    currency: currency
                });

                setTimeout(() => {
                    donationForm.reset();
                    amountButtons.forEach(btn => btn.classList.remove("active"));
                    customAmountInput.style.display = "none";
                    selectedAmount = 0;
                    updateDonateButtonText();
                }, 3000);

            } else {
                Swal.fire({
                    icon: 'error',
                    title: '❌ فشل في عملية الدفع',
                    text: `${paymentResult.message}`
                });
            }

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: '❌ خطأ',
                text: 'حدث خطأ أثناء عملية الدفع'
            });
            console.error('Payment error:', error);
        } finally {
            donateBtn.disabled = false;
            updateDonateButtonText();
        }
    });

    // دالة اختيار طريقة الدفع
    async function handlePayment(method, amount, currency, donorInfo) {
        switch (method) {
            case "card":
                return await handleCardPayment(amount, currency, donorInfo);
            case "paypal":
                return await handlePayPalPayment(amount, currency, donorInfo);
            case "wallet":
                return await handleWalletPayment(amount, currency, donorInfo);
            case "transfer":
                return await handleBankTransfer(amount, currency, donorInfo);
            default:
                return { success: false, message: "طريقة دفع غير معروفة" };
        }
    }

    // الدوال الخاصة بالدفع
    async function handleCardPayment(amount, currency, donorInfo) {
        return new Promise((resolve) => {
            const cardForm = `
                <div id="cardPaymentModal" class="payment-modal">
                    <div class="modal-content">
                        <h3><i class="fas fa-credit-card"></i> الدفع بالبطاقة البنكية</h3>
                        <div class="form-group"><label>رقم البطاقة</label><input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19"></div>
                        <div class="form-row">
                            <div class="form-group"><label>تاريخ الانتهاء</label><input type="text" id="expiryDate" placeholder="MM/YY" maxlength="5"></div>
                            <div class="form-group"><label>CVV</label><input type="text" id="cvv" placeholder="123" maxlength="4"></div>
                        </div>
                        <div class="form-group"><label>اسم حامل البطاقة</label><input type="text" id="cardHolder" placeholder="${donorInfo.name}"></div>
                        <div class="modal-buttons">
                            <button id="cancelCard" type="button">إلغاء</button>
                            <button id="payCard" type="button">دفع ${amount} ${currency}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', cardForm);

            document.getElementById('cancelCard').addEventListener('click', () => {
                closeModal('cardPaymentModal', () => resolve({ success: false, message: 'تم إلغاء عملية الدفع' }));
            });

            document.getElementById('payCard').addEventListener('click', () => {
                closeModal('cardPaymentModal');
                resolve({ success: true, transactionId: 'CARD_' + Date.now() });
            });
        });
    }

    async function handlePayPalPayment(amount, currency, donorInfo) {
        return new Promise((resolve) => {
            const paypalWindow = window.open('https://www.paypal.com/cgi-bin/webscr?cmd=_donations&amount=' + amount + '&currency_code=' + currency, 'paypalWindow', 'width=600,height=700');
            const interval = setInterval(() => {
                if (paypalWindow.closed) {
                    clearInterval(interval);
                    if (confirm('هل تمت عملية الدفع بنجاح عبر PayPal؟')) {
                        resolve({ success: true, transactionId: 'PAYPAL_' + Date.now() });
                    } else {
                        resolve({ success: false, message: 'فشل عملية الدفع عبر PayPal' });
                    }
                }
            }, 500);
        });
    }

    async function handleWalletPayment(amount, currency, donorInfo) {
        return new Promise((resolve) => {
            const walletModalHTML = `
                <div id="walletPaymentModal" class="payment-modal">
                    <div class="modal-content">
                        <h3><i class="fas fa-wallet"></i> الدفع بالمحفظة الإلكترونية</h3>
                        <div class="wallet-form">
                            <p><strong>المبلغ:</strong> ${amount} ${currency}</p>
                            <p><strong>المستفيد:</strong> GiveHope Foundation</p>
                            <p><strong>الرقم المرجعي:</strong> WALLET_${Date.now()}</p>
                            <label for="verificationCode">أدخل رمز التحقق:</label>
                            <input type="text" id="verificationCode" placeholder="أدخل الرمز المكون من 4 أرقام">
                        </div>
                        <div class="modal-buttons">
                            <button id="cancelWallet" type="button">إلغاء</button>
                            <button id="confirmWallet" type="button">تأكيد الدفع</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', walletModalHTML);

            const verificationCodeInput = document.getElementById('verificationCode');
            const confirmButton = document.getElementById('confirmWallet');

            document.getElementById('cancelWallet').addEventListener('click', () => {
                closeModal('walletPaymentModal', () => resolve({ success: false, message: 'تم إلغاء عملية الدفع' }));
            });

            confirmButton.addEventListener('click', () => {
                const verificationCode = verificationCodeInput.value;
                if (verificationCode && verificationCode.length >= 4) {
                    closeModal('walletPaymentModal');
                    setTimeout(() => resolve({ success: true, transactionId: 'WALLET_' + Date.now() }), 1000);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: '⚠️ تحقق',
                        text: 'رمز التحقق غير صحيح أو لم يتم إدخاله بشكل صحيح'
                    });
                }
            });
        });
    }

    async function handleBankTransfer(amount, currency, donorInfo) {
        return new Promise((resolve) => {
            const transferInfo = `
                <div id="bankTransferModal" class="payment-modal">
                    <div class="modal-content">
                        <h3><i class="fas fa-university"></i> التحويل البنكي</h3>
                        <div class="transfer-details">
                            <p><strong>اسم البنك:</strong> البنك الإسلامي الفلسطيني</p>
                            <p><strong>رقم الحساب:</strong> PS00 PALS 0123 4567 8901 2345</p>
                            <p><strong>اسم المستفيد:</strong> GiveHope Foundation</p>
                            <p><strong>المبلغ:</strong> ${amount} ${currency}</p>
                            <p><strong>الرقم المرجعي:</strong> REF_${Date.now()}</p>
                        </div>
                        <div class="instructions">
                            <p>⏳ الرجاء إرسال صورة التحويل إلى Zaka.anb@hotmail.com</p>
                            <p>✅ سيتم تفعيل التبرع خلال 24 ساعة من استلام التحويل</p>
                        </div>
                        <div class="modal-buttons">
                            <button id="cancelBank" type="button">إلغاء</button>
                            <button id="confirmBank" type="button">تأكيد التحويل</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', transferInfo);

            document.getElementById('cancelBank').addEventListener('click', () => {
                closeModal('bankTransferModal', () => resolve({ success: false, message: 'تم إلغاء عملية الدفع' }));
            });

            document.getElementById('confirmBank').addEventListener('click', () => {
                closeModal('bankTransferModal');
                resolve({ success: true, transactionId: 'BANK_' + Date.now() });
            });
        });
    }

    // دالة إغلاق النوافذ
    function closeModal(modalId, onclose) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
            if (typeof onclose === 'function') onclose();
        }
    }
// function getAuthToken() {
//     // 1. حاول جلب الرمز من SessionStorage (الجلسة الحالية)
//     let token = sessionStorage.getItem('token');
//     if (token) {
//         return token;
//     }
//     // 2. إذا لم تجده، حاول جلب الرمز من LocalStorage (تذكرني)
//     token = localStorage.getItem('token');
//     return token;
// }
    // تحديث حالة التبرع (إرسال البيانات)
    // دالة تحديث حالة التبرع (إرسال البيانات)
async function updateDonationStatus(caseId, amount, donationInfo) {
    try {
        // 1. جلب التوكن
        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'انتهت الجلسة',
                text: 'يرجى تسجيل الدخول مرة أخرى',
                confirmButtonText: 'تسجيل الدخول'
            }).then(() => {
                window.location.href = 'login.html';
            });
            return;
        }

        console.log('🔑 Token exists, fetching user data...');

        // 2. جلب بيانات المستخدم الحالي من الـ backend
        let currentUser = null;
        let userName = '';
        let userId = '';
        
        try {
            const userResponse = await fetch('http://localhost:5003/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('👤 User API response status:', userResponse.status);
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log('👤 User data received:', userData);
                
                if (userData.success && userData.user) {
                    currentUser = userData.user;
                    userId = currentUser.id || currentUser._id;
                    userName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
                }
            } else {
                console.warn('⚠️ User API failed:', userResponse.status);
            }
        } catch (userError) {
            console.warn('⚠️ Could not fetch user:', userError);
        }

        // 3. تحضير بيانات التبرع
        const donationData = {
            caseId: caseId,
            amount: amount,
            currency: donationInfo.currency,
            donorInfo: {
                name: donationInfo.name,
                email: donationInfo.email,
                phone: donationInfo.phone,
                idcard: donationInfo.idcard,
            },
            paymentMethod: donationInfo.paymentMethod,
            anonymous: donationInfo.anonymous,
            transactionId: donationInfo.transactionId
        };

        // 4. إضافة معلومات الكاتب إذا كانت موجودة
        if (userId && userName) {
            donationData.authorId = userId;
            donationData.authorName = userName;
            console.log('📝 Added author info:', { authorId: userId, authorName: userName });
        } else {
            console.warn('⚠️ No user info available, using donor name as author');
            donationData.authorId = 'anonymous';
            donationData.authorName = donationInfo.name;
        }

        // 5. إضافة CSRF token إذا كان موجوداً
        const csrfToken = await getCSRFToken();
        
        console.log('📤 Sending donation data:', donationData);

        // 6. إرسال طلب التبرع
        const response = await fetch('http://localhost:5003/api/donations', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-CSRF-Token': csrfToken || 'temp-csrf'
            },
            body: JSON.stringify(donationData)
        });

        const result = await response.json();
        console.log('📥 Donation response:', {
            status: response.status,
            ok: response.ok,
            data: result
        });

        // 7. معالجة الرد
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '🎉 تم التبرع بنجاح',
                text: 'شكرًا لدعمك، تم تسجيل تبرعك بنجاح ❤️, وتم إرسال إيصال التبرع إلى ايميلك',
                timer: 3000,
                showConfirmButton: true
            });
            
            // تحديث الصفحة بعد ثواني
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
        } else {
            // إذا كان الخطأ متعلق بالمستخدم
            if (result.message && result.message.includes('Author ID')) {
                Swal.fire({
                    icon: 'error',
                    title: '⚠️ مشكلة في بيانات المستخدم',
                    html: `
                        <div style="text-align: right; direction: rtl;">
                            <p>لم يتم التعرف على حسابك بشكل صحيح.</p>
                            <p>يرجى:</p>
                            <ol>
                                <li>تسجيل الخروج ثم الدخول مرة أخرى</li>
                                <li>إذا استمرت المشكلة، تواصل مع الدعم الفني</li>
                            </ol>
                        </div>
                    `,
                    confirmButtonText: 'حسناً'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: '⚠️ فشل في العملية',
                    text: result.message || 'حدث خطأ أثناء إرسال التبرع',
                    confirmButtonText: 'حسناً'
                });
            }
        }

    } catch (error) {
        console.error('❌ خطأ في إرسال التبرع:', error);
        Swal.fire({
            icon: 'error',
            title: '❌ خطأ في الشبكة',
            text: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى',
            confirmButtonText: 'حسناً'
        });
    }
}

});

// دالة تعديل اتجاه النص
function autoDirection(input) {
    input.addEventListener("input", function() {
        if (/^[\u0600-\u06FF]/.test(this.value)) {
            this.style.direction = "rtl";
            this.style.textAlign = "right";
        } else if (/^[A-Za-z0-9]/.test(this.value)) {
            this.style.direction = "ltr";
            this.style.textAlign = "left";
        } else if (this.value.trim() === "") {
            this.style.direction = "rtl";
            this.style.textAlign = "right";
        }
    });
}

// تطبيق autoDirection على الحقول
autoDirection(document.getElementById("name"));
autoDirection(document.getElementById("email"));
autoDirection(document.getElementById("phone"));
autoDirection(document.getElementById("idcard"));

    //************************************************************************************************/
        // بيانات الأسئلة والأجوبة
    const faq = {
        "كيف أتبرع؟": "للتبرع، يرجى ملء النموذج أعلاه واختيار مبلغ التبرع وطريقة الدفع المناسبة",
        " طريقه الدفع؟": "بطاقة / باي بال / محفظة / حوالة",
        " كم المبلغ؟'": "إذا ضغطت على “مخصص” يدخل الرقم، أو اختر أحد الأزرار المسبقة (50,100...)",
        "  التبرع من مجهول ؟": "بشكل تلقائي تم تفعيل التبرع بالمجهول لكن اذا ارت اظهار اسمك الغي هذا التفعيل",
    };

    // رسائل ترحيب عشوائية
    const welcomeMessages = [
        "مرحباً! كيف يمكنني مساعدتك اليوم؟ 😊",
        "أهلاً بك! أنا هنا للإجابة على استفساراتك حول التبرع. 🤗",
        "مساء الخير! ما الذي يمكنني مساعدتك به اليوم؟ 🌟",
        "أهلاً! أسعدني تواصلك معنا. كيف يمكنني مساعدتك؟ 💙"
    ];

    function toggleChat() {
        const chatbotWindow = document.getElementById('chatbotWindow');
        if (chatbotWindow.style.display === 'flex') {
            chatbotWindow.classList.remove('active');
            setTimeout(() => {
                chatbotWindow.style.display = 'none';
            }, 300);
        } else {
            chatbotWindow.style.display = 'flex';
            setTimeout(() => {
                chatbotWindow.classList.add('active');
            }, 10);
            
            // إضافة رسالة ترحيب عشوائية عند فتح الشات
            setTimeout(() => {
                const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
                addBotMessage(randomWelcome);
            }, 500);
        }
    }

    function sendQuickReply(question) {
        // إظهار مؤشر الكتابة
        const typingIndicator = document.getElementById('typingIndicator');
        typingIndicator.style.display = 'block';
        
        // إضافة رسالة المستخدم أولاً
        addUserMessage(question);
        
        // محاكاة وقت الكتابة ثم إظهار الرد
        setTimeout(() => {
            typingIndicator.style.display = 'none';
            sendMessage(question);
        }, 1000);
    }

    function sendMessage(question) {
        const chatbotBody = document.getElementById('chatbotBody');

        let response = "عذرًا، لم أفهم سؤالك. جرب سؤال آخر 🙏";
        if (faq[question]) {
            response = faq[question];
        }

        addBotMessage(response);
    }

    function addUserMessage(message) {
        const chatbotBody = document.getElementById('chatbotBody');
        const userMessage = document.createElement('div');
        userMessage.className = 'chatbot-message user-message';
        userMessage.textContent = message;
        chatbotBody.appendChild(userMessage);
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
    }

    function addBotMessage(message) {
        const chatbotBody = document.getElementById('chatbotBody');
        const botMessage = document.createElement('div');
        botMessage.className = 'chatbot-message bot-message';
        botMessage.textContent = message;
        chatbotBody.appendChild(botMessage);
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
    }

    function sendUserMessage() {
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();
        
        if (message !== '') {
            // إظهار مؤشر الكتابة
            const typingIndicator = document.getElementById('typingIndicator');
            typingIndicator.style.display = 'block';
            
            // إضافة رسالة المستخدم أولاً
            addUserMessage(message);
            userInput.value = '';
            
            // محاكاة وقت الكتابة ثم إظهار الرد
            setTimeout(() => {
                typingIndicator.style.display = 'none';
                sendMessage(message);
            }, 1000);
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            sendUserMessage();
        }
    }

    document.addEventListener('click', function(event) {
        const chatbotWindow = document.getElementById('chatbotWindow');
        const chatbotIcon = document.querySelector('.chatbot-icon');
        
        if (!chatbotWindow.contains(event.target) && !chatbotIcon.contains(event.target)) {
            if (chatbotWindow.style.display === 'flex') {
                chatbotWindow.classList.remove('active');
                setTimeout(() => {
                    chatbotWindow.style.display = 'none';
                }, 300);
            }
        }
    });


