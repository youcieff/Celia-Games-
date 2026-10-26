import {
    getAdminDatabase,
    sendJson,
    verifyBearerToken
} from '../server/firebaseAdmin.js';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const safeCount = value => Math.max(0, Math.min(1_000_000, Math.floor(Number(value) || 0)));
const normalizeName = value => String(value || '').trim().normalize('NFKC').toLocaleLowerCase('ar');
const storageKey = id => `p_${Buffer.from(id, 'utf8').toString('base64url')}`;

function cleanOpponent(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const nickname = String(value.nickname || '').trim().slice(0, 24);
    const suppliedId = typeof value.playerId === 'string' && ID_PATTERN.test(value.playerId) ? value.playerId : '';
    const playerId = suppliedId || (nickname ? `legacy_${Buffer.from(normalizeName(nickname), 'utf8').toString('base64url')}` : '');
    if (!nickname || !playerId) return null;
    return {
        playerId,
        nickname,
        aliases: Array.isArray(value.aliases)
            ? [...new Set(value.aliases.map(alias => String(alias || '').trim().slice(0, 24)).filter(Boolean))].slice(-20)
            : [],
        avatar: String(value.avatar || 'cool').slice(0, 40),
        wins: safeCount(value.wins),
        xp: safeCount(value.xp),
        matches: safeCount(value.matches),
        lastPlayed: Math.max(0, Math.min(Date.now() + 60_000, Number(value.lastPlayed) || 0))
    };
}

async function importLegacyOpponents(uid, body) {
    const database = getAdminDatabase();
    const ownProfile = (await database.ref(`users/${uid}`).get()).val();
    if (!ownProfile) {
        const error = new Error('الحساب غير موجود');
        error.status = 404;
        throw error;
    }
    const ownIds = new Set([uid, ownProfile.playerId].filter(Boolean));
    const ownNames = new Set([ownProfile.nickname, ...(ownProfile.nicknameAliases || [])].map(normalizeName).filter(Boolean));
    const submitted = Array.isArray(body.players) ? body.players.slice(0, 100) : [];
    const players = submitted.map(cleanOpponent).filter(player => player
        && !ownIds.has(player.playerId)
        && !ownNames.has(normalizeName(player.nickname))
        && !player.aliases.some(alias => ownNames.has(normalizeName(alias))));

    await Promise.all(players.map(async player => {
        const key = storageKey(player.playerId);
        const opponentRef = database.ref(`playedAgainst/${uid}/${key}`);
        const possiblePublicProfile = await database.ref(`publicProfiles/${player.playerId}`).get();
        const publicProfile = possiblePublicProfile.val();
        await opponentRef.transaction(current => {
            const saved = current && typeof current === 'object' ? current : {};
            const savedAliases = Array.isArray(saved.aliases) ? saved.aliases : [];
            return {
                ...saved,
                opponentId: player.playerId,
                ...(publicProfile?.uid ? { opponentUid: publicProfile.uid } : {}),
                nickname: publicProfile?.nickname || player.nickname,
                avatar: publicProfile?.avatar || player.avatar,
                aliases: [...new Set([...savedAliases, ...player.aliases, player.nickname])].filter(name => normalizeName(name) !== normalizeName(publicProfile?.nickname || player.nickname)).slice(-20),
                wins: Math.max(safeCount(saved.wins), player.wins),
                xp: Math.max(safeCount(saved.xp), player.xp),
                matches: Math.max(safeCount(saved.matches), player.matches),
                lastPlayed: Math.max(Number(saved.lastPlayed) || 0, player.lastPlayed),
                importedAt: Number(saved.importedAt) || Date.now()
            };
        }, undefined, false);
    }));
    return { imported: players.length };
}

async function loadLeaderboard(uid) {
    const database = getAdminDatabase();
    const [profileSnapshot, opponentsSnapshot] = await Promise.all([
        database.ref(`users/${uid}`).get(),
        database.ref(`playedAgainst/${uid}`).orderByChild('lastPlayed').limitToLast(100).get()
    ]);
    if (!profileSnapshot.exists()) {
        const error = new Error('الحساب غير موجود');
        error.status = 404;
        throw error;
    }
    const profile = profileSnapshot.val();
    const opponentEntries = Object.entries(opponentsSnapshot.val() || {})
        .sort((left, right) => (Number(right[1]?.lastPlayed) || 0) - (Number(left[1]?.lastPlayed) || 0))
        .slice(0, 100);
    const namesToHide = new Set([profile.nickname, ...(profile.nicknameAliases || [])].map(normalizeName).filter(Boolean));
    const loadedOpponents = await Promise.all(opponentEntries.map(async ([key, raw]) => {
        const saved = raw && typeof raw === 'object' ? raw : {};
        const opponentUid = typeof saved.opponentUid === 'string' && ID_PATTERN.test(saved.opponentUid)
            ? saved.opponentUid
            : null;
        const [latestProfileSnapshot, privateProfileSnapshot] = opponentUid
            ? await Promise.all([
                database.ref(`publicProfiles/${opponentUid}`).get(),
                database.ref(`users/${opponentUid}`).get()
            ])
            : [null, null];
        const latestProfile = latestProfileSnapshot?.val() || null;
        const privateProfile = privateProfileSnapshot?.val() || null;
        const nickname = String(latestProfile?.nickname || saved.nickname || '').trim().slice(0, 24);
        const aliases = [...new Set([
            ...(Array.isArray(saved.aliases) ? saved.aliases : []),
            ...(Array.isArray(privateProfile?.nicknameAliases) ? privateProfile.nicknameAliases : [])
        ])];
        if (!nickname || (!opponentUid && (namesToHide.has(normalizeName(nickname)) || aliases.some(alias => namesToHide.has(normalizeName(alias)))))
            || opponentUid === uid) return null;
        return {
            id: opponentUid || String(saved.opponentId || key),
            opponentUid,
            nickname,
            aliases: [...aliases, ...(latestProfile?.nickname ? [latestProfile.nickname] : [])],
            avatar: String(latestProfile?.avatar || saved.avatar || 'cool').slice(0, 40),
            wins: safeCount(latestProfile?.wins ?? saved.wins),
            xp: safeCount(latestProfile?.xp ?? saved.xp),
            gamesPlayed: safeCount(latestProfile?.gamesPlayed ?? saved.matches),
            isMe: false
        };
    }));
    const registeredAliasOwners = new Map();
    for (const opponent of loadedOpponents.filter(Boolean).filter(row => row.opponentUid)) {
        for (const alias of [opponent.nickname, ...opponent.aliases]) {
            const normalized = normalizeName(alias);
            if (!normalized) continue;
            if (!registeredAliasOwners.has(normalized)) registeredAliasOwners.set(normalized, new Set());
            registeredAliasOwners.get(normalized).add(opponent.opponentUid);
        }
    }
    const opponents = loadedOpponents.filter(Boolean).filter(opponent => {
        if (opponent.opponentUid) return true;
        return ![opponent.nickname, ...opponent.aliases].some(alias => {
            const owners = registeredAliasOwners.get(normalizeName(alias));
            return owners?.size === 1;
        });
    }).map(({ opponentUid, aliases, ...opponent }) => opponent);
    const rows = [{
        id: uid,
        nickname: String(profile.nickname || 'لاعب').slice(0, 24),
        avatar: String(profile.avatar || 'cool').slice(0, 40),
        wins: safeCount(profile.wins),
        xp: safeCount(profile.xp),
        gamesPlayed: safeCount(profile.gamesPlayed),
        isMe: true
    }, ...opponents.filter(Boolean)];
    const uniqueRows = [...new Map(rows.map(row => [row.id, row])).values()];
    uniqueRows.sort((left, right) => right.wins - left.wins || right.xp - left.xp || left.nickname.localeCompare(right.nickname));
    return uniqueRows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export default async function handler(req, res) {
    try {
        const identity = await verifyBearerToken(req);
        if (req.method === 'GET') return sendJson(res, 200, { leaderboard: await loadLeaderboard(identity.uid) });
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'طريقة الطلب غير مدعومة' });
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        if (body.action === 'import_legacy') return sendJson(res, 200, await importLegacyOpponents(identity.uid, body));
        return sendJson(res, 400, { error: 'طلب غير صالح' });
    } catch (error) {
        const status = Number(error.status) || (error.message?.includes('FIREBASE_SERVICE_ACCOUNT_JSON') ? 503 : 500);
        return sendJson(res, status, { error: status >= 500 ? 'تعذر تحميل المتصدرين الآن' : error.message });
    }
}
