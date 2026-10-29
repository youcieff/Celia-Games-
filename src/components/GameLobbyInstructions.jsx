import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CircleHelp from 'lucide-react/dist/esm/icons/circle-help';
import X from 'lucide-react/dist/esm/icons/x';

const LOBBY_GUIDES = {
    'celia-code': { title: 'خمن الكود', steps: ['اختاروا طول الكود، ثم يحاول كل لاعب كشف كود خصمه.', 'بعد كل محاولة راجع عدد الأرقام الصحيحة ومواقعها.', 'استخدم النتائج لتضييق الاحتمالات؛ أول من يكشف الكود يفوز.'] },
    'celia-word': { title: 'خمن الكلمة', steps: ['كل لاعب يكتب كلمة سرية للخصم.', 'خمّن الحروف بالتبادل؛ الحرف الصحيح يكشف مكانه والخطأ يستهلك محاولة.', 'اكشف كلمة خصمك قبل أن يكشف كلمتك.'] },
    'celia-xo': { title: 'إكس أو', steps: ['اختاروا X أو O بالتبادل على شبكة ٣×٣.', 'كوّن ثلاثة رموز متتالية أفقيًا أو رأسيًا أو قطريًا.', 'لو امتلأت الشبكة من غير فائز تنتهي الجولة تعادلًا.'] },
    'celia-uxo': { title: 'إكس أو الكبير', steps: ['اللوحة الكبيرة فيها ٩ لوحات إكس أو صغيرة.', 'حركتك تحدد اللوحة الصغيرة التي سيلعب فيها خصمك بعدك.', 'اكسب ٣ لوحات صغيرة على خط واحد للفوز باللوحة الكبيرة.'] },
    'celia-c4': { title: 'كونكت 4', steps: ['أسقط قرصك في أحد أعمدة الشبكة.', 'كوّن ٤ أقراص متتالية أفقيًا أو رأسيًا أو قطريًا.', 'امنع خصمك من إكمال خطه قبل أن تكمل خطك.'] },
    'celia-mem': { title: 'تحدي الذاكرة', steps: ['اقلب بطاقتين في كل محاولة وابحث عن صورتين متطابقتين.', 'لو تطابقتا احتفظ بالزوج والعب مرة أخرى.', 'اجمع أزواجًا أكثر من خصمك قبل انتهاء البطاقات.'] },
    'celia-db': { title: 'النقاط والمربعات', steps: ['ضع خطًا واحدًا في كل دور بين نقطتين متجاورتين.', 'أغلق أضلاع مربع لتسجل نقطة وتلعب مرة أخرى.', 'صاحب أكبر عدد من المربعات عند امتلاء اللوحة يفوز.'] },
    'celia-sea': { title: 'حرب السفن', steps: ['ضع سفنك على الشبكة من غير أن يراها خصمك.', 'اختار إحداثية في كل دور لتبحث عن سفينة الخصم.', 'اكشف كل سفن خصمك قبل أن يكشف سفنك.'] },
    'celia-time': { title: 'خمن الوقت', steps: ['اختاروا نمط الجولة والمدة المستهدفة.', 'ابدأ الساعة ثم أوقفها عند أقرب لحظة تقدر عليها.', 'الأقرب للوقت المطلوب يكسب الجولة؛ تابعوا النقاط حتى النهاية.'] },
    'celia-bus': { title: 'باص كامل', steps: ['ابدأ الجولة بالحرف الذي يظهر على الشاشة.', 'اكتب إجابة مناسبة لكل فئة وتبدأ بالحرف نفسه.', 'الإجابة الصحيحة وغير المكررة تكسب نقاطًا؛ صاحب المجموع الأعلى يفوز.'] },
    'celia-trivia': { title: 'تحدي المعلومات', steps: ['اقرأ السؤال واختار الإجابة الصحيحة من الاختيارات.', 'أجب بسرعة قبل انتهاء وقت السؤال.', 'اجمع نقاطًا أكثر من خصمك عبر الأسئلة لتفوز.'] },
    'celia-domino': { title: 'الدومينو', steps: ['ضع قطعة تطابق أحد طرفي السلسلة المفتوحين.', 'لو ماعندكش حركة مناسبة اسحب قطعة أو فوّت الدور حسب المتاح.', 'تخلّص من قطعك أولًا أو اجمع أقل نقاط عند إغلاق اللعب.'] },
    'celia-rps': { title: 'حجر ورقة مقص', steps: ['اختار حجرًا أو ورقة أو مقصًا في كل جولة.', 'الحجر يهزم المقص، والمقص يهزم الورقة، والورقة تهزم الحجر.', 'استخدم بطاقة الجولة بذكاء؛ أول لاعب يصل إلى نقاط الفوز يحسم المباراة.'] },
    'celia-hockey': { title: 'الهوكي الهوائي', steps: ['اسحب إصبعك أو حرّك الماوس لتحريك المضرب.', 'صد القرص وسدّد به إلى مرمى خصمك.', 'أول لاعب يسجل ٧ أهداف يفوز.'] },
    'celia-draw': { title: 'ارسم وخمّن', steps: ['الرسام يرسم الكلمة الظاهرة له من غير كتابة حروفها.', 'الخصم يكتب تخمينه؛ بدّلوا الأدوار بعد كل كلمة.', 'اكسب نقاطًا بالتخمين الصحيح قبل انتهاء الوقت.'] },
    'celia-snake': { title: 'ثعبان النيون', steps: ['وجّه ثعبانك بالأسهم أو WASD أو بالسحب على اللوحة.', 'كُل الطعام لتكبر، وتجنب الحواف والثعابين الأخرى.', 'ابقَ حيًا أطول من خصمك لتكسب المواجهة.'] },
    'celia-brick': { title: 'تدمير الكتل', steps: ['حرّك مضربك لرد الكرة، واضغط الساحة أو Space لإطلاقها.', 'الكتل مشتركة؛ الذهبية تحتاج ضربتين، وكل كتلة تمنح نقاطًا.', 'معك دقيقتان؛ أعلى مجموع نقاط عند انتهاء الوقت يكسب.'] },
    'celia-math': { title: 'سرعة الحساب', steps: ['حل المسألة الظاهرة وأرسل إجابتك بسرعة.', 'الإجابة الصحيحة تزيد نقاطك؛ الدقة والسرعة مهمتان.', 'اجمع نقاطًا أكثر من خصمك خلال الجولات للفوز.'] },
    'celia-sudoku': { title: 'سودوكو السرعة', steps: ['حلوا نفس اللغز على لوحتين منفصلتين.', 'املأ الخانات من ١ إلى ٩ بلا تكرار في الصف أو العمود أو مربع ٣×٣.', 'أول لاعب يكمل الحل الصحيح يكسب الجولة.'] },
    'celia-whoami': { title: 'أنا مين؟', steps: ['اختاروا بطاقاتكم السرية من غير ما تكشفوها لبعض.', 'اسأل سؤالًا إجابته نعم أو لا لتستبعد شخصيات.', 'خمّن بطاقة خصمك قبل أن يخمّن بطاقتك.'] },
    'celia-whoami-together': { title: 'أنا مين سوا', steps: ['اختاروا البطاقات السرية ثم مرروا الجهاز بينكم.', 'اسألوا أسئلة إجابتها نعم أو لا واستبعدوا البطاقات.', 'خمّنوا الشخصية السرية قبل نفاد المحاولات.'] },
    'celia-taboo': { title: 'الكلمة الممنوعة', steps: ['الواصف يشرح الكلمة من غير استخدام الكلمات الممنوعة.', 'الخمّان يكتب تخمينه في الدردشة؛ عندكم ٣ محاولات للكلمة.', 'بدّلوا الأدوار واجمعوا نقاطًا أكثر خلال الجولات.'] },
    'celia-taboo-together': { title: 'الكلمة الممنوعة سوا', steps: ['الواصف يشوف الكلمة والممنوعات ويشرحها بصوته.', 'الخمّان يقول تخمينه بصوت؛ اضغط «صح» عند الإجابة الصحيحة.', 'تخطّوا الكلمة لو صعبت، وبدّلوا الأدوار في الجولة التالية.'] },
};

export default function GameLobbyInstructions({ gameIdPrefix }) {
    const [isOpen, setIsOpen] = useState(false);
    const guide = LOBBY_GUIDES[gameIdPrefix] || {
        title: 'طريقة اللعب',
        steps: ['أنشئ غرفة وشارك كودها مع صديقك، أو أدخل كود غرفته.', 'اقرأ تعليمات الجولة داخل اللعبة واتبع دورك.', 'العبوا حتى تظهر نتيجة المباراة.']
    };

    useEffect(() => {
        if (!isOpen) return undefined;
        const previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = event => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            window.removeEventListener('keydown', closeOnEscape);
            document.body.style.overflow = previousBodyOverflow;
        };
    }, [isOpen]);

    return (
        <>
            <button
                type="button"
                className="lobby-instructions-trigger"
                onClick={() => setIsOpen(true)}
                aria-label={`طريقة لعب ${guide.title}`}
                title={`طريقة لعب ${guide.title}`}
            >
                <CircleHelp size={17} />
                <span className="sr-only">طريقة اللعب</span>
            </button>
            {isOpen && createPortal(
                <div className="lobby-instructions-backdrop" onClick={event => { if (event.target === event.currentTarget) setIsOpen(false); }}>
                    <section className="lobby-instructions-dialog" role="dialog" aria-modal="true" aria-labelledby="lobby-instructions-title" dir="rtl">
                        <header className="lobby-instructions-header">
                            <span className="lobby-instructions-mark"><CircleHelp size={20} /></span>
                            <div className="min-w-0 flex-1 text-right">
                                <p className="lobby-instructions-eyebrow">دليل سريع</p>
                                <h2 id="lobby-instructions-title" className="lobby-instructions-title">إزاي تلعب {guide.title}؟</h2>
                            </div>
                            <button type="button" className="lobby-instructions-close" onClick={() => setIsOpen(false)} aria-label="إغلاق التعليمات"><X size={18} /></button>
                        </header>
                        <ol className="lobby-instructions-steps">
                            {guide.steps.map((step, index) => (
                                <li key={step}>
                                    <span className="lobby-instructions-number">{index + 1}</span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                        <p className="lobby-instructions-footer">تقدر ترجع للتعليمات من علامة الاستفهام أعلى اللوبي.</p>
                    </section>
                </div>,
                document.body
            )}
        </>
    );
}
