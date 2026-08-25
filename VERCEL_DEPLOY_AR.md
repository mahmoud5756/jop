# خطوات النشر على Vercel

## ما اتغيّر في المشروع
- **`server/app.ts`** (جديد): يحتوي على كل الـ API routes بدون `app.listen()` ومن غير أي static/vite serving — ملف مشترك بين البيئة المحلية و Vercel.
- **`server.ts`**: بقى بس لتشغيل المشروع محليًا (`npm run dev`) — بيستدعي `createApp()` من `server/app.ts` ويضيف عليه الـ static serving أو vite حسب البيئة.
- **`api/index.ts`** (جديد): نقطة الدخول لـ Vercel Serverless Function — بتستخدم نفس `createApp()` وتصدّرها مباشرة (`export default app`), Vercel بيشغلها كـ handler لكل طلب.
- **`vercel.json`** (جديد): يبني الفرونت إند بـ `vite build`، ويوجّه كل `/api/*` لملف `api/index.ts`، وأي مسار تاني لـ `index.html` (SPA fallback).

## خطوات النشر
1. تأكد إن المشروع كامل (بما فيه مجلد `api/` و`server/` و`vercel.json`) مرفوع على GitHub (أو أي Git provider متصل بـ Vercel).
2. من لوحة Vercel: **New Project** → اختار الريبو ده.
3. Vercel هيكتشف تلقائيًا إعدادات `vercel.json`. تأكد إن:
   - **Framework Preset**: Other / Vite
   - **Build Command**: `vite build` (متظبط في vercel.json بالفعل)
   - **Output Directory**: `dist`
4. **مهم جدًا:** ضيف متغيرات البيئة دي في إعدادات المشروع (Project Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET` (لازم تحط قيمة قوية وسرية، متسبهاش الافتراضية)
   - `GEMINI_API_KEY` (لو بتستخدم أي ميزة AI)
5. اعمل Deploy.

## ملاحظة مهمة عن الـ Rate Limiting
الـ rate limiter بتاع تسجيل الدخول (`createRateLimiter` في `server/auth.ts`) بيخزن العداد في ذاكرة الـ process (`Map` عادية). في بيئة Vercel Serverless، كل طلب ممكن ياخد instance مختلفة، فالحد ده (15 محاولة/دقيقة مثلاً) ممكن ميتطبقش بدقة 100%. ده مش هيمنع تسجيل الدخول من الشغل، بس الحماية من الـ brute-force هتبقى أضعف من بيئة سيرفر تقليدي دايم شغال (زي Render/Railway). لو محتاج حماية دقيقة، فكّر تستخدم Redis أو خدمة rate-limiting خارجية بدل الـ in-memory Map.
