import React from 'react';
import Delete from 'lucide-react/dist/esm/icons/delete';
import Check from 'lucide-react/dist/esm/icons/check';

export default function CodeKeypad({ onNumber, onDelete, onSubmit, disabled, submitDisabled }) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
        <div className="glass-card rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
                {nums.map(n => (
                    <button
                        key={n}
                        disabled={disabled}
                        onClick={() => onNumber(n.toString())}
                        className="numpad-btn h-[60px] text-2xl font-black rounded-xl disabled:opacity-30"
                    >
                        {n}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
                <button
                    disabled={disabled}
                    onClick={onDelete}
                    className="numpad-btn h-[60px] flex items-center justify-center text-red-400 rounded-xl disabled:opacity-30"
                >
                    <Delete size={28} />
                </button>
                <button
                    disabled={disabled}
                    onClick={() => onNumber('0')}
                    className="numpad-btn h-[60px] text-2xl font-black rounded-xl disabled:opacity-30"
                >
                    0
                </button>
                <button
                    disabled={submitDisabled}
                    onClick={onSubmit}
                    className="glow-button h-[60px] flex items-center justify-center rounded-xl shadow-lg disabled:opacity-30 z-10"
                >
                    <Check strokeWidth={3} size={28} />
                </button>
            </div>
        </div>
    );
}
