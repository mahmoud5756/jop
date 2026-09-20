import { Applicant } from '../types';
import { getMissingDocuments } from './applicantDocuments';

/**
 * بيحوّل رقم الموبايل لصيغة واتساب الدولية (مصر: 20 + الرقم بدون الصفر).
 * بيرجّع null لو الرقم مش صالح.
 */
export const toWhatsAppNumber = (raw: string | undefined | null): string | null => {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('20') && d.length === 12) return d;
  if (d.startsWith('0') && d.length === 11) return `20${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('1')) return `20${d}`;
  // رقم دولي تاني (بدون صفر في الأول)
  if (d.length >= 11 && d.length <= 15 && !d.startsWith('0')) return d;
  return null;
};

export const buildWhatsAppUrl = (phone: string, text: string): string =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

export type WhatsAppTemplateKey = 'interview' | 'documents' | 'accepted' | 'rejected' | 'blank';

export const WHATSAPP_TEMPLATES: { key: WhatsAppTemplateKey; label: string }[] = [
  { key: 'interview', label: 'دعوة لمقابلة' },
  { key: 'documents', label: 'استكمال المستندات' },
  { key: 'accepted', label: 'قبول' },
  { key: 'rejected', label: 'اعتذار' },
  { key: 'blank', label: 'رسالة فاضية' },
];

export interface WhatsAppContext {
  interviewDate?: string; // YYYY-MM-DD
  interviewTime?: string; // HH:MM
  interviewPlace?: string;
}

const formatDateAr = (iso?: string) => {
  if (!iso) return '____';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? '____'
    : d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
};

const formatTimeAr = (hhmm?: string) => {
  if (!hhmm) return '____';
  const d = new Date(`1970-01-01T${hhmm}:00`);
  return Number.isNaN(d.getTime())
    ? '____'
    : d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true });
};

/** الحالة الافتراضية للقالب حسب وضع الطلب */
export const defaultTemplateFor = (a: Applicant): WhatsAppTemplateKey => {
  if (a.status === 'مقبول') return 'accepted';
  if (a.status === 'مرفوض' || a.status === ('رفض' as any)) return 'rejected';
  if (getMissingDocuments(a).length > 0) return 'documents';
  return 'interview';
};

export const buildWhatsAppMessage = (
  key: WhatsAppTemplateKey,
  a: Applicant,
  ctx: WhatsAppContext = {},
): string => {
  const name = a.full_name;
  const position = a.position_name;
  const branch = a.branch_name;

  switch (key) {
    case 'interview':
      return [
        `السلام عليكم ${name}،`,
        `شكرًا لتقديمك على وظيفة ${position} في BOB WICH.`,
        `يسعدنا ندعوك لمقابلة شخصية:`,
        `📅 ${formatDateAr(ctx.interviewDate)}`,
        `🕒 ${formatTimeAr(ctx.interviewTime)}`,
        `📍 ${ctx.interviewPlace?.trim() || `فرع ${branch}`}`,
        `برجاء تأكيد حضورك بالرد على الرسالة دي.`,
      ].join('\n');
    case 'documents': {
      const missing = getMissingDocuments(a);
      const list = missing.length ? missing.map(m => `• ${m}`).join('\n') : '• ____';
      return [
        `السلام عليكم ${name}،`,
        `بخصوص طلب التوظيف لوظيفة ${position} في BOB WICH، لسه ناقصنا المستندات دي:`,
        list,
        `برجاء إرسالها في أقرب وقت لاستكمال الطلب. شكرًا لتعاونك.`,
      ].join('\n');
    }
    case 'accepted':
      return [
        `السلام عليكم ${name}،`,
        `يسعدنا نبلغك إن طلبك لوظيفة ${position} في BOB WICH (فرع ${branch}) اتقبل 🎉`,
        `هنتواصل معاك لتحديد موعد المباشرة.`,
      ].join('\n');
    case 'rejected':
      return [
        `السلام عليكم ${name}،`,
        `شكرًا لاهتمامك بالتقدم لوظيفة ${position} في BOB WICH.`,
        `للأسف مش هنقدر نكمل معاك في الوقت الحالي، وبنتمنالك التوفيق.`,
      ].join('\n');
    default:
      return `السلام عليكم ${name}،\n`;
  }
};
