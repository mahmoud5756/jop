import React, { useMemo, useState } from 'react';
import { Employee, Applicant, Branch, JobPosition, CurrentUser } from '../types';
import { SvgIcons } from './BobWichLogo';
import { RESIGNED_STATUS, TERMINATED_STATUS, separationDateOf, serviceDuration } from '../utils/employeeStatus';

interface DepartedArchiveViewProps {
  /** المستقيلين ومنهيي التعاقد فقط (App بيفلترهم من كل الموظفين) */
  employees: Employee[];
  applicants: Applicant[];
  branches: Branch[];
  positions: JobPosition[];
  currentUser: CurrentUser;
  onViewApplicant: (applicant: Applicant) => void;
  onPrintDocs: (applicant: Applicant) => void;
  onPrintResignation: (employee: Employee) => void;
  onReinstate: (employee: Employee) => void;
  onDelete: (employeeId: string) => void;
}

type SortMode = 'newest' | 'oldest' | 'name';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-EG');
};

export const DepartedArchiveView: React.FC<DepartedArchiveViewProps> = ({
  employees,
  applicants,
  branches,
  positions,
  currentUser,
  onViewApplicant,
  onPrintDocs,
  onPrintResignation,
  onReinstate,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'resigned' | 'terminated'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const canManage = currentUser.role === 'admin' || currentUser.role === 'hr';

  const safe = useMemo(() => (Array.isArray(employees) ? employees : []), [employees]);
  const safeApplicants = useMemo(() => (Array.isArray(applicants) ? applicants : []), [applicants]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: safe.length,
      resigned: safe.filter(e => e.status === RESIGNED_STATUS).length,
      terminated: safe.filter(e => e.status !== RESIGNED_STATUS).length,
      last30: safe.filter(e => now - new Date(separationDateOf(e)).getTime() <= 30 * DAY_MS).length,
    };
  }, [safe]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = safe.filter(e => {
      const matchesSearch =
        !q ||
        (e.full_name && e.full_name.toLowerCase().includes(q)) ||
        (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
        (e.national_id && e.national_id.includes(q)) ||
        (e.phone && e.phone.includes(q));
      const matchesBranch = selectedBranch === 'all' || e.branch_name === selectedBranch;
      const matchesPosition = selectedPosition === 'all' || e.position_name === selectedPosition;
      const isResigned = e.status === RESIGNED_STATUS;
      const matchesType =
        selectedType === 'all' || (selectedType === 'resigned' ? isResigned : !isResigned);
      return matchesSearch && matchesBranch && matchesPosition && matchesType;
    });

    const time = (e: Employee) => new Date(separationDateOf(e)).getTime() || 0;
    return list.sort((a, b) => {
      if (sortMode === 'oldest') return time(a) - time(b);
      if (sortMode === 'name') return (a.full_name || '').localeCompare(b.full_name || '', 'ar');
      return time(b) - time(a);
    });
  }, [safe, searchTerm, selectedBranch, selectedPosition, selectedType, sortMode]);

  const selectCls =
    'w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2">
          <span>🚪</span>
          <span>أرشيف المستقيلين</span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          الموظفين اللي حالتهم «مستقيل» أو «منهي التعاقد» بيتنقلوا هنا تلقائيًا من سجل الموظفين وتفضل بياناتهم
          ومستنداتهم محفوظة — تقدر تطبع إخلاء الطرف أو ترجّع الموظف للشغل في أي وقت.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 block">الإجمالي في الأرشيف</span>
          <span className="text-xl font-black text-stone-900 font-mono">{stats.total}</span>
        </div>
        <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200 shadow-xs">
          <span className="text-[11px] font-bold text-red-700 block">مستقيلون</span>
          <span className="text-xl font-black text-red-900 font-mono">{stats.resigned}</span>
        </div>
        <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 block">منهيو التعاقد</span>
          <span className="text-xl font-black text-amber-950 font-mono">{stats.terminated}</span>
        </div>
        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-600 block">آخر 30 يوم</span>
          <span className="text-xl font-black text-stone-900 font-mono">{stats.last30}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، كود الموظف، الرقم القومي، أو الهاتف..."
              className="w-full bg-stone-50 rounded-xl pr-10 pl-4 py-2.5 border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
            />
            <div className="absolute right-3 top-3 text-stone-400">
              <SvgIcons.Search className="w-4 h-4" />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-3 text-xs text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            )}
          </div>

          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className={selectCls}>
            <option value="all">جميع الفروع</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          <select value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)} className={selectCls}>
            <option value="all">جميع الوظائف</option>
            {positions.map(p => (
              <option key={p.id} value={p.title}>
                {p.title}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as 'all' | 'resigned' | 'terminated')}
            className={selectCls}
          >
            <option value="all">استقالة + إنهاء تعاقد</option>
            <option value="resigned">مستقيلون فقط</option>
            <option value="terminated">منهيو التعاقد فقط</option>
          </select>

          <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)} className={selectCls}>
            <option value="newest">الأحدث خروجًا أولًا</option>
            <option value="oldest">الأقدم خروجًا أولًا</option>
            <option value="name">ترتيب بالاسم</option>
          </select>
        </div>

        <div className="text-xs text-stone-400 font-mono text-left pt-2 border-t border-stone-100">
          عرض {filtered.length} من {safe.length}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto text-3xl">
              🚪
            </div>
            <h3 className="text-lg font-bold text-stone-800">
              {safe.length === 0 ? 'الأرشيف فاضي' : 'مفيش نتائج مطابقة'}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {safe.length === 0
                ? 'أي موظف تغيّر حالته لـ «مستقيل» أو «منهي التعاقد» هيظهر هنا تلقائيًا.'
                : 'جرّب تغيّر البحث أو الفلاتر.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-stone-100/80 text-stone-700 font-bold border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-4">الموظف</th>
                  <th className="py-3.5 px-4">الوظيفة / الفرع</th>
                  <th className="py-3.5 px-4">تاريخ المباشرة</th>
                  <th className="py-3.5 px-4">تاريخ الخروج</th>
                  <th className="py-3.5 px-4">مدة الخدمة</th>
                  <th className="py-3.5 px-4">النوع</th>
                  <th className="py-3.5 px-4">السبب</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(emp => {
                  const linked = safeApplicants.find(a => a.id === emp.applicant_id);
                  const endDate = separationDateOf(emp);
                  const isResigned = emp.status === RESIGNED_STATUS;
                  const reason = emp.separation_reason?.trim();
                  return (
                    <tr key={emp.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {emp.photo_url ? (
                              <img
                                src={emp.photo_url}
                                alt={emp.full_name}
                                className="w-full h-full object-cover grayscale"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-[10px] text-stone-400 font-bold">4×6</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900">{emp.full_name}</div>
                            <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                              <span className="text-[#9E1A24] font-black">{emp.employee_code}</span> • {emp.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{emp.position_name}</div>
                        <div className="text-[11px] text-stone-500 font-semibold">{emp.branch_name}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-stone-600">{formatDate(emp.hire_date)}</td>

                      <td className="py-3 px-4 font-mono text-red-700 font-bold">
                        {formatDate(endDate)}
                        {!emp.separation_date && (
                          <span
                            className="block text-[10px] text-stone-400 font-sans font-normal"
                            title="التاريخ لم يُسجَّل وقت الخروج؛ المعروض هو آخر تعديل للسجل"
                          >
                            (آخر تعديل)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-stone-700 font-semibold">
                        {serviceDuration(emp.hire_date, endDate)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-black border inline-block ${
                            isResigned
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isResigned ? 'استقالة' : emp.status === TERMINATED_STATUS ? 'إنهاء تعاقد' : emp.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-[220px]">
                        {reason ? (
                          <span className="text-stone-600 line-clamp-2 leading-snug" title={reason}>
                            {reason}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onPrintResignation(emp)}
                            className="bg-stone-100 hover:bg-amber-600 hover:text-white text-stone-800 px-2 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 text-[11px]"
                            title="طباعة استمارة استقالة وإخلاء طرف"
                          >
                            <SvgIcons.FileText className="w-3.5 h-3.5" />
                            <span>إخلاء طرف</span>
                          </button>
                          {linked && (
                            <>
                              <button
                                onClick={() => onViewApplicant(linked)}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg transition-all"
                                title="عرض ملف التقديم الأصلي"
                              >
                                <SvgIcons.Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onPrintDocs(linked)}
                                className="bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 p-1.5 rounded-lg transition-all"
                                title="طباعة البطاقة (وش وضهر) والشهادة الصحية"
                              >
                                <SvgIcons.Paperclip className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {canManage && (
                            <button
                              onClick={() => onReinstate(emp)}
                              className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px]"
                              title="رجّع الموظف للشغل (نشط)"
                            >
                              ↩ إعادة تعيين
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() => onDelete(emp.id)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                              title="حذف نهائي"
                            >
                              <SvgIcons.Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
