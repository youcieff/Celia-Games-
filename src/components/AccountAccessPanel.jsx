import { useEffect, useState } from 'react';
import { KeyRound, LogOut, UserRound, UserRoundPlus } from 'lucide-react';
import {
    createAccount,
    getSavedAccount,
    loginToAccount,
    logoutAccount,
    refreshAccountSnapshot,
    subscribeToAccount
} from '../lib/accountClient';
import FriendsPanel from './FriendsPanel';

export default function AccountAccessPanel({ profile }) {
    const [user, setUser] = useState(null);
    const [savedAccount, setSavedAccount] = useState(() => getSavedAccount());
    const [mode, setMode] = useState('register');
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [pinConfirm, setPinConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => subscribeToAccount(nextUser => {
        setUser(nextUser);
        if (!nextUser) {
            setSavedAccount(getSavedAccount());
            return;
        }
        refreshAccountSnapshot()
            .then(remoteProfile => setSavedAccount({ username: remoteProfile?.username || nextUser.displayName }))
            .catch(syncError => setError(syncError.message));
    }), []);

    const handleSubmit = async event => {
        event.preventDefault();
        setError('');
        setMessage('');
        if (mode === 'register' && pin !== pinConfirm) {
            setError('الرقمان غير متطابقين');
            return;
        }

        setBusy(true);
        try {
            const accountProfile = mode === 'register'
                ? await createAccount(username, pin, profile)
                : await loginToAccount(username, pin);
            setSavedAccount({ username: accountProfile.username });
            setPin('');
            setPinConfirm('');
            setMessage(mode === 'register' ? 'اتحفظ حسابك وبياناتك على أي جهاز تسجّل منه.' : 'تم تسجيل الدخول ومزامنة بياناتك.');
        } catch (requestError) {
            setError(requestError.message || 'حصلت مشكلة، حاول تاني');
        } finally {
            setBusy(false);
        }
    };

    const handleLogout = async () => {
        setBusy(true);
        setError('');
        try {
            await logoutAccount();
            setSavedAccount(null);
            setMessage('خرجت من الحساب. تقدر تكمل اللعب كضيف.');
        } catch (logoutError) {
            setError(logoutError.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4 text-right" dir="rtl">
            <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]">
                    <UserRound size={18} />
                </span>
                <div>
                    <h3 className="text-sm font-black">حسابك على أجهزتك</h3>
                    <p className="mt-0.5 text-[10px] font-bold text-white/50">اختياري — اللعب كضيف يفضل متاحًا</p>
                </div>
            </div>

            {user ? (
                <>
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3">
                        <p className="text-xs font-bold text-white/60">الحساب المتصل · مزامنة تلقائية</p>
                        <p className="mt-1 truncate text-sm font-black text-emerald-300">{savedAccount?.username || user.displayName || 'حسابك'}</p>
                        <div className="mt-3 flex">
                            <button type="button" disabled={busy} onClick={handleLogout} className="flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 text-xs font-black text-rose-200 disabled:opacity-50">
                                <LogOut size={14} /> خروج
                            </button>
                        </div>
                    </div>
                    <FriendsPanel />
                </>
            ) : (
                <>
                    {savedAccount?.username && <p className="mb-2 text-[11px] font-bold text-white/50">آخر حساب: <span className="text-white/80">{savedAccount.username}</span></p>}
                    <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/20 p-1 text-[11px] font-black">
                        <button type="button" onClick={() => { setMode('register'); setError(''); setMessage(''); }} className={`rounded-lg py-2 ${mode === 'register' ? 'bg-[var(--accent)] text-white' : 'text-white/55'}`}>
                            إنشاء حساب
                        </button>
                        <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={`rounded-lg py-2 ${mode === 'login' ? 'bg-[var(--accent)] text-white' : 'text-white/55'}`}>
                            عندي حساب
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                        <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-[var(--accent)]">
                            <UserRoundPlus size={15} className="shrink-0 text-white/40" />
                            <input required minLength={3} maxLength={20} value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-white/35" placeholder="اسم المستخدم" />
                        </label>
                        <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-[var(--accent)]">
                            <KeyRound size={15} className="shrink-0 text-white/40" />
                            <input required minLength={6} maxLength={8} inputMode="numeric" pattern="[0-9٠-٩]{6,8}" value={pin} onChange={event => setPin(event.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className="w-full bg-transparent text-xs font-bold tracking-[0.2em] outline-none placeholder:tracking-normal placeholder:text-white/35" placeholder="PIN من 6 إلى 8 أرقام" />
                        </label>
                        {mode === 'register' && (
                            <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-[var(--accent)]">
                                <KeyRound size={15} className="shrink-0 text-white/40" />
                                <input required minLength={6} maxLength={8} inputMode="numeric" pattern="[0-9٠-٩]{6,8}" value={pinConfirm} onChange={event => setPinConfirm(event.target.value)} autoComplete="new-password" className="w-full bg-transparent text-xs font-bold tracking-[0.2em] outline-none placeholder:tracking-normal placeholder:text-white/35" placeholder="أكّد الـ PIN" />
                            </label>
                        )}
                        <button disabled={busy} className="glow-button flex h-10 items-center justify-center rounded-xl text-xs font-black disabled:opacity-50">
                            {busy ? 'لحظة...' : mode === 'register' ? 'إنشاء وحفظ بياناتي' : 'دخول ومزامنة'}
                        </button>
                    </form>
                    <p className="mt-2 text-center text-[10px] font-bold text-amber-200/70">احتفظ بالـ PIN؛ لا يوجد استرجاع له حاليًا.</p>
                </>
            )}

            {error && <p role="alert" className="mt-2 rounded-lg bg-rose-400/10 px-3 py-2 text-[11px] font-bold text-rose-300">{error}</p>}
            {message && <p role="status" className="mt-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-300">{message}</p>}
        </section>
    );
}
