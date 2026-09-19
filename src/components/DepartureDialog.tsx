import React, { useState } from 'react';
import { Employee } from '../types';

interface DepartureDialogProps {
  employee: Employee;
  /** 'مستقيل' أو 'منهي التعاقد' */
  status: string;
  onConfirm: (separationDate: string, reason: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * نافذة تسجيل استقالة / إنهاء تعاقد: بتاخد تاريخ الخروج وسببه (اختياري)
 * قبل ما الموظف يتنقل لأرشيف المستقيلين.
 */
export const DepartureDialog: React.FC<DepartureDialogProps> = ({
  employee,
  status,
  onConfirm,
  onCancel,
  isSaving = false,
}) => {
  const [date, setDate] = useState(todayLocal());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const isResign = status === 'مستقيل';

  const submit = () => {
    if (!date) {
      setError('يرجى تحديد التاريخ');
      return;
    }
    if (employee.hire_date && /^\d{4}-\d{2}-\d{2}/.test(employee.hire_date) && date < employee.hire_date.slice(0, 10)) {
      setError('التاريخ قبل تاريخ المباشرة، راجع التاريخ');
      return;
    }
    onConfirm(date, reason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      dir="rtl"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
            <span>🗄️</span>
            <span>{isResign ? 'تسجيل استقالة' : 'تسجيل إنهاء تعاقد'}</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            الموظف <strong className="text-stone-800">{employee.full_name}</strong> ({employee.employee_code})
            هيتنقل لـ <strong>أرشيف المستقيلين</strong> وبياناته ومستنداته تفضل محفوظة، وتقدر ترجّعه في أي وقت.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-stone-700">
            {isResign ? 'تاريخ الاستقالة' : 'تاريخ إنهاء التعاقد'}
          </span>
          <input
            type="date"
            value={date}
            onChange={e => {
              setDate(e.target.value);
              setError('');
            }}
            className="w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-stone-700">السبب / ملاحظات (اختياري)</span>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={isResign ? 'مثال: سفر، ظروف شخصية، فرصة عمل أخرى...' : 'مثال: انتهاء المدة، مخالفة...'}
            className="w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#9E1A24] resize-none"
          />
        </label>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-2 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={submit}
            disabled={isSaving}
            className="flex-1 bg-[#9E1A24] hover:bg-[#85151e] disabled:bg-stone-300 text-white py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            {isSaving ? 'جاري الحفظ...' : 'تأكيد ونقل للأرشيف'}
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
