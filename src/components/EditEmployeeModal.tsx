import React, { useState } from 'react';
import { Employee, Branch, JobPosition } from '../types';
import { ApiService } from '../services/api';
import { SvgIcons } from './BobWichLogo';

interface EditEmployeeModalProps {
  employee: Employee;
  branches: Branch[];
  positions: JobPosition[];
  onClose: () => void;
  onSaved: (updated: Employee) => void;
}

/**
 * تعديل بيانات موظف حالي.
 *
 * الغرض منها تصحيح أي بيانات اتحطت بالغلط وقت التحويل إلى موظف:
 * الفرع، الوظيفة، الراتب الشهري، وتاريخ بداية العمل.
 * كل تعديل يُسجَّل تلقائيًا في سجل العمليات باسم من قام به.
 */
export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  employee,
  branches,
  positions,
  onClose,
  onSaved,
}) => {
  const [branchName, setBranchName] = useState(employee.branch_name || '');
  const [positionName, setPositionName] = useState(employee.position_name || '');
  const [salary, setSalary] = useState<string>(
    employee.salary === null || employee.salary === undefined ? '' : String(employee.salary)
  );
  const [hireDate, setHireDate] = useState(employee.hire_date ? employee.hire_date.split('T')[0] : '');
  const [phone, setPhone] = useState(employee.phone || '');
  const [rankName, setRankName] = useState(employee.rank_name || '');
  const [hideSalary, setHideSalary] = useState(!!employee.hide_salary_from_manager);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeBranches = branches.filter(b => b.is_active);
  const activePositions = positions.filter(p => p.is_active);

  // الرتب المتاحة للوظيفة المختارة (لو الرتبة الحالية مش ضمنها بنسيبها ظاهرة عشان مانضيعهاش بالغلط)
  const selectedPosition = positions.find(p => p.title === positionName);
  const availableRanks = selectedPosition?.ranks || [];

  const handlePositionChange = (newPosition: string) => {
    setPositionName(newPosition);
    // الرتبة تخص الوظيفة القديمة — لو الوظيفة الجديدة مفيهاش نفس الرتبة نفرّغها
    const next = positions.find(p => p.title === newPosition);
    if (rankName && !(next?.ranks || []).includes(rankName)) {
      setRankName('');
    }
  };

  const handleSave = async () => {
    if (!branchName.trim()) {
      setError('يرجى اختيار الفرع');
      return;
    }
    if (!positionName.trim()) {
      setError('يرجى اختيار الوظيفة');
      return;
    }
    if (salary !== '' && (isNaN(Number(salary)) || Number(salary) < 0)) {
      setError('الراتب يجب أن يكون رقماً صحيحاً');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const updated = await ApiService.updateEmployee(employee.id, {
        branch_name: branchName.trim(),
        position_name: positionName.trim(),
        salary: salary === '' ? '' : Number(salary),
        hire_date: hireDate,
        phone: phone.replace(/\D/g, ''),
        rank_name: rankName,
        hide_salary_from_manager: hideSalary,
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#9E1A24]';

  return (
    <div
      className="fixed inset-0 z-70 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#9E1A24] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg">تعديل بيانات الموظف</h3>
            <p className="text-[11px] text-amber-100 font-semibold mt-0.5">
              {employee.full_name} · {employee.employee_code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/15 transition-colors"
            title="إغلاق"
          >
            <SvgIcons.XMark className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border-r-4 border-red-600 p-3 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2">
              <SvgIcons.AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* الفرع */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">الفرع</label>
              <select value={branchName} onChange={e => setBranchName(e.target.value)} className={inputClass}>
                <option value="">اختر الفرع</option>
                {activeBranches.map(b => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
                {branchName && !activeBranches.some(b => b.name === branchName) && (
                  <option value={branchName}>{branchName} (الحالي)</option>
                )}
              </select>
            </div>

            {/* الوظيفة */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">الوظيفة</label>
              <select
                value={positionName}
                onChange={e => handlePositionChange(e.target.value)}
                className={inputClass}
              >
                <option value="">اختر الوظيفة</option>
                {activePositions.map(p => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
                {positionName && !activePositions.some(p => p.title === positionName) && (
                  <option value={positionName}>{positionName} (الحالي)</option>
                )}
              </select>
            </div>

            {/* الرتبة داخل الوظيفة */}
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700">الرتبة داخل الوظيفة</label>
              <select value={rankName} onChange={e => setRankName(e.target.value)} className={inputClass}>
                <option value="">
                  {availableRanks.length === 0 && !rankName ? 'مفيش رتب متسجلة للوظيفة دي' : 'بدون رتبة'}
                </option>
                {availableRanks.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {rankName && !availableRanks.includes(rankName) && (
                  <option value={rankName}>{rankName} (الحالية)</option>
                )}
              </select>
              <p className="text-[10px] text-stone-500">
                الرتب بتتضاف لكل وظيفة من شاشة "الفروع والوظائف ← المسميات الوظيفية ← تعديل".
              </p>
            </div>

            {/* الراتب */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">الراتب الشهري (ج.م)</label>
              <input
                type="number"
                min={0}
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="مثال: 6000"
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* إخفاء الراتب عن مدير الفرع */}
            <label className="sm:col-span-2 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideSalary}
                onChange={e => setHideSalary(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#9E1A24]"
              />
              <span className="text-xs font-bold text-amber-900 leading-relaxed">
                إخفاء راتب الموظف ده عن مدير الفرع
                <span className="block text-[10px] font-semibold text-amber-800/80 mt-0.5">
                  مدير الفرع هيشوف "مخفي" بدل الراتب. الأدمن والموارد البشرية يشوفوه عادي.
                </span>
              </span>
            </label>

            {/* تاريخ بداية العمل */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">تاريخ بداية العمل</label>
              <input
                type="date"
                value={hireDate}
                onChange={e => setHireDate(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            {/* الهاتف */}
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700">رقم الهاتف</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <p className="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-xl p-3 leading-relaxed">
            أي تعديل هنا يُسجَّل تلقائيًا في سجل العمليات باسمك وبالقيمة القديمة والجديدة، ويظهر فورًا
            في كارت الموظف ومفردات المرتب والمستندات المطبوعة.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#9E1A24] hover:bg-[#85151e] disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow transition-all"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ التعديلات'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
