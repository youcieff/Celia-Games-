export const MATCH_CONDITIONS = [
    {
        id: 'yes_elimination',
        title: 'الاستبعاد بعد أيوه فقط',
        description: 'الاستبعاد متاح بعد أيوه فقط. لو الإجابة لأ، الدور ينتقل للخصم من غير استبعاد.'
    },
    {
        id: 'yes_continue',
        title: 'كمّل السؤال بعد أيوه',
        description: 'لو إجابة سؤالك أيوه، تقدر تسأل تاني. بعد لأ، استبعد أو خمّن ثم سلّم الدور.'
    },
    {
        id: 'no_repeat',
        title: 'ممنوع تكرار السؤال',
        description: 'كل سؤال يتسأل مرة واحدة فقط طول المباراة.'
    },
    {
        id: 'three_questions',
        title: '٣ أسئلة لكل لاعب',
        description: 'لكل لاعب ثلاثة أسئلة فقط طوال المباراة.'
    },
    {
        id: 'single_hint',
        title: 'تلميح واحد',
        description: 'لكل لاعب تلميح واحد، بعد ما يسأل أول سؤال.'
    },
    {
        id: 'interrupt_once',
        title: 'اقطع الدور مرة',
        description: 'بعد «لأ»، السائل يستبعد أو يخمّن ثم يسلّم الدور. وبعد أول سؤال، لكل لاعب فرصة واحدة يوقف بها دور خصمه ويأخذ الدور.'
    },
    {
        id: 'turn_timer',
        title: 'مؤقت ٣٠ ثانية',
        description: 'السؤال أو الاستبعاد لازم يتم خلال ٣٠ ثانية، وإلا الدور ينتقل.'
    }
];

export const getMatchCondition = (conditionId) =>
    MATCH_CONDITIONS.find(condition => condition.id === conditionId) || null;
