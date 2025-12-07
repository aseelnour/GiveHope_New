// notificationAPI.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging.js";


export async function registerDeviceToken(userToken) {
    try {
        console.log("📱 Registering device token...");
        console.log("User token:", userToken);

        if (!('serviceWorker' in navigator)) {
            console.warn("Service Worker not supported");
            return;
        }

        // تسجيل الـ SW
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log("✅ SW registered", swReg);

        // طلب الإذن للإشعارات
        const permission = await Notification.requestPermission();
        console.log("Notification permission:", permission);
        if (permission !== "granted") return;

        // === Initialize Firebase ===
        const firebaseConfig = {
            apiKey: "AIzaSyB5j-eUIk1reXC-ZBswdRHP9YCXPoqbyYQ",
            authDomain: "givehope-ef489.firebaseapp.com",
            projectId: "givehope-ef489",
            storageBucket: "givehope-ef489.firebasestorage.app",
            messagingSenderId: "295123532414",
            appId: "1:295123532414:web:58d3beed76167d8de0362f",
            measurementId: "G-7Z70Z023VK"
        };

        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        // الحصول على FCM token
        const fcmToken = await getToken(messaging, {
            vapidKey: "BOmATSp_zj7di5r5fd7KMNj-ExI4OzPEqy_zD6_Er1rk0fUNYIvmnAtG0d01xNLQCtRBbCvxP9UStS7sRyzaKCM",
            serviceWorkerRegistration: swReg
        });

        console.log("🔥 FCM Token:", fcmToken);
        if (!fcmToken) {
            console.warn("⚠️ Failed to get FCM token");
            return;
        }

        // إرسال الـ token للـ backend
        const response = await fetch("http://localhost:4000/api/notifications/register-device", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${userToken}`
            },
            body: JSON.stringify({
                deviceToken: fcmToken,
                platform: "web"
            })
        });

        console.log("Backend response status:", response.status);
        if (response.ok) {
            console.log("✅ Device token registered successfully");
        } else {
            console.error("❌ Failed to register device token");
            const errorText = await response.text();
            console.error("Backend error:", errorText);
        }

    } catch (err) {
        console.error("❌ Error registering device token:", err);
    }
}