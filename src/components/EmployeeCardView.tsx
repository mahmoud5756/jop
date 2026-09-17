import React, { useEffect } from 'react';
import { Employee } from '../types';
import { SvgIcons } from './BobWichLogo';

interface EmployeeCardViewProps {
  employee: Employee;
  /** صورة بديلة تُستخدم لو ملف الموظف نفسه مش فيه صورة (تُؤخذ من ملف التقديم) */
  fallbackPhotoUrl?: string;
  onBack: () => void;
}

/**
 * كارت الموظف الرسمي (BOB WICH).
 *
 * مقاس الكارت مطابق لمقاس كارت البنك / الهوية القياسي (CR80):
 *   85.6mm × 54mm
 *
 * الطباعة تتم بمقاس الكارت تمامًا وليس A4، عن طريق قاعدة @page مستقلة
 * تُحقن مع المكوّن نفسه (فتتغلّب على قاعدة A4 العامة الموجودة في index.css
 * لأنها تأتي بعدها في ترتيب الأنماط). وبالتالي:
 *   - "طباعة" على طابعة كروت = كارت جاهز
 *   - "حفظ كـ PDF" = ملف PDF مقاسه مقاس الكارت بالظبط، جاهز للطباعة والقص
 */
export const EmployeeCardView: React.FC<EmployeeCardViewProps> = ({
  employee,
  fallbackPhotoUrl,
  onBack,
}) => {
  // صورة الموظف: من ملف الموظف أولًا، وإلا من صورة ملف التقديم الأصلي
  const photoUrl = (employee.photo_url || fallbackPhotoUrl || '').trim();
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

  const formatDate = (d?: string) => {
    if (!d) return '—';
    const parts = d.split('T')[0].split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="print-root fixed inset-0 z-70 overflow-y-auto bg-stone-900/85 backdrop-blur-xs flex flex-col items-center p-4 sm:p-8 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* قاعدة الطباعة الخاصة بالكارت — مقاس الكارت وليس A4 */}
      <style>{`
        @media print {
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .id-card-sheet {
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            display: block !important;
            transform: none !important;
          }
          .id-card {
            width: 85.6mm !important;
            height: 54mm !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
            overflow: hidden !important;
          }
          .id-card:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {/* شريط الأدوات (لا يُطبع) */}
      <div className="sticky top-0 z-10 mb-6 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-stone-200 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow transition-all hover:scale-105 active:scale-95"
        >
          <SvgIcons.Print className="w-4 h-4" />
          <span>تحميل الكارت PDF / طباعة (مقاس كارت)</span>
        </button>

        <button
          onClick={onBack}
          className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all"
        >
          <SvgIcons.XMark className="w-4 h-4" />
          <span>إغلاق</span>
        </button>
      </div>

      <p className="text-[11px] text-stone-300 mb-4 text-center max-w-md print:hidden leading-relaxed">
        عند الضغط على الطباعة اختر <span className="font-bold text-white">«حفظ كـ PDF»</span> —
        سينزل الملف بمقاس كارت قياسي 85.6 × 54 مم (وجه وظهر في صفحتين)، جاهز للطباعة والقص مباشرة.
        <br />
        تأكد أن خيار <span className="font-bold text-white">«الرسومات الخلفية / Background graphics»</span> مفعّل.
      </p>

      {/* ورقة الكروت */}
      <div
        className="id-card-sheet flex flex-col items-center gap-8 origin-top scale-[1.6] sm:scale-[1.9] mt-16 print:mt-0 print:scale-100 print:transform-none"
        dir="rtl"
      >
        {/* ============ الوجه الأمامي ============ */}
        <div
          className="id-card relative bg-[#9E1A24] text-white overflow-hidden shadow-2xl rounded-xl"
          style={{ width: '85.6mm', height: '54mm' }}
        >
          {/* زخرفة خلفية */}
          <div className="absolute -left-10 -top-10 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -left-6 -bottom-12 w-28 h-28 rounded-full bg-black/10" />

          <div className="relative h-full flex items-stretch gap-[2.5mm] p-[3.5mm]">
            {/* عمود الصورة */}
            <div className="flex flex-col items-center gap-[1.2mm] flex-shrink-0">
              <div className="w-[21mm] h-[26mm] rounded-md overflow-hidden border-2 border-white bg-white shadow-md flex items-center justify-center">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={employee.full_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-[2.1mm] font-bold text-stone-400 leading-tight px-[1mm]">
                    صورة
                    <br />
                    الموظف
                  </div>
                )}
              </div>
              <div className="bg-white/95 text-[#9E1A24] rounded px-[1.5mm] py-[0.5mm] font-mono font-black text-[2.2mm] tracking-wider">
                {employee.employee_code}
              </div>
            </div>

            {/* عمود البيانات */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              {/* الهيدر: اللوجو + اسم المطعم */}
              <div className="flex items-center gap-[1.8mm]">
                <div className="w-[9mm] h-[9mm] rounded-lg overflow-hidden bg-white/95 border border-white/60 flex-shrink-0">
                  <img
                    src="/bobwich-logo.jpg"
                    alt="BOB WICH"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="leading-tight min-w-0">
                  <div className="font-black tracking-wider text-[3.4mm]">BOB WICH</div>
                  <div className="text-[2.1mm] text-amber-100 font-semibold">
                    كارت تعريف موظف · STAFF ID
                  </div>
                </div>
              </div>

              {/* اسم الموظف */}
              <div>
                <div className="text-[2.1mm] text-amber-100 font-bold mb-[0.4mm]">اسم الموظف</div>
                <div className="font-black text-[3.6mm] leading-tight truncate">{employee.full_name}</div>
              </div>

              {/* الوظيفة / الفرع / بداية العمل */}
              <div className="bg-white/95 text-stone-900 rounded-md p-[1.8mm] space-y-[1mm]">
                <div className="flex items-baseline gap-[1.5mm]">
                  <span className="text-[2mm] font-bold text-[#9E1A24] w-[13mm] flex-shrink-0">الوظيفة</span>
                  <span className="text-[2.5mm] font-black truncate">{employee.position_name || '—'}</span>
                </div>
                <div className="flex items-baseline gap-[1.5mm]">
                  <span className="text-[2mm] font-bold text-[#9E1A24] w-[13mm] flex-shrink-0">الفرع</span>
                  <span className="text-[2.5mm] font-black truncate">{employee.branch_name || '—'}</span>
                </div>
                <div className="flex items-baseline gap-[1.5mm]">
                  <span className="text-[2mm] font-bold text-[#9E1A24] w-[13mm] flex-shrink-0">بداية العمل</span>
                  <span className="text-[2.5mm] font-black font-mono">{formatDate(employee.hire_date)}</span>
                </div>
              </div>

              <div className="text-[2mm] text-amber-100 font-bold truncate">
                نحن نبحث عن شغفك.. لنصنع أفضل تجربة طعم!
              </div>
            </div>
          </div>
        </div>

        {/* ============ الوجه الخلفي ============ */}
        <div
          className="id-card relative bg-white text-stone-900 overflow-hidden shadow-2xl rounded-xl border border-stone-200"
          style={{ width: '85.6mm', height: '54mm' }}
        >
          <div className="h-full flex flex-col justify-between p-[3.5mm]">
            <div className="flex items-center justify-between border-b-2 border-[#9E1A24] pb-[1.5mm]">
              <div className="font-black text-[#9E1A24] text-[3mm]">BOB WICH</div>
              <div className="text-[2.2mm] font-bold text-stone-600">بيانات الموظف</div>
            </div>

            <div className="space-y-[1.2mm] text-[2.5mm]">
              <div className="flex justify-between border-b border-dashed border-stone-300 pb-[0.8mm]">
                <span className="font-bold text-stone-500">كود الموظف</span>
                <span className="font-mono font-black text-[#9E1A24]">{employee.employee_code}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-stone-300 pb-[0.8mm]">
                <span className="font-bold text-stone-500">الوظيفة</span>
                <span className="font-bold">{employee.position_name || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-stone-300 pb-[0.8mm]">
                <span className="font-bold text-stone-500">الفرع</span>
                <span className="font-bold">{employee.branch_name || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-stone-300 pb-[0.8mm]">
                <span className="font-bold text-stone-500">تاريخ بداية العمل</span>
                <span className="font-mono font-bold">{formatDate(employee.hire_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-stone-500">رقم الهاتف</span>
                <span className="font-mono font-bold">{employee.phone || '—'}</span>
              </div>
            </div>

            <div className="text-[2mm] text-stone-500 leading-snug border-t border-stone-200 pt-[1.2mm]">
              هذا الكارت ملك لمطاعم BOB WICH ويُسلَّم للإدارة عند انتهاء الخدمة. في حالة العثور عليه
              يُرجى تسليمه لأقرب فرع.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
