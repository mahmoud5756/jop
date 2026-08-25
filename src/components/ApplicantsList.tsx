import React, { useState, useMemo } from 'react';
import { Applicant, Branch, JobPosition, CurrentUser } from '../types';
import { SvgIcons } from './BobWichLogo';

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
}

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
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [filterConverted, setFilterConverted] = useState<'all' | 'converted' | 'applicants_only'>('all');

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

      const matchesBranch = selectedBranch === 'all' || app.branch_name === selectedBranch;
      const matchesPosition = selectedPosition === 'all' || app.position_name === selectedPosition;
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;

      let matchesConverted = true;
      if (filterConverted === 'converted') {
        matchesConverted = Boolean(app.is_converted_to_employee);
      } else if (filterConverted === 'applicants_only') {
        matchesConverted = !app.is_converted_to_employee;
      }

      return matchesSearch && matchesBranch && matchesPosition && matchesStatus && matchesConverted;
    });
  }, [safeApplicants, searchTerm, selectedBranch, selectedPosition, selectedStatus, filterConverted]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = safeApplicants.length;
    const accepted = safeApplicants.filter(a => a.status === 'مقبول' || a.is_converted_to_employee).length;
    const pending = safeApplicants.filter(a => a.status === 'طلب جديد' || a.status === 'تحت المراجعة').length;
    const interviewed = safeApplicants.filter(a => a.status === 'حضر المقابلة').length;
    const waiting = safeApplicants.filter(a => a.status === 'قائمة انتظار').length;
    return { total, accepted, pending, interviewed, waiting };
  }, [safeApplicants]);

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

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2">
            <span>سجل طلبات التوظيف الإلكترونية</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            إدارة ومتابعة طلبات التوظيف، فحص المستندات، وإجراء المقابلات لجميع فروع BOB WICH
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <SvgIcons.QrCode className="w-4 h-4 text-amber-700" />
              <span>رابط التقديم والـ QR Code</span>
            </button>
          )}

          <button
            onClick={onAddNew}
            className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <SvgIcons.Plus className="w-5 h-5" />
            <span>استمارة طلب توظيف جديدة</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => { setSelectedStatus('all'); setFilterConverted('all'); }}
          className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs cursor-pointer hover:border-[#9E1A24] transition-all"
        >
          <span className="text-[11px] font-bold text-stone-500 block">إجمالي المتقدمين</span>
          <span className="text-xl font-black text-stone-900 font-mono">{stats.total}</span>
        </div>

        <div
          onClick={() => setSelectedStatus('طلب جديد')}
          className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 shadow-xs cursor-pointer hover:border-blue-500 transition-all"
        >
          <span className="text-[11px] font-bold text-blue-700 block">طلبات جديدة / مراجعة</span>
          <span className="text-xl font-black text-blue-900 font-mono">{stats.pending}</span>
        </div>

        <div
          onClick={() => setSelectedStatus('حضر المقابلة')}
          className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs cursor-pointer hover:border-amber-500 transition-all"
        >
          <span className="text-[11px] font-bold text-amber-800 block">تمت المقابلة</span>
          <span className="text-xl font-black text-amber-950 font-mono">{stats.interviewed}</span>
        </div>

        <div
          onClick={() => { setSelectedStatus('مقبول'); setFilterConverted('converted'); }}
          className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-xs cursor-pointer hover:border-emerald-500 transition-all"
        >
          <span className="text-[11px] font-bold text-emerald-800 block">تم القبول والتعيين</span>
          <span className="text-xl font-black text-emerald-950 font-mono">{stats.accepted}</span>
        </div>

        <div
          onClick={() => setSelectedStatus('قائمة انتظار')}
          className="bg-stone-100 p-3.5 rounded-2xl border border-stone-300 shadow-xs cursor-pointer hover:border-stone-500 transition-all col-span-2 sm:col-span-1"
        >
          <span className="text-[11px] font-bold text-stone-700 block">قائمة الانتظار</span>
          <span className="text-xl font-black text-stone-900 font-mono">{stats.waiting}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                ✕
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
              <option value="مرفوض">مرفوض</option>
            </select>
          </div>
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
            عرض {filteredApplicants.length} من {applicants.length}
          </div>
        </div>
      </div>

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
                جرب تغيير خيارات البحث أو الفلترة، أو قم بتسجيل طلب توظيف جديد في النظام.
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
                {filteredApplicants.map(app => (
                  <tr key={app.id} className="hover:bg-stone-50/80 transition-colors">
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
                        <button
                          onClick={() => onEdit(app)}
                          className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg transition-all"
                          title="تعديل الاستمارة"
                        >
                          <SvgIcons.Edit className="w-4 h-4" />
                        </button>
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
    </div>
  );
};
