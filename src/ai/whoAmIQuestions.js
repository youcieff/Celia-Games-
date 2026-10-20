// Templates mapping attributes to questions for the AI

export const WHOAMI_QUESTIONS = {
  people: [
    { attr: 'gender', val: 'female', text: 'هل هي أنثى؟ (ست)' },
    { attr: 'gender', val: 'male', text: 'هل هو ذكر؟ (رجل)' },
    { attr: 'hairColor', val: 'black', text: 'هل لون شعره/شعرها أسود؟' },
    { attr: 'hairColor', val: 'brown', text: 'هل لون شعره/شعرها بني؟' },
    { attr: 'hairColor', val: 'blonde', text: 'هل شعره/شعرها أشقر؟' },
    { attr: 'hairColor', val: 'red', text: 'هل لون شعره/شعرها أحمر؟' },
    { attr: 'hairColor', val: 'gray', text: 'هل لون شعره/شعرها رمادي/أبيض؟' },
    { attr: 'hairColor', val: 'none', text: 'هل هو أصلع؟' },
    { attr: 'hairLength', val: 'long', text: 'هل شعره/شعرها طويل؟' },
    { attr: 'hairLength', val: 'short', text: 'هل شعره/شعرها قصير؟' },
    { attr: 'glasses', val: true, text: 'هل يرتدي/ترتدي نظارة؟' },
    { attr: 'hat', val: true, text: 'هل يرتدي/ترتدي قبعة؟' },
    { attr: 'facialHair', val: 'mustache', text: 'هل عنده شنب؟' },
    { attr: 'facialHair', val: 'beard', text: 'هل عنده لحية (دقن)؟' },
    { attr: 'earrings', val: true, text: 'هل يرتدي/ترتدي حلق؟' },
    { attr: 'ageGroup', val: 'young', text: 'هل هو/هي شاب/شابة؟' },
    { attr: 'ageGroup', val: 'elderly', text: 'هل هو/هي كبير في السن (عجوز)؟' },
    { attr: 'skinTone', val: 'dark', text: 'هل بشرته/بشرتها سمراء؟' },
    { attr: 'skinTone', val: 'light', text: 'هل بشرته/بشرتها فاتحة؟' },
    { attr: 'smiling', val: true, text: 'هل هو/هي يبتسم في الصورة؟' }
  ],
  animals: [
    { attr: 'habitat', val: 'land', text: 'هل يعيش على الأرض؟' },
    { attr: 'habitat', val: 'water', text: 'هل يعيش في الماء؟' },
    { attr: 'habitat', val: 'air', text: 'هل يستطيع الطيران؟' },
    { attr: 'hasFur', val: true, text: 'هل يغطيه الفرو؟' },
    { attr: 'hasWings', val: true, text: 'هل عنده أجنحة؟' },
    { attr: 'legsCount', val: '4', text: 'هل يمشي على 4 أرجل؟' },
    { attr: 'legsCount', val: '2', text: 'هل يمشي على رجلين؟' },
    { attr: 'legsCount', val: '0', text: 'هل ليس لديه أرجل؟' },
    { attr: 'legsCount', val: '6', text: 'هل لديه 6 أرجل؟' },
    { attr: 'legsCount', val: '8', text: 'هل لديه 8 أرجل؟' },
    { attr: 'size', val: 'large', text: 'هل حجمه كبير؟' },
    { attr: 'size', val: 'small', text: 'هل حجمه صغير؟' },
    { attr: 'diet', val: 'meat', text: 'هل يأكل اللحوم (مفترس)؟' },
    { attr: 'diet', val: 'plants', text: 'هل يأكل النباتات (عاشب)؟' },
    { attr: 'isPet', val: true, text: 'هل يمكن تربيته كحيوان أليف؟' }
  ],
  food: [
    { attr: 'temperature', val: 'hot', text: 'هل يُقدم ساخنًا عادة؟' },
    { attr: 'temperature', val: 'cold', text: 'هل يُقدم باردًا؟' },
    { attr: 'taste', val: 'sweet', text: 'هل طعمه حلو (حلوى)؟' },
    { attr: 'taste', val: 'savory', text: 'هل طعمه حادق (مالح)؟' },
    { attr: 'course', val: 'main', text: 'هل يعتبر وجبة رئيسية؟' },
    { attr: 'course', val: 'dessert', text: 'هل هو للتحلية؟' },
    { attr: 'course', val: 'drink', text: 'هل هو مشروب؟' },
    { attr: 'origin', val: 'egyptian', text: 'هل أصله مصري أو مشهور جدًا في مصر؟' },
    { attr: 'mainIngredient', val: 'rice', text: 'هل المكون الأساسي فيه أرز؟' },
    { attr: 'mainIngredient', val: 'meat', text: 'هل يحتوي على لحوم؟' },
    { attr: 'mainIngredient', val: 'dough', text: 'هل يحتوي على عجين/مخبوزات؟' },
    { attr: 'mainIngredient', val: 'dairy', text: 'هل يحتوي على حليب أو مشتقاته؟' },
    { attr: 'eatenWithHand', val: true, text: 'هل يمكن أكله باليد بسهولة (بدون معلقة/شوكة)؟' }
  ]
};
