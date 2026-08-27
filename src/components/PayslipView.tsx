import React, { useEffect, useMemo, useState } from 'react';
import { Employee } from '../types';
import { SvgIcons } from './BobWichLogo';
import { ApiService } from '../services/api';

interface PayslipViewProps {
  employee: Employee;
  onBack: () => void;
}

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// Editable monthly payslip ("مفردات المرتب") builder + printable A4 slip.
// Figures are entered per-month (they are not stored on the Employee record
// since they change monthly) and the net salary is computed live.
export const PayslipView: React.FC<PayslipViewProps> = ({ employee, onBack }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const [basicSalary, setBasicSalary] = useState(String(employee.salary || ''));
  const [allowances, setAllowances] = useState('0');
  const [bonuses, setBonuses] = useState('0');
  const [overtime, setOvertime] = useState('0');

  const [socialInsurance, setSocialInsurance] = useState('0');
  const [absenceDeduction, setAbsenceDeduction] = useState('0');
  const [advanceDeduction, setAdvanceDeduction] = useState('0');
  const [otherPenalties, setOtherPenalties] = useState('0');

  // Fixed company data (السجل التجاري / البطاقة الضريبية) — entered once in
  // "بيانات الشركة الثابتة" settings and pulled in automatically here instead
  // of being typed by hand on every payslip.
  const [commercialRegistry, setCommercialRegistry] = useState('');
  const [taxCard, setTaxCard] = useState('');

  useEffect(() => {
    ApiService.getCompanySettings()
      .then(settings => {
        setCommercialRegistry(settings.commercial_registry || '');
        setTaxCard(settings.tax_card || '');
      })
      .catch(() => {
        // Non-critical for the payslip itself; fields just stay blank.
      });
  }, []);

  const num = (v: string) => Number(v.replace(/[^0-9.-]/g, '')) || 0;

  const totals = useMemo(() => {
    const gross = num(basicSalary) + num(allowances) + num(bonuses) + num(overtime);
    const totalDeductions = num(socialInsurance) + num(absenceDeduction) + num(advanceDeduction) + num(otherPenalties);
    const net = gross - totalDeductions;
    return { gross, totalDeductions, net };
  }, [basicSalary, allowances, bonuses, overtime, socialInsurance, absenceDeduction, advanceDeduction, otherPenalties]);

  const fmt = (n: number) => n.toLocaleString('ar-EG', { maximumFractionDigits: 2 });

  const handlePrint = () => window.print();

  const inputCls = "w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-left focus:outline-none focus:ring-2 focus:ring-[#9E1A24]";
  const labelCls = "text-xs font-bold text-stone-700 mb-1 block";

  return (
    <div className="print-root fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-xs flex flex-col items-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Action Bar (hidden on print) */}
      <div className="sticky top-0 z-60 bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-stone-200 flex items-center gap-4 print:hidden mb-4 mt-2">
        <button
          onClick={handlePrint}
          className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow transition-all hover:scale-105 active:scale-95"
        >
          <SvgIcons.Print className="w-4 h-4" />
          <span>طباعة مفردات المرتب / حفظ PDF</span>
        </button>
        <button
          onClick={onBack}
          className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all"
        >
          <SvgIcons.XMark className="w-4 h-4" />
          <span>إغلاق المعاينة</span>
        </button>
      </div>

      {/* Editable Monthly Figures Panel (hidden on print) */}
      <div className="print:hidden w-full max-w-[210mm] bg-white rounded-2xl border border-stone-200 shadow-lg p-5 mb-6 text-right dir-rtl" dir="rtl">
        <h3 className="font-black text-stone-900 mb-3 flex items-center gap-2">
          <SvgIcons.FileText className="w-4 h-4 text-[#9E1A24]" />
          بيانات الشهر — {employee.full_name}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className={labelCls}>الشهر</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={inputCls + " text-right"}>
              {arabicMonths.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>السنة</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          <div>
            <label className={labelCls}>الراتب الأساسي</label>
            <input value={basicSalary} onChange={e => setBasicSalary(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>البدلات</label>
            <input value={allowances} onChange={e => setAllowances(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>الحوافز/المكافآت</label>
            <input value={bonuses} onChange={e => setBonuses(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>مقابل ساعات إضافية</label>
            <input value={overtime} onChange={e => setOvertime(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>التأمينات الاجتماعية</label>
            <input value={socialInsurance} onChange={e => setSocialInsurance(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>خصم غياب/تأخير</label>
            <input value={absenceDeduction} onChange={e => setAbsenceDeduction(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>سلف مستحقة</label>
            <input value={advanceDeduction} onChange={e => setAdvanceDeduction(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>جزاءات أخرى</label>
            <input value={otherPenalties} onChange={e => setOtherPenalties(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-200 flex flex-wrap gap-4 text-xs font-bold">
          <span className="text-stone-700">إجمالي المستحقات: <span className="font-mono text-emerald-700">{fmt(totals.gross)} ج.م</span></span>
          <span className="text-stone-700">إجمالي الاستقطاعات: <span className="font-mono text-red-700">{fmt(totals.totalDeductions)} ج.م</span></span>
          <span className="text-stone-900">الصافي المستحق للصرف: <span className="font-mono text-[#9E1A24]">{fmt(totals.net)} ج.م</span></span>
        </div>
      </div>

      {/* Printable Slip — deliberately compact so the whole payslip
          (header, employee data, both tables, net pay, acknowledgments
          and signatures) always fits on a single A4 page. */}
      <div className="bg-white text-stone-900 w-full max-w-[210mm] shadow-2xl print:shadow-none font-sans text-right dir-rtl print:my-0 rounded-lg print:rounded-none overflow-hidden" dir="rtl">
        <div className="p-6 sm:p-7 print:p-0 print-page print-page-single flex flex-col relative">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#9E1A24] pb-2 mb-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden shadow-sm border border-[#9E1A24]/30 bg-[#83141D] flex items-center justify-center">
                  <img src="/bobwich-logo.jpg" alt="BOB WICH" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-[#9E1A24] tracking-tight leading-tight">مفردات المرتب</h1>
                  <h2 className="text-sm font-bold text-stone-900 tracking-wider leading-tight">BOB WICH</h2>
                  <p className="text-[10px] text-stone-500 font-semibold">قسيمة راتب شهرية</p>
                </div>
              </div>
              <div className="text-xs font-mono text-stone-600 text-left">
                <span className="font-bold text-stone-700">عن شهر: </span>
                {arabicMonths[month]} {year}
              </div>
            </div>

            {/* Company Registration Info — filled in once under "بيانات الشركة
                الثابتة" in settings and shown automatically here for every
                employee/month, never typed by hand. */}
            <div className="flex items-center justify-between gap-3 text-[9.5px] text-stone-600 mb-2 pb-1.5 border-b border-stone-200">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-stone-700">السجل التجاري:</span>
                <span className="font-mono">{commercialRegistry || '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-stone-700">البطاقة الضريبية:</span>
                <span className="font-mono">{taxCard || '—'}</span>
              </div>
            </div>

            {/* Employee Data */}
            <div className="mb-2 print-avoid-break">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[10.5px] font-bold rounded-t">بيانات الموظف</div>
              <div className="border border-stone-300 border-t-0 p-2 text-[11px] space-y-1 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">الاسم الكامل:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold pb-0.5">{employee.full_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">كود الموظف:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono pb-0.5">{employee.employee_code || '—'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">الوظيفة:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold pb-0.5">{employee.position_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">الفرع:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold pb-0.5">{employee.branch_name || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Table */}
            <div className="mb-2 print-avoid-break">
              <div className="bg-emerald-700 text-white px-2.5 py-0.5 text-[10.5px] font-bold rounded-t">المستحقات</div>
              <table className="w-full text-[11px] border border-stone-300 border-t-0">
                <tbody>
                  <tr className="border-b border-stone-200">
                    <td className="px-2 py-1 font-semibold text-stone-700">الراتب الأساسي</td>
                    <td className="px-2 py-1 font-mono text-left">{fmt(num(basicSalary))} ج.م</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="px-2 py-1 font-semibold text-stone-700">البدلات</td>
                    <td className="px-2 py-1 font-mono text-left">{fmt(num(allowances))} ج.م</td>
                  </tr>
                  <tr className="border-b border-stone-200">
                    <td className="px-2 py-1 font-semibold text-stone-700">الحوافز/المكافآت</td>
                    <td className="px-2 py-1 font-mono text-left">{fmt(num(bonuses))} ج.م</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="px-2 py-1 font-semibold text-stone-700">مقابل ساعات إضافية</td>
                    <td className="px-2 py-1 font-mono text-left">{fmt(num(overtime))} ج.م</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="px-2 py-1 font-black text-emerald-800">إجمالي المستحقات</td>
                    <td className="px-2 py-1 font-mono font-black text-emerald-800 text-left">{fmt(totals.gross)} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions Table */}
            <div className="mb-2 print-avoid-break">
              <div className="bg-red-700 text-white px-2.5 py-0.5 text-[10.5px] font-bold rounded-t">الاستقطاعات</div>
              <table className="w-full text-[11px] border border-stone-300 border-t-0">
                <tbody>
                  <tr className="border-b border-stone-200">
                    <td className="px-2 py-1 font-semibold text-stone-700">التأمينات الاجتماعية</td>
                    <td className="px-2 py-1 font-mono text-left">{fmt(num(socialInsurance))} ج.م</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="px-2 py-1 font-semibold text-stone-700">خصم غياب/تأخير</td>
                    <td className="px-2 py-1 font-mono text-left">{fmt(num(absenceDeduction))} ج.م</td>
                  </tr>
                  <tr className="border-b border-stone-200">
                    <td className="px-2 py-1 font-semibold text-stone-700">سلف مستحقة</td>
                    <td className="px-2 py-1 font-mono text-left">{fmt(num(advanceDeduction))} ج.م</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="px-2 py-1 font-semibold text-stone-700">جزاءات أخرى</td>
                    <td className="px-2 py-1 font-mono text-left">{fmt(num(otherPenalties))} ج.م</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-2 py-1 font-black text-red-800">إجمالي الاستقطاعات</td>
                    <td className="px-2 py-1 font-mono font-black text-red-800 text-left">{fmt(totals.totalDeductions)} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net Pay */}
            <div className="bg-[#9E1A24] text-white rounded-lg px-4 py-2.5 flex items-center justify-between mb-2 print-avoid-break">
              <span className="font-black text-xs">الصافي المستحق للصرف</span>
              <span className="font-mono font-black text-lg">{fmt(totals.net)} ج.م</span>
            </div>

            {/* Legal Acknowledgments */}
            <div className="mb-2 print-avoid-break">
              <div className="bg-stone-700 text-white px-2.5 py-0.5 text-[10.5px] font-bold rounded-t">إقرارات وأحكام عامة</div>
              <div className="border border-stone-300 border-t-0 p-2 text-[9px] space-y-1 bg-white leading-snug text-justify">
                <p>
                  تصدر هذه القسيمة إلكترونيًا عن نظام الموارد البشرية الخاص بشركة BOB WICH، وتوضح تفاصيل المستحقات والاستقطاعات الخاصة بالموظف المذكور أعلاه عن الشهر المشار إليه، استنادًا إلى سجلات الحضور والانصراف، وجدول الورديات، وتقارير نظام نقاط البيع (POS)، والسجلات المعتمدة الأخرى لدى الشركة. وتُحتسب بنود الاستقطاعات، بما فيها التأمينات الاجتماعية، وفقًا لأحكام قانون العمل وقانون التأمينات الاجتماعية والمعاشات واللوائح الداخلية المعتمدة.
                </p>
                <p>
                  يقر الموظف الموقّع أدناه بمراجعة بنود المستحقات والاستقطاعات الموضحة أعلاه، وبأن عدم إبداء أي اعتراض كتابي إلى الموارد البشرية خلال سبعة (7) أيام عمل من تاريخ الاستلام يُعتبر إقرارًا بصحة القسيمة وعدم وجود أي منازعة بشأنها. وتُعد هذه القسيمة مستندًا رسميًا من ملف الموظف، ولا تُعتبر إقرارًا نهائيًا بالاستلام إلا بعد توقيع الموظف عليها أدناه.
                </p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="grid grid-cols-2 gap-8 mt-2 pt-3 border-t-2 border-stone-300 print-avoid-break">
            <div className="text-center space-y-3">
              <p className="font-bold text-[11px] text-stone-800">استلمت المبلغ المذكور أعلاه بالكامل</p>
              <div className="text-[10px] space-y-1.5">
                <p>الاسم: {employee.full_name || '____________________'}</p>
                <p className="pt-3 border-t border-stone-400 mt-3">التوقيع والتاريخ: __________</p>
              </div>
            </div>
            <div className="text-center space-y-3">
              <p className="font-bold text-[11px] text-stone-800">الموارد البشرية / الحسابات</p>
              <div className="text-[10px] space-y-1.5">
                <p>الاسم: __________________</p>
                <p className="pt-3 border-t border-stone-400 mt-3">التوقيع والختم: __________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
