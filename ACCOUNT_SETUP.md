# إعداد الحساب الاختياري ولوحة الإدارة

الحساب اختياري. اللاعب الضيف يحتفظ بملفه وإحصاءاته على الجهاز الحالي، ويمكنه إنشاء حساب باسم مستخدم وPIN لنقل الملف والسجل إلى أجهزته الأخرى. بعد إنشاء الحساب يمكن إرسال طلبات صداقة بالاسم، وقبول الدعوات لدخول غرفة اللعبة. صفحة الإدارة موجودة على `/admin`.

## إعداد Firebase مرة واحدة

1. فعّل **Firebase Authentication** في مشروع `Celia-Games` حتى يقبل تسجيل الدخول بالـ Custom Token.
2. من **Project settings → Service accounts** أنشئ مفتاح **Firebase Admin SDK**. احتفظ بملف JSON خارج المستودع؛ لا ترفعه إلى Git ولا تضعه في ملفات `VITE_`.
3. في مشروع Vercel افتح **Settings → Environment Variables**، وأضف القيم التالية لبيئات Preview وProduction:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: محتوى ملف JSON كاملًا.
   - `FIREBASE_DATABASE_URL`: عنوان Realtime Database للمشروع، مثل `https://celia-games-9ed83-default-rtdb.europe-west1.firebasedatabase.app`.
   - `CELIA_ADMIN_PASSWORD`: `laila`.
   - `CELIA_ADMIN_SESSION_SECRET`: سلسلة عشوائية طويلة لا تقل عن 32 حرفًا. ولّدها محليًا في PowerShell:
     ```powershell
     $secretBytes = New-Object byte[] 48
     $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
     $rng.GetBytes($secretBytes)
     [Convert]::ToBase64String($secretBytes)
     $rng.Dispose()
     ```
4. احفظ المتغيرات ثم أعد نشر المشروع. افتح `/admin`، وأدخل كلمة المرور `laila`.

المشروع يحدد Node.js `>=22.12` في `package.json` لأن وظائف الحساب تستخدم Firebase Admin SDK.

## قواعد Realtime Database

الملف `database.rules.json` يضيف صلاحيات بيانات الحساب مع إبقاء صلاحيات `rooms` كما هي حاليًا. نشر القواعد يستبدل قواعد قاعدة البيانات الحالية بالقواعد الموجودة في الملف، لذلك راجع الملف قبل نشره. الحسابات والسجلات تُقرأ وتُكتب حاليًا من واجهات الخادم باستخدام Firebase Admin SDK.

لا ترسل ملف Service Account أو قيمة `CELIA_ADMIN_SESSION_SECRET` في المحادثة، ولا تحفظهما في المستودع.

واجهات `/api` تعمل كـ Vercel Functions؛ تشغيل الواجهة وحدها باستخدام `npm run dev` لا يشغّل هذه الوظائف. استخدم Preview Deployment على Vercel بعد ضبط المتغيرات للتأكد من الحسابات ولوحة الإدارة.
