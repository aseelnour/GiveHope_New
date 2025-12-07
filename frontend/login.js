
import { registerDeviceToken } from './pages/notificationAPI.js'; //for notification
// JavaScript for Arabic Login Page

document.addEventListener('DOMContentLoaded', function () {
    // Get form elements
    const loginForm = document.getElementById('loginForm');
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    const loginPassword = document.getElementById('loginPassword');

    // Success modal
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    const successMessage = document.getElementById('successMessage');

    // API Configuration
    const API_URL = 'http://localhost:5003/api/auth/login';
 
    // Arabic messages
    const messages = {
        buttons: {
            signingIn: 'جاري تسجيل الدخول...',
            signIn: 'تسجيل الدخول'
        },
        success: {
            signIn: 'أهلاً بعودتك! تم تسجيل الدخول بنجاح'
        },
        error: {
            invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
            serverError: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى',
            networkError: 'خطأ في الاتصال بالخادم. تأكد من تشغيل السيرفر'
        },
        validation: {
            emailInvalid: 'يرجى إدخال عنوان بريد إلكتروني صحيح',
            fieldRequired: 'هذا الحقل مطلوب'
        }
    };

    // Password visibility toggle functionality
    toggleLoginPassword.addEventListener('click', function () {
        const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPassword.setAttribute('type', type);

        const icon = this.querySelector('i');
        if (type === 'text') {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });

    // Form validation
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required]');

        inputs.forEach(input => {
            const value = input.value.trim();

            // Remove previous validation classes
            input.classList.remove('is-valid', 'is-invalid');

            if (value === '') {
                input.classList.add('is-invalid');
                isValid = false;
            } else if (input.type === 'email' && !validateEmail(value)) {
                input.classList.add('is-invalid');
                isValid = false;
            } else {
                input.classList.add('is-valid');
            }
        });

        return isValid;
    }

    function clearValidation(form) {
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
    }

    // Show error message
    function showError(message) {
        // Create alert element if it doesn't exist
        let alertDiv = document.querySelector('.alert-danger');
        if (!alertDiv) {
            alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.setAttribute('role', 'alert');
            loginForm.insertBefore(alertDiv, loginForm.firstChild);
        }

        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv && alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Form submission handler
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (validateForm(this)) {
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            // Get form values
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            // Show loading state
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm ms-2"></span>${messages.buttons.signingIn}`;
            submitBtn.disabled = true;

            try {
                // Make API call
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Store token and user info
                    if (rememberMe) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    } else {
                        sessionStorage.setItem('token', data.token);
                        sessionStorage.setItem('user', JSON.stringify(data.user));
                    }
 
      
                    // Show success message
                    successMessage.textContent = messages.success.signIn;
                    successModal.show();

// تسجيل device token للإشعارات
registerDeviceToken(data.token);

                    // Clear form 
                    this.reset();
                    clearValidation(this);

                    // Redirect after modal
                    setTimeout(() => {
        const redirectUrl = localStorage.getItem('redirectUrl');
        
        if (redirectUrl) {
            // 1. توجيه للصفحة التي كان يحاول زيارتها
            localStorage.removeItem('redirectUrl');
             window.location.href = redirectUrl;
        } else if (data.user.type === 'needy') {
            // 2. إذا لا يوجد، توجيه حسب النوع
           window.location.href = 'donation-type-selection.html';
        } else {
            window.location.href = 'HomePage.html';
        }
    }, 1500);
    
                } else {
                    // Handle error response
                    let errorMessage = messages.error.invalidCredentials;

                    if (data.message) {
                        if (data.message.includes('Invalid credentials')) {
                            errorMessage = messages.error.invalidCredentials;
                        } else {
                            errorMessage = data.message;
                        }
                    } else if (data.errors && data.errors.length > 0) {
                        errorMessage = data.errors.map(err => err.msg).join(', ');
                    }

                    showError(errorMessage);
                }
            } catch (error) {
                console.error('Login error:', error);
                showError(messages.error.networkError);
            } finally {
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    });

    // Real-time validation for better UX
    const allInputs = document.querySelectorAll('input');
    allInputs.forEach(input => {
        input.addEventListener('blur', function () {
            if (this.value.trim() !== '') {
                if (this.type === 'email' && !validateEmail(this.value)) {
                    this.classList.add('is-invalid');
                    this.classList.remove('is-valid');
                } else {
                    this.classList.add('is-valid');
                    this.classList.remove('is-invalid');
                }
            }
        });

        input.addEventListener('input', function () {
            // Remove invalid class when user starts typing
            if (this.classList.contains('is-invalid')) {
                this.classList.remove('is-invalid');
            }

            // Remove any error alerts
            const alertDiv = document.querySelector('.alert-danger');
            if (alertDiv) {
                alertDiv.remove();
            }
        });
    });

    // RTL-specific enhancements
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('focus', function () {
            // Ensure cursor starts at the right position for RTL
            setTimeout(() => {
                if (this.value === '') {
                    this.style.textAlign = 'right';
                }
            }, 10);
        });

        input.addEventListener('input', function () {
            // Maintain RTL alignment while typing
            this.style.textAlign = 'right';
        });
    });

    // Handle form auto-fill detection
    function checkAutoFill() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.value !== '') {
                input.classList.add('is-valid');
            }
        });
    }

    // Check for auto-filled inputs after a short delay
    setTimeout(checkAutoFill, 500);

    // Also check when the page becomes visible (user switches tabs)
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            setTimeout(checkAutoFill, 100);
        }
    });

    // Check if user is already logged in
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
        window.location.href = 'Thedonor.html';
    }


});


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(reg => console.log("✅ SW registered", reg))
        .catch(err => console.error("❌ SW registration failed:", err));
}


 
