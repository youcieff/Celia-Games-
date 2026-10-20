import React, { useState } from 'react';

const PACK_FOLDERS = { people: 'friends', animals: 'animals', food: 'food' };

export function portraitPath(pack, card) {
    if (card?.image !== undefined) return card.image;
    const folder = PACK_FOLDERS[pack?.scope];
    return folder && card?.id ? `/whoami/${folder}/${card.id}.webp` : '';
}

export default function CardPortrait({ pack, card, className = '', fit = 'cover' }) {
    const src = portraitPath(pack, card);
    const [loadedSrc, setLoadedSrc] = useState('');
    const [failedSrc, setFailedSrc] = useState('');
    const imageLoaded = Boolean(src) && loadedSrc === src;
    const imageFailed = !src || failedSrc === src;

    return (
        <div className={`overflow-hidden bg-gradient-to-br from-violet-900 via-fuchsia-950 to-slate-950 ${className}`}>
            {!imageLoaded && (
                <div className="absolute inset-0 z-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,0.2),transparent_58%)]">
                    <span className="grid h-14 w-14 place-items-center rounded-full border border-amber-200/30 bg-slate-950/40 text-4xl font-black text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.2)]">
                        {card?.name?.charAt(0) || '?'}
                    </span>
                </div>
            )}
            {src && !imageFailed && (
                <img
                    src={src}
                    alt={card?.name || ''}
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                    onLoad={() => setLoadedSrc(src)}
                    onError={() => setFailedSrc(src)}
                    className={`absolute inset-0 z-0 h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                />
            )}
        </div>
    );
}
