// Service Worker pour Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBsGrY-AqYMoI70kT3WMxLgW0HwYA4KyaQ",
    authDomain: "livraison-c8498.firebaseapp.com",
    projectId: "livraison-c8498",
    storageBucket: "livraison-c8498.firebasestorage.app",
    messagingSenderId: "403240604780",
    appId: "1:403240604780:web:77d84ad03d68bdaddfb449"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Obtenir l'instance de messaging
const messaging = firebase.messaging();

// Gérer les messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
    console.log('Message reçu en arrière-plan:', payload);
    
    const notificationTitle = payload.notification?.title || 'GROUPE EXPRESS';
    const notificationOptions = {
        body: payload.notification?.body || 'Nouveau message',
        icon: '/image/u.png',
        badge: '/image/GE.jpg',
        tag: 'groupe-express',
        requireInteraction: false
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});
