import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { Bell, BellRing, Check, Gamepad2, ShieldCheck, Swords, Volume2, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { acceptFriendRequest, dismissGameInvite, rejectFriendRequest } from '../lib/socialClient';
import { startPresence } from '../lib/socialPresence';
import { playSound } from '../lib/audioEngine';

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
    if (document.visibilityState === 'visible') return;
    try {
        const notification = new Notification(title, { body, icon: '/logo.png', tag, renotify: true, requireInteraction: true });
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch { }
}

export default function SocialNotifications() {
    const [uid, setUid] = useState(null);
    const [requests, setRequests] = useState([]);
    const [invites, setInvites] = useState([]);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState({});
    const [error, setError] = useState('');
    const [permission, setPermission] = useState(() => (
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
    ));
    const requestIds = useRef(null);
    const inviteIds = useRef(null);

    const notify = useCallback((userUid, type, id, title, body) => {
        if (!claimNotification(userUid, type, id)) return;
        playSound('notification', { dedupeKey: `social:${userUid}:${type}:${id}`, dedupeMs: 24 * 60 * 60 * 1000 });
        showBrowserNotification(title, body, `celia-${type}-${id}`);
    }, []);

    useEffect(() => {
        let stopPresence = null;
        let stopRequests = null;
        let stopInvites = null;

        const unsubscribeAuth = onAuthStateChanged(auth, user => {
            stopRequests?.();
            stopInvites?.();
            void stopPresence?.();
            stopRequests = null;
            stopInvites = null;
            stopPresence = null;
            requestIds.current = null;
            inviteIds.current = null;
            setRequests([]);
            setInvites([]);
            setError('');
            setUid(user?.uid || null);
            if (!user) return;

            stopPresence = startPresence(user.uid);
            stopRequests = onValue(ref(db, `friendRequests/${user.uid}`), snapshot => {
                const next = Object.entries(snapshot.val() || {}).map(([fromUid, value]) => ({ uid: fromUid, ...(value || {}) }));
                const previousIds = requestIds.current;
                if (previousIds) {
                    next.forEach(request => {
                        if (!previousIds.has(request.uid)) {
                            notify(user.uid, 'friend-request', `${request.uid}:${request.createdAt || ''}`, 'طلب صداقة جديد', `${request.nickname || 'لاعب'} بعتلك طلب صداقة`);
                        }
                    });
                }
                requestIds.current = new Set(next.map(request => request.uid));
                setRequests(next.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
            }, listenerError => {
                setError(listenerError.message || 'تعذر استقبال طلبات الصداقة مباشرة');
                setOpen(true);
            });

            stopInvites = onValue(ref(db, `gameInvites/${user.uid}`), snapshot => {
                const next = Object.entries(snapshot.val() || {}).map(([id, value]) => ({ id, ...(value || {}) }));
                const previousIds = inviteIds.current;
                if (previousIds) {
                    next.forEach(invite => {
                        if (!previousIds.has(invite.id)) {
                            notify(user.uid, 'game-invite', invite.id, 'دعوة لعب جديدة', `${invite.fromNickname || 'صديقك'} دعاك إلى ${invite.gameTitle || 'لعبة'}`);
                        }
                    });
                }
                inviteIds.current = new Set(next.map(invite => invite.id));
                setInvites(next.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
            }, listenerError => {
                setError(listenerError.message || 'تعذر استقبال دعوات اللعب مباشرة');
                setOpen(true);
            });
        });

        return () => {
            unsubscribeAuth();
            stopRequests?.();
            stopInvites?.();
            void stopPresence?.();
        };
    }, [notify]);

    useEffect(() => {
        if (requests.length || invites.length) setOpen(true);
    }, [requests.length, invites.length]);

    const runAction = async (key, action) => {
        setBusy(current => ({ ...current, [key]: true }));
        setError('');
        try {
            await action();
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
        } catch {
            setPermission(Notification.permission);
        }
    };

    if (!uid) return null;

    const total = requests.length + invites.length;
    const canRequestPermission = permission === 'default';

    return (
        <div className="fixed bottom-4 right-4 z-[3000] flex w-[min(390px,calc(100vw-2rem))] flex-col items-end gap-3 font-arabic" dir="rtl">
            {open && (
                <section aria-label="إشعارات الأصدقاء واللعب" aria-live="polite" className="w-full overflow-hidden rounded-[1.65rem] border border-rose-200/15 bg-[#100b10]/95 text-white shadow-[0_24px_80px_rgba(0,0,0,.72),0_0_38px_rgba(225,65,94,.15)] backdrop-blur-2xl">
                    <header className="relative flex items-center justify-between gap-3 border-b border-white/[0.08] bg-gradient-to-l from-rose-500/[0.13] via-fuchsia-400/[0.05] to-transparent px-4 py-3.5">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-rose-300/70 to-transparent" />
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-200/20 bg-rose-400/10 text-rose-200 shadow-[0_0_24px_rgba(251,113,133,.16)]">
                                <BellRing size={19} />
                                {total > 0 && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#100b10] bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,.8)]" />}
                            </div>
                            <div className="min-w-0">
                                <h2 className="truncate text-sm font-black tracking-wide">إشعاراتك</h2>
                                <p className="mt-0.5 truncate text-[10px] font-bold text-white/45">{total ? `${total} تنبيه محفوظ لحد ما ترد` : 'طلبات الأصدقاء ودعوات اللعب'}</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <button type="button" onClick={() => playSound('notification')} aria-label="تشغيل صوت الإشعار" title="تجربة صوت الإشعار" className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-rose-200/25 hover:bg-rose-300/10 hover:text-rose-100">
                                <Volume2 size={15} />
                            </button>
                            <button type="button" onClick={() => setOpen(false)} aria-label="تصغير الإشعارات" className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50 transition hover:bg-white/10 hover:text-white">
                                <X size={15} />
                            </button>
                        </div>
                    </header>

                    {(canRequestPermission || permission === 'granted') && (
                        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2">
                            <p className="text-[10px] font-bold text-white/45">{permission === 'granted' ? 'تنبيه المتصفح مفعّل عند وجودك بالخلفية' : 'استقبل تنبيهًا من المتصفح لو الصفحة بالخلفية'}</p>
                            {canRequestPermission ? (
                                <button type="button" onClick={() => void requestBrowserPermission()} className="shrink-0 rounded-lg border border-sky-300/20 bg-sky-300/[0.08] px-2.5 py-1.5 text-[10px] font-black text-sky-100 transition hover:bg-sky-300/[0.15]">تفعيل</button>
                            ) : <ShieldCheck size={15} className="shrink-0 text-emerald-300" />}
                        </div>
                    )}

                    <div className="max-h-[min(55vh,440px)] space-y-2 overflow-y-auto p-3">
                        {error && <p role="alert" className="rounded-xl border border-rose-300/15 bg-rose-400/[0.08] px-3 py-2 text-[11px] font-bold text-rose-200">{error}</p>}
                        {requests.map(request => {
                            const key = `request:${request.uid}`;
                            return (
                                <article key={key} className="group relative overflow-hidden rounded-2xl border border-sky-300/15 bg-gradient-to-br from-sky-300/[0.09] to-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
                                    <div className="absolute right-0 top-3 h-8 w-0.5 rounded-l-full bg-sky-300/80 shadow-[0_0_12px_rgba(125,211,252,.7)]" />
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/15 bg-[#0b151b] text-lg">{request.avatar === 'cool' ? '😎' : '🎮'}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-black">{request.nickname || 'لاعب جديد'}</p>
                                            <p className="mt-0.5 truncate text-[10px] font-bold text-white/45">@{request.username || 'player'} بعتلك طلب صداقة</p>
                                        </div>
                                        <span className="rounded-full border border-sky-200/15 bg-sky-200/[0.08] px-2 py-1 text-[9px] font-black text-sky-100">صداقة</span>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <button type="button" disabled={busy[key]} onClick={() => void runAction(key, () => acceptFriendRequest(request.uid))} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-emerald-400 to-teal-300 text-[11px] font-black text-[#062117] shadow-[0_5px_20px_rgba(52,211,153,.16)] transition hover:brightness-110 disabled:opacity-50"><Check size={15} /> قبول الطلب</button>
                                        <button type="button" disabled={busy[key]} onClick={() => void runAction(key, () => rejectFriendRequest(request.uid))} className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[11px] font-black text-white/70 transition hover:border-rose-300/25 hover:bg-rose-400/[0.09] hover:text-rose-100 disabled:opacity-50"><X size={14} /> رفض</button>
                                    </div>
                                </article>
                            );
                        })}

                        {invites.map(invite => {
                            const key = `invite:${invite.id}`;
                            const gameUrl = `/?${new URLSearchParams({ game: invite.gameId, room: invite.roomCode, invite: invite.id }).toString()}`;
                            return (
                                <article key={key} className="group relative overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.12] via-orange-300/[0.045] to-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]">
                                    <div className="absolute right-0 top-3 h-8 w-0.5 rounded-l-full bg-amber-300/90 shadow-[0_0_12px_rgba(252,211,77,.7)]" />
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/20 bg-[#19150b] text-amber-200"><Swords size={19} /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-black">{invite.fromNickname || 'صديقك'} دعاك للعب</p>
                                            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-bold text-white/50"><Gamepad2 size={12} className="shrink-0" />{invite.gameTitle || 'لعبة'} · غرفة {invite.roomCode}</p>
                                        </div>
                                        <span className="rounded-full border border-amber-200/15 bg-amber-200/[0.08] px-2 py-1 text-[9px] font-black text-amber-100">دعوة</span>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <button type="button" disabled={busy[key]} onClick={() => { window.location.assign(gameUrl); }} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-l from-amber-300 to-yellow-200 text-[11px] font-black text-[#211700] shadow-[0_5px_20px_rgba(252,211,77,.15)] transition hover:brightness-110 disabled:opacity-50"><Swords size={15} /> ادخل اللعبة</button>
                                        <button type="button" disabled={busy[key]} onClick={() => void runAction(key, () => dismissGameInvite(invite.id))} className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[11px] font-black text-white/70 transition hover:border-rose-300/25 hover:bg-rose-400/[0.09] hover:text-rose-100 disabled:opacity-50"><X size={14} /> رفض</button>
                                    </div>
                                </article>
                            );
                        })}

                        {total === 0 && !error && (
                            <div className="flex flex-col items-center px-4 py-7 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/35"><Bell size={21} /></div>
                                <p className="mt-3 text-xs font-black text-white/75">مفيش إشعارات جديدة</p>
                                <p className="mt-1 text-[10px] font-bold text-white/40">أي دعوة هتفضل هنا لحد ما تقبلها أو ترفضها</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <button type="button" onClick={() => setOpen(current => !current)} aria-label={open ? 'إغلاق صندوق الإشعارات' : `فتح صندوق الإشعارات${total ? `، ${total} جديد` : ''}`} aria-expanded={open} className={`relative flex h-12 items-center gap-2 rounded-2xl border px-4 text-xs font-black text-white shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 ${total ? 'border-rose-200/25 bg-gradient-to-l from-rose-500 to-pink-500 shadow-[0_8px_30px_rgba(225,65,94,.25)]' : 'border-white/10 bg-[#171117]/90 hover:border-rose-200/20 hover:bg-[#211720]'}`}>
                {open ? <X size={17} /> : <Bell size={17} className={total ? 'animate-pulse' : ''} />}
                <span>الإشعارات</span>
                {total > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-white/25 bg-white px-1 text-[10px] font-black text-rose-600">{total > 99 ? '99+' : total}</span>}
                {total > 0 && <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-rose-100/20" />}
            </button>
        </div>
    );
}
