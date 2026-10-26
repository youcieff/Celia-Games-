import React, { useEffect, useState } from 'react';
import useProfile from '../hooks/useProfile';
import { getGlobalLeaderboard } from '../lib/leaderboardEngine';
import { fetchAccountLeaderboard, getSavedAccount, subscribeToAccount } from '../lib/accountClient';
import { auth } from '../lib/firebase';
import { AvatarDisplay } from './icons/AvatarIcons';
import { playSound, playHaptic } from '../lib/audioEngine';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import X from 'lucide-react/dist/esm/icons/x';
import Crown from 'lucide-react/dist/esm/icons/crown';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Users from 'lucide-react/dist/esm/icons/users';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { announceOverlayOpen } from '../lib/overlayEvents';

export default function LeaderboardWidget() {
    const [profile] = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [cloudLeaderboard, setCloudLeaderboard] = useState(null);
    const [cloudLoading, setCloudLoading] = useState(false);
    const [cloudError, setCloudError] = useState('');
    const [accountUid, setAccountUid] = useState(auth.currentUser?.uid || getSavedAccount()?.uid || null);
    const [refreshKey, setRefreshKey] = useState(0);

    const leaderboard = cloudLeaderboard ?? (accountUid ? [] : getGlobalLeaderboard(profile));
    const myEntry = leaderboard.find(p => p.isMe);
    const playerCount = leaderboard.length;

    useEffect(() => {
        let active = true;
        let request = null;
        let requestUid = null;
        const refresh = user => {
            setAccountUid(user?.uid || null);
            if (!user) {
                setCloudLeaderboard(null);
                setCloudError('');
                return;
            }
            if (requestUid !== user.uid) {
                setCloudLeaderboard(null);
                setCloudError('');
            }
            if (request) {
                if (requestUid !== user.uid) requestUid = user.uid;
                return;
            }
            requestUid = user.uid;
            setCloudLoading(true);
            setCloudError('');
            request = fetchAccountLeaderboard()
                .then(rows => { if (active && auth.currentUser?.uid === user.uid) setCloudLeaderboard(rows); })
                .catch(error => { if (active && auth.currentUser?.uid === user.uid) setCloudError(error?.message || 'تعذر تحديث المتصدرين'); })
                .finally(() => {
                    request = null;
                    const nextUser = auth.currentUser;
                    if (active && nextUser && nextUser.uid !== user.uid) refresh(nextUser);
                    else if (active) setCloudLoading(false);
                });
        };
        const unsubscribe = subscribeToAccount(refresh);
        function refreshCurrent() { refresh(auth.currentUser); }
        let interval;
        if (isOpen) {
            refreshCurrent();
            interval = window.setInterval(refreshCurrent, 30_000);
            window.addEventListener('focus', refreshCurrent);
        }
        return () => {
            active = false;
            unsubscribe();
            if (interval) window.clearInterval(interval);
            window.removeEventListener('focus', refreshCurrent);
        };
    }, [isOpen, refreshKey]);

    useEffect(() => {
        const closeForAnotherOverlay = event => {
            if (event.detail?.id !== 'leaderboard') setIsOpen(false);
        };
        window.addEventListener('celia-overlay-open', closeForAnotherOverlay);
        return () => window.removeEventListener('celia-overlay-open', closeForAnotherOverlay);
    }, []);

    const handleOpen = () => {
        announceOverlayOpen('leaderboard');
        setIsOpen(true);
        playSound('click');
        playHaptic(15);
    };

    return (
        <>
            <button
                type="button"
                className="glass-card h-10 px-2.5 sm:px-3 rounded-2xl flex items-center gap-1.5 cursor-pointer hover:bg-white/10 hover:border-amber-400/30 transition-all select-none shrink-0 border border-white/10 shadow-sm active:scale-95 group"
                onClick={handleOpen}
                title="لوحة المتصدرين الحقيقية"
            >
                <div className="w-6 h-6 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-300 border border-amber-400/20 shrink-0 transition-colors">
                    <Trophy size={14} />
                </div>
                <span className="text-xs font-black text-amber-300 hidden sm:inline tracking-wide">
                    المتصدرين
                </span>
            </button>

            {isOpen && (
                <div
                    className="safe-area-overlay fixed inset-0 bg-black/80 backdrop-blur-md z-[130] flex items-center justify-center p-3 animate-fade-in"
                    onPointerDown={event => { if (event.target === event.currentTarget) setIsOpen(false); }}
                >
                    <div className="glass-card rounded-3xl p-5 w-full max-w-md flex flex-col gap-4 animate-pop-in border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-300 border border-amber-400/20">
                                    <Trophy size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black gradient-text">لوحة الصدارة الحقيقية</h2>
                                    <p className="text-[10px] text-white/50 font-bold">ترتيب اللاعبين الحقيقيين فقط</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {cloudLoading && <RefreshCw size={14} className="animate-spin text-white/50" aria-label="جار التحديث" />}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-full glass-card flex items-center justify-center text-white/70 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {cloudError && (
                            <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-center">
                                <p className="text-[11px] font-bold text-rose-200">تعذر تحميل ترتيب الحساب من الإنترنت. القائمة المحلية لن تُعرض بدلًا منها.</p>
                                <p dir="auto" className="mt-1 break-words text-[10px] font-semibold text-rose-200/75">تفاصيل الخطأ: {cloudError}</p>
                                <button type="button" onClick={() => setRefreshKey(value => value + 1)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-black text-white/80 hover:bg-white/5">
                                    <RefreshCw size={12} /> حاول مرة أخرى
                                </button>
                            </div>
                        )}

                        {accountUid && cloudLoading && !cloudLeaderboard && !cloudError && (
                            <p className="py-6 text-center text-xs font-bold text-white/55">جارٍ تحميل ترتيب حسابك…</p>
                        )}

                        {/* Leaderboard Cards */}
                        <div className="flex flex-col gap-2.5 my-1">
                            {leaderboard.map((player) => {
                                const isFirst = player.rank === 1;
                                const isSecond = player.rank === 2;
                                const isThird = player.rank === 3;

                                return (
                                    <div
                                        key={player.id}
                                        className={`glass-card p-3 rounded-2xl border flex items-center justify-between gap-3 text-right transition-all ${
                                            isFirst
                                                ? 'border-amber-400/35 bg-amber-500/[0.08]'
                                                : isSecond
                                                ? 'border-slate-300/50 bg-gradient-to-r from-slate-400/15 to-transparent'
                                                : isThird
                                                ? 'border-amber-700/40 bg-gradient-to-r from-amber-700/15 to-transparent'
                                                : player.isMe
                                                ? 'border-emerald-400/60 bg-emerald-500/15'
                                                : 'border-white/10 bg-white/[0.02]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Rank Badge */}
                                            <div className="shrink-0 text-center w-7">
                                                {isFirst ? (
                                                    <span className="text-xl drop-shadow">🥇</span>
                                                ) : isSecond ? (
                                                    <span className="text-xl drop-shadow">🥈</span>
                                                ) : isThird ? (
                                                    <span className="text-xl drop-shadow">🥉</span>
                                                ) : (
                                                    <span className="text-xs font-black text-white/50">#{player.rank}</span>
                                                )}
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                                <AvatarDisplay avatarId={player.avatar} size={22} />
                                            </div>

                                            {/* Info */}
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-black text-white truncate">
                                                        {player.nickname}
                                                    </span>
                                                    {player.isMe && (
                                                        <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 shrink-0">
                                                            أنت
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-bold text-white/40 truncate">
                                                    {isFirst ? '👑 المتصدر الحالي' : 'لاعب حقيقي'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-xs font-black text-amber-300">
                                                {player.wins} فوز
                                            </span>
                                            <span className="text-[9px] font-bold text-white/40">
                                                {player.xp} XP
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Info Banner when playing alone */}
                        {playerCount <= 1 && !cloudLoading && !cloudError && (
                            <div className="glass-card p-4 rounded-2xl border border-white/10 text-center flex flex-col items-center gap-2 bg-white/[0.02]">
                                <Users size={24} className="text-amber-400/80 animate-pulse" />
                                <p className="text-xs font-bold text-white/80">
                                    {accountUid ? 'لا توجد مباريات مسجلة في ترتيب حسابك بعد.' : 'الترتيب هنا محفوظ على هذا الجهاز فقط.'}
                                </p>
                                <p className="text-[10px] text-white/50 leading-relaxed max-w-xs">
                                    {accountUid
                                        ? 'المباريات الجديدة مع أصدقاء مسجلين ستظهر هنا بعد اكتمالها.'
                                        : 'سجّل الدخول بالحساب نفسه على أجهزتك لمتابعة تقدمك ومبارياتك بينها.'}
                                </p>
                            </div>
                        )}

                        {!accountUid && (
                            <div className="rounded-2xl border border-[var(--surface-line)] bg-[var(--surface-raised)] p-3 text-center">
                                <p className="text-[10px] font-bold text-white/65">كضيف، تظهر بيانات هذا الجهاز فقط. سجّل الدخول بالحساب نفسه على أجهزتك لمتابعة تقدمك بينها.</p>
                                <button type="button" onClick={() => { setIsOpen(false); window.dispatchEvent(new Event('celia-open-profile')); }} className="mt-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-2 text-[10px] font-black text-[var(--accent)]">فتح الملف وتسجيل الدخول</button>
                            </div>
                        )}

                        {/* Current Rank Footer */}
                        {myEntry && playerCount > 1 && (
                            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-sky-500/15 to-indigo-500/20 border border-emerald-400/30 flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-emerald-300 animate-pulse" />
                                    <span>مركزك الحالي: <strong className="text-emerald-300 font-black">#{myEntry.rank}</strong></span>
                                </div>
                                <span className="text-[10px] text-white/60">
                                    {myEntry.wins} فوز | {myEntry.xp} XP
                                </span>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    );
}
