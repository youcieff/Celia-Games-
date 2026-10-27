import { auth } from './firebase';

const TOKEN_KEY = 'celia_push_token';
const TOKEN_UID_KEY = 'celia_push_token_uid';

async function sendTokenAction(action, token, user) {
    const idToken = await user.getIdToken();
    const response = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action, token })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر إعداد إشعارات الجهاز');
    return result;
}

export async function registerPushNotifications() {
    const user = auth.currentUser;
    if (!user || typeof window === 'undefined' || !('Notification' in window)
        || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return false;

    const messagingSdk = await import('firebase/messaging');
    if (!await messagingSdk.isSupported()) return false;
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    let token;
    try {
        token = await messagingSdk.getToken(messagingSdk.getMessaging(), {
            serviceWorkerRegistration: registration,
            ...(vapidKey ? { vapidKey } : {})
        });
    } catch (error) {
        if (!vapidKey) {
            const setupError = new Error('تعذر تسجيل إشعارات الخلفية. أضف مفتاح Web Push من Firebase إلى VITE_FIREBASE_VAPID_KEY في إعدادات Vercel ثم أعد النشر.');
            setupError.cause = error;
            throw setupError;
        }
        throw error;
    }
    if (!token) return false;
    await sendTokenAction('register_notification_token', token, user);
    try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_UID_KEY, user.uid);
    } catch { }
    return true;
}

export async function unregisterPushNotifications(user = auth.currentUser) {
    if (!user) return;
    let token = '';
    let registeredUid = '';
    try {
        token = localStorage.getItem(TOKEN_KEY) || '';
        registeredUid = localStorage.getItem(TOKEN_UID_KEY) || '';
    } catch { }
    if (!token || (registeredUid && registeredUid !== user.uid)) return;
    await sendTokenAction('remove_notification_token', token, user);
    try { localStorage.removeItem(TOKEN_UID_KEY); } catch { }
}
