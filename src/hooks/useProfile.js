import { useState, useEffect, useRef } from 'react';

import { recordMatch } from '../lib/statsEngine';
import { ensureProfileIdentity } from '../lib/profileIdentity';
import { recordAccountMatch, syncAccountSnapshot } from '../lib/accountClient';

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

export default function useProfile(defaultMatchDetails = {}) {
    const [profile, setProfile] = useState(DEFAULT_PROFILE);
    const profileRef = useRef(profile);
    profileRef.current = profile;

    const saveProfile = (nextProfile, { sync = true } = {}) => {
        const normalized = ensureProfileIdentity(nextProfile);
        profileRef.current = normalized;
        setProfile(normalized);
        window.dispatchEvent(new CustomEvent('celia-local-profile-updated', { detail: normalized }));
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch (e) {
            console.error('Failed to save profile', e);
        }
        if (sync) void syncAccountSnapshot(normalized).catch(error => console.warn('Account sync will retry later', error));
        return normalized;
    };

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const savedProfile = { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
                const normalized = ensureProfileIdentity(savedProfile);
                profileRef.current = normalized;
                setProfile(normalized);
            } else {
                const normalized = ensureProfileIdentity(DEFAULT_PROFILE);
                profileRef.current = normalized;
                setProfile(normalized);
            }
        } catch (e) {
            console.error('Failed to load profile', e);
        }
        const handleLocalProfile = event => {
            if (!event.detail) return;
            profileRef.current = event.detail;
            setProfile(event.detail);
        };
        const handleAccountProfile = event => {
            let nextProfile = event.detail;
            if (!nextProfile) {
                try { nextProfile = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { }
            }
            if (!nextProfile) return;
            const normalized = ensureProfileIdentity({ ...DEFAULT_PROFILE, ...nextProfile });
            profileRef.current = normalized;
            setProfile(normalized);
        };
        window.addEventListener('celia-local-profile-updated', handleLocalProfile);
        window.addEventListener('celia-account-profile-updated', handleAccountProfile);
        return () => {
            window.removeEventListener('celia-local-profile-updated', handleLocalProfile);
            window.removeEventListener('celia-account-profile-updated', handleAccountProfile);
        };
    }, []);

    const updateProfile = (updates) => {
        const previous = profileRef.current;
        const nextProfile = { ...previous, ...updates };
        if (updates.nickname && updates.nickname.trim() !== previous.nickname?.trim()) {
            nextProfile.nicknameAliases = [...new Set([
                ...(previous.nicknameAliases || []),
                previous.nickname?.trim()
            ].filter(Boolean))].slice(-8);
        }
        saveProfile(nextProfile);
    };

    const awardMatchResult = (result, xpOrDetails = {}) => {
        const outcome = typeof result === 'string' ? result : (result ? 'win' : 'loss');
        const isWin = outcome === 'win';
        const suppliedDetails = xpOrDetails && typeof xpOrDetails === 'object' ? xpOrDetails : {};
        const matchDetails = { ...defaultMatchDetails, ...suppliedDetails };
        const detailXP = suppliedDetails.xpEarned ?? suppliedDetails.xp;
        const explicitXP = typeof xpOrDetails === 'number'
            ? xpOrDetails
            : detailXP !== undefined && detailXP !== null && Number.isFinite(Number(detailXP))
                ? Number(detailXP)
                : null;
        const addedXP = Number.isFinite(explicitXP) ? Math.max(0, explicitXP) : (isWin ? 30 : 10);
        const recorded = recordMatch({
            isWin,
            outcome,
            ...matchDetails,
            xpEarned: addedXP,
            gameId: matchDetails.gameId || 'unknown-game',
            gameTitle: matchDetails.gameTitle || 'مباراة'
        });

        const previous = profileRef.current;
        const nextProfile = {
            ...previous,
            xp: (previous.xp || 0) + addedXP,
            wins: (previous.wins || 0) + (isWin ? 1 : 0),
            gamesPlayed: (previous.gamesPlayed || 0) + 1
        };
        saveProfile(nextProfile, { sync: false });
        if (recorded?.match) {
            void recordAccountMatch(recorded.match, outcome, addedXP)
                .catch(error => console.warn('Account match saved locally and will retry', error));
        }
    };

    return [profile, updateProfile, awardMatchResult];
}
