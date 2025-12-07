// sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyB5j-eUIk1reXC-ZBswdRHP9YCXPoqbyYQ",
    authDomain: "givehope-ef489.firebaseapp.com",
    projectId: "givehope-ef489",
    storageBucket: "givehope-ef489.firebasestorage.app",
    messagingSenderId: "295123532414",
    appId: "1:295123532414:web:58d3beed76167d8de0362f",
    measurementId: "G-7Z70Z023VK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Listen for background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || 'إشعار جديد';
    const notificationOptions = {
        body: payload.notification?.body || 'لديك إشعار جديد',
        icon: '/images/icon.png',
        badge: '/images/badge.png',
        data: {
            url: payload.data?.link || '/',
            notificationId: payload.data?.notificationId
        }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(urlToOpen);
        })
    );
});