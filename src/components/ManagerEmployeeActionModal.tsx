import React, { useState } from 'react';
import { Employee, Branch, ManagerRequestType } from '../types';
import { ApiService } from '../services/api';
import { SvgIcons } from './BobWichLogo';

type EmployeeActionType = Extract<ManagerRequestType, 'transfer' | 'resignation' | 'termination' | 'investigation'>;

interface Props {
  employee: Employee;
  branches: Branch[];
  /** النوع المختار افتراضيًا */
  initialType?: EmployeeActionType;
  onClose: () => void;
  /** بيتنادى بعد ما الطلب يتبعت بنجاح */
  onSent: (message: string) => void;
}

const ACTIONS: { type: EmployeeActionType; label: string; icon: string; hint: string; danger?: boolean }[] = [
  { type: 'transfer', label: 'نقل لفرع تاني', icon: '🔁', hint: 'الموارد البشرية بتراجع وبتنفّذ النقل' },
  { type: 'resignation', label: 'استقالة', icon: '📝', hint: 'الموظف قدّم استقالة وهيمشي في يوم معيّن' },
  { type: 'termination', label: 'طلب إنهاء تعاقد', icon: '⛔', hint: 'إنت عايز الموظف يمشي — القرار للموارد البشرية', danger: true },
  { type: 'investigation', label: 'تحويل للتحقيق', icon: '⚖️', hint: 'مخالفة تستدعي تحقيق رسمي', danger: true },
];

/**
 * نافذة مدير الفرع لطلب إجراء على موظف من فرعه.
 * كل الطلبات بتروح للموارد البشرية — مدير الفرع مش بينفّذ حاجة بنفسه.
 */
export const ManagerEmployeeActionModal: React.FC<Props> = ({ employee, branches, initialType, onClose, onSent }) => {
  const [type, setType] = useState<EmployeeActionType>(initialType || 'transfer');
  const [targetBranch, setTargetBranch] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherBranches = branches.filter(b => b.is_active && b.name !== employee.branch_name);
  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]';

  const needsDate = type === 'resignation' || type === 'termination';
  const dateLabel =
    type === 'resignation' ? 'آخر يوم عمل' : type === 'termination' ? 'تاريخ إنهاء التعاقد' : 'تاريخ النقل المطلوب (اختياري)';
  const reasonRequired = type !== 'resignation';

  const handleSend = async () => {
    setError(null);
    if (type === 'transfer' && !targetBranch) return setError('اختر الفرع اللي هيتنقل له الموظف');
    if (needsDate && !date) return setError(type === 'resignation' ? 'حدد آخر يوم عمل' : 'حدد تاريخ إنهاء التعاقد');
    if (reasonRequired && !reason.trim()) return setError('اكتب السبب');

    try {
      setIsSaving(true);
      await ApiService.createManagerRequest({
        request_type: type,
        employee_id: employee.id,
        target_branch: type === 'transfer' ? targetBranch : undefined,
        effective_date: date || undefined,
        reason: reason.trim() || undefined,
      });
      const label = ACTIONS.find(a => a.type === type)!.label;
      onSent(`تم إرسال طلب "${label}" للموارد البشرية بخصوص ${employee.full_name}`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  const current = ACTIONS.find(a => a.type === type)!;

  return (
    <div className="fixed inset-0 z-70 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-[#9E1A24] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg">إجراء على موظف</h3>
            <p className="text-[11px] text-amber-100 font-semibold mt-0.5">
              {employee.full_name} · {employee.position_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/15 transition-colors" title="إغلاق">
            <SvgIcons.XMark className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border-r-4 border-red-600 p-3 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2">
              <SvgIcons.AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map(a => (
              <button
                key={a.type}
                type="button"
                onClick={() => {
                  setType(a.type);
                  setError(null);
                }}
                className={`px-3 py-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                  type === a.type
                    ? a.danger
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-red-50 border-[#9E1A24] text-[#9E1A24]'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-stone-500 font-semibold">{current.hint}</p>

          {type === 'transfer' && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">الفرع الجديد</label>
              <select value={targetBranch} onChange={e => setTargetBranch(e.target.value)} className={inputClass}>
                <option value="">اختر الفرع</option>
                {otherBranches.map(b => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(needsDate || type === 'transfer') && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">{dateLabel}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${inputClass} font-mono`} />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">
              {type === 'resignation' ? 'سبب الاستقالة (اختياري)' : 'السبب / التفاصيل'}
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={
                type === 'investigation'
                  ? 'إيه اللي حصل؟ التاريخ والواقعة...'
                  : type === 'termination'
                  ? 'ليه عايز الموظف يمشي؟'
                  : type === 'transfer'
                  ? 'ليه النقل؟'
                  : 'أي تفاصيل تهم الموارد البشرية'
              }
              className={`${inputClass} font-semibold resize-none`}
            />
          </div>
        </div>

        <div className="px-5 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-200 transition-colors">
            إلغاء
          </button>
          <button
            onClick={handleSend}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#9E1A24] hover:bg-[#85151e] disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow transition-all"
          >
            {isSaving ? 'جاري الإرسال...' : 'إرسال للموارد البشرية'}
          </button>
        </div>
      </div>
    </div>
  );
};
