/**
 * صوت الإشعارات — نغمة قصيرة (لحنين) بتتولّد برمجيًا عن طريق Web Audio API،
 * فمفيش حاجة لملف صوت خارجي نحمّله أو نستضيفه.
 *
 * ملحوظة: المتصفحات بتمنع تشغيل أي صوت قبل أول تفاعل حقيقي من المستخدم مع الصفحة
 * (ضغطة أو لمسة)، فالصوت هيشتغل عادي طول ما المستخدم داخل شغال على الصفحة —
 * وده بالظبط وقت وصول الإشعارات الجديدة.
 */

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
};

/** بيشغّل نغمة إشعار قصيرة (دينج-دونج لطيف). */
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const notes: Array<{ freq: number; start: number; duration: number }> = [
      { freq: 880, start: 0, duration: 0.14 },
      { freq: 1318.5, start: 0.12, duration: 0.22 },
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.22, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    });
  } catch {
    // لو المتصفح رفض التشغيل (مثلاً قبل أول تفاعل)، نتجاهل بهدوء من غير ما نكسر الواجهة
  }
};

/** بيطلب إذن إشعارات النظام مرة واحدة (يتم استدعاؤها بعد أول تفاعل من المستخدم، مثلاً بعد تسجيل الدخول). */
export const requestNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
};

/**
 * بيبعت إشعار نظام (بيظهر حتى لو التاب في الخلفية) — بس لو المستخدم وافق على الإذن.
 * بيشتغل مع صوت النظام الافتراضي للإشعارات.
 */
export const showSystemNotification = (title: string, body?: string) => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, {
      body,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      tag: 'bobwich-hr-notification',
    });
  } catch {
    // بعض المتصفحات (خصوصًا على iOS خارج وضع التطبيق المثبّت) ممكن ما تدعمش ده — نتجاهل بهدوء
  }
};
