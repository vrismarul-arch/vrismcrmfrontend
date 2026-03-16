/* Background Notifications */
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBcNTkpl4sv89fUMecf6vvmLilq7wmdb5Y",
  authDomain: "vrism-b96fc.firebaseapp.com",
  projectId: "vrism-b96fc",
  messagingSenderId: "376273879246",
  appId: "1:376273879246:web:835a60aa82508ae20f109f",
});

const messaging = firebase.messaging();

// 🔥 Show notification when app is in background
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "New Message";
  const body = payload.notification?.body || "Tap to open chat";

  const data = payload.data || {};

  const notificationOptions = {
    body,
    icon: "/logo192.png",
    badge: "/logo192.png",
    data, // include senderId for navigation
  };

  self.registration.showNotification(title, notificationOptions);
});

// 🔥 When notification is clicked → open relevant chat
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const senderId = event.notification?.data?.senderId;

  if (senderId) {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(`/chat/${senderId}`) && "focus" in client) {
            return client.focus();
          }
        }

        return clients.openWindow(`/chat/${senderId}`);
      })
    );
  } else {
    event.waitUntil(clients.openWindow("/notifications"));
  }
});
