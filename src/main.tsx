import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// تسجيل الـ service worker عشان الموقع يبقى قابل للتنصيب على الشاشة الرئيسية
// (بدون ما يبقى تطبيق تقيل من المتجر) — لو المتصفح مش بيدعمه بيتجاهل بهدوء.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* غير مدعوم أو فشل التسجيل — مش مشكلة، الموقع بيشتغل عادي من غيره */
    });
  });
}
