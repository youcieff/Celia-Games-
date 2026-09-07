import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Shield from 'lucide-react/dist/esm/icons/shield';

export default function Visualizer({ lives, maxLives }) {
    const { theme } = useTheme();
    const isGirly = theme === 'girly';

    return (
        <div className="flex gap-3 justify-center my-4">
            {Array.from({ length: maxLives }).map((_, idx) => {
                const isLost = idx >= lives;

                return (
                    <div
                        key={idx}
                        className={`life-icon transition-all duration-500 ${isLost ? 'lost' : ''}`}
                    >
                        {isGirly ? (
                            <Heart
                                size={38}
                                className={isLost ? 'text-gray-600' : 'text-pink-400 fill-pink-400'}
                            />
                        ) : (
                            <Shield
                                size={38}
                                className={isLost ? 'text-gray-600' : 'text-emerald-400 fill-emerald-400'}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
