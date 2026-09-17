import React from 'react';
import { FormFieldConfig, FormSectionKey } from '../types';
import { customFieldsOf, formatCustomValue, allVisibleCustomFields, FORM_SECTIONS } from '../formFields';

/**
 * عرض/إدخال الحقول الإضافية التي أنشأها مدير النظام.
 *
 * نفس المكوّن يُستخدم في:
 *   - البوابة العامة  (CustomFieldsInputs)
 *   - شاشة إدخال/تعديل الأدمن (CustomFieldsInputs)
 *   - شاشة تفاصيل المتقدم (CustomFieldsReadOnly)
 *   - صفحة الطباعة (CustomFieldsPrint)
 *
 * وبالتالي أي حقل يضيفه المدير يظهر في الأربع شاشات بنفس الاسم وبنفس
 * الترتيب — مستحيل يحصل اختلاف بينهم.
 */

interface InputsProps {
  config: FormFieldConfig[];
  section: FormSectionKey;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  /** تنسيق الحقول: شبكة عمودين (افتراضي) أو عمود واحد */
  columns?: 1 | 2;
  disabled?: boolean;
}

export const CustomFieldsInputs: React.FC<InputsProps> = ({
  config,
  section,
  values,
  onChange,
  columns = 2,
  disabled = false,
}) => {
  const fields = customFieldsOf(config, section);
  if (fields.length === 0) return null;

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm';

  return (
    <div className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : ''} gap-4`}>
      {fields.map(f => {
        const value = values?.[f.key];
        const label = (
          <label className="block text-xs font-bold text-stone-700">
            {f.label} {f.required && <span className="text-red-500">*</span>}
          </label>
        );

        if (f.type === 'checkbox') {
          return (
            <label
              key={f.key}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                value ? 'border-[#9E1A24] bg-red-50/40' : 'border-stone-300 bg-white'
              } ${columns === 2 ? 'sm:col-span-2' : ''}`}
            >
              <input
                type="checkbox"
                checked={!!value}
                disabled={disabled}
                onChange={e => onChange(f.key, e.target.checked)}
                className="w-5 h-5 accent-[#9E1A24]"
              />
              <span className="text-sm font-bold text-stone-800">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </span>
            </label>
          );
        }

        return (
          <div
            key={f.key}
            className={`space-y-1 ${f.type === 'textarea' && columns === 2 ? 'sm:col-span-2' : ''}`}
          >
            {label}
            {f.type === 'select' ? (
              <select
                value={value ?? ''}
                disabled={disabled}
                onChange={e => onChange(f.key, e.target.value)}
                className={`${inputClass} bg-white font-medium`}
              >
                <option value="">اختر من القائمة</option>
                {(f.options || []).map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                rows={3}
                value={value ?? ''}
                disabled={disabled}
                placeholder={f.placeholder}
                onChange={e => onChange(f.key, e.target.value)}
                className={inputClass}
              />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'phone' ? 'tel' : 'text'}
                value={value ?? ''}
                disabled={disabled}
                placeholder={f.placeholder}
                onChange={e =>
                  onChange(
                    f.key,
                    f.type === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value
                  )
                }
                className={`${inputClass} ${f.type === 'phone' || f.type === 'number' ? 'font-mono' : ''}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------

interface ReadOnlyProps {
  config: FormFieldConfig[];
  /** لو تم تمريره، تُعرض حقول هذا القسم فقط، وإلا تُعرض كل الحقول الإضافية */
  section?: FormSectionKey;
  values: Record<string, any> | undefined;
}

/** عرض الحقول الإضافية داخل شاشة تفاصيل المتقدم (للأدمن) */
export const CustomFieldsReadOnly: React.FC<ReadOnlyProps> = ({ config, section, values }) => {
  const fields = section ? customFieldsOf(config, section) : allVisibleCustomFields(config);
  if (fields.length === 0) return null;

  return (
    <>
      {fields.map(f => (
        <div key={f.key} className="flex justify-between items-start gap-3 py-1.5 border-b border-stone-100 last:border-0">
          <span className="text-xs font-bold text-stone-500">{f.label}</span>
          <span className="text-xs font-bold text-stone-900 text-left">
            {formatCustomValue(f, values?.[f.key])}
          </span>
        </div>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------

interface PrintProps {
  config: FormFieldConfig[];
  values: Record<string, any> | undefined;
}

/**
 * الحقول الإضافية في صفحة الطباعة — مجمّعة حسب القسم بنفس ترتيب النموذج
 * حتى تتطابق الورقة المطبوعة تمامًا مع ما ملأه المتقدم.
 */
export const CustomFieldsPrint: React.FC<PrintProps> = ({ config, values }) => {
  const fields = allVisibleCustomFields(config).filter(f => f.show_in_print !== false);
  if (fields.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="bg-stone-800 text-white px-2 py-1 text-[11px] font-bold mb-1">
        بيانات إضافية
      </div>
      <table className="w-full border-collapse text-[10px]">
        <tbody>
          {fields.map(f => {
            const sectionTitle =
              FORM_SECTIONS.find(s => s.key === f.section)?.title || '';
            return (
              <tr key={f.key}>
                <td className="border border-stone-400 px-1.5 py-1 bg-stone-100 font-bold w-[32%]">
                  {f.label}
                  {sectionTitle && (
                    <span className="text-[8px] text-stone-500 font-normal"> ({sectionTitle})</span>
                  )}
                </td>
                <td className="border border-stone-400 px-1.5 py-1 font-bold">
                  {formatCustomValue(f, values?.[f.key])}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
