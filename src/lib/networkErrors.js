export function isNetworkError(error) {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();
    const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

    return browserOffline
        || code === 'auth/network-request-failed'
        || /failed to fetch|network request failed|networkerror|load failed|internet disconnected|offline/.test(message);
}

export function getReadableNetworkError(error, fallback = 'تعذر الاتصال بالخادم. حاول مرة أخرى عند توفر الإنترنت.') {
    if (isNetworkError(error)) return 'الإنترنت غير متاح حاليًا. بياناتك المحفوظة على الجهاز تظل موجودة، وسنحاول المزامنة عند رجوع الاتصال.';
    return error?.message || fallback;
}
