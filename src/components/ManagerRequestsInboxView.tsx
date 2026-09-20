import React, { useMemo, useState } from 'react';
import { ManagerRequest, ManagerRequestStatus, CurrentUser } from '../types';
import { ApiService } from '../services/api';
import { MANAGER_REQUEST_LABELS } from '../utils/managerRequests';
import { RequestStatusBadge, requestSummaryLine } from './ManagerRequestBadge';

interface Props {
  requests: ManagerRequest[];
  currentUser: CurrentUser;
  onChanged: () => void;
  showToast: (msg: string) => void;
}

const TYPE_ICON: Record<string, string> = {
  staff_request: '🧾',
  transfer: '🔁',
  new_hire_review: '👋',
  investigation: '⚖️',
  termination: '⛔',
  resignation: '📝',
};

type Filter = ManagerRequestStatus | 'الكل';
const FILTERS: Filter[] = ['جديد', 'تمت الموافقة', 'تم التنفيذ', 'مرفوض', 'الكل'];

/**
 * صندوق طلبات مديري الفروع — للموارد البشرية والأدمن.
 * (طلب موظف، نقل، تقييم موظف جديد، تحقيق، إنهاء تعاقد، استقالة)
 */
export const ManagerRequestsInboxView: React.FC<Props> = ({ requests, onChanged, showToast }) => {
  const [filter, setFilter] = useState<Filter>('جديد');
  const [busyId, setBusyId] = useState<string | null>(null);
  // ملاحظة الموارد البشرية لكل طلب (بتتبعت مع القرار)
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [branchFilter, setBranchFilter] = useState('الكل');

  const branches = useMemo(() => Array.from(new Set<string>(requests.map(r => r.branch_name))).sort((a, b) => a.localeCompare(b, 'ar')), [requests]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { الكل: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [requests]);

  const visible = requests.filter(
    r => (filter === 'الكل' || r.status === filter) && (branchFilter === 'الكل' || r.branch_name === branchFilter)
  );

  const act = async (r: ManagerRequest, action: 'approve' | 'reject' | 'execute') => {
    const note = (notes[r.id] || '').trim();
    if (action === 'reject' && !note) {
      showToast('اكتب سبب الرفض في خانة الملاحظة الأول');
      return;
    }
    if (action === 'execute' && (r.request_type === 'resignation' || r.request_type === 'termination')) {
      const ok = window.confirm(`تنفيذ ${MANAGER_REQUEST_LABELS[r.request_type]} لـ "${r.employee_name}" دلوقتي؟ الموظف هيتنقل لأرشيف المستقيلين.`);
      if (!ok) return;
    }
    setBusyId(r.id);
    try {
      await ApiService.resolveManagerRequest(r.id, action, note);
      showToast(action === 'reject' ? 'تم رفض الطلب' : action === 'execute' ? 'تم تنفيذ الطلب' : 'تمت الموافقة على الطلب');
      onChanged();
    } catch (err: any) {
      alert(err.message || 'فشل تحديث الطلب');
    } finally {
      setBusyId(null);
    }
  };

  const approveLabel = (r: ManagerRequest) => {
    const today = new Date().toISOString().split('T')[0];
    switch (r.request_type) {
      case 'transfer':
        return 'موافقة وتنفيذ النقل';
      case 'resignation':
      case 'termination':
        return r.effective_date && r.effective_date > today ? `موافقة (تتنفذ يوم ${r.effective_date})` : 'موافقة وتنفيذ الخروج';
      case 'new_hire_review':
        return 'تم الاطلاع';
      default:
        return 'موافقة';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-stone-900">طلبات مديري الفروع</h2>
          <p className="text-xs text-stone-500 mt-1">
            طلبات موظفين، نقل، استقالات، إنهاء تعاقد، تحقيقات، وتقييم الموظفين الجدد — كل الطلبات من مديري الفروع بتوصل هنا.
          </p>
        </div>
        {branches.length > 1 && (
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="bg-white rounded-xl px-3 py-2 border border-stone-300 text-xs font-bold text-stone-700"
          >
            <option value="الكل">كل الفروع</option>
            {branches.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${
              filter === f ? 'bg-[#9E1A24] text-white border-[#9E1A24]' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            {f} <span className="font-mono opacity-80">({counts[f] || 0})</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-sm text-stone-400 font-bold">
          مفيش طلبات في القسم ده
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(r => {
            const open = r.status === 'جديد';
            const approvedWaiting = r.status === 'تمت الموافقة';
            const notOk = r.request_type === 'new_hire_review' && r.review_result === 'مش تمام';
            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border shadow-xs p-4 space-y-2.5 ${
                  notOk && open ? 'border-red-300' : r.urgent && open ? 'border-amber-400' : 'border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{TYPE_ICON[r.request_type]}</span>
                    <span className="font-black text-stone-900 text-sm">{MANAGER_REQUEST_LABELS[r.request_type]}</span>
                    <span className="bg-stone-100 text-stone-700 text-[11px] font-bold px-2 py-0.5 rounded-full">فرع {r.branch_name}</span>
                    {r.urgent && <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2 py-0.5 rounded-full">مستعجل</span>}
                  </div>
                  <RequestStatusBadge status={r.status} />
                </div>

                <div className="text-sm font-bold text-stone-800">{requestSummaryLine(r)}</div>
                {r.employee_code && <div className="text-[11px] font-mono text-stone-500">{r.employee_code}</div>}
                {r.reason && <div className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">{r.reason}</div>}
                <div className="text-[11px] text-stone-400">
                  بواسطة {r.requested_by} · {String(r.created_at).slice(0, 10)}
                  {r.resolved_by && r.status !== 'جديد' ? ` · القرار: ${r.resolved_by}` : ''}
                </div>
                {r.hr_note && !open && (
                  <div className="text-[11px] text-stone-700 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5">ملاحظة الموارد البشرية: {r.hr_note}</div>
                )}

                {open && (
                  <div className="pt-1 space-y-2">
                    <input
                      value={notes[r.id] || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="ملاحظة للمدير (إجبارية عند الرفض)"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => act(r, 'approve')}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black px-4 py-2 rounded-xl transition-all"
                      >
                        {approveLabel(r)}
                      </button>
                      {r.request_type !== 'new_hire_review' && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => act(r, 'reject')}
                          className="bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 text-xs font-black px-4 py-2 rounded-xl transition-all disabled:opacity-60"
                        >
                          رفض
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {approvedWaiting && (
                  <div className="pt-1 flex items-center gap-2 flex-wrap">
                    {(r.request_type === 'resignation' || r.request_type === 'termination') && (
                      <span className="text-[11px] text-sky-700 font-bold">هتتنفذ تلقائيًا يوم {r.effective_date}</span>
                    )}
                    <button
                      disabled={busyId === r.id}
                      onClick={() => act(r, 'execute')}
                      className="bg-stone-800 hover:bg-stone-900 disabled:opacity-60 text-white text-xs font-black px-4 py-2 rounded-xl transition-all"
                    >
                      {r.request_type === 'resignation' || r.request_type === 'termination'
                        ? 'تنفيذ الآن'
                        : r.request_type === 'staff_request'
                        ? 'تم توفير الموظف'
                        : 'تم التنفيذ'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
