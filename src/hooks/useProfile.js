import { useState, useEffect } from 'react';

const STORAGE_KEY = 'celia_games_profile';

const DEFAULT_PROFILE = {
    nickname: 'لاعب عظيم',
    avatar: '😎',
};

export default function useProfile() {
    const [profile, setProfile] = useState(DEFAULT_PROFILE);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setProfile(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load profile', e);
        }
    }, []);

    const updateProfile = (updates) => {
        const newProfile = { ...profile, ...updates };
        setProfile(newProfile);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
        } catch (e) {
            console.error('Failed to save profile', e);
        }
    };

    return [profile, updateProfile];
}
