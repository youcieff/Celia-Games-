import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { Bell, BellRing, Check, Clock3, Gamepad2, ShieldCheck, Swords, UserRoundPlus, Volume2, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { acceptFriendRequest, dismissGameInvite, rejectFriendRequest } from '../lib/socialClient';
import { setPresenceActivity, startPresence } from '../lib/socialPresence';
import { playSound } from '../lib/audioEngine';
import './SocialNotifications.css';
import { announceOverlayOpen } from '../lib/overlayEvents';

function formatNotificationTime(timestamp) {
    const time = Number(timestamp);
    if (!time) return 'الآن';
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
    if (elapsedMinutes < 1) return 'الآن';
    if (elapsedMinutes < 60) return `منذ ${elapsedMinutes} د`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `منذ ${elapsedHours} س`;
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(new Date(time));
}

function claimNotification(uid, type, id) {
    const key = `${uid}:${type}:${id}`;
    try {
        const stored = JSON.parse(localStorage.getItem('celia_social_notified') || '{}');
        const now = Date.now();
        if (Number(stored[key]) > now - 24 * 60 * 60 * 1000) return false;
        stored[key] = now;
        const entries = Object.entries(stored)
            .filter(([, createdAt]) => Number(createdAt) > now - 7 * 24 * 60 * 60 * 1000)
            .slice(-200);
        localStorage.setItem('celia_social_notified', JSON.stringify(Object.fromEntries(entries)));
    } catch { }
    return true;
}

function showBrowserNotification(title, body, tag) {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        const notification = new Notification(title, { body, icon: '/logo.png', tag, renotify: true, requireInteraction: true });
        notification.onclick = () => {
            window.focus();
            window.dispatchEvent(new Event('celia-open-notifications'));
            notification.close();
        };
    } catch { }
}

function buildInviteUrl(invite) {
    return `/?${new URLSearchParams({ game: invite.gameId, room: invite.roomCode, invite: invite.id }).toString()}`;
}

export default function SocialNotifications() {
    const [uid, setUid] = useState(null);
    const [requests, setRequests] = useState([]);
    const [invites, setInvites] = useState([]);
    const [toasts, setToasts] = useState([]);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState({});
    const [error, setError] = useState('');
    const [permission, setPermission] = useState(() => (
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
    ));
    const requestIds = useRef(null);
    const inviteIds = useRef(null);
    const uidRef = useRef(null);
    const activityRef = useRef({ status: 'online', gameId: '' });
    const toastTimers = useRef(new Map());

    const removeToast = useCallback(id => {
        const timer = toastTimers.current.get(id);
        if (timer) clearTimeout(timer);
        toastTimers.current.delete(id);
        setToasts(current => current.filter(toast => toast.id !== id));
    }, []);

    const pushToast = useCallback(toast => {
        setToasts(current => [toast, ...current.filter(item => item.id !== toast.id)].slice(0, 3));
        const previousTimer = toastTimers.current.get(toast.id);
        if (previousTimer) clearTimeout(previousTimer);
        toastTimers.current.set(toast.id, setTimeout(() => removeToast(toast.id), 9_000));
    }, [removeToast]);

    const notify = useCallback((userUid, type, id, title, body) => {
        const shouldShowToast = claimNotification(userUid, type, id);
        if (shouldShowToast) playSound('notification', { dedupeKey: `social:${userUid}:${type}:${id}`, dedupeMs: 24 * 60 * 60 * 1000 });
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
            && claimNotification(userUid, `${type}-browser`, id)) {
            showBrowserNotification(title, body, `celia-${type}-${id}`);
        }
        return shouldShowToast;
    }, []);

    useEffect(() => {
        let stopPresence = null;
        let stopRequests = null;
        let stopInvites = null;
        let presenceHeartbeat = null;

        const clearSession = () => {
            stopRequests?.();
            stopInvites?.();
            if (presenceHeartbeat) clearInterval(presenceHeartbeat);
            presenceHeartbeat = null;
            void stopPresence?.();
            stopRequests = null;
            stopInvites = null;
            stopPresence = null;
            requestIds.current = null;
            inviteIds.current = null;
            setRequests([]);
            setInvites([]);
            setToasts([]);
            setOpen(false);
            setError('');
            for (const timer of toastTimers.current.values()) clearTimeout(timer);
            toastTimers.current.clear();
        };

        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            clearSession();
            uidRef.current = user?.uid || null;
            setUid(uidRef.current);
            if (!user) return;

            stopPresence = startPresence(user.uid);
            void setPresenceActivity(user.uid, activityRef.current.status, activityRef.current.gameId);
            presenceHeartbeat = window.setInterval(() => {
                if (uidRef.current !== user.uid || activityRef.current.status !== 'playing') return;
                void setPresenceActivity(user.uid, 'playing', activityRef.current.gameId);
            }, 30_000);
            stopRequests = onValue(ref(db, `friendRequests/${user.uid}`), snapshot => {
                const next = Object.entries(snapshot.val() || {}).map(([fromUid, value]) => ({ uid: fromUid, ...(value || {}) }));
                const previousIds = requestIds.current;
                next.forEach(request => {
                    const isNew = previousIds ? !previousIds.has(request.uid) : Date.now() - Number(request.createdAt || 0) < 10 * 60 * 1000;
                    const id = `${request.uid}:${request.createdAt || ''}`;
                    if (isNew && notify(user.uid, 'friend-request', id, 'طلب صداقة جديد', `${request.nickname || 'لاعب'} بعتلك طلب صداقة`)) {
                        pushToast({ id: `request:${id}`, type: 'request', title: 'طلب صداقة جديد', body: `${request.nickname || 'لاعب'} بعتلك طلب صداقة`, request });
                    }
                });
                requestIds.current = new Set(next.map(request => request.uid));
                setRequests(next.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
            }, listenerError => setError(listenerError.message || 'تعذر استقبال طلبات الصداقة مباشرة'));

            stopInvites = onValue(ref(db, `gameInvites/${user.uid}`), snapshot => {
                const next = Object.entries(snapshot.val() || {}).map(([id, value]) => ({ id, ...(value || {}) }));
                const previousIds = inviteIds.current;
                next.forEach(invite => {
                    const isNew = previousIds ? !previousIds.has(invite.id) : Date.now() - Number(invite.createdAt || 0) < 10 * 60 * 1000;
                    if (isNew && notify(user.uid, 'game-invite', invite.id, 'دعوة لعب جديدة', `${invite.fromNickname || 'صديقك'} دعاك إلى ${invite.gameTitle || 'لعبة'}`)) {
                        pushToast({ id: `invite:${invite.id}`, type: 'invite', title: 'دعوة لعب جديدة', body: `${invite.fromNickname || 'صديقك'} دعاك إلى ${invite.gameTitle || 'لعبة'}`, invite });
                    }
                });
                inviteIds.current = new Set(next.map(invite => invite.id));
                setInvites(next.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
            }, listenerError => setError(listenerError.message || 'تعذر استقبال دعوات اللعب مباشرة'));
        });

        const handleGameStarted = event => {
            activityRef.current = { status: 'playing', gameId: String(event.detail?.gameId || '') };
            if (uidRef.current) void setPresenceActivity(uidRef.current, 'playing', activityRef.current.gameId);
        };
        const handleGameEnded = () => {
            activityRef.current = { status: 'online', gameId: '' };
            if (uidRef.current) void setPresenceActivity(uidRef.current, 'online');
        };
        const handleOpen = () => {
            announceOverlayOpen('notifications');
            setOpen(true);
        };
        window.addEventListener('celia-game-started', handleGameStarted);
        window.addEventListener('celia-game-ended', handleGameEnded);
        window.addEventListener('celia-open-notifications', handleOpen);

        return () => {
            unsubscribeAuth();
            clearSession();
            window.removeEventListener('celia-game-started', handleGameStarted);
            window.removeEventListener('celia-game-ended', handleGameEnded);
            window.removeEventListener('celia-open-notifications', handleOpen);
        };
    }, [notify, pushToast]);

    useEffect(() => {
        const closeForAnotherOverlay = event => {
            if (event.detail?.id !== 'notifications') setOpen(false);
        };
        window.addEventListener('celia-overlay-open', closeForAnotherOverlay);
        return () => window.removeEventListener('celia-overlay-open', closeForAnotherOverlay);
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const handleKeyDown = event => {
            if (event.key === 'Escape') setOpen(false);
        };
        const handleOutsideClick = event => {
            if (!event.target.closest?.('.social-notifications-root')) setOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerdown', handleOutsideClick);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('pointerdown', handleOutsideClick);
        };
    }, [open]);

    const runAction = async (key, action) => {
        setBusy(current => ({ ...current, [key]: true }));
        setError('');
        try {
            await action();
            removeToast(key);
        } catch (actionError) {
            setError(actionError.message || 'تعذر تنفيذ الطلب');
        } finally {
            setBusy(current => {
                const next = { ...current };
                delete next[key];
                return next;
            });
        }
    };

    const requestBrowserPermission = async () => {
        if (permission === 'unsupported') return;
        try {
            const nextPermission = await Notification.requestPermission();
            setPermission(nextPermission);
            playSound('notification');
            if (nextPermission === 'granted' && uid) {
                requests.forEach(request => {
                    const id = `${request.uid}:${request.createdAt || ''}`;
                    if (Date.now() - Number(request.createdAt || 0) < 10 * 60 * 1000) {
                        notify(uid, 'friend-request', id, 'طلب صداقة جديد', `${request.nickname || 'لاعب'} بعتلك طلب صداقة`);
                    }
                });
                invites.forEach(invite => {
                    if (Date.now() - Number(invite.createdAt || 0) < 10 * 60 * 1000) {
                        notify(uid, 'game-invite', invite.id, 'دعوة لعب جديدة', `${invite.fromNickname || 'صديقك'} دعاك إلى ${invite.gameTitle || 'لعبة'}`);
                    }
                });
            }
        } catch {
            setPermission(Notification.permission);
        }
    };

    const total = requests.length + invites.length;
    const canRequestPermission = permission === 'default';
    const notifications = [
        ...requests.map(request => ({
            id: request.uid,
            key: `request:${request.uid}:${request.createdAt || ''}`,
            type: 'request',
            createdAt: request.createdAt,
            title: `${request.nickname || 'لاعب جديد'} بعتلك طلب صداقة`,
            detail: `@${request.username || 'player'}`,
            request
        })),
        ...invites.map(invite => ({
            id: invite.id,
            key: `invite:${invite.id}`,
            type: 'invite',
            createdAt: invite.createdAt,
            title: `${invite.fromNickname || 'صديقك'} دعاك للعب`,
            detail: `${invite.gameTitle || 'لعبة'} · كود الغرفة ${invite.roomCode || '—'}`,
            invite
        }))
    ].sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));

    const toggleNotifications = () => {
        if (open) setOpen(false);
        else {
            announceOverlayOpen('notifications');
            setOpen(true);
        }
    };

    const renderActions = (notification, toast = false) => {
        const request = notification.request;
        const invite = notification.invite;
        const actionKey = toast ? notification.id : notification.key;
        if (request) {
            return <>
                <button type="button" disabled={busy[actionKey]} onClick={() => void runAction(actionKey, () => acceptFriendRequest(request.uid))} className="social-notification-button social-notification-button--primary"><Check size={14} /> قبول</button>
                <button type="button" disabled={busy[actionKey]} onClick={() => void runAction(actionKey, () => rejectFriendRequest(request.uid))} className="social-notification-button"><X size={13} /> رفض</button>
            </>;
        }
        return <>
            <button type="button" disabled={busy[actionKey]} onClick={() => window.location.assign(buildInviteUrl(invite))} className="social-notification-button social-notification-button--primary"><Swords size={14} /> ادخل اللعب</button>
            <button type="button" disabled={busy[actionKey]} onClick={() => void runAction(actionKey, () => dismissGameInvite(invite.id))} className="social-notification-button"><X size={13} /> رفض</button>
        </>;
    };

    if (typeof document === 'undefined') return null;
    return createPortal(
        <div className="social-notifications-root" dir="rtl">
            {toasts.length > 0 && (
                <div className="social-notification-toasts" aria-live="polite" aria-relevant="additions">
                    {toasts.map(toast => (
                        <article className={`social-notification-toast social-notification-toast--${toast.type}`} key={toast.id}>
                            <div className="social-notification-toast-icon">{toast.type === 'request' ? <UserRoundPlus size={18} /> : <Gamepad2 size={18} />}</div>
                            <div className="social-notification-toast-content">
                                <strong>{toast.title}</strong>
                                <span>{toast.body}</span>
                            </div>
                            <button type="button" className="social-notification-toast-close" onClick={() => removeToast(toast.id)} aria-label="إخفاء الإشعار"><X size={15} /></button>
                            <div className="social-notification-toast-actions">{renderActions(toast, true)}</div>
                        </article>
                    ))}
                </div>
            )}

            <button type="button" onClick={toggleNotifications} aria-label={open ? 'إغلاق مركز التنبيهات' : `فتح مركز التنبيهات${total ? `، ${total} محفوظ` : ''}`} aria-expanded={open} className="social-notifications-toggle">
                {open ? <X size={19} /> : total ? <BellRing size={19} /> : <Bell size={19} />}
                {total > 0 && <span className="social-notifications-toggle-count">{total > 99 ? '99+' : total}</span>}
            </button>

            {open && (
                <section aria-label="إشعارات الأصدقاء واللعب" className="social-notifications-panel" dir="rtl">
                    <header className="social-notifications-header">
                        <div className="social-notifications-heading">
                            <div className="social-notifications-icon"><BellRing size={19} /></div>
                            <div className="min-w-0">
                                <h2 className="social-notifications-title">الإشعارات</h2>
                                <p className="social-notifications-subtitle">{total ? `${total} محفوظة لحد ما ترد` : 'دعوات اللعب وطلبات الصداقة'}</p>
                            </div>
                        </div>
                        <div className="social-notifications-header-actions">
                            {total > 0 && <span className="social-notifications-count">{total > 99 ? '99+' : total}</span>}
                            <button type="button" onClick={() => playSound('notification')} aria-label="تجربة صوت التنبيه" title="تجربة الصوت" className="social-notifications-icon-button"><Volume2 size={15} /></button>
                            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق التنبيهات" className="social-notifications-icon-button"><X size={15} /></button>
                        </div>
                    </header>

                    {(canRequestPermission || permission === 'granted') && (
                        <div className="social-notifications-permission">
                            <p>{permission === 'granted' ? 'تنبيه المتصفح مفعّل' : 'فعّل تنبيهات المتصفح للدعوات الجديدة'}</p>
                            {canRequestPermission ? (
                                <button type="button" onClick={() => void requestBrowserPermission()} className="social-notifications-permission-button">تفعيل</button>
                            ) : <ShieldCheck size={15} className="shrink-0 text-[var(--accent)]" />}
                        </div>
                    )}
                    {permission === 'denied' && <p className="social-notifications-denied">إشعارات المتصفح مقفولة. اسمح بها من إعدادات الموقع في المتصفح.</p>}

                    <div className="social-notifications-list">
                        {error && <p role="alert" className="social-notifications-error">{error}</p>}
                        {!uid ? (
                            <div className="social-notification-empty">
                                <div className="social-notifications-action-icon"><UserRoundPlus size={20} /></div>
                                <strong>سجّل الدخول عشان توصلك الإشعارات</strong>
                                <span>بعد تسجيل الدخول، طلبات الصداقة ودعوات اللعب هتظهر هنا وتفضل محفوظة لحد ما ترد.</span>
                                <button type="button" className="social-notification-button social-notification-button--primary social-notifications-login" onClick={() => window.dispatchEvent(new Event('celia-open-account'))}>فتح الملف الشخصي</button>
                            </div>
                        ) : notifications.map(notification => {
                            const isRequest = notification.type === 'request';
                            return (
                                <article key={notification.key} className={`social-notification-card social-notification-card--${notification.type}`}>
                                    <div className="social-notifications-action-icon">{isRequest ? <UserRoundPlus size={17} /> : <Gamepad2 size={17} />}</div>
                                    <div className="social-notification-copy">
                                        <div className="social-notification-topline">
                                            <span className="social-notification-kind">{isRequest ? 'طلب صداقة' : 'دعوة لعب'}</span>
                                            <span className="social-notification-time"><Clock3 size={11} /> {formatNotificationTime(notification.createdAt)}</span>
                                        </div>
                                        <p className="social-notification-name">{notification.title}</p>
                                        <p className="social-notification-detail">{notification.detail}</p>
                                    </div>
                                    <div className="social-notification-actions">{renderActions(notification)}</div>
                                </article>
                            );
                        })}

                        {uid && notifications.length === 0 && !error && (
                            <div className="social-notification-empty">
                                <div className="social-notifications-action-icon"><Bell size={20} /></div>
                                <strong>مفيش إشعارات جديدة</strong>
                                <span>دعوات اللعب وطلبات الصداقة هتظهر هنا وتفضل موجودة لحد ما ترد.</span>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>,
        document.body
    );
}
