import React from 'react';

/** Native input wrapper shared by the internal form and public portal. */
export const SharedInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = props => <input {...props} />;

/** Native select wrapper shared by the internal form and public portal. */
export const SharedSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = props => <select {...props} />;

/** Consistent date input for both applicant forms. */
export const SharedDateInput: React.FC<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>> = props => <input type="date" {...props} />;

interface YesNoFieldProps {
  name: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  layout?: 'inline' | 'cards';
}
/** Accessible yes/no radio group used for study and experience questions. */
export const YesNoField: React.FC<YesNoFieldProps> = ({ name, value, onChange, layout = 'inline' }) => (
  <div role="radiogroup" aria-label="اختر نعم أو لا" className={layout === 'cards' ? 'flex gap-4 mt-2' : 'flex items-center gap-4 pt-1'}>
    {([['نعم', true], ['لا', false]] as const).map(([label, answer]) => (
      <label key={label} className={layout === 'cards'
        ? `flex-1 py-2 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${value === answer ? 'bg-red-50 border-[#9E1A24] text-[#9E1A24]' : 'bg-stone-50 border-stone-200'}`
        : 'flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-800'}>
        <input type="radio" name={name} checked={value === answer} onChange={() => onChange(answer)} className="accent-[#9E1A24] w-4 h-4" />
        {label}
      </label>
    ))}
  </div>
);

/** Reusable loading skeleton for data-backed lists. */
export const ListLoadingSkeleton: React.FC<{ rows?: number; label?: string }> = ({ rows = 5, label = 'جاري تحميل البيانات' }) => (
  <div role="status" aria-label={label} aria-busy="true" className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
    <span className="sr-only">{label}</span>
    <div className="h-7 w-1/3 animate-pulse rounded-lg bg-stone-200" />
    {Array.from({ length: rows }, (_, i) => <div key={i} className="flex gap-3 animate-pulse"><div className="h-10 w-10 rounded-lg bg-stone-200" /><div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-stone-200" /><div className="h-3 w-1/3 rounded bg-stone-100" /></div><div className="h-8 w-20 rounded bg-stone-100" /></div>)}
  </div>
);
