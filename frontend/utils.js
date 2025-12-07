




 // دالة لتحميل HTML مع الحفاظ على فعالية السكربتات
    async function loadHTML(file, elementId) {
        try {
            const response = await fetch(file);
            const data = await response.text();
            const container = document.getElementById(elementId);
            container.innerHTML = data;
            
            // إعادة تهيئة الأحداث للعناصر المنقولة
            if (file === 'navbar.html') {
                initNavbar();
            }
            
            return true;
        } catch (error) {
            console.error('Error loading HTML:', error);
            return false;
        }
    }


// وظيفة للحصول على اسم النوع بالعربية
function getTypeName(type) {
    const typeNames = {
        "health": "صحية",
        "education": "تعليمية",
        "living": "معيشية",
        "orphans": "رعاية أيتام"
    };
    return typeNames[type] || "أخرى";
}


    
// وظيفة لتحديد ما إذا كانت الحالة عاجلة بناءً على الموعد النهائي
function isUrgent (deadline) {
    if (!deadline) return false;
    
    try {
        // تحويل تاريخ الموعد النهائي إلى كائن تاريخ
        const [day, month, year] = deadline.split('-').map(Number);
        const deadlineDate = new Date(year, month - 1, day); // الشهر يبدأ من 0 في JavaScript
        
        // تاريخ اليوم
        const today = new Date();
        
        // حساب الفرق بالأيام
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // إذا كان الموعد النهائي خلال أسبوعين أو أقل، تعتبر الحالة عاجلة
        return diffDays <= 20 && diffDays >= 0;
    } catch (error) {
        console.error('Error calculating urgency:', error);
        return false;
    }
}
