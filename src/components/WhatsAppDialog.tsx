import React, { useMemo, useRef, useState } from 'react';
import { useAccessibleDialog } from './useAccessibleDialog';
import { Applicant } from '../types';
import {
  WHATSAPP_TEMPLATES,
  WhatsAppTemplateKey,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  defaultTemplateFor,
  toWhatsAppNumber,
} from '../utils/whatsapp';

interface WhatsAppDialogProps {
  applicant?: Applicant;
  applicants?: Applicant[];
  onClose: () => void;
}

/**
 * رسالة واتساب جاهزة للمتقدم: بتختار القالب (مقابلة / مستندات / قبول / اعتذار)،
 * تعدّل النص لو حبيت، وبعدين بتفتح واتساب بالرسالة معبّاة — أنت اللي بتدوس إرسال.
 */
export const WhatsAppDialog: React.FC<WhatsAppDialogProps> = ({ applicant: singleApplicant, applicants, onClose }) => {
  const recipients = applicants?.length ? applicants : singleApplicant ? [singleApplicant] : [];
  const [recipientIndex, setRecipientIndex] = useState(0);
  const applicant = recipients[Math.min(recipientIndex, recipients.length - 1)];
  const [template, setTemplate] = useState<WhatsAppTemplateKey>(() => defaultTemplateFor(applicant));
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [message, setMessage] = useState(() =>
    buildWhatsAppMessage(defaultTemplateFor(applicant), applicant),
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(dialogRef, onClose);
  const phone = useMemo(() => toWhatsAppNumber(applicant.phone), [applicant.phone]);

  const regenerate = (key: WhatsAppTemplateKey, d = date, t = time, p = place) =>
    setMessage(
      buildWhatsAppMessage(key, applicant, { interviewDate: d, interviewTime: t, interviewPlace: p }),
    );

  const pickTemplate = (key: WhatsAppTemplateKey) => {
    setTemplate(key);
    regenerate(key);
  };

  const whatsappUrl = phone ? buildWhatsAppUrl(phone, message) : '';

  const inputCls =
    'w-full bg-stone-50 rounded-xl px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600';

  return (
    <div
      className="fixed inset-0 z-[60] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="whatsapp-dialog-title" tabIndex={-1}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          {recipients.length > 1 && <p className="text-[11px] font-bold text-emerald-700 mb-1">المستلم {recipientIndex + 1} من {recipients.length}</p>}
          <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
            <span>💬</span>
            <span id="whatsapp-dialog-title">رسالة واتساب</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {applicant.full_name} ·{' '}
            <span className="font-mono" dir="ltr">
              {applicant.phone}
            </span>
          </p>
        </div>

        {!phone && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-2 text-xs font-bold">
            رقم الهاتف غير صالح للواتساب. راجع الرقم في بيانات المتقدم.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {WHATSAPP_TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={() => pickTemplate(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                template === t.key
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {template === 'interview' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[11px] font-bold text-stone-600">التاريخ</span>
              <input
                type="date"
                value={date}
                onChange={e => {
                  setDate(e.target.value);
                  regenerate('interview', e.target.value, time, place);
                }}
                className={inputCls}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold text-stone-600">الساعة</span>
              <input
                type="time"
                value={time}
                onChange={e => {
                  setTime(e.target.value);
                  regenerate('interview', date, e.target.value, place);
                }}
                className={inputCls}
              />
            </label>
            <label className="space-y-1 col-span-2">
              <span className="text-[11px] font-bold text-stone-600">المكان (اختياري — الافتراضي فرع المتقدم)</span>
              <input
                type="text"
                value={place}
                onChange={e => {
                  setPlace(e.target.value);
                  regenerate('interview', date, time, e.target.value);
                }}
                placeholder={`فرع ${applicant.branch_name}`}
                className={inputCls}
              />
            </label>
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-stone-600">نص الرسالة (تقدر تعدّله)</span>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={8}
            className={`${inputCls} leading-relaxed resize-y`}
          />
        </label>

        <div className="flex items-center gap-2 pt-1">
          {phone && message.trim() ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              فتح واتساب بالرسالة
            </a>
          ) : (
            <button
              disabled
              className="flex-1 bg-stone-300 cursor-not-allowed text-white py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              فتح واتساب بالرسالة
            </button>
          )}
          {recipientIndex < recipients.length - 1 && <button type="button" onClick={() => { const next = recipientIndex + 1; setRecipientIndex(next); const nextApplicant = recipients[next]; const nextTemplate = defaultTemplateFor(nextApplicant); setTemplate(nextTemplate); setMessage(buildWhatsAppMessage(nextTemplate, nextApplicant)); setDate(''); setTime(''); setPlace(''); }} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl font-bold text-sm">المستلم التالي</button>}
          <button
            onClick={onClose}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            إغلاق
          </button>
        </div>
        <p className="text-[11px] text-stone-400">
          الرسالة بتتفتح جاهزة في واتساب وأنت اللي بتدوس «إرسال». تغيير القالب أو التاريخ بيعيد كتابة النص.
        </p>
      </div>
    </div>
  );
};
