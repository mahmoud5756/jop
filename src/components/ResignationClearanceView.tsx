import React from 'react';
import { Employee } from '../types';
import { SvgIcons } from './BobWichLogo';

interface ResignationClearanceViewProps {
  employee: Employee;
  onBack: () => void;
}

// A single, generic resignation + custody-clearance ("إخلاء طرف") document
// that covers ANY employee leaving regardless of their position — cashier
// or otherwise — so a separate form per role is not needed.
export const ResignationClearanceView: React.FC<ResignationClearanceViewProps> = ({
  employee,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-xs flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Action Bar (hidden on print) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-stone-200 flex items-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow transition-all hover:scale-105 active:scale-95"
        >
          <SvgIcons.Print className="w-4 h-4" />
          <span>طباعة استمارة الاستقالة وإخلاء الطرف (A4) / حفظ PDF</span>
        </button>
        <button
          onClick={onBack}
          className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all"
        >
          <SvgIcons.XMark className="w-4 h-4" />
          <span>إغلاق المعاينة</span>
        </button>
      </div>

      <div className="bg-white text-stone-900 w-full max-w-[210mm] shadow-2xl print:shadow-none font-sans text-right dir-rtl my-16 print:my-0 rounded-lg print:rounded-none overflow-hidden">
        <div className="p-6 sm:p-8 print:p-0 min-h-[297mm] print:min-h-[297mm] print:h-[297mm] print-page flex flex-col justify-between relative">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#9E1A24] pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-[#9E1A24]/30 bg-[#83141D] flex items-center justify-center">
                  <img src="/bobwich-logo.jpg" alt="BOB WICH" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#9E1A24] tracking-tight">استقالة وإخلاء طرف</h1>
                  <h2 className="text-lg font-bold text-stone-900 tracking-wider">BOB WICH</h2>
                  <p className="text-[11px] text-stone-500 font-semibold mt-0.5">إقرار استقالة وإعفاء نهائي من العهدة — يسري على جميع الوظائف</p>
                </div>
              </div>
              <div className="text-xs font-mono text-stone-600 text-left">
                <span className="font-bold text-stone-700">التاريخ: </span>
                {today}
              </div>
            </div>

            {/* Section 1: Employee data */}
            <div className="mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">أولاً: بيانات الموظف المستقيل</div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-xs space-y-1.5 bg-white">
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
                    <span className="font-bold text-stone-700 min-w-24">الرقم القومي:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono pb-0.5">{employee.national_id || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">رقم الهاتف:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono pb-0.5">{employee.phone || '—'}</span>
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
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-700 min-w-24">تاريخ المباشرة:</span>
                  <span className="border-b border-stone-400 flex-1 font-mono pb-0.5">{employee.hire_date || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Resignation statement */}
            <div className="mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">ثانياً: إقرار الاستقالة</div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-[11px] space-y-2 bg-white leading-relaxed text-justify">
                <p>
                  أقر أنا الموقّع أدناه، <span className="font-bold border-b border-stone-400 px-1">{employee.full_name || '__________________'}</span>،
                  بأنني أتقدم باستقالتي الاختيارية من العمل لدى شركة BOB WICH بوظيفة <span className="font-bold">{employee.position_name || '__________'}</span> بفرع{' '}
                  <span className="font-bold">{employee.branch_name || '__________'}</span>، وذلك اعتبارًا من تاريخ:
                  <span className="border-b border-stone-400 font-mono px-2">____ / ____ / ______</span>.
                </p>
                <p>
                  وأقر بأنني على علم بأحكام قانون العمل واللائحة الداخلية المنظمة لإجراءات إنهاء الخدمة بالاستقالة، وأنني أقدم هذه الاستقالة بإرادتي الحرة دون أي ضغط أو إكراه.
                </p>
              </div>
            </div>

            {/* Section 3: Custody & final settlement clearance — generic for any role */}
            <div className="mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">ثالثاً: إخلاء الطرف والإعفاء النهائي من العهدة</div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-[11px] space-y-2 bg-white leading-relaxed text-justify">
                <p>
                  أقر بأنني قمت بتسليم كافة العهدات النقدية والعينية والأصول (إن وجدت) المرتبطة بعملي إلى المسؤول المختص، وتمت مراجعة حسابي على نظام نقاط البيع (POS) وتسوية آخر وردية/فترة عمل لي بالكامل، ولم يتبق بذمتي أي مبالغ نقدية أو عهدة أو أدوات أو مستندات خاصة بالشركة من أي نوع.
                </p>
                <p>
                  وبناءً عليه، تُعفيني الشركة إعفاءً نهائيًا من أي مسؤولية مستقبلية عن أي عهدة أو نظام أو حساب مستخدم كان بعهدتي، اعتبارًا من تاريخ التسليم والتسوية أعلاه، مع بقاء حق الشركة في المطالبة بأي عجز أو مخالفة يثبت لاحقًا ارتباطها بفترة عملي وفقًا لأحكام القانون.
                </p>
                <p>
                  كما أقر بعدم وجود أي مستحقات مالية لي أو عليّ تجاه الشركة غير ما تم تسويته، وأنني استلمت مستحقاتي النهائية (إن وجدت) بالكامل، ولا يحق لي الرجوع على الشركة بأي مطالبة بعد توقيعي على هذا الإقرار.
                </p>
              </div>
            </div>

            {/* Section 4: HR / Management acknowledgment */}
            <div className="mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">رابعاً: إقرار الإدارة باستلام العهدة وإتمام التسوية</div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-[11px] space-y-1.5 bg-white leading-relaxed">
                <p>يقر مسؤول الفرع/الموارد البشرية الموقّع أدناه بأنه تم استلام كافة العهدات المشار إليها أعلاه من الموظف المذكور، وتمت مطابقتها وتسويتها دون وجود أي عجز أو ملاحظات، أو تم إثبات الملاحظات التالية إن وجدت:</p>
                <p className="border-b border-stone-400 pb-3">________________________________________________________________</p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t-2 border-stone-300">
            <div className="text-center space-y-6">
              <p className="font-bold text-xs text-stone-800">الموظف المستقيل</p>
              <div className="text-[11px] space-y-3">
                <p>الاسم: {employee.full_name || '____________________'}</p>
                <p className="pt-5 border-t border-stone-400 mt-5">التوقيع: __________</p>
              </div>
            </div>
            <div className="text-center space-y-6">
              <p className="font-bold text-xs text-stone-800">مستلم العهدة (مدير الفرع)</p>
              <div className="text-[11px] space-y-3">
                <p>الاسم: __________________</p>
                <p className="pt-5 border-t border-stone-400 mt-5">التوقيع: __________</p>
              </div>
            </div>
            <div className="text-center space-y-6">
              <p className="font-bold text-xs text-stone-800">الموارد البشرية</p>
              <div className="text-[11px] space-y-3">
                <p>الاسم: __________________</p>
                <p className="pt-5 border-t border-stone-400 mt-5">التوقيع والختم: __________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
