
/**
 * 1. دالة تحديث عداد الإشعارات
 * يتم استدعاؤها عندما يصل إشعار جديد في الواجهة الأمامية.
 */
export const updateNotificationCount = () => {
    // 🚨 افتراض: وجود عنصر بالـ id التالي في شريط التنقل العلوي للتطبيق
    const notificationCountElement = document.getElementById('notification-count');
    
    if (notificationCountElement) {
        let currentCount = parseInt(notificationCountElement.textContent);
        currentCount = isNaN(currentCount) ? 0 : currentCount;
        notificationCountElement.textContent = currentCount + 1;
        
        // يمكن إضافة تأثير بصري (مثل وميض) هنا
        console.log(`Notification count updated to: ${currentCount + 1}`);
    } else {
        console.warn('Could not find #notification-count element to update.');
    }
};

/**
 * 2. دالة عرض شريط التنبيه (Snackbar)
 */
export const displaySnackbar = (data) => {
    // 🚨 افتراض: وجود حاوية بالـ id التالي في أسفل يمين الصفحة
    const container = document.getElementById('snackbar-container'); 
    
    if (!container) {
        console.error('Snackbar container (#snackbar-container) not found.');
        return;
    }
    
    const { title, body, link } = data;

    // إنشاء عنصر Snackbar جديد بتصميم Tailwind CSS
    const snackbar = document.createElement('div');
    snackbar.className = 'snackbar p-4 bg-white text-gray-800 border-r-4 border-indigo-500 shadow-xl rounded-lg max-w-sm opacity-0 transition-opacity duration-300 transform translate-x-10';
    
    snackbar.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <p class="font-bold text-sm text-indigo-600">${title}</p>
                <p class="text-xs mt-1">${body}</p>
            </div>
            <button class="text-gray-400 hover:text-gray-600 ml-3 close-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        ${link ? `<a href="${link}" class="block mt-2 text-xs text-blue-500 hover:text-blue-700 font-semibold">عرض التفاصيل</a>` : ''}
    `;
    
    // إضافة Snackbar وإظهاره
    container.appendChild(snackbar);
    setTimeout(() => {
        snackbar.classList.remove('opacity-0', 'translate-x-10');
        snackbar.classList.add('opacity-100', 'translate-x-0');
    }, 10);

    // إخفاء Snackbar بعد 5 ثواني
    const timeoutId = setTimeout(() => {
        hideSnackbar(snackbar);
    }, 5000);

    // معالج لإغلاق الـ Snackbar يدوياً
    snackbar.querySelector('.close-btn').addEventListener('click', () => {
        clearTimeout(timeoutId);
        hideSnackbar(snackbar);
    });
};

function hideSnackbar(snackbar) {
    snackbar.classList.remove('opacity-100', 'translate-x-0');
    snackbar.classList.add('opacity-0', 'translate-x-10');
    
    snackbar.addEventListener('transitionend', () => {
        if (snackbar.parentNode) {
           snackbar.remove();
        }
    }, { once: true });
}