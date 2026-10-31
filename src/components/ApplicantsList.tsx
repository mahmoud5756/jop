import React, { useState, useMemo, useEffect } from 'react';
import { Applicant, Branch, JobPosition, CurrentUser } from '../types';
import { SvgIcons } from './BobWichLogo';
import { getMissingDocuments } from '../utils/applicantDocuments';
import { exportExcel } from '../utils/exportExcel';
import { AlertTriangle, CalendarDays, Download, MessageCircle, X } from 'lucide-react';
import { ListLoadingSkeleton } from './ApplicantFormControls';
import { PdfReportButton } from './PdfReportButton';

interface ApplicantsListProps {
  applicants: Applicant[];
  branches: Branch[];
  positions: JobPosition[];
  currentUser: CurrentUser;
  onAddNew: () => void;
  onView: (applicant: Applicant) => void;
  onEdit: (applicant: Applicant) => void;
  onPrint: (applicant: Applicant) => void;
  onDelete: (applicantId: string) => void;
  onOpenShareModal?: () => void;
  /** طباعة البطاقة (وش وضهر) والشهادة الصحية */
  onPrintDocs?: (applicant: Applicant) => void;
  /** رفض الطلب ونقله لأرشيف المرفوضين */
  onReject?: (applicant: Applicant) => void;
  /** فتح رسالة واتساب جاهزة للمتقدم */
  onWhatsApp?: (applicant: Applicant) => void;
  onBulkStatusChange?: (applicantIds: string[], status: Applicant['status']) => Promise<void> | void;
  onBulkWhatsApp?: (applicants: Applicant[]) => void;
  isLoading?: boolean;
  /** تخصيصات النصوص عند استخدام نفس الشاشة لأرشيف منفصل (مثل تسجيل الموظفين الحاليين) */
  title?: string;
  subtitle?: string;
  shareButtonLabel?: string;
  addNewLabel?: string;
  emptyStateLabel?: string;
}

/**
 * تقسيم المتقدمين لثلاث مجموعات:
 *  - جدد: طلب جديد / تحت المراجعة
 *  - قائمة الانتظار
 *  - نشطين (شغالين حاليًا في الإجراءات): حضر المقابلة / إعادة مقابلة / مقبول / اتحوّل لموظف
 */
type GroupTab = 'all' | 'new' | 'waiting' | 'active';

const groupOf = (a: Applicant): Exclude<GroupTab, 'all'> => {
  if (a.status === 'قائمة انتظار') return 'waiting';
  if (
    a.is_converted_to_employee ||
    a.status === 'حضر المقابلة' ||
    a.status === 'إعادة مقابلة' ||
    a.status === 'مقبول'
  ) {
    return 'active';
  }
  return 'new';
};

export const ApplicantsList: React.FC<ApplicantsListProps> = ({
  applicants,
  branches,
  positions,
  currentUser,
  onAddNew,
  onView,
  onEdit,
  onPrint,
  onDelete,
  onOpenShareModal,
  onPrintDocs,
  onReject,
  onWhatsApp,
  onBulkStatusChange,
  onBulkWhatsApp,
  isLoading = false,
  title = 'سجل طلبات التوظيف الإلكترونية',
  subtitle = 'إدارة ومتابعة طلبات التوظيف، فحص المستندات، وإجراء المقابلات لجميع فروع BOB WICH',
  shareButtonLabel = 'رابط التقديم والـ QR Code',
  addNewLabel = 'استمارة طلب توظيف جديدة',
  emptyStateLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [groupTab, setGroupTab] = useState<GroupTab>('all');
  const [docsFilter, setDocsFilter] = useState<'all' | 'missing' | 'complete'>('all');
  const [filterConverted, setFilterConverted] = useState<'all' | 'converted' | 'applicants_only'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);

  useEffect(() => { setPage(1); }, [searchTerm, dateFrom, dateTo, selectedBranch, selectedPosition, selectedStatus, groupTab, docsFilter, filterConverted]);

  // Filtered list calculation
  const safeApplicants = useMemo(() => Array.isArray(applicants) ? applicants : [], [applicants]);

  const filteredApplicants = useMemo(() => {
    return safeApplicants.filter(app => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (app.full_name && app.full_name.toLowerCase().includes(q)) ||
        (app.national_id && app.national_id.includes(q)) ||
        (app.phone && app.phone.includes(q)) ||
        (app.application_code && app.application_code.toLowerCase().includes(q));

      const createdDate = String(app.created_at || '').slice(0, 10);
      const matchesDate = (!dateFrom || createdDate >= dateFrom) && (!dateTo || createdDate <= dateTo);
      const matchesBranch = selectedBranch === 'all' || app.branch_name === selectedBranch;
      const matchesPosition = selectedPosition === 'all' || app.position_name === selectedPosition;
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
      const matchesGroup = groupTab === 'all' || groupOf(app) === groupTab;
      const missingCount = getMissingDocuments(app).length;
      const matchesDocs =
        docsFilter === 'all' || (docsFilter === 'missing' ? missingCount > 0 : missingCount === 0);

      let matchesConverted = true;
      if (filterConverted === 'converted') {
        matchesConverted = Boolean(app.is_converted_to_employee);
      } else if (filterConverted === 'applicants_only') {
        matchesConverted = !app.is_converted_to_employee;
      }

      return matchesSearch && matchesDate && matchesBranch && matchesPosition && matchesStatus && matchesGroup && matchesDocs && matchesConverted;
    });
  }, [safeApplicants, searchTerm, dateFrom, dateTo, selectedBranch, selectedPosition, selectedStatus, groupTab, docsFilter, filterConverted]);

  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / pageSize));
  const visibleApplicants = filteredApplicants.slice((page - 1) * pageSize, page * pageSize);
  const visibleIds = visibleApplicants.map(a => a.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  const selectedApplicants = safeApplicants.filter(a => selectedIds.includes(a.id));
  const exportFiltered = () => exportExcel('المتقدمون',
    ['الاسم', 'كود الطلب', 'الرقم القومي', 'الهاتف', 'الوظيفة', 'الفرع', 'الحالة', 'تاريخ التقديم'],
    filteredApplicants.map(a => [a.full_name, a.application_code, a.national_id, a.phone, a.position_name, a.branch_name, a.status, String(a.created_at || '').slice(0, 10)]),
    'قائمة_المتقدمين');
  const setVisibleSelected = (checked: boolean) => setSelectedIds(prev => checked
    ? [...new Set([...prev, ...visibleIds])]
    : prev.filter(id => !visibleIds.includes(id)));
  const runBulkStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0 || !onBulkStatusChange) return;
    setIsBulkSaving(true);
    try { await onBulkStatusChange(selectedIds, bulkStatus as Applicant['status']); setSelectedIds([]); setBulkStatus(''); }
    finally { setIsBulkSaving(false); }
  };
  const upcomingInterviews = safeApplicants.flatMap(app => (app.interviews || [])
    .filter(interview => interview.status === 'مجدولة' && String(interview.interview_date || '') >= new Date().toISOString().slice(0, 10))
    .map(interview => ({ app, interview })))
    .sort((a, b) => String(a.interview.interview_date).localeCompare(String(b.interview.interview_date)) || Number(a.interview.interview_number) - Number(b.interview.interview_number));
  // Statistics counters
  const stats = useMemo(() => {
    const total = safeApplicants.length;
    const accepted = safeApplicants.filter(a => a.status === 'مقبول' || a.is_converted_to_employee).length;
    const pending = safeApplicants.filter(a => a.status === 'طلب جديد' || a.status === 'تحت المراجعة').length;
    const interviewed = safeApplicants.filter(a => a.status === 'حضر المقابلة').length;
    const waiting = safeApplicants.filter(a => a.status === 'قائمة انتظار').length;
    const groups = {
      new: safeApplicants.filter(a => groupOf(a) === 'new').length,
      waiting: safeApplicants.filter(a => groupOf(a) === 'waiting').length,
      active: safeApplicants.filter(a => groupOf(a) === 'active').length,
    };
    const missingDocs = safeApplicants.filter(a => getMissingDocuments(a).length > 0).length;
    return { total, accepted, pending, interviewed, waiting, groups, missingDocs };
  }, [safeApplicants]);

  // الضغط على تاب مجموعة بيصفّر باقي الفلاتر السريعة، والعكس صحيح للكروت
  const selectGroup = (g: GroupTab) => {
    setGroupTab(g);
    setSelectedStatus('all');
    setFilterConverted('all');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'مقبول':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'طلب جديد':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'تحت المراجعة':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'حضر المقابلة':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'إعادة مقابلة':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'مرفوض':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'قائمة انتظار':
        return 'bg-stone-200 text-stone-800 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  if (isLoading) return <ListLoadingSkeleton rows={7} label="جاري تحميل قائمة المتقدمين" />;
  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2">
            <span>{title}</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <SvgIcons.QrCode className="w-4 h-4 text-amber-700" />
              <span>{shareButtonLabel}</span>
            </button>
          )}

          <button
            onClick={onAddNew}
            className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <SvgIcons.Plus className="w-5 h-5" />
            <span>{addNewLabel}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => { setSelectedStatus('all'); setFilterConverted('all'); setGroupTab('all'); }}
          className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs cursor-pointer hover:border-[#9E1A24] transition-all"
        >
          <span className="text-[11px] font-bold text-stone-500 block">إجمالي المتقدمين</span>
          <span className="text-xl font-black text-stone-900 font-mono">{stats.total}</span>
        </div>

        <div
          onClick={() => { setGroupTab('all'); setSelectedStatus('طلب جديد'); }}
          className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 shadow-xs cursor-pointer hover:border-blue-500 transition-all"
        >
          <span className="text-[11px] font-bold text-blue-700 block">طلبات جديدة / مراجعة</span>
          <span className="text-xl font-black text-blue-900 font-mono">{stats.pending}</span>
        </div>

        <div
          onClick={() => { setGroupTab('all'); setSelectedStatus('حضر المقابلة'); }}
          className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs cursor-pointer hover:border-amber-500 transition-all"
        >
          <span className="text-[11px] font-bold text-amber-800 block">تمت المقابلة</span>
          <span className="text-xl font-black text-amber-950 font-mono">{stats.interviewed}</span>
        </div>

        <div
          onClick={() => { setGroupTab('all'); setSelectedStatus('مقبول'); setFilterConverted('converted'); }}
          className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-xs cursor-pointer hover:border-emerald-500 transition-all"
        >
          <span className="text-[11px] font-bold text-emerald-800 block">تم القبول والتعيين</span>
          <span className="text-xl font-black text-emerald-950 font-mono">{stats.accepted}</span>
        </div>

        <div
          onClick={() => { setGroupTab('all'); setSelectedStatus('قائمة انتظار'); }}
          className="bg-stone-100 p-3.5 rounded-2xl border border-stone-300 shadow-xs cursor-pointer hover:border-stone-500 transition-all col-span-2 sm:col-span-1"
        >
          <span className="text-[11px] font-bold text-stone-700 block">قائمة الانتظار</span>
          <span className="text-xl font-black text-stone-900 font-mono">{stats.waiting}</span>
        </div>
      </div>

      {/* تقسيم المتقدمين: جدد / قائمة انتظار / نشطين */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: 'all', label: 'الكل', count: stats.total, active: 'bg-stone-800 text-white border-stone-800', idle: 'bg-white text-stone-700 border-stone-300 hover:border-stone-500', badge: 'bg-stone-200 text-stone-800' },
          { key: 'new', label: 'جدد', count: stats.groups.new, active: 'bg-blue-700 text-white border-blue-700', idle: 'bg-white text-blue-800 border-blue-200 hover:border-blue-500', badge: 'bg-blue-100 text-blue-800' },
          { key: 'waiting', label: 'قائمة الانتظار', count: stats.groups.waiting, active: 'bg-stone-600 text-white border-stone-600', idle: 'bg-white text-stone-700 border-stone-300 hover:border-stone-500', badge: 'bg-stone-200 text-stone-800' },
          { key: 'active', label: 'نشطين (مقابلات ومقبولين)', count: stats.groups.active, active: 'bg-emerald-700 text-white border-emerald-700', idle: 'bg-white text-emerald-800 border-emerald-200 hover:border-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
        ] as { key: GroupTab; label: string; count: number; active: string; idle: string; badge: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => selectGroup(t.key)}
            className={`px-4 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${groupTab === t.key ? t.active : t.idle}`}
          >
            <span>{t.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono ${groupTab === t.key ? 'bg-white/25 text-white' : t.badge}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
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
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
            >
              <option value="all">جميع الفروع ({branches.length})</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Position Filter */}
          <div>
            <select
              value={selectedPosition}
              onChange={e => setSelectedPosition(e.target.value)}
              className="w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
            >
              <option value="all">جميع الوظائف ({positions.length})</option>
              {positions.map(p => (
                <option key={p.id} value={p.title}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
            >
              <option value="all">جميع الحالات</option>
              <option value="طلب جديد">طلب جديد</option>
              <option value="تحت المراجعة">تحت المراجعة</option>
              <option value="حضر المقابلة">حضر المقابلة</option>
              <option value="إعادة مقابلة">إعادة مقابلة</option>
              <option value="مقبول">مقبول</option>
              <option value="قائمة انتظار">قائمة انتظار</option>
            </select>
          </div>

          {/* Documents Filter */}
          <div>
            <select
              value={docsFilter}
              onChange={e => setDocsFilter(e.target.value as 'all' | 'missing' | 'complete')}
              className="w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
            >
              <option value="all">كل المستندات</option>
              <option value="missing">ناقص مستندات ({stats.missingDocs})</option>
              <option value="complete">مستندات كاملة</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-stone-100 pt-3">
          <label className="text-[11px] font-bold text-stone-600">من تاريخ التقديم<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 w-full bg-stone-50 rounded-xl px-3 py-2 border border-stone-300 text-xs" /></label>
          <label className="text-[11px] font-bold text-stone-600">إلى تاريخ التقديم<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 w-full bg-stone-50 rounded-xl px-3 py-2 border border-stone-300 text-xs" /></label>
        </div>
        {/* Quick Filter Badges */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-500">التصنيف:</span>
            <button
              onClick={() => setFilterConverted('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterConverted === 'all' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              الكل ({applicants.length})
            </button>
            <button
              onClick={() => setFilterConverted('applicants_only')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterConverted === 'applicants_only'
                  ? 'bg-[#9E1A24] text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              متقدمون قيد الإجراء ({applicants.filter(a => !a.is_converted_to_employee).length})
            </button>
            <button
              onClick={() => setFilterConverted('converted')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterConverted === 'converted'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              تم تعيينهم كموظفين ({applicants.filter(a => a.is_converted_to_employee).length})
            </button>
          </div>

          <div className="text-stone-400 font-mono">
            عرض {filteredApplicants.length} من {applicants.length} · صفحة {Math.min(page, totalPages)} من {totalPages}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white border border-stone-200 rounded-2xl p-3">
        <button type="button" onClick={exportFiltered} disabled={!filteredApplicants.length} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Download className="h-4 w-4" />تصدير Excel ({filteredApplicants.length})</button>
        <PdfReportButton<Applicant>
          title={title}
          subtitle="النتائج المطابقة للفلاتر الحالية"
          rows={filteredApplicants}
          columns={[
            { label: 'الاسم', value: applicant => applicant.full_name },
            { label: 'كود الطلب', value: applicant => applicant.application_code },
            { label: 'الرقم القومي', value: applicant => applicant.national_id },
            { label: 'الهاتف', value: applicant => applicant.phone },
            { label: 'الوظيفة', value: applicant => applicant.position_name },
            { label: 'الفرع', value: applicant => applicant.branch_name },
            { label: 'الحالة', value: applicant => applicant.status },
            { label: 'تاريخ التقديم', value: applicant => String(applicant.created_at || '').slice(0, 10) },
          ]}
        />
        <button type="button" onClick={() => setShowUpcoming(v => !v)} className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 border border-sky-200"><CalendarDays className="h-4 w-4" />{showUpcoming ? 'إخفاء' : 'عرض'} المقابلات القادمة ({upcomingInterviews.length})</button>
        {selectedIds.length > 0 && <span className="text-xs font-bold text-stone-600">تم تحديد {selectedIds.length}</span>}
        {onBulkStatusChange && <><select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-xs"><option value="">تغيير حالة المحددين إلى...</option>{['طلب جديد','تحت المراجعة','حضر المقابلة','إعادة مقابلة','مقبول','قائمة انتظار','مرفوض'].map(st => <option key={st} value={st}>{st}</option>)}</select><button type="button" disabled={!bulkStatus || !selectedIds.length || isBulkSaving} onClick={runBulkStatus} className="rounded-xl bg-[#9E1A24] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{isBulkSaving ? 'جارٍ الحفظ...' : 'تطبيق الحالة'}</button></>}
        {onBulkWhatsApp && <button type="button" disabled={!selectedApplicants.length} onClick={() => onBulkWhatsApp(selectedApplicants)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 border border-emerald-200 disabled:opacity-50">إرسال واتساب للمحددين</button>}
      </div>
      {showUpcoming && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-black text-sky-950">جدول المقابلات القادمة بالأيام</h3>
            <PdfReportButton<{ app: Applicant; interview: NonNullable<Applicant['interviews']>[number] }>
              title="المقابلات القادمة"
              subtitle={title}
              rows={upcomingInterviews}
              columns={[
                { label: 'التاريخ والوقت', value: item => `${item.interview.interview_date}${item.interview.interview_time ? ` · ${item.interview.interview_time}` : ''}` },
                { label: 'المتقدم', value: item => item.app.full_name },
                { label: 'كود الطلب', value: item => item.app.application_code },
                { label: 'الوظيفة / الفرع', value: item => `${item.app.position_name} / ${item.app.branch_name}` },
                { label: 'رقم المقابلة', value: item => item.interview.interview_number },
                { label: 'المقابل', value: item => item.interview.interviewer_name },
                { label: 'الحالة', value: item => item.interview.status },
              ]}
            />
          </div>
          {upcomingInterviews.length ? <div className="space-y-3">{Array.from(new Set(upcomingInterviews.map(x => x.interview.interview_date))).map(day => <section key={day} className="rounded-xl bg-white p-3"><h4 className="font-bold text-sky-900 mb-2">{new Date(`${day}T00:00:00`).toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</h4><ul className="space-y-2">{upcomingInterviews.filter(x => x.interview.interview_date === day).map(({app,interview}) => <li key={interview.id} className="flex flex-wrap justify-between gap-2 border-t pt-2 text-xs"><button type="button" onClick={() => onView(app)} className="font-bold text-[#9E1A24] underline">{app.full_name}</button><span>{interview.interview_time ? `${interview.interview_time} · ` : ''}مقابلة {interview.interview_number} · {interview.interviewer_name}</span><span>{interview.status}</span></li>)}</ul></section>)}</div> : <p className="text-xs text-stone-600">لا توجد مقابلات قادمة مسجلة.</p>}
        </div>
      )}
      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {filteredApplicants.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <SvgIcons.Search className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-800">لم يتم العثور على أي متقدمين</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {emptyStateLabel || 'جرب تغيير خيارات البحث أو الفلترة، أو قم بتسجيل طلب توظيف جديد في النظام.'}
              </p>
            </div>
            <button
              onClick={onAddNew}
              className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <SvgIcons.Plus className="w-4 h-4" />
              <span>إضافة طلب توظيف جديد</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-stone-100/80 text-stone-700 font-bold border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-3"><input type="checkbox" aria-label="تحديد المتقدمين في الصفحة" checked={allVisibleSelected} onChange={e => setVisibleSelected(e.target.checked)} /></th>
                  <th className="py-3.5 px-4">المتقدم</th>
                  <th className="py-3.5 px-4">الرقم القومي</th>
                  <th className="py-3.5 px-4">الوظيفة / الفرع</th>
                  <th className="py-3.5 px-4">الهاتف</th>
                  <th className="py-3.5 px-4">تاريخ التقديم</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibleApplicants.map(app => (
                  <tr key={app.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-3"><input type="checkbox" aria-label={`تحديد ${app.full_name}`} checked={selectedIds.includes(app.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...new Set([...prev, app.id])] : prev.filter(id => id !== app.id))} /></td>
                    {/* Applicant Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {app.photo_url ? (
                            <img
                              src={app.photo_url}
                              alt={app.full_name}
                              className="w-full h-full object-cover"
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
                          <div className="text-[11px] font-mono text-stone-500 mt-0.5 flex items-center gap-2">
                            <span>كود: <strong>{app.application_code}</strong></span>
                            {app.is_converted_to_employee && (
                              <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded text-[10px] border border-emerald-200">
                                موظف {app.employee_code}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const missing = getMissingDocuments(app);
                            return missing.length > 0 ? (
                              <div
                                className="mt-1 inline-block bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 text-[10px] font-bold"
                                title="مستندات أساسية لسه ماترفعتش"
                              >
                        <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" aria-hidden="true" /> ناقص: {missing.join('، ')}</span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </td>

                    {/* National ID */}
                    <td className="py-3 px-4 font-mono font-bold text-stone-700">
                      {app.national_id}
                    </td>

                    {/* Position & Branch */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{app.position_name}</div>
                      <div className="text-[11px] text-stone-500 font-semibold">{app.branch_name}</div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 font-mono text-stone-700">
                      {onWhatsApp && (
                        <button
                          onClick={() => onWhatsApp(app)}
                          className="ml-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-md px-1.5 py-0.5 text-[11px] font-sans transition-all align-middle"
                          title="رسالة واتساب جاهزة"
                        >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                      {app.phone}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-stone-500">
                      {new Date(app.created_at).toLocaleDateString('ar-EG')}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border inline-block ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
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
                        {onPrintDocs && (
                          <button
                            onClick={() => onPrintDocs(app)}
                            className="bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 p-1.5 rounded-lg transition-all"
                            title="طباعة البطاقة (وش وضهر) والشهادة الصحية"
                          >
                            <SvgIcons.Paperclip className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(app)}
                          className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg transition-all"
                          title="تعديل الاستمارة"
                        >
                          <SvgIcons.Edit className="w-4 h-4" />
                        </button>
                        {onReject &&
                          (currentUser.role === 'admin' || currentUser.role === 'hr') &&
                          !app.is_converted_to_employee && (
                            <button
                              onClick={() => onReject(app)}
                              className="text-amber-700 hover:bg-amber-50 p-1.5 rounded-lg transition-all"
                              title="رفض الطلب ونقله لأرشيف المرفوضين"
                            >
                              <SvgIcons.XMark className="w-4 h-4" />
                            </button>
                          )}
                        {currentUser.role === 'admin' && !app.is_converted_to_employee && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف استمارة المتقدم ${app.full_name}؟`)) {
                                onDelete(app.id);
                              }
                            }}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                            title="حذف"
                          >
                            <SvgIcons.Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {filteredApplicants.length > pageSize && <div className="flex items-center justify-center gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1,p-1))} className="rounded-xl border px-4 py-2 text-xs font-bold disabled:opacity-40">السابق</button><span className="text-xs font-bold">صفحة {page} من {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages,p+1))} className="rounded-xl border px-4 py-2 text-xs font-bold disabled:opacity-40">التالي</button></div>}
    </div>
  );
};
