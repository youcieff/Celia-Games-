import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, Swords, Trash2, UserPlus, X } from 'lucide-react';
import {
    acceptFriendRequest,
    dismissGameInvite,
    loadSocialData,
    rejectFriendRequest,
    removeFriend,
    sendFriendRequest
} from '../lib/socialClient';

export default function FriendsPanel() {
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [invites, setInvites] = useState([]);
    const [username, setUsername] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const refresh = useCallback(async (showLoader = true) => {
        if (showLoader) setBusy(true);
        try {
            const data = await loadSocialData();
            setFriends(data.friends);
            setRequests(data.requests);
            setInvites(data.invites);
            setError('');
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            if (showLoader) setBusy(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
        const timer = setInterval(() => void refresh(false), 25_000);
        return () => clearInterval(timer);
    }, [refresh]);

    const runAction = async (action, successMessage) => {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            await action();
            await refresh(false);
            if (successMessage) setMessage(successMessage);
            return true;
        } catch (actionError) {
            setError(actionError.message);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const handleSendRequest = async event => {
        event.preventDefault();
        const requestedUsername = username.trim();
        if (!requestedUsername) return;
        if (await runAction(() => sendFriendRequest(requestedUsername), 'اتبعث طلب الصداقة')) setUsername('');
    };

    const joinInvite = async invite => {
        const params = new URLSearchParams({ game: invite.gameId, room: invite.roomCode, invite: invite.id });
        window.location.assign(`/?${params.toString()}`);
    };

    return (
        <section className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-right" dir="rtl">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-black">الأصدقاء والدعوات</h3>
                    <p className="mt-0.5 text-[10px] font-bold text-white/45">طلبات الصداقة ودخول الغرف</p>
                </div>
                <button type="button" onClick={() => void refresh()} disabled={busy} aria-label="تحديث الأصدقاء" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/65 hover:bg-white/10 disabled:opacity-50">
                    <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                </button>
            </div>

            <form onSubmit={handleSendRequest} className="flex gap-2">
                <input value={username} onChange={event => setUsername(event.target.value)} maxLength={20} className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-bold outline-none focus:border-[var(--accent)]" placeholder="ابحث باسم المستخدم" />
                <button disabled={busy || !username.trim()} className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-xs font-black text-white disabled:opacity-40">
                    <UserPlus size={14} /> أضف
                </button>
            </form>

            {error && <p role="alert" className="mt-2 rounded-lg bg-rose-400/10 px-3 py-2 text-[11px] font-bold text-rose-300">{error}</p>}
            {message && <p role="status" className="mt-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-300">{message}</p>}

            {invites.length > 0 && (
                <div className="mt-4">
                    <p className="mb-2 text-[11px] font-black text-amber-300">دعوات اللعب <span className="opacity-60">{invites.length}</span></p>
                    <div className="flex flex-col gap-2">
                        {invites.map(invite => (
                            <div key={invite.id} className="flex items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-2.5">
                                <Swords size={16} className="shrink-0 text-amber-300" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-black">{invite.fromNickname} دعاك لـ {invite.gameTitle}</p>
                                    <p className="text-[10px] font-bold text-white/45">كود الغرفة: {invite.roomCode}</p>
                                </div>
                                <button type="button" disabled={busy} onClick={() => void joinInvite(invite)} className="h-8 rounded-lg bg-amber-300 px-2.5 text-[10px] font-black text-slate-950 disabled:opacity-50">ادخل</button>
                                <button type="button" disabled={busy} onClick={() => void runAction(() => dismissGameInvite(invite.id))} aria-label="إخفاء الدعوة" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 disabled:opacity-50"><X size={13} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {requests.length > 0 && (
                <div className="mt-4">
                    <p className="mb-2 text-[11px] font-black text-sky-300">طلبات الصداقة <span className="opacity-60">{requests.length}</span></p>
                    <div className="flex flex-col gap-2">
                        {requests.map(request => (
                            <div key={request.uid} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-black">{request.nickname}</p>
                                    <p className="truncate text-[10px] font-bold text-white/45">@{request.username}</p>
                                </div>
                                <button type="button" disabled={busy} onClick={() => void runAction(() => acceptFriendRequest(request.uid), 'بقيتوا أصدقاء')} aria-label="قبول الطلب" className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300 disabled:opacity-50"><Check size={15} /></button>
                                <button type="button" disabled={busy} onClick={() => void runAction(() => rejectFriendRequest(request.uid))} aria-label="رفض الطلب" className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300 disabled:opacity-50"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-4">
                <p className="mb-2 text-[11px] font-black text-white/65">قائمة الأصدقاء <span className="opacity-60">{friends.length}</span></p>
                {friends.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[11px] font-bold text-white/40">لسه مفيش أصدقاء مضافين</p>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {friends.map(friend => (
                            <div key={friend.uid} className="flex items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-black">{friend.nickname}</p>
                                    <p className="truncate text-[10px] font-bold text-white/40">@{friend.username} · {friend.wins} فوز</p>
                                </div>
                                <button type="button" disabled={busy} onClick={() => window.confirm(`تحذف ${friend.nickname} من الأصدقاء؟`) && void runAction(() => removeFriend(friend.uid))} aria-label="حذف صديق" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-50"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
