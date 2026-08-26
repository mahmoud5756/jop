import React, { useState, useMemo } from 'react';
import { Employee, Applicant, CurrentUser } from '../types';
import { SvgIcons } from './BobWichLogo';

interface EmployeesViewProps {
  employees: Employee[];
  applicants: Applicant[];
  currentUser: CurrentUser;
  onViewApplicant: (applicant: Applicant) => void;
  onPrintApplicant: (applicant: Applicant) => void;
  onPrintContract?: (employee: Employee) => void;
  onPrintResignation?: (employee: Employee) => void;
  onPrintPayslip?: (employee: Employee) => void;
  onUpdateStatus?: (employeeId: string, newStatus: string) => void;
  onDelete?: (employeeId: string) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  applicants,
  currentUser,
  onViewApplicant,
  onPrintApplicant,
  onPrintContract,
  onPrintResignation,
  onPrintPayslip,
  onUpdateStatus,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const safeApplicants = useMemo(() => Array.isArray(applicants) ? applicants : [], [applicants]);

  const filteredEmployees = useMemo(() => {
    return safeEmployees.filter(emp => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (emp.full_name && emp.full_name.toLowerCase().includes(q)) ||
        (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
        (emp.national_id && emp.national_id.includes(q)) ||
        (emp.phone && emp.phone.includes(q)) ||
        (emp.branch_name && emp.branch_name.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [safeEmployees, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'نشط':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'تحت الاختبار':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'مجاز':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'مستقيل':
      case 'منهي التعاقد':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2">
            <span>سجل الموظفين المعينين</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            قاعدة بيانات الموظفين المعينين رسمياً من خلال طلبات التوظيف الإلكترونية مع الاحتفاظ بملف التقديم الأصلي
          </p>
        </div>

        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
          <SvgIcons.UserCheck className="w-4 h-4" />
          <span>إجمالي القوة الفعلية: {employees.length} موظف</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 relative w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم، كود الموظف، الرقم القومي، أو الفرع..."
            className="w-full bg-stone-50 rounded-xl pr-10 pl-4 py-2.5 border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
          />
          <div className="absolute right-3 top-3 text-stone-400">
            <SvgIcons.Search className="w-4 h-4" />
          </div>
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-300 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
          >
            <option value="all">جميع الحالات</option>
            <option value="نشط">نشط</option>
            <option value="تحت الاختبار">تحت الاختبار</option>
            <option value="مجاز">مجاز</option>
            <option value="مستقيل">مستقيل</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <SvgIcons.UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-800">لا يوجد موظفون مسجلون حالياً</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              عند قبول المتقدمين وتحويلهم إلى موظفين عبر زر "تحويل إلى موظف"، ستظهر بياناتهم هنا تلقائياً.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-stone-100/80 text-stone-700 font-bold border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-4">كود الموظف</th>
                  <th className="py-3.5 px-4">الموظف</th>
                  <th className="py-3.5 px-4">الوظيفة / الفرع</th>
                  <th className="py-3.5 px-4">الراتب الشهري</th>
                  <th className="py-3.5 px-4">تاريخ المباشرة</th>
                  <th className="py-3.5 px-4">الحالة وإدارتها</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات والملف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredEmployees.map(emp => {
                  const linkedApplicant = safeApplicants.find(a => a.id === emp.applicant_id);
                  return (
                    <tr key={emp.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-black text-[#9E1A24]">
                        {emp.employee_code}
                      </td>

                      {/* Name & Phone */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{emp.full_name}</div>
                        <div className="text-[11px] font-mono text-stone-500">{emp.phone} • {emp.national_id}</div>
                      </td>

                      {/* Position & Branch */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{emp.position_name}</div>
                        <div className="text-[11px] text-stone-500 font-semibold">{emp.branch_name}</div>
                      </td>

                      {/* Salary */}
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {emp.salary ? `${Number(emp.salary).toLocaleString('ar-EG')} ج.م` : '—'}
                      </td>

                      {/* Hire Date */}
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {emp.hire_date || '—'}
                      </td>

                      {/* Status & Change Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border inline-block ${getStatusBadge(emp.status)}`}>
                            {emp.status}
                          </span>
                          {onUpdateStatus && (currentUser.role === 'admin' || currentUser.role === 'hr') && (
                            <select
                              value={emp.status}
                              onChange={e => onUpdateStatus(emp.id, e.target.value)}
                              className="block w-full bg-stone-50 border border-stone-300 rounded-lg text-[10px] py-1 px-1.5 font-semibold text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#9E1A24]"
                              title="تغيير حالة الموظف أو تسجيل استقالة/إنهاء تعاقد"
                            >
                              <option value="نشط">نشط</option>
                              <option value="تحت الاختبار">تحت الاختبار</option>
                              <option value="مستقيل">مستقيل</option>
                              <option value="منهي التعاقد">منهي التعاقد</option>
                              <option value="مجاز">مجاز</option>
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Linked Applicant Actions & Delete */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {linkedApplicant && (
                            <>
                              <button
                                onClick={() => onViewApplicant(linkedApplicant)}
                                className="bg-stone-100 hover:bg-[#9E1A24] hover:text-white text-stone-800 px-2 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 text-[11px]"
                                title="عرض ملف التقديم الكامل والعهدة"
                              >
                                <SvgIcons.Eye className="w-3.5 h-3.5" />
                                <span>الملف</span>
                              </button>
                              <button
                                onClick={() => onPrintApplicant(linkedApplicant)}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-xl transition-all"
                                title="طباعة الاستمارة وإقرار العهدة الموقع"
                              >
                                <SvgIcons.Print className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {onPrintContract && emp.position_name?.includes('كاشير') && (
                            <button
                              onClick={() => onPrintContract(emp)}
                              className="bg-stone-100 hover:bg-[#9E1A24] hover:text-white text-stone-800 px-2 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 text-[11px]"
                              title="طباعة عقد عمل الكاشير الرسمي (مسؤولية العهدة)"
                            >
                              <SvgIcons.Briefcase className="w-3.5 h-3.5" />
                              <span>عقد كاشير</span>
                            </button>
                          )}
                          {onPrintResignation && (
                            <button
                              onClick={() => onPrintResignation(emp)}
                              className="bg-stone-100 hover:bg-amber-600 hover:text-white text-stone-800 px-2 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 text-[11px]"
                              title="طباعة استمارة استقالة وإخلاء طرف (تصلح لأي وظيفة)"
                            >
                              <SvgIcons.FileText className="w-3.5 h-3.5" />
                              <span>استقالة/إخلاء طرف</span>
                            </button>
                          )}
                          {onPrintPayslip && (
                            <button
                              onClick={() => onPrintPayslip(emp)}
                              className="bg-stone-100 hover:bg-emerald-700 hover:text-white text-stone-800 px-2 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 text-[11px]"
                              title="إنشاء وطباعة مفردات المرتب الشهرية"
                            >
                              <SvgIcons.FileText className="w-3.5 h-3.5" />
                              <span>مفردات مرتب</span>
                            </button>
                          )}
                          {onDelete && (currentUser.role === 'admin' || currentUser.role === 'hr') && (
                            <button
                              onClick={() => onDelete(emp.id)}
                              className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 px-2 py-1.5 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1"
                              title="حذف الموظف نهائياً من السجل"
                            >
                              <SvgIcons.Trash className="w-3.5 h-3.5" />
                              <span>حذف</span>
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
