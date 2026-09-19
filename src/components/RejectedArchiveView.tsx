import React, { useMemo, useState } from 'react';
import { Applicant, Branch, JobPosition, CurrentUser } from '../types';
import { SvgIcons } from './BobWichLogo';

interface RejectedArchiveViewProps {
  /** المرفوضين فقط (App بيفلترهم من كل الطلبات) */
  applicants: Applicant[];
  branches: Branch[];
  positions: JobPosition[];
  currentUser: CurrentUser;
  onView: (applicant: Applicant) => void;
  onPrint: (applicant: Applicant) => void;
  onPrintDocs: (applicant: Applicant) => void;
  onRestore: (applicant: Applicant) => void;
  onDelete: (applicantId: string) => void;
}

type SortMode = 'newest' | 'oldest' | 'name';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-EG');
};

/** ملاحظة الرفض: من قرار الـ HR أولًا، وإلا من آخر مقابلة اترفض فيها المتقدم */
const rejectionNote = (a: Applicant): string => {
  const hrNote = a.hr_decision?.hr_notes?.trim();
  if (hrNote) return hrNote;
  const rejectedInterviews = (a.interviews || []).filter(i => i.status === 'مرفوض' && i.notes?.trim());
  const last = rejectedInterviews[rejectedInterviews.length - 1];
  return last?.notes?.trim() || '';
};

export const RejectedArchiveView: React.FC<RejectedArchiveViewProps> = ({
  applicants,
  branches,
  positions,
  currentUser,
  onView,
  onPrint,
  onPrintDocs,
  onRestore,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'external' | 'internal_staff'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const canManage = currentUser.role === 'admin' || currentUser.role === 'hr';
  const canDelete = currentUser.role === 'admin';

  const safe = useMemo(() => (Array.isArray(applicants) ? applicants : []), [applicants]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: safe.length,
      last30: safe.filter(a => now - new Date(a.updated_at || a.created_at).getTime() <= 30 * DAY_MS).length,
      external: safe.filter(a => a.applicant_category !== 'internal_staff').length,
      staff: safe.filter(a => a.applicant_category === 'internal_staff').length,
    };
  }, [safe]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = safe.filter(a => {
      const matchesSearch =
        !q ||
        (a.full_name && a.full_name.toLowerCase().includes(q)) ||
        (a.national_id && a.national_id.includes(q)) ||
        (a.phone && a.phone.includes(q)) ||
        (a.application_code && a.application_code.toLowerCase().includes(q));
      const matchesBranch = selectedBranch === 'all' || a.branch_name === selectedBranch;
      const matchesPosition = selectedPosition === 'all' || a.position_name === selectedPosition;
      const isStaff = a.applicant_category === 'internal_staff';
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'internal_staff' ? isStaff : !isStaff);
      return matchesSearch && matchesBranch && matchesPosition && matchesCategory;
    });

    const time = (a: Applicant) => new Date(a.updated_at || a.created_at).getTime() || 0;
    return list.sort((a, b) => {
      if (sortMode === 'oldest') return time(a) - time(b);
      if (sortMode === 'name') return (a.full_name || '').localeCompare(b.full_name || '', 'ar');
      return time(b) - time(a);
    });
  }, [safe, searchTerm, selectedBranch, selectedPosition, selectedCategory, sortMode]);

  const selectCls =
    'w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2">
          <span>🗄️</span>
          <span>أرشيف المرفوضين</span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          كل الطلبات اللي اتحوّلت لحالة «مرفوض» بتتنقل هنا تلقائيًا وتفضل محفوظة بمستنداتها — تقدر
          تراجعها أو تطبع مستنداتها أو ترجّعها لقائمة المتقدمين في أي وقت.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 block">إجمالي المرفوضين</span>
          <span className="text-xl font-black text-stone-900 font-mono">{stats.total}</span>
        </div>
        <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200 shadow-xs">
          <span className="text-[11px] font-bold text-red-700 block">آخر 30 يوم</span>
          <span className="text-xl font-black text-red-900 font-mono">{stats.last30}</span>
        </div>
        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-600 block">متقدمون جدد</span>
          <span className="text-xl font-black text-stone-900 font-mono">{stats.external}</span>
        </div>
        <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 block">موظفون حاليون</span>
          <span className="text-xl font-black text-amber-950 font-mono">{stats.staff}</span>
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
              placeholder="ابحث بالاسم، الرقم القومي، الهاتف، أو كود الطلب..."
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
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value as 'all' | 'external' | 'internal_staff')}
            className={selectCls}
          >
            <option value="all">كل المصادر</option>
            <option value="external">متقدمون جدد</option>
            <option value="internal_staff">موظفون حاليون</option>
          </select>

          <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)} className={selectCls}>
            <option value="newest">الأحدث رفضًا أولًا</option>
            <option value="oldest">الأقدم رفضًا أولًا</option>
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
              🗄️
            </div>
            <h3 className="text-lg font-bold text-stone-800">
              {safe.length === 0 ? 'الأرشيف فاضي' : 'مفيش نتائج مطابقة'}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {safe.length === 0
                ? 'أي متقدم تختار له «رفض» هيظهر هنا تلقائيًا مع كل بياناته ومستنداته.'
                : 'جرّب تغيّر البحث أو الفلاتر.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-stone-100/80 text-stone-700 font-bold border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-4">المتقدم</th>
                  <th className="py-3.5 px-4">الرقم القومي</th>
                  <th className="py-3.5 px-4">الوظيفة / الفرع</th>
                  <th className="py-3.5 px-4">الهاتف</th>
                  <th className="py-3.5 px-4">تاريخ التقديم</th>
                  <th className="py-3.5 px-4">تاريخ الرفض</th>
                  <th className="py-3.5 px-4">ملاحظات</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(app => {
                  const note = rejectionNote(app);
                  const isStaff = app.applicant_category === 'internal_staff';
                  return (
                    <tr key={app.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {app.photo_url ? (
                              <img
                                src={app.photo_url}
                                alt={app.full_name}
                                className="w-full h-full object-cover grayscale"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-[10px] text-stone-400 font-bold">4×6</span>
                            )}
                          </div>
                          <div>
                            <button
                              onClick={() => onView(app)}
                              className="font-bold text-stone-900 hover:text-[#9E1A24] text-xs text-right cursor-pointer block"
                            >
                              {app.full_name}
                            </button>
                            <div className="text-[11px] font-mono text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>
                                كود: <strong>{app.application_code}</strong>
                              </span>
                              {isStaff && (
                                <span className="bg-amber-50 text-amber-800 font-bold px-1.5 rounded text-[10px] border border-amber-200">
                                  موظف حالي
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-stone-700">{app.national_id}</td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{app.position_name}</div>
                        <div className="text-[11px] text-stone-500 font-semibold">{app.branch_name}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-stone-700">{app.phone}</td>

                      <td className="py-3 px-4 font-mono text-stone-500">{formatDate(app.created_at)}</td>

                      <td className="py-3 px-4 font-mono text-red-700 font-bold">
                        {formatDate(app.updated_at || app.created_at)}
                      </td>

                      <td className="py-3 px-4 max-w-[220px]">
                        {note ? (
                          <span className="text-stone-600 line-clamp-2 leading-snug" title={note}>
                            {note}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onView(app)}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg transition-all"
                            title="عرض الملف والتفاصيل"
                          >
                            <SvgIcons.Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onPrint(app)}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-800 p-1.5 rounded-lg transition-all"
                            title="طباعة الاستمارة الرسمية A4"
                          >
                            <SvgIcons.Print className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onPrintDocs(app)}
                            className="bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 p-1.5 rounded-lg transition-all"
                            title="طباعة البطاقة (وش وضهر) والشهادة الصحية"
                          >
                            <SvgIcons.Paperclip className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => onRestore(app)}
                              className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px]"
                              title="رجّع الطلب لقائمة المتقدمين (تحت المراجعة)"
                            >
                              ↩ استرجاع
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => onDelete(app.id)}
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
