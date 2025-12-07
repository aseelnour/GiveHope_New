// دالة تحميل HTML
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

// تهيئة النافبار
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

// تحميل النافبار والفوتر عند بدء التحميل
window.addEventListener('DOMContentLoaded', function() {
    loadHTML('navbar.html', 'navbar-placeholder');
    loadHTML('footer.html', 'footer-placeholder');
});


      
      //************************************************************************************************/
        // بيانات الأسئلة والأجوبة
    const faq = {
        "كيف أتبرع؟": "للتبرع اضغط على زر 'تبرع الآن' بالأعلى، وسيتم توجيهك لخطوات الدفع.",
        "هل المبلغ يصل مباشرة للمستفيد؟": "نعم، المبلغ يصل أولاً للجمعية ثم يتم تحويله للمستفيد وسيصلك إشعارات عند كل مرحلة.",
        "هل التبرع آمن؟": "نعم، جميع عمليات التبرع مؤمنة وتتم عبر الجمعية بشكل رسمي وسري.",
        "هل عملية التبرع تجري بشفافية؟": "نعم، جميع عمليات التبرع شفافة ويتم توثيقها رسمياً وسيصلك إيصال دفع.",
        "هل عملية التبرع تحدث بسرية تامة؟": "نعم، جميع عمليات التبرع سرية تماماً ولا يُكشف عن هوية المحتاج أبداً.",
        "هل أقدر أتبرع بمبلغ صغير؟": "نعم، يمكنك التبرع بأي مبلغ مهما كان بسيطاً.",
        "شو بصير إذا اكتمل المبلغ؟": "عند اكتمال المبلغ المطلوب، يتم إغلاق الحالة وحذفها من الموقع     .",
        "كيف أتأكد من صحة الحالة؟": "تمت مراجعة جميع الأوراق الرسمية والتأكد من صحة الحالة من قبل الجمعية.",
        "هل يمكنني التبرع بشكل مجهول؟": "نعم يمكنك اختيار التبرع بشكل مجهول.لن يعرف الشخص من تبرع له و لن نذكر اسمك في أي منشورات أو تقارير",
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




// --- Modal Logic ---
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const isShowing = modal.classList.contains('show');
    
    if (isShowing) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
        // Return focus to the button that opened the modal
        document.getElementById(modal.dataset.trigger).focus();
    } else {
        modal.classList.add('show');
         document.body.style.overflow = 'hidden'; // Disable scrolling
        const closeBtn = modal.querySelector('.btn-close');
        if (closeBtn) closeBtn.focus();
    }
}

// Attach event listeners to open modal
document.addEventListener('DOMContentLoaded', () => {
    const modalBtn = document.getElementById('shareBtn');
    if (modalBtn) {
        modalBtn.addEventListener('click', () => {
            const modalId = modalBtn.getAttribute('data-bs-target').replace('#', '');
            toggleModal(modalId);
        });
        document.getElementById('shareModal').dataset.trigger = 'shareBtn';
    }
    
    // Attach event listeners to close modal
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                toggleModal(modal.id);
            }
        });
    });
    
    // Close modal when clicking outside
    document.getElementById('shareModal').addEventListener('click', (e) => {
        if (e.target.id === 'shareModal') {
            toggleModal('shareModal');
        }
    });
});

// --- Toast Logic ---
function showToast(toastId) {
    const toastElement = document.getElementById(toastId);
    if (!toastElement) return;

    toastElement.classList.add('show');

    // Hide the toast after 3 seconds
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3000);
}

// --- Your existing sharing logic, updated to use the new functions ---
document.addEventListener("DOMContentLoaded", function() {
    const shareData = {
        title: "حالة محتاجة للتبرع",
        text: "ساعد في نشر الخير بمشاركة هذه الحالة 🌸",
        url: window.location.href
    };

    const whatsappBtn = document.getElementById("whatsapp-share");
    if (whatsappBtn) {
        whatsappBtn.addEventListener("click", () => {
            const encodedText = encodeURIComponent(`${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`);
            const whatsappUrl = `https://wa.me/?text=${encodedText}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    const facebookBtn = document.getElementById("facebook-share");
    if (facebookBtn) {
        facebookBtn.addEventListener("click", () => {
            const encodedUrl = encodeURIComponent(shareData.url);
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            window.open(facebookUrl, '_blank');
        });
    }

    const copyLinkBtn = document.getElementById("copy-link");
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(shareData.url);
                
                // Use the custom function to show the toast
                showToast('copyToast');

                // Use the custom function to close the modal
                toggleModal('shareModal');
                
            } catch (err) {
                console.error("Failed to copy link:", err);
                alert("تعذر نسخ الرابط. يرجى محاولة النسخ يدويًا.");
            }
        });
    }

    // Since you asked for a tooltip, here is a simple custom implementation
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        el.addEventListener('mouseover', () => {
            const tooltipText = el.getAttribute('title');
            if (!tooltipText) return;
            el.dataset.title = tooltipText; // Store the original title
            el.removeAttribute('title');
            
            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.textContent = tooltipText;
            document.body.appendChild(tooltip);

            const rect = el.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
        });
        el.addEventListener('mouseout', () => {
            const tooltip = document.querySelector('.custom-tooltip');
            if (tooltip) tooltip.remove();
            el.setAttribute('title', el.dataset.title); // Restore the original title
        });
    });
});







// دالة لتحديد إذا كانت الحالة عاجلة - نفس الدالة في ShowAllCasess.js
function isUrgent(deadline) {
    if (!deadline) return false;
    
    try {
        let deadlineDate;
        
        if (deadline instanceof Date) {
            deadlineDate = new Date(deadline);
        } else if (typeof deadline === 'string') {
            const dateStr = deadline.split('T')[0]; 
            const [year, month, day] = dateStr.split('-').map(Number);
            deadlineDate = new Date(year, month - 1, day);
        } else {
            deadlineDate = new Date(deadline);
        }
        
        if (isNaN(deadlineDate.getTime())) {
            return false;
        }
        
        const today = new Date();
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const deadlineLocal = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
        
        const diffTime = deadlineLocal - todayLocal;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= 20 && diffDays >= 0;
    } catch (error) {
        console.error('Error calculating urgency:', error);
        return false;
    }
}
















document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const caseId = params.get("id");  // الآن string (لـ _id)

    if (!caseId) {
        console.error('No case ID provided');
        return;
    }

    document.querySelector(".donate-button").setAttribute("href", `DonateNow.html?id=${caseId}`);

    fetch(`/api/casedetails/${caseId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }
            return res.json();
        })   

        .then(c => {
        
const urgent = isUrgent(c.deadline);

const titleText = urgent
  ? `<span style="color: #ff4444;"> حالة عاجلة</span> - ${c.title} 🚨`
  : ` حالة - ${c.title}`;

document.getElementById("caseTitle").innerHTML = titleText;



            document.getElementById("caseImage").src = c.image;
            document.getElementById("totalAmount").textContent = `${c.total} ₪`;
            document.getElementById("donatedAmount").textContent = `${c.donated} ₪`;
            document.getElementById("remainingAmount").textContent = `${c.total - c.donated} ₪`;
            document.getElementById("donationsCount").textContent = `${c.donationsCount} عمليات`;
            document.getElementById("publishDate").textContent = c.publishDate;
            document.getElementById("deadline").textContent = c.deadline;
            document.getElementById("caseDescription").textContent = c.description;
            document.getElementById("otherDescription").textContent = c.otherDescription;
            document.getElementById("caseType").textContent = getTypeName(c.type);

            // البروجريس بار
            const percent = Math.floor((c.donated / c.total) * 100);
            document.getElementById("progressBar").style.width = `${percent}%`;
            document.getElementById("progressText").textContent = `${percent}% مكتمل`;
        })
        .catch(error => {
            console.error('Error fetching case details:', error);
        });
});


function getTypeName(type) {
    switch(type) {
        case "health": return "صحية";
        case "education": return "تعليمية";
        case "living": return "معيشية";
        case "orphans": return "رعاية أيتام";
        case "Emergency": return "طوارئ";
        default: return "أخرى";
    }
}
