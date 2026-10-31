import React, { useEffect, useMemo, useState } from 'react';
import { Applicant, CurrentUser, Employee } from '../types';
import { SvgIcons } from './BobWichLogo';
import { serviceDuration } from '../utils/employeeStatus';
import { AlertTriangle, LockKeyhole } from 'lucide-react';

interface EmployeesReportViewProps {
  employees: Employee[];
  /** لجلب صورة الموظف من ملف التقديم لو ملف الموظف مفيهوش صورة */
  applicants?: Applicant[];
  currentUser: CurrentUser;
  onBack: () => void;
}

type SortKey = 'name' | 'position' | 'fingerprint' | 'hire';

const BRAND = '#9E1A24';
const BRAND_DARK = '#6f0f17';
const GOLD = '#B8902A';
const NO_BRANCH = 'بدون فرع';

/**
 * تقرير الموظفين (PDF فاخر) — مقسّم حسب الفرع.
 *
 * نفس نمط باقي شاشات الطباعة في النظام: معاينة على الشاشة + window.print()
 * (الطباعة أو «حفظ كـ PDF»). الورقة A4 عرضي عشان الجدول يستوعب كل البيانات،
 * وكل فرع بيبدأ في صفحة جديدة وعنوان الفرع وعناوين الأعمدة بيتكرروا في كل صفحة.
 */
export const EmployeesReportView: React.FC<EmployeesReportViewProps> = ({
  employees,
  applicants = [],
  currentUser,
  onBack,
}) => {
  const isManager = currentUser.role === 'manager';
  const canSeeSalary = currentUser.role === 'admin' || currentUser.role === 'hr';

  const [branchFilter, setBranchFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [showSalary, setShowSalary] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showExtra, setShowExtra] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const handlePrint = () => {
    setTimeout(() => window.print(), 50);
  };

  // مدير الفرع: تقرير فرعه بس (حتى لو الـ API رجّع أكتر)
  const scoped = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    if (isManager && currentUser.branch) return list.filter(e => e.branch_name === currentUser.branch);
    return list;
  }, [employees, isManager, currentUser.branch]);

  const branchNames = useMemo(() => {
    const set = new Set<string>();
    scoped.forEach(e => set.add((e.branch_name || '').trim() || NO_BRANCH));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [scoped]);

  const photoOf = (emp: Employee): string => {
    if (emp.photo_url) return emp.photo_url;
    const linked = applicants.find(a => a.id === emp.applicant_id);
    return linked?.photo_url || '';
  };

  const groups = useMemo(() => {
    const fpNum = (e: Employee) => {
      const n = parseInt(String(e.fingerprint_id ?? '').replace(/\D/g, ''), 10);
      return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
    };
    const cmp = (a: Employee, b: Employee) => {
      switch (sortBy) {
        case 'position':
          return (
            (a.position_name || '').localeCompare(b.position_name || '', 'ar') ||
            (a.full_name || '').localeCompare(b.full_name || '', 'ar')
          );
        case 'fingerprint':
          return fpNum(a) - fpNum(b) || (a.full_name || '').localeCompare(b.full_name || '', 'ar');
        case 'hire':
          return (a.hire_date || '9999').localeCompare(b.hire_date || '9999');
        default:
          return (a.full_name || '').localeCompare(b.full_name || '', 'ar');
      }
    };

    return branchNames
      .filter(b => branchFilter === 'all' || b === branchFilter)
      .map(branch => {
        const list = scoped
          .filter(e => ((e.branch_name || '').trim() || NO_BRANCH) === branch)
          .slice()
          .sort(cmp);

        const withFp = list.filter(e => String(e.fingerprint_id ?? '').trim() !== '').length;

        // رقم بصمة متكرر داخل نفس الفرع = غالبًا خطأ إدخال، بنعلّم عليه
        const fpCount = new Map<string, number>();
        list.forEach(e => {
          const k = String(e.fingerprint_id ?? '').trim();
          if (k) fpCount.set(k, (fpCount.get(k) || 0) + 1);
        });
        const duplicates = new Set(Array.from(fpCount.entries()).filter(([, n]) => n > 1).map(([k]) => k));

        const positionCounts = new Map<string, number>();
        list.forEach(e => {
          const p = e.position_name || '—';
          positionCounts.set(p, (positionCounts.get(p) || 0) + 1);
        });

        return {
          branch,
          list,
          withFp,
          withoutFp: list.length - withFp,
          duplicates,
          positions: Array.from(positionCounts.entries()).sort((a, b) => b[1] - a[1]),
        };
      });
  }, [scoped, branchNames, branchFilter, sortBy]);

  const totals = useMemo(() => {
    const total = groups.reduce((s, g) => s + g.list.length, 0);
    const withFp = groups.reduce((s, g) => s + g.withFp, 0);
    return { total, withFp, withoutFp: total - withFp, branches: groups.length };
  }, [groups]);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const longDate = today.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  const salaryOn = canSeeSalary && showSalary;

  const fmtDate = (d?: string | null) => {
    if (!d) return '—';
    const parts = d.split('T')[0].split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
  };
  const fmtMoney = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    return Number.isNaN(n) ? '—' : `${n.toLocaleString('en-US')} ج.م`;
  };

  const statusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'نشط':
        return { background: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' };
      case 'تحت الاختبار':
        return { background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' };
      case 'مجاز':
      case 'إجازة':
        return { background: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' };
      default:
        return { background: '#f5f5f4', color: '#44403c', borderColor: '#d6d3d1' };
    }
  };

  const th: React.CSSProperties = {
    padding: '2.2mm 1.6mm',
    fontSize: '7.6pt',
    fontWeight: 800,
    color: '#fff',
    background: '#3b0a0f',
    textAlign: 'right',
    whiteSpace: 'nowrap',
    borderLeft: '0.2mm solid rgba(255,255,255,0.12)',
  };
  const td: React.CSSProperties = {
    padding: '1.6mm 1.6mm',
    fontSize: '8pt',
    color: '#1c1917',
    verticalAlign: 'middle',
    borderBottom: '0.2mm solid #e7e5e4',
  };
  const mono: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    direction: 'ltr',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  };

  const colCount = 9 + (showPhotos ? 1 : 0) + (salaryOn ? 1 : 0);

  return (
    <div className="print-root fixed inset-0 z-70 overflow-y-auto bg-stone-900/85 backdrop-blur-xs flex flex-col items-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm 10mm 14mm 10mm;
            @bottom-center {
              content: "BOB WICH HR SYSTEM  •  تقرير الموظفين  •  سري — للاستخدام الداخلي";
              font-size: 7pt;
              color: #78716c;
            }
            @bottom-left {
              content: "\\202A" counter(page) " / " counter(pages) "\\202C";
              font-size: 7.5pt;
              color: #78716c;
            }
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .emp-report-sheet {
            width: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #fff !important;
          }
          .emp-report-cover { min-height: 0 !important; }
          .emp-report-branch {
            break-before: page;
            page-break-before: always;
            margin-top: 0 !important;
          }
          .emp-report-branch table { width: 100% !important; }
          .emp-report-branch thead { display: table-header-group; }
          .emp-report-branch tr { break-inside: avoid; page-break-inside: avoid; }
          .emp-report-branch tfoot { display: table-footer-group; }
        }
      `}</style>

      {/* شريط الأدوات (لا يُطبع) */}
      <div className="sticky top-0 z-10 mb-4 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-stone-200 flex flex-wrap items-center justify-center gap-3 print:hidden max-w-full">
        <button
          onClick={handlePrint}
          disabled={totals.total === 0}
          className="bg-[#9E1A24] hover:bg-[#85151e] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow transition-all hover:scale-105 active:scale-95"
        >
          <SvgIcons.Print className="w-4 h-4" />
          <span>تحميل التقرير PDF / طباعة</span>
        </button>

        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
          title="الفرع"
        >
          <option value="all">كل الفروع (مقسّم حسب الفرع)</option>
          {branchNames.map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
          title="ترتيب الموظفين داخل الفرع"
        >
          <option value="name">الترتيب: بالاسم</option>
          <option value="position">الترتيب: بالوظيفة</option>
          <option value="fingerprint">الترتيب: برقم البصمة</option>
          <option value="hire">الترتيب: بتاريخ المباشرة</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer select-none">
          <input type="checkbox" checked={showPhotos} onChange={e => setShowPhotos(e.target.checked)} />
          الصور
        </label>
        <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer select-none">
          <input type="checkbox" checked={showExtra} onChange={e => setShowExtra(e.target.checked)} />
          العنوان والمؤهل
        </label>
        {canSeeSalary && (
          <label className="flex items-center gap-1.5 text-xs font-bold text-amber-800 cursor-pointer select-none">
            <input type="checkbox" checked={showSalary} onChange={e => setShowSalary(e.target.checked)} />
            <span className="inline-flex items-center gap-1">الراتب <LockKeyhole className="h-3 w-3" aria-hidden="true" /></span>
          </label>
        )}

        <button
          onClick={onBack}
          className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all"
        >
          <SvgIcons.XMark className="w-4 h-4" />
          <span>إغلاق</span>
        </button>
      </div>

      <p className="text-[11px] text-stone-300 mb-4 text-center max-w-xl print:hidden leading-relaxed">
        عند الضغط على الطباعة اختر <span className="font-bold text-white">«حفظ كـ PDF»</span> — الورقة A4 عرضي، وكل فرع في
        صفحات مستقلة. تأكد أن خيار <span className="font-bold text-white">«الرسومات الخلفية / Background graphics»</span> مفعّل
        عشان الألوان تظهر.
      </p>

      {/* الورقة */}
      <div className="w-full overflow-x-auto print:overflow-visible">
        <div
          className="emp-report-sheet mx-auto bg-white shadow-2xl rounded-lg"
          dir="rtl"
          style={{ width: '297mm', maxWidth: 'none', padding: '10mm', boxSizing: 'border-box', color: '#1c1917' }}
        >
          {totals.total === 0 ? (
            <div className="text-center py-20 text-stone-500 font-bold">لا يوجد موظفون لعرضهم في التقرير.</div>
          ) : (
            <>
              {/* ================= الغلاف + الملخص ================= */}
              <section className="emp-report-cover" style={{ minHeight: '180mm' }}>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
                    borderRadius: '4mm',
                    padding: '9mm 11mm',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', left: '-14mm', top: '-14mm', width: '55mm', height: '55mm', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                  <div style={{ position: 'absolute', left: '30mm', bottom: '-20mm', width: '45mm', height: '45mm', borderRadius: '50%', background: 'rgba(0,0,0,0.12)' }} />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8mm' }}>
                    <div style={{ width: '26mm', height: '26mm', borderRadius: '5mm', overflow: 'hidden', border: `0.8mm solid ${GOLD}`, background: '#83141D', flexShrink: 0 }}>
                      <img src="/bobwich-logo.jpg" alt="BOB WICH" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '9pt', letterSpacing: '0.35em', color: '#f3d98b', fontWeight: 800 }}>BOB WICH • HR SYSTEM</div>
                      <div style={{ fontSize: '26pt', fontWeight: 900, lineHeight: 1.25, marginTop: '1.5mm' }}>تقرير بيانات الموظفين</div>
                      <div style={{ fontSize: '10pt', color: 'rgba(255,255,255,0.85)', marginTop: '1.5mm' }}>
                        {branchFilter === 'all' ? 'جميع الفروع — مقسّم حسب الفرع' : `فرع ${branchFilter}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'left', fontSize: '8.5pt', color: 'rgba(255,255,255,0.9)', lineHeight: 1.9 }}>
                      <div>تاريخ التقرير</div>
                      <div style={{ fontWeight: 900, fontSize: '10.5pt' }}>{longDate}</div>
                      <div style={{ opacity: 0.8 }}>أعدّه: {currentUser.name}</div>
                    </div>
                  </div>
                  <div style={{ height: '0.6mm', background: `linear-gradient(90deg, ${GOLD}, transparent)`, marginTop: '6mm', position: 'relative' }} />
                </div>

                {/* بطاقات الإحصاء */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4mm', margin: '6mm 0' }}>
                  {[
                    { label: 'إجمالي الموظفين', value: totals.total, color: BRAND },
                    { label: 'عدد الفروع', value: totals.branches, color: '#44403c' },
                    { label: 'بصمة مسجّلة', value: totals.withFp, color: '#047857' },
                    { label: 'بدون رقم بصمة', value: totals.withoutFp, color: totals.withoutFp > 0 ? '#b45309' : '#047857' },
                  ].map(card => (
                    <div
                      key={card.label}
                      style={{
                        border: '0.3mm solid #e7e5e4',
                        borderTop: `1.2mm solid ${card.color}`,
                        borderRadius: '3mm',
                        padding: '4mm 5mm',
                        background: '#fafaf9',
                      }}
                    >
                      <div style={{ fontSize: '8.5pt', color: '#78716c', fontWeight: 700 }}>{card.label}</div>
                      <div style={{ fontSize: '22pt', fontWeight: 900, color: card.color, lineHeight: 1.2 }}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* جدول ملخص الفروع */}
                <div style={{ fontSize: '11pt', fontWeight: 900, color: BRAND, margin: '0 0 2.5mm', display: 'flex', alignItems: 'center', gap: '2mm' }}>
                  <span style={{ width: '1.5mm', height: '5mm', background: GOLD, borderRadius: '1mm', display: 'inline-block' }} />
                  ملخص الفروع
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '3mm', overflow: 'hidden' }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: '8mm' }}>#</th>
                      <th style={th}>الفرع</th>
                      <th style={{ ...th, textAlign: 'center' }}>عدد الموظفين</th>
                      <th style={{ ...th, textAlign: 'center' }}>بصمة مسجّلة</th>
                      <th style={{ ...th, textAlign: 'center' }}>بدون بصمة</th>
                      <th style={th}>أكبر الوظائف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g, i) => (
                      <tr key={g.branch} style={{ background: i % 2 ? '#fafaf9' : '#fff' }}>
                        <td style={{ ...td, color: '#a8a29e' }}>{i + 1}</td>
                        <td style={{ ...td, fontWeight: 900, color: BRAND }}>{g.branch}</td>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 900 }}>{g.list.length}</td>
                        <td style={{ ...td, textAlign: 'center', color: '#047857', fontWeight: 800 }}>{g.withFp}</td>
                        <td style={{ ...td, textAlign: 'center', color: g.withoutFp ? '#b45309' : '#a8a29e', fontWeight: 800 }}>{g.withoutFp}</td>
                        <td style={{ ...td, fontSize: '7.5pt', color: '#57534e' }}>
                          {g.positions.slice(0, 4).map(([p, n]) => `${p} (${n})`).join('  •  ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* ================= صفحات الفروع ================= */}
              {groups.map(g => (
                <section key={g.branch} className="emp-report-branch" style={{ marginTop: '10mm' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      {/* شريط الفرع — بيتكرر في أول كل صفحة */}
                      <tr>
                        <th
                          colSpan={colCount}
                          style={{
                            background: `linear-gradient(90deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
                            color: '#fff',
                            padding: '3.2mm 4mm',
                            textAlign: 'right',
                            borderBottom: `0.8mm solid ${GOLD}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6mm' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
                              <span style={{ fontSize: '8pt', color: '#f3d98b', letterSpacing: '0.2em', fontWeight: 800 }}>الفرع</span>
                              <span style={{ fontSize: '15pt', fontWeight: 900 }}>{g.branch}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '5mm', fontSize: '8.5pt', fontWeight: 700 }}>
                              <span>الموظفين: <b style={{ fontSize: '11pt' }}>{g.list.length}</b></span>
                              <span style={{ color: '#a7f3d0' }}>بصمة مسجّلة: <b>{g.withFp}</b></span>
                              <span style={{ color: g.withoutFp ? '#fde68a' : 'rgba(255,255,255,0.6)' }}>بدون بصمة: <b>{g.withoutFp}</b></span>
                            </div>
                          </div>
                        </th>
                      </tr>
                      <tr>
                        <th style={{ ...th, width: '7mm' }}>#</th>
                        {showPhotos && <th style={{ ...th, width: '12mm', textAlign: 'center' }}>الصورة</th>}
                        <th style={th}>كود الموظف</th>
                        <th style={th}>الاسم</th>
                        <th style={{ ...th, textAlign: 'center', background: '#7a1620' }}>رقم البصمة</th>
                        <th style={th}>الوظيفة / الرتبة</th>
                        <th style={th}>الرقم القومي</th>
                        <th style={th}>الهاتف / الطوارئ</th>
                        <th style={th}>تاريخ المباشرة</th>
                        <th style={{ ...th, textAlign: 'center' }}>الحالة</th>
                        {salaryOn && <th style={th}>الراتب</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {g.list.map((emp, idx) => {
                        const fp = String(emp.fingerprint_id ?? '').trim();
                        const isDup = fp !== '' && g.duplicates.has(fp);
                        const photo = showPhotos ? photoOf(emp) : '';
                        return (
                          <tr key={emp.id} style={{ background: idx % 2 ? '#fafaf9' : '#fff' }}>
                            <td style={{ ...td, color: '#a8a29e', fontSize: '7.5pt' }}>{idx + 1}</td>

                            {showPhotos && (
                              <td style={{ ...td, textAlign: 'center' }}>
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    style={{ width: '9mm', height: '9mm', borderRadius: '50%', objectFit: 'cover', border: `0.4mm solid ${GOLD}`, display: 'inline-block' }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      width: '9mm', height: '9mm', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      background: '#f5e6e8', color: BRAND, fontWeight: 900, fontSize: '9pt', border: `0.4mm solid #e8c9cd`,
                                    }}
                                  >
                                    {(emp.full_name || '؟').trim().charAt(0)}
                                  </span>
                                )}
                              </td>
                            )}

                            <td style={{ ...td, ...mono, color: BRAND, fontWeight: 800, fontSize: '7.4pt' }}>{emp.employee_code}</td>

                            <td style={td}>
                              <div style={{ fontWeight: 900, fontSize: '8.6pt' }}>{emp.full_name}</div>
                              {showExtra && (emp.qualification || emp.address) && (
                                <div style={{ fontSize: '6.8pt', color: '#78716c', marginTop: '0.6mm', lineHeight: 1.5 }}>
                                  {emp.qualification ? `المؤهل: ${emp.qualification}` : ''}
                                  {emp.qualification && emp.address ? ' • ' : ''}
                                  {emp.address || ''}
                                </div>
                              )}
                            </td>

                            <td style={{ ...td, textAlign: 'center' }}>
                              {fp ? (
                                <span
                                  style={{
                                    ...mono,
                                    display: 'inline-block',
                                    minWidth: '11mm',
                                    textAlign: 'center',
                                    padding: '0.8mm 2.2mm',
                                    borderRadius: '1.6mm',
                                    fontWeight: 900,
                                    fontSize: '9.5pt',
                                    background: isDup ? '#fee2e2' : '#fdf3d7',
                                    color: isDup ? '#b91c1c' : '#7a5a00',
                                    border: `0.3mm solid ${isDup ? '#fca5a5' : '#e8c867'}`,
                                  }}
                                  title={isDup ? 'رقم بصمة متكرر في نفس الفرع' : undefined}
                                >
                                  {fp}
                                </span>
                              ) : (
                                <span style={{ fontSize: '7.4pt', color: '#b45309', fontWeight: 800 }}>غير مسجّل</span>
                              )}
                              {isDup && <div style={{ fontSize: '6pt', color: '#b91c1c', fontWeight: 800, marginTop: '0.5mm', display: 'flex', alignItems: 'center', gap: '1mm' }}><AlertTriangle style={{ width: '6px', height: '6px' }} aria-hidden="true" /> مكرر</div>}
                            </td>

                            <td style={td}>
                              <div style={{ fontWeight: 800 }}>{emp.position_name || '—'}</div>
                              {emp.rank_name && (
                                <div style={{ fontSize: '6.8pt', color: '#92400e', fontWeight: 800, marginTop: '0.4mm' }}>{emp.rank_name}</div>
                              )}
                            </td>

                            <td style={{ ...td, ...mono, fontSize: '7.6pt' }}>{emp.national_id || '—'}</td>

                            <td style={td}>
                              <div style={{ ...mono, fontSize: '7.6pt' }}>{emp.phone || '—'}</div>
                              {emp.emergency_phone && (
                                <div style={{ fontSize: '6.8pt', color: '#78716c', marginTop: '0.4mm', whiteSpace: 'nowrap' }}>
                                  <span>طوارئ: </span>
                                  <span style={{ ...mono, display: 'inline-block' }}>{emp.emergency_phone}</span>
                                </div>
                              )}
                            </td>

                            <td style={td}>
                              <div style={{ ...mono, fontSize: '7.6pt' }}>{fmtDate(emp.hire_date)}</div>
                              {emp.hire_date && (
                                <div style={{ fontSize: '6.6pt', color: '#78716c', marginTop: '0.4mm' }}>
                                  {serviceDuration(emp.hire_date, todayIso)}
                                </div>
                              )}
                            </td>

                            <td style={{ ...td, textAlign: 'center' }}>
                              <span
                                style={{
                                  ...statusStyle(emp.status),
                                  display: 'inline-block',
                                  padding: '0.6mm 2.2mm',
                                  borderRadius: '99mm',
                                  fontSize: '7pt',
                                  fontWeight: 800,
                                  borderWidth: '0.3mm',
                                  borderStyle: 'solid',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {emp.status}
                              </span>
                            </td>

                            {salaryOn && (
                              <td style={{ ...td, ...mono, fontWeight: 800, color: '#065f46' }}>
                                {emp.salary === null && emp.hide_salary_from_manager ? 'مخفي' : fmtMoney(emp.salary)}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ marginTop: '3mm', display: 'flex', flexWrap: 'wrap', gap: '2mm', alignItems: 'center' }}>
                    <span style={{ fontSize: '7.5pt', fontWeight: 800, color: '#57534e' }}>توزيع الوظائف:</span>
                    {g.positions.map(([p, n]) => (
                      <span
                        key={p}
                        style={{
                          fontSize: '7.2pt', fontWeight: 800, padding: '0.6mm 2.4mm', borderRadius: '99mm',
                          background: '#f5e6e8', color: BRAND, border: '0.3mm solid #e8c9cd',
                        }}
                      >
                        {p} × {n}
                      </span>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
