import React, { useState, useEffect, useRef } from 'react';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Home from 'lucide-react/dist/esm/icons/home';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Send from 'lucide-react/dist/esm/icons/send';
import { playSound } from '../lib/audioEngine';

export default function ConnectionPauseOverlay({ conn, onLeave, opponentName, onInvite, onConnectionPause, onConnectionResume }) {
    const [isPaused, setIsPaused] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isReconnected, setIsReconnected] = useState(false);
    const [inviteState, setInviteState] = useState('idle');
    const [inviteError, setInviteError] = useState('');
    const pauseNotifiedRef = useRef(false);
    const inviteOpponent = onInvite || conn?.inviteOpponentBack;

    const handleInviteOpponent = async () => {
        if (!inviteOpponent || inviteState === 'sending' || inviteState === 'sent') return;
        setInviteState('sending');
        setInviteError('');
        try {
            await inviteOpponent();
            setInviteState('sent');
        } catch (error) {
            setInviteState('idle');
            setInviteError(error?.message || 'تعذر إرسال دعوة الرجوع. حاول مرة أخرى.');
        }
    };

    useEffect(() => {
        if (!conn) return;

        const markPaused = () => {
            if (!pauseNotifiedRef.current) {
                onConnectionPause?.();
                playSound('lose');
            }
            pauseNotifiedRef.current = true;
            setIsPaused(true);
            setIsReconnected(false);
            setTimeLeft(30);
        };

        const resumeIfConnected = async (verifyPeerPresence = true) => {
            if (!pauseNotifiedRef.current) return;
            if (window.navigator.onLine === false) return;
            if (verifyPeerPresence) {
                try {
                    if (conn.isPeerOnline && !(await conn.isPeerOnline())) return;
                } catch { return; }
            }
            if (!pauseNotifiedRef.current) return;
            pauseNotifiedRef.current = false;
            onConnectionResume?.();
            playSound('ding');
            setIsReconnected(true);
            setTimeout(() => {
                setIsPaused(false);
                setIsReconnected(false);
            }, 1200);
        };

        const handlePeerDisconnect = markPaused;
        const handlePeerReconnect = () => resumeIfConnected(false);

        conn.on('peer-disconnect', handlePeerDisconnect);
        conn.on('peer-reconnect', handlePeerReconnect);

        // Also check local network online/offline
        const handleOffline = markPaused;
        const handleOnline = () => resumeIfConnected(true);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            conn.off('peer-disconnect', handlePeerDisconnect);
            conn.off('peer-reconnect', handlePeerReconnect);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [conn, onConnectionPause, onConnectionResume]);

    // Countdown timer during pause
    useEffect(() => {
        let timer;
        if (isPaused && !isReconnected && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        }
        return () => { if (timer) clearInterval(timer); };
    }, [isPaused, isReconnected, timeLeft]);

    if (!isPaused) return null;

    return (
        <div className="safe-area-overlay fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-card border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                {isReconnected ? (
                    <div className="animate-pop-in">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                            <Zap size={30} />
                        </div>
                        <h3 className="text-xl font-black text-emerald-400 mb-1">عادت الإشارة!</h3>
                        <p className="text-xs font-bold opacity-70">تم استعادة الاتصال واستئناف اللعبة تلقائياً...</p>
                    </div>
                ) : (
                    <div>
                        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                            <WifiOff size={28} />
                        </div>
                        <h3 className="text-xl font-black text-amber-300 mb-1">اتقطع اتصال {opponentName || 'الخصم'}</h3>
                        <p className="text-xs opacity-75 font-bold mb-4">
                            وقفنا الجولة مؤقتًا وبنستنى رجوعه.
                        </p>

                        {/* Progress Bar */}
                        <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-white/10 mb-2 p-0.5">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(timeLeft / 30) * 100}%` }}
                            />
                        </div>

                        <div className="text-2xl font-mono font-black text-amber-400 mb-6">
                            {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
                        </div>

                        {inviteOpponent && (
                            <>
                                <button
                                    type="button"
                                    disabled={inviteState === 'sending' || inviteState === 'sent'}
                                    onClick={() => void handleInviteOpponent()}
                                    className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-400/10 py-3 text-xs font-black text-sky-100 transition hover:bg-sky-400/15 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                                >
                                    <Send size={15} />
                                    {inviteState === 'sending' ? 'جاري إرسال الدعوة...' : inviteState === 'sent'
                                        ? `اتبعثت دعوة الرجوع إلى ${opponentName || 'صديقك'}`
                                        : `دعوة ${opponentName || 'صديقك'} للعودة لنفس المباراة`}
                                </button>
                                {inviteError && <p role="alert" className="mb-3 text-xs font-bold text-rose-300">{inviteError}</p>}
                            </>
                        )}

                        {timeLeft === 0 ? (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs text-rose-400 font-bold mb-2">انتهت مدة الانتظار</p>
                                <button
                                    onClick={() => setTimeLeft(20)}
                                    className="glass-card py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                                >
                                    <RefreshCw size={14} /> انتظر 20 ثانية إضافية
                                </button>
                                <button
                                    onClick={() => { conn?.close?.(); if (onLeave) { onLeave(); } else { window.location.hash = ''; window.location.reload(); } }}
                                    className="glow-button py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2"
                                >
                                    <Home size={14} /> العودة للقائمة الرئيسية
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-[10px] opacity-40 font-bold mb-3">جاري محاولة المزامنة الفورية...</p>
                                <button
                                    onClick={() => { conn?.close?.(); if (onLeave) { onLeave(); } else { window.location.hash = ''; window.location.reload(); } }}
                                    className="glass-card w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/10 text-rose-400 border border-rose-500/20 transition-colors"
                                >
                                    <Home size={12} /> الرجوع للقائمة الآن
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
