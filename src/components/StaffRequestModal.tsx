import React, { useState } from 'react';
import { JobPosition } from '../types';
import { ApiService } from '../services/api';
import { SvgIcons } from './BobWichLogo';

interface Props {
  positions: JobPosition[];
  initialPosition?: string;
  initialCount?: number;
  onClose: () => void;
  onSent: (message: string) => void;
}

/** طلب موظف/كاشير (أو أي وظيفة) لفرع مدير الفرع. */
export const StaffRequestModal: React.FC<Props> = ({ positions, initialPosition, initialCount, onClose, onSent }) => {
  const [position, setPosition] = useState(initialPosition || '');
  const [count, setCount] = useState<number>(initialCount && initialCount > 0 ? initialCount : 1);
  const [neededBy, setNeededBy] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePositions = positions.filter(p => p.is_active);
  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]';

  const handleSend = async () => {
    setError(null);
    if (!position) return setError('اختر الوظيفة المطلوبة');
    if (!count || count < 1) return setError('العدد لازم يكون 1 على الأقل');
    try {
      setIsSaving(true);
      await ApiService.createManagerRequest({
        request_type: 'staff_request',
        requested_position: position,
        requested_count: count,
        effective_date: neededBy || undefined,
        urgent,
        reason: reason.trim() || undefined,
      });
      onSent(`تم إرسال طلب ${count} × ${position} للموارد البشرية`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-[#9E1A24] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg">طلب موظف للفرع</h3>
            <p className="text-[11px] text-amber-100 font-semibold mt-0.5">الطلب بيروح للموارد البشرية وهي اللي بتوفّر</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700">الوظيفة</label>
              <select value={position} onChange={e => setPosition(e.target.value)} className={inputClass}>
                <option value="">اختر الوظيفة</option>
                {activePositions.map(p => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">العدد</label>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">محتاجه قبل تاريخ (اختياري)</label>
            <input type="date" value={neededBy} onChange={e => setNeededBy(e.target.value)} className={`${inputClass} font-mono`} />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
            <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} className="w-4 h-4 accent-[#9E1A24]" />
            مستعجل
          </label>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700">ملاحظات (اختياري)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="مثلاً: حد استقال / زيادة ضغط في الويك إند / شيفت ليلي"
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
            className="px-5 py-2.5 rounded-xl bg-[#9E1A24] hover:bg-[#85151e] disabled:opacity-50 text-white text-sm font-bold shadow transition-all"
          >
            {isSaving ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
};
