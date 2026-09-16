import confetti from 'canvas-confetti';
import { playSound } from './audioEngine';

// Trigger a victory confetti explosion
export const triggerVictoryEffects = () => {
    // Play victory sound if you have one, or just pop
    playSound('pop'); 
    
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti({
            ...defaults, particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#34d399', '#fbbf24', '#ffffff'] // emerald, amber, white
        });
        confetti({
            ...defaults, particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#34d399', '#fbbf24', '#ffffff']
        });
    }, 250);
};

// Trigger a simple draw/tie effect
export const triggerDrawEffects = () => {
    playSound('pop');
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9ca3af', '#fcd34d', '#ffffff'] // gray, yellow, white
    });
};

// Trigger defeat effect
export const triggerDefeatEffects = () => {
    playSound('splash'); // or another suitable sound
    // We could add a screen shake or simple red flash
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(225, 29, 72, 0.3)'; // rose-600
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'opacity 1s ease-out';
    document.body.appendChild(overlay);

    // Fade out
    setTimeout(() => {
        overlay.style.opacity = '0';
    }, 100);

    // Remove
    setTimeout(() => {
        document.body.removeChild(overlay);
    }, 1100);
};
