// Arabic drawing words for Quick Draw & Guess
// Grouped by category — used for random selection

export const DRAW_WORDS = [
    // Animals 🐾
    { word: 'قطة', category: 'حيوانات', emoji: '🐱' },
    { word: 'كلب', category: 'حيوانات', emoji: '🐶' },
    { word: 'أسد', category: 'حيوانات', emoji: '🦁' },
    { word: 'فيل', category: 'حيوانات', emoji: '🐘' },
    { word: 'زرافة', category: 'حيوانات', emoji: '🦒' },
    { word: 'سمكة', category: 'حيوانات', emoji: '🐟' },
    { word: 'طيور', category: 'حيوانات', emoji: '🐦' },
    { word: 'أرنب', category: 'حيوانات', emoji: '🐰' },
    { word: 'حصان', category: 'حيوانات', emoji: '🐴' },
    { word: 'تمساح', category: 'حيوانات', emoji: '🐊' },

    // Food 🍕
    { word: 'بيتزا', category: 'أكل', emoji: '🍕' },
    { word: 'برجر', category: 'أكل', emoji: '🍔' },
    { word: 'كعكة', category: 'أكل', emoji: '🎂' },
    { word: 'تفاحة', category: 'أكل', emoji: '🍎' },
    { word: 'موزة', category: 'أكل', emoji: '🍌' },
    { word: 'آيس كريم', category: 'أكل', emoji: '🍦' },
    { word: 'قهوة', category: 'أكل', emoji: '☕' },
    { word: 'شطة', category: 'أكل', emoji: '🌶️' },

    // Objects 🏠
    { word: 'سيارة', category: 'أشياء', emoji: '🚗' },
    { word: 'بيت', category: 'أشياء', emoji: '🏠' },
    { word: 'طيارة', category: 'أشياء', emoji: '✈️' },
    { word: 'قلم', category: 'أشياء', emoji: '✏️' },
    { word: 'كتاب', category: 'أشياء', emoji: '📚' },
    { word: 'موبايل', category: 'أشياء', emoji: '📱' },
    { word: 'ساعة', category: 'أشياء', emoji: '⌚' },
    { word: 'مفتاح', category: 'أشياء', emoji: '🔑' },
    { word: 'كورة', category: 'أشياء', emoji: '⚽' },
    { word: 'شمسية', category: 'أشياء', emoji: '☂️' },

    // Nature 🌿
    { word: 'شجرة', category: 'طبيعة', emoji: '🌳' },
    { word: 'شمس', category: 'طبيعة', emoji: '☀️' },
    { word: 'قمر', category: 'طبيعة', emoji: '🌙' },
    { word: 'سحاب', category: 'طبيعة', emoji: '☁️' },
    { word: 'بحر', category: 'طبيعة', emoji: '🌊' },
    { word: 'جبل', category: 'طبيعة', emoji: '⛰️' },
    { word: 'نجمة', category: 'طبيعة', emoji: '⭐' },
    { word: 'مطر', category: 'طبيعة', emoji: '🌧️' },
    { word: 'زهرة', category: 'طبيعة', emoji: '🌸' },

    // People & Actions 🕺
    { word: 'رجل', category: 'أشخاص', emoji: '🧍' },
    { word: 'راقص', category: 'أشخاص', emoji: '💃' },
    { word: 'طبيب', category: 'أشخاص', emoji: '👨‍⚕️' },
    { word: 'ملك', category: 'أشخاص', emoji: '👑' },
    { word: 'لاعب', category: 'أشخاص', emoji: '⚽' },
];

export function getRandomWords(count = 3) {
    const shuffled = [...DRAW_WORDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export function getRandomWord() {
    return DRAW_WORDS[Math.floor(Math.random() * DRAW_WORDS.length)];
}
