import React, { useState, useEffect } from 'react';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Home from 'lucide-react/dist/esm/icons/home';
import { playSound } from '../lib/audioEngine';

export default function ConnectionPauseOverlay({ conn, onLeave }) {
    const [isPaused, setIsPaused] = useState(false);
    const [timeLeft, setTimeLeft] = useState(10);
    const [isReconnected, setIsReconnected] = useState(false);

    useEffect(() => {
        if (!conn) return;

        const handlePeerDisconnect = () => {
            playSound('lose');
            setIsPaused(true);
            setIsReconnected(false);
            setTimeLeft(10);
        };

        const handlePeerReconnect = () => {
            playSound('ding');
            setIsReconnected(true);
            setTimeout(() => {
                setIsPaused(false);
                setIsReconnected(false);
            }, 1200);
        };

        conn.on('peer-disconnect', handlePeerDisconnect);
        conn.on('peer-reconnect', handlePeerReconnect);

        // Also check local network online/offline
        const handleOffline = () => {
            setIsPaused(true);
            setTimeLeft(10);
        };
        const handleOnline = () => {
            setIsReconnected(true);
            setTimeout(() => {
                setIsPaused(false);
                setIsReconnected(false);
            }, 1200);
        };
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            conn.off('peer-disconnect', handlePeerDisconnect);
            conn.off('peer-reconnect', handlePeerReconnect);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [conn]);

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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-card border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                {isReconnected ? (
                    <div className="animate-pop-in">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                            <span className="text-3xl">⚡</span>
                        </div>
                        <h3 className="text-xl font-black text-emerald-400 mb-1">عادت الإشارة!</h3>
                        <p className="text-xs font-bold opacity-70">تم استعادة الاتصال واستئناف اللعبة تلقائياً...</p>
                    </div>
                ) : (
                    <div>
                        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                            <WifiOff size={28} />
                        </div>
                        <h3 className="text-xl font-black text-amber-300 mb-1">انقطع اتصال الخصم!</h3>
                        <p className="text-xs opacity-75 font-bold mb-4">
                            تم إيقاف اللعبة مؤقتاً لحفظ التقدم.. ننتظر عودة الخصم
                        </p>

                        {/* Progress Bar */}
                        <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-white/10 mb-2 p-0.5">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(timeLeft / 10) * 100}%` }}
                            />
                        </div>

                        <div className="text-2xl font-mono font-black text-amber-400 mb-6">
                            00:0{timeLeft}
                        </div>

                        {timeLeft === 0 ? (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs text-rose-400 font-bold mb-2">انتهت مدة الانتظار (10 ثوانٍ)</p>
                                <button
                                    onClick={() => setTimeLeft(15)}
                                    className="glass-card py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                                >
                                    <RefreshCw size={14} /> انتظر 15 ثانية إضافية
                                </button>
                                {onLeave && (
                                    <button
                                        onClick={onLeave}
                                        className="glow-button py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2"
                                    >
                                        <Home size={14} /> العودة للقائمة الرئيسية
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-[10px] opacity-40 font-bold">جاري محاولة المزامنة الفورية...</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
