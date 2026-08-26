import React from 'react';
import { Employee } from '../types';
import { SvgIcons } from './BobWichLogo';

interface CashierContractViewProps {
  employee: Employee;
  onBack: () => void;
}

// Renders the official BOB WICH cashier employment & cash-custody contract,
// auto-filled with the employee's stored data. Follows the same in-page
// print pattern as PrintApplicationView (window.print(), no popup windows).
export const CashierContractView: React.FC<CashierContractViewProps> = ({
  employee,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toISOString().split('T')[0];
  const salaryDisplay = employee.salary
    ? Number(employee.salary).toLocaleString('ar-EG')
    : '__________________';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-xs flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Action Bar (hidden on print) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-stone-200 flex items-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow transition-all hover:scale-105 active:scale-95"
        >
          <SvgIcons.Print className="w-4 h-4" />
          <span>طباعة عقد الكاشير (A4) / حفظ PDF</span>
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

        {/* ================= PAGE 1 ================= */}
        <div className="p-6 sm:p-8 print:p-0 min-h-[297mm] print:min-h-[297mm] print:h-[297mm] print-page flex flex-col justify-between relative border-b-4 border-dashed border-stone-300 print:border-none page-break-after">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-[#9E1A24] pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-[#9E1A24]/30 bg-[#83141D] flex items-center justify-center">
                  <img src="/bobwich-logo.jpg" alt="BOB WICH" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#9E1A24] tracking-tight">عقد عمل كاشير</h1>
                  <h2 className="text-lg font-bold text-stone-900 tracking-wider">BOB WICH</h2>
                  <p className="text-[11px] text-stone-500 font-semibold mt-0.5">عقد عمل ومسؤولية عهدة نقدية</p>
                </div>
              </div>
              <div className="text-xs font-mono text-stone-600 text-left">
                <span className="font-bold text-stone-700">التاريخ: </span>
                {today}
              </div>
            </div>

            <h3 className="text-center font-black text-base mb-3 text-stone-900">عقد عمل محدد البنود</h3>

            {/* Section 1: Parties */}
            <div className="mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">أولاً: بيانات الطرفين</div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-xs space-y-1.5 bg-white">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-700 min-w-28">الطرف الأول: شركة BOB WICH</span>
                  <span className="font-bold text-stone-700">يمثلها:</span>
                  <span className="border-b border-stone-400 flex-1 pb-0.5">__________________________</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-32">الطرف الثاني - اسم الموظف:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold pb-0.5">{employee.full_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">الرقم القومي:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono pb-0.5">{employee.national_id || '—'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">رقم الهاتف:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono pb-0.5">{employee.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">العنوان:</span>
                    <span className="border-b border-stone-400 flex-1 pb-0.5">{employee.address || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Job & Duration */}
            <div className="mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">ثانياً: الوظيفة ومدة العمل</div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-xs space-y-1.5 bg-white leading-relaxed">
                <p>
                  اتفق الطرفان على أن يعمل الطرف الثاني لدى الطرف الأول بوظيفة <span className="font-bold">كاشير</span> في فرع:{' '}
                  <span className="border-b border-stone-400 font-semibold px-1">{employee.branch_name || '__________________________'}</span>
                  ، وأن يبدأ العمل اعتبارًا من: <span className="border-b border-stone-400 font-mono px-1">{employee.hire_date || '____ / ____ / ______'}</span>.
                </p>
                <p>مدة العقد:  ☐ غير محددة    ☐ محددة من ____ / ____ / ______ إلى ____ / ____ / ______.</p>
                <p>يلتزم الطرف الثاني بساعات وأيام العمل ونظام الورديات والتعليمات الداخلية المعتمدة لدى الشركة.</p>
              </div>
            </div>

            {/* Section 3: Salary */}
            <div className="mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">ثالثاً: الأجر والمزايا</div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-xs space-y-1.5 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">الراتب الأساسي:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono font-bold text-emerald-800 pb-0.5">{salaryDisplay} جنيه شهريًا</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-28">الحوافز/البدلات:</span>
                    <span className="border-b border-stone-400 flex-1 pb-0.5">________________________</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-28">فترة الاختبار إن وجدت:</span>
                    <span className="border-b border-stone-400 flex-1 pb-0.5">____________________</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-24">موعد صرف الأجر:</span>
                    <span className="border-b border-stone-400 flex-1 pb-0.5">__________________________</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Daily variable custody responsibility */}
            <div className="mb-2">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">رابعاً: العهدة اليومية المتغيرة ومسؤولية الكاشير</div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-[10.5px] space-y-1.5 bg-white leading-relaxed text-justify">
                <p>نظرًا لطبيعة عمل الطرف الثاني بوظيفة كاشير، يقر الطرف الثاني بأن العهدة المالية الخاصة بعمله عهدة يومية متغيرة وليست عهدة ثابتة، وتتحدد قيمتها وفقًا للمبيعات والتحصيلات والعمليات المالية التي تتم خلال يوم العمل أو الوردية المسندة إليه.</p>
                <p>وتبدأ مسؤولية الطرف الثاني عن العهدة اليومية بمجرد مباشرته للعمل في اليوم أو الوردية المسندة إليه، وتكون المبيعات والتحصيلات والعمليات المالية التي تتم خلال فترة عمله والمسجلة على حسابه أو نقطة البيع (POS) أو المرتبطة بالوردية الخاصة به ضمن عهدته ومسؤوليته الوظيفية.</p>
                <p>ولا يشترط ولا يلزم تحرير أو توقيع محضر استلام عهدة أو محضر تسليم عهدة يومي أو مستقل، وتثبت بداية ونهاية مسؤولية الطرف الثاني عن العهدة اليومية من خلال سجلات الحضور والانصراف، وجدول الورديات، وسجلات نظام نقاط البيع (POS)، وحساب المستخدم الخاص به، وتقارير المبيعات والتحصيل والتسوية والعمليات المالية المسجلة خلال فترة عمله.</p>
                <p>وتتجدد العهدة المالية للطرف الثاني تلقائيًا مع كل يوم عمل أو وردية جديدة، وتكون العهدة الخاصة بكل يوم مستقلة عن الأيام الأخرى من حيث المبيعات والتحصيلات والعمليات المالية.</p>
                <p>وتنتهي مسؤولية الطرف الثاني عن العهدة الخاصة بذلك اليوم أو الوردية عند انتهاء فترة عمله وإتمام التسوية المالية وفق النظام المعتمد وانتقال التعامل مع العهدة إلى الموظف أو الكاشير الذي يتولى العمل بعده، دون الحاجة إلى تحرير محضر استلام أو تسليم.</p>
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-stone-400 font-semibold pt-2">صفحة 1 من 2 — يتبع</div>
        </div>

        {/* ================= PAGE 2 ================= */}
        <div className="p-6 sm:p-8 print:p-0 min-h-[297mm] print:min-h-[297mm] print:h-[297mm] print-page flex flex-col justify-between relative">
          <div className="text-[10.5px] space-y-2.5 leading-relaxed text-justify">
            <div>
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">1. نظام نقاط البيع POS</div>
              <div className="border border-stone-300 border-t-0 p-2.5 bg-white space-y-1.5">
                <p>يلتزم الطرف الثاني باستخدام حساب المستخدم الشخصي المخصص له فقط، ويحظر عليه مشاركة اسم المستخدم أو كلمة المرور أو رمز الدخول أو تمكين أي شخص آخر من استخدام حسابه.</p>
                <p>كما يحظر عليه إجراء أي عملية خارج الصلاحيات الممنوحة له أو حذف أو تعديل أو إخفاء أي بيانات أو عمليات بيع أو تحصيل أو تسوية. وتعتبر سجلات نظام POS وسجل الدخول والخروج ووقت تنفيذ العمليات واسم المستخدم من السجلات المعتمدة التي يجوز الرجوع إليها في مراجعة الوردية وتحديد المسؤولية.</p>
              </div>
            </div>
            <div>
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">2. النقدية ودرج الكاشير</div>
              <div className="border border-stone-300 border-t-0 p-2.5 bg-white space-y-1.5">
                <p>يلتزم الطرف الثاني بالمحافظة على النقدية الموجودة في درج الكاشير والمتحصلات الناتجة عن المبيعات خلال ورديته، وعدم إخراج أي مبالغ من الدرج إلا وفق الإجراءات المعتمدة، وعدم خلط أمواله الشخصية بأموال المنشأة. ولا يجوز لأي شخص غير مصرح له التعامل مع درج الكاشير أو النقدية الموجودة به.</p>
              </div>
            </div>
            <div>
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">3. عمليات الإلغاء (VOID) والخصومات والمرتجعات</div>
              <div className="border border-stone-300 border-t-0 p-2.5 bg-white space-y-1.5">
                <p>يحظر على الطرف الثاني إلغاء أي طلب أو عملية بيع، أو منح أي خصم، أو إجراء أي مرتجع أو رد نقدي، إلا في الحالات المسموح بها ووفق الصلاحيات المحددة له، وتخضع جميع هذه العمليات للمراجعة وفق الصلاحيات والسياسات المعتمدة.</p>
              </div>
            </div>
            <div>
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">4. العجز والتسوية والزيادة</div>
              <div className="border border-stone-300 border-t-0 p-2.5 bg-white space-y-1.5">
                <p>في حالة وجود فرق أو عجز عند إجراء التسوية النهائية للوردية، تتم مطابقة النقدية الفعلية مع المبيعات المسجلة على نظام POS وعمليات الدفع الإلكتروني والمرتجعات والخصومات وعمليات VOID. فإذا ثبت أن العجز نتج عن خطأ الطرف الثاني أو إهماله أو مخالفته للتعليمات، يكون مسؤولًا عن قيمة الضرر أو الفقد المثبت في حدود ما يقرره القانون. ولا يُعتد بأي عجز غير مثبت أو غير قابل للربط بالوردية أو بالعمليات التي كانت تحت مسؤوليته. وفي حالة وجود زيادة في النقدية، يلتزم الطرف الثاني بالإفصاح عنها فورًا وإثباتها ضمن تقرير التسوية.</p>
              </div>
            </div>
            <div>
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">5. المسؤولية القانونية عن العهدة</div>
              <div className="border border-stone-300 border-t-0 p-2.5 bg-white space-y-1.5">
                <p>يقر الطرف الثاني بأن العهدة المخصصة له أثناء الوردية ليست مجرد مسؤولية وظيفية شكلية، ويلتزم بالمحافظة عليها وبذل العناية اللازمة بها، ويكون مسؤولًا عن الفقد أو التلف أو العجز الذي يثبت أنه نتج عن خطئه أو إهماله أو مخالفته للتعليمات، وذلك وفقًا لأحكام قانون العمل ولائحة تنظيم العمل والجزاءات المعتمدة بالمنشأة. ولا يجوز إجراء أي اقتطاع من أجره أو توقيع أي جزاء مالي إلا وفقًا للإجراءات والحدود المنصوص عليها في قانون العمل.</p>
              </div>
            </div>
            <div>
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">سادساً: الالتزامات والسرية</div>
              <div className="border border-stone-300 border-t-0 p-2.5 bg-white space-y-1.5">
                <p>يلتزم الطرف الثاني بالمحافظة على أسرار العمل وبيانات العملاء والأسعار والتقارير وعدم استخدامها خارج نطاق العمل. يلتزم الطرفان بأحكام قانون العمل واللوائح الداخلية، وبإخطار الطرف الآخر عند الرغبة في إنهاء العلاقة وفق المدد والإجراءات القانونية الواجبة. ويقر الطرف الثاني بأنه اطلع على قواعد تشغيل الكاشير وإجراءات النقدية ونظام POS وسياسة الخصومات والمرتجعات وعمليات VOID وتسوية الوردية، والتزم بها.</p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t-2 border-stone-300">
            <div className="text-center space-y-8">
              <p className="font-bold text-sm text-stone-800">الطرف الثاني - الموظف</p>
              <div className="text-xs space-y-4">
                <p>الاسم: {employee.full_name || '____________________'}</p>
                <p className="pt-6 border-t border-stone-400 mt-6">التوقيع: __________________</p>
              </div>
            </div>
            <div className="text-center space-y-8">
              <p className="font-bold text-sm text-stone-800">الطرف الأول - الشركة</p>
              <div className="text-xs space-y-4">
                <p>الاسم والصفة: _______________</p>
                <p className="pt-6 border-t border-stone-400 mt-6">التوقيع والختم: ______________</p>
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-stone-400 font-semibold pt-4">صفحة 2 من 2</div>
        </div>
      </div>
    </div>
  );
};
