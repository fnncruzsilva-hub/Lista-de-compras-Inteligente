importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB3W3SG5RdPBeSHDSKB4qtZVvGuctERMxI",
  authDomain: "listou-app-5535f.firebaseapp.com",
  projectId: "listou-app-5535f",
  messagingSenderId: "221502013994",
  appId: "1:221502013994:web:25a35708c1fbec65f67953"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'Nova lista!';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
