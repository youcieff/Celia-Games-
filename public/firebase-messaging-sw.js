self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) {
            if (new URL(client.url).origin !== self.location.origin) continue;
            if ('navigate' in client) await client.navigate(url);
            await client.focus();
            return;
        }
        await self.clients.openWindow(url);
    })());
});

importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyAygCJaU8BS6gcAyistyDojD7l2aCFwgnw',
    authDomain: 'celia-games-9ed83.firebaseapp.com',
    databaseURL: 'https://celia-games-9ed83-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'celia-games-9ed83',
    storageBucket: 'celia-games-9ed83.firebasestorage.app',
    messagingSenderId: '519214921029',
    appId: '1:519214921029:web:9b15f179dc386e17b33a2c'
});

firebase.messaging().onBackgroundMessage(payload => {
    const data = payload.data || {};
    const title = data.title || 'إشعار جديد';
    return self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/logo.png',
        badge: '/favicon.svg',
        tag: data.notificationId || `celia-${data.type || 'social'}`,
        renotify: false,
        requireInteraction: true,
        vibrate: [180, 90, 180],
        data: { url: data.url || '/?openNotifications=1' }
    });
});
