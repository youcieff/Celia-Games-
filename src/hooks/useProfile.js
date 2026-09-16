import { useState, useEffect } from 'react';

import { recordMatch } from '../lib/statsEngine';

const STORAGE_KEY = 'celia_games_profile';

const DEFAULT_PROFILE = {
    nickname: 'لاعب عظيم',
    avatar: 'cool',
    xp: 0,
    wins: 0,
    gamesPlayed: 0
};

export const getLevelInfo = (xp = 0) => {
    const level = Math.floor(xp / 50) + 1;
    let title = 'مبتدئ 🥉';
    if (level >= 10) title = 'أسطورة سيليا 👑';
    else if (level >= 7) title = 'غراند ماستر 💎';
    else if (level >= 5) title = 'بطل المنصة 🏆';
    else if (level >= 3) title = 'محترف 🥇';
    else if (level >= 2) title = 'متحدي 🥈';

    const currentLevelBaseXP = (level - 1) * 50;
    const progressXP = xp - currentLevelBaseXP;
    const progressPercent = Math.min(100, Math.round((progressXP / 50) * 100));

    return { level, title, progressXP, nextLevelXP: 50, progressPercent };
};

export default function useProfile() {
    const [profile, setProfile] = useState(DEFAULT_PROFILE);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setProfile(prev => ({ ...DEFAULT_PROFILE, ...JSON.parse(stored) }));
            }
        } catch (e) {
            console.error('Failed to load profile', e);
        }
    }, []);

    const updateProfile = (updates) => {
        setProfile(prev => {
            const newProfile = { ...prev, ...updates };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
            } catch (e) {
                console.error('Failed to save profile', e);
            }
            return newProfile;
        });
    };

    const awardMatchResult = (isWin, matchDetails = {}) => {
        // Record match in history and update win streak
        if (matchDetails.gameTitle) {
            recordMatch({
                isWin,
                ...matchDetails
            });
        }

        setProfile(prev => {
            const addedXP = isWin ? 30 : 10;
            const newProfile = {
                ...prev,
                xp: (prev.xp || 0) + addedXP,
                wins: (prev.wins || 0) + (isWin ? 1 : 0),
                gamesPlayed: (prev.gamesPlayed || 0) + 1
            };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
            } catch (e) { }
            return newProfile;
        });
    };

    return [profile, updateProfile, awardMatchResult];
}
