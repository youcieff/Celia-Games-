import React, { useState } from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Plus from 'lucide-react/dist/esm/icons/plus';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

export default function P2PLobby({ myId, onJoin, isConnecting }) {
    const [joinId, setJoinId] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(myId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto gap-5">

            {/* Create Room */}
            <div className="glass-card rounded-3xl p-6 w-full text-center">
                <h2 className="text-xl font-black mb-1 flex items-center justify-center gap-2">
                    <Plus size={20} /> إنشاء غرفة جديدة
                </h2>
                <p className="opacity-50 text-xs mb-4">ابعت الكود ده للطرف التاني عشان يدخل معاك</p>

                {myId ? (
                    <div className="flex items-center gap-2 glass-card rounded-2xl p-3 mb-2">
                        <span className="font-mono text-2xl tracking-widest font-black flex-1">{myId}</span>
                        <button onClick={handleCopy} className="opacity-60 hover:opacity-100 transition-opacity p-2">
                            <Copy size={20} className={copied ? "text-emerald-400" : ""} />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center py-3">
                        <Loader2 className="animate-spin opacity-40" size={28} />
                    </div>
                )}

                {copied && (
                    <p className="text-xs text-emerald-400 font-bold animate-pop-in">✓ تم النسخ!</p>
                )}
            </div>

            <div className="flex items-center gap-4 w-full">
                <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }}></div>
                <span className="opacity-40 text-sm">أو</span>
                <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }}></div>
            </div>

            {/* Join Room */}
            <div className="glass-card rounded-3xl p-6 w-full text-center">
                <h2 className="text-xl font-black mb-1 flex items-center justify-center gap-2">
                    <LinkIcon size={20} /> دخول لغرفة
                </h2>
                <p className="opacity-50 text-xs mb-4">اكتب كود الغرفة اللي اتعملت</p>

                <input
                    type="text"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                    placeholder="XXXX"
                    className="glass-input w-full rounded-2xl px-4 py-4 text-center font-mono tracking-widest font-black text-xl mb-4 uppercase"
                    dir="ltr"
                    maxLength={4}
                />

                <button
                    onClick={() => onJoin(joinId)}
                    disabled={!joinId || isConnecting}
                    className="glow-button w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {isConnecting ? <Loader2 className="animate-spin" size={22} /> : '🚀 انضمام الآن'}
                </button>
            </div>
        </div>
    );
}
