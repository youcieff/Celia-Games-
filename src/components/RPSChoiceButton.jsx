import React from 'react';
import HandFist from 'lucide-react/dist/esm/icons/hand-fist';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Scissors from 'lucide-react/dist/esm/icons/scissors';
import Equal from 'lucide-react/dist/esm/icons/equal';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';

const CHOICES = {
    rock: { label: 'حجر', Icon: HandFist },
    paper: { label: 'ورقة', Icon: FileText },
    scissors: { label: 'مقص', Icon: Scissors }
};

export function RPSChoiceIcon({ choice, size = 32, className = '' }) {
    const Icon = CHOICES[choice]?.Icon;
    if (!Icon) return null;
    return <Icon size={size} strokeWidth={2} className={className} aria-hidden="true" />;
}

export function RPSChoiceButton({
    choice,
    label = CHOICES[choice]?.label || '',
    selected = false,
    disabled = false,
    onClick,
    iconSize = 32,
    className = '',
    selectedClassName = '',
    idleClassName = '',
    selectedIconClassName = 'text-sky-300',
    idleIconClassName = 'text-white/80'
}) {
    if (!CHOICES[choice]) return null;

    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={selected}
            disabled={disabled}
            onClick={onClick}
            className={`group flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border font-black transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 ${selected
                ? (selectedClassName || 'border-sky-300/70 bg-sky-400/10 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.14)]')
                : (idleClassName || 'glass-card border-white/10 text-white/90 hover:-translate-y-0.5 hover:border-sky-300/40 hover:bg-white/[0.06]')
                } ${disabled && !selected ? 'cursor-not-allowed opacity-40' : ''} ${className}`}
        >
            <RPSChoiceIcon
                choice={choice}
                size={iconSize}
                className={`transition-transform duration-200 group-hover:scale-110 ${selected ? selectedIconClassName : idleIconClassName}`}
            />
            <span className="text-sm">{label}</span>
        </button>
    );
}

export function RPSTieNotice({ className = '' }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={`rounded-2xl border border-amber-300/35 bg-amber-300/[0.08] px-4 py-3 text-center shadow-[0_8px_28px_rgba(245,158,11,0.08)] ${className}`}
        >
            <div className="flex items-center justify-center gap-2 text-amber-200">
                <Equal size={19} strokeWidth={2.5} aria-hidden="true" />
                <span className="font-black">تعادل — اخترتما الحركة نفسها</span>
            </div>
            <p className="mt-1.5 text-xs font-bold leading-relaxed text-white/65">
                لم يبدأ أي لاعب بعد. اختارا من جديد لتحديد من يبدأ.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black text-amber-100/80">
                <RotateCcw size={13} aria-hidden="true" />
                <span>جولة جديدة</span>
            </div>
        </div>
    );
}
