import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Eye, KeyRound, RefreshCw, ShieldCheck, Trash2, Users } from 'lucide-react';

function formatDate(timestamp) {
    if (!timestamp) return '—';
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

async function adminRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر الاتصال بالخادم');
    return result;
}

export default function AdminDashboard({ setView }) {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [users, setUsers] = useState([]);
    const [openUserId, setOpenUserId] = useState('');
    const [userDetails, setUserDetails] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const loadUsers = useCallback(async () => {
        setBusy(true);
        setError('');
        try {
            const result = await adminRequest('/api/admin');
            setUsers(Array.isArray(result.users) ? result.users : []);
            setAuthenticated(true);
        } catch (requestError) {
            if (requestError.message.includes('سجّل دخول')) setAuthenticated(false);
            else setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => { void loadUsers(); }, [loadUsers]);

    const handleLogin = async event => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await adminRequest('/api/admin', {
                method: 'POST',
                body: JSON.stringify({ action: 'login', password })
            });
            setPassword('');
            await loadUsers();
        } catch (requestError) {
            setError(requestError.message);
            setBusy(false);
        }
    };

    const handleDelete = async user => {
        if (!window.confirm(`تمسح حساب ${user.username || user.nickname} وكل سجله؟`)) return;
        setBusy(true);
        setError('');
        try {
            await adminRequest('/api/admin', {
                method: 'DELETE',
                body: JSON.stringify({ uid: user.uid })
            });
            setUsers(current => current.filter(item => item.uid !== user.uid));
            if (openUserId === user.uid) setOpenUserId('');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    };

    const toggleUserDetails = async user => {
        if (openUserId === user.uid) {
            setOpenUserId('');
            return;
        }
        setOpenUserId(user.uid);
        if (userDetails[user.uid]) return;
        setBusy(true);
        setError('');
        try {
            const details = await adminRequest(`/api/admin?uid=${encodeURIComponent(user.uid)}`);
            setUserDetails(current => ({ ...current, [user.uid]: details }));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    };

    const handleLogout = async () => {
        setBusy(true);
        try {
            await adminRequest('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
            setAuthenticated(false);
            setUsers([]);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    };

    const leaveAdmin = () => {
        window.history.replaceState({}, '', '/');
        setView('hub');
    };

    return (
        <main className="min-h-dvh px-4 py-8 sm:px-6" dir="rtl">
            <div className="mx-auto max-w-5xl">
                <header className="mb-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black sm:text-2xl">إدارة Celia Games</h1>
                            <p className="mt-1 text-xs font-bold text-white/50">حسابات اللاعبين وإحصاءاتهم</p>
                        </div>
                    </div>
                    <button type="button" onClick={leaveAdmin} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black hover:bg-white/10">
                        <ArrowRight size={15} /> الرئيسية
                    </button>
                </header>

                {!authenticated ? (
                    <section className="glass-card mx-auto mt-16 max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl sm:p-8">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                            <KeyRound size={25} />
                        </div>
                        <h2 className="text-center text-lg font-black">دخول الإدارة</h2>
                        <p className="mb-5 mt-1 text-center text-xs font-bold text-white/50">الصفحة خاصة بصاحب الموقع</p>
                        <form onSubmit={handleLogin} className="flex flex-col gap-3">
                            <input
                                autoFocus
                                type="password"
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                autoComplete="current-password"
                                required
                                className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 text-center font-bold outline-none focus:border-[var(--accent)]"
                                placeholder="كلمة مرور الإدارة"
                            />
                            <button disabled={busy} className="glow-button h-12 rounded-xl font-black disabled:opacity-50">
                                {busy ? 'جاري التحقق...' : 'دخول'}
                            </button>
                        </form>
                        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-400/10 px-3 py-2 text-center text-xs font-bold text-rose-300">{error}</p>}
                    </section>
                ) : (
                    <section className="glass-card rounded-3xl border border-white/10 p-4 shadow-2xl sm:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Users size={19} className="text-[var(--accent)]" />
                                <h2 className="font-black">اللاعبون المسجلون</h2>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-black">{users.length}</span>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => void loadUsers()} disabled={busy} className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black hover:bg-white/10 disabled:opacity-50">
                                    <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> تحديث
                                </button>
                                <button type="button" onClick={() => void handleLogout()} disabled={busy} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black hover:bg-white/10 disabled:opacity-50">خروج الإدارة</button>
                            </div>
                        </div>

                        {error && <p role="alert" className="mb-3 rounded-xl bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-300">{error}</p>}
                        {users.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm font-bold text-white/50">
                                {busy ? 'جاري تحميل الحسابات...' : 'لسه مفيش حسابات مسجلة'}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {users.map(user => (
                                    <div key={user.uid}>
                                    <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(65px,0.55fr))_auto]">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black">{user.nickname || user.username || 'لاعب'}</p>
                                            <p className="mt-1 truncate text-[11px] font-bold text-white/45">@{user.username}</p>
                                            <p className="text-[10px] font-bold text-white/35">عضو منذ {formatDate(user.createdAt)}</p>
                                            <p className="mt-1 text-[10px] font-bold text-white/35 sm:hidden">{user.xp} XP · {user.wins} فوز · {user.gamesPlayed} مباراة</p>
                                            <p className="text-[10px] font-bold text-white/35 sm:hidden">آخر ظهور: {formatDate(user.lastSeenAt)}</p>
                                        </div>
                                        <div className="hidden text-center sm:block"><p className="text-xs font-black text-amber-300">{user.wins}</p><p className="text-[10px] text-white/40">فوز</p></div>
                                        <div className="hidden text-center sm:block"><p className="text-xs font-black">{user.gamesPlayed}</p><p className="text-[10px] text-white/40">مباراة</p></div>
                                        <div className="hidden text-center sm:block"><p className="text-xs font-black text-emerald-300">{user.xp}</p><p className="text-[10px] text-white/40">XP</p></div>
                                        <div className="hidden text-center sm:block"><p className="text-xs font-black">{formatDate(user.lastSeenAt)}</p><p className="text-[10px] text-white/40">آخر ظهور</p></div>
                                        <div className="flex gap-1.5">
                                            <button type="button" disabled={busy} onClick={() => void toggleUserDetails(user)} title="عرض السجل" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 disabled:opacity-50">
                                                {openUserId === user.uid ? <ChevronDown size={15} /> : <Eye size={15} />}
                                            </button>
                                            <button type="button" disabled={busy} onClick={() => void handleDelete(user)} title="حذف الحساب" className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/15 bg-rose-400/[0.06] text-rose-300 hover:bg-rose-400/15 disabled:opacity-50">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </article>
                                    {openUserId === user.uid && userDetails[user.uid] && (
                                        <div className="rounded-b-2xl border border-t-0 border-white/10 bg-black/25 px-3 pb-3 pt-2">
                                            <div className="mb-2 flex gap-3 text-[10px] font-bold text-white/50">
                                                <span>السلسلة الحالية: <b className="text-white/80">{userDetails[user.uid].streak?.currentStreak || 0}</b></span>
                                                <span>أعلى سلسلة: <b className="text-white/80">{userDetails[user.uid].streak?.maxStreak || 0}</b></span>
                                            </div>
                                            {userDetails[user.uid].history.length ? (
                                                <div className="flex flex-col gap-1.5">
                                                    {userDetails[user.uid].history.map(match => (
                                                        <div key={match.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.035] px-2.5 py-2 text-[10px]">
                                                            <span className="min-w-0 truncate font-black">{match.gameTitle} · {match.outcome === 'draw' ? 'تعادل' : match.isWin ? 'فوز' : 'خسارة'}</span>
                                                            <span className="shrink-0 text-white/45">{match.myScore} – {match.oppScore} · {formatDate(match.timestamp)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="py-2 text-center text-[10px] font-bold text-white/40">لا يوجد سجل مباريات بعد</p>}
                                        </div>
                                    )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}
