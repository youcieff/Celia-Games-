import { useTheme } from '../context/ThemeContext';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Shield from 'lucide-react/dist/esm/icons/shield';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    const isGirly = theme === 'girly';

    return (
        <button
            onClick={toggleTheme}
            className="theme-button relative flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-500 overflow-hidden shadow-lg"
        >
            {isGirly ? (
                <>
                    <Heart className="w-4 h-4 fill-current animate-pulse-slow" />
                    <span>بناتي</span>
                </>
            ) : (
                <>
                    <Shield className="w-4 h-4 fill-current" />
                    <span>ولادي</span>
                </>
            )}
        </button>
    );
}
