// Service worker بسيط: غرضه الأساسي إن المتصفح يعتبر الموقع "قابل للتنصيب" على الشاشة الرئيسية،
// وبيدي كاش خفيف لملفات الواجهة الثابتة بس (مش بيانات الـ API) عشان الفتح يبقى أسرع
// ولو النت قطع لحظة، الواجهة تفضل شغالة. البيانات نفسها دايمًا بتتجاب لايف من السيرفر.

const CACHE_VERSION = 'bobwich-hr-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = ['/', '/manifest.webmanifest', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // بنسيب أي حاجة غير GET أو طلبات الـ API/الـ auth تعدي عادي من غير كاش خالص —
  // البيانات لازم تفضل لايف من السيرفر.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin) return;

  // للتنقل بين الصفحات (فتح الأبلكيشن): نجرب الشبكة الأول، ولو فشلت نرجع للكاش (offline fallback).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/').then((res) => res || fetch(request))),
    );
    return;
  }

  // للملفات الثابتة (JS/CSS/صور): كاش الأول وبعدين تحديث في الخلفية (stale-while-revalidate).
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    }),
  );
});
