import React, { useState } from 'react';
import StickyNote from 'lucide-react/dist/esm/icons/sticky-note';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';

export default function Scratchpad() {
    const [notes, setNotes] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full mb-3">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="w-full glass-card rounded-2xl px-4 py-3 flex items-center justify-between transition-all hover:scale-[1.01]"
            >
                <div className="flex items-center gap-2 font-bold text-sm">
                    <StickyNote size={16} style={{ color: 'var(--accent-color)' }} />
                    <span>ملاحظاتي 📝</span>
                    {notes && (
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-slow" />
                    )}
                </div>
                {isOpen ? <ChevronUp size={16} className="opacity-50" /> : <ChevronDown size={16} className="opacity-50" />}
            </button>

            {/* Expandable Note Area */}
            {isOpen && (
                <div className="mt-2 glass-card rounded-2xl p-3 animate-pop-in">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs opacity-40 font-bold">اكتب ملاحظاتك هنا — مثلاً: الرقم 5 في المنتصف، 3 مش موجود...</p>
                        {notes && (
                            <button onClick={() => setNotes('')} className="opacity-40 hover:opacity-80 p-1">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="✏️ سجّل ملاحظاتك..."
                        dir="rtl"
                        rows={3}
                        className="glass-input w-full rounded-xl px-3 py-2 text-sm resize-none font-arabic"
                        style={{ minHeight: '80px' }}
                    />
                </div>
            )}
        </div>
    );
}
