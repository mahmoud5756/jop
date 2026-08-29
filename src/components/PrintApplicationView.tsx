import React from 'react';
import { Applicant } from '../types';
import { SvgIcons } from './BobWichLogo';

interface PrintApplicationViewProps {
  applicant: Applicant;
  onClose: () => void;
}

export const PrintApplicationView: React.FC<PrintApplicationViewProps> = ({
  applicant,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const skillsList = applicant.skills || [];
  const experiences = applicant.experiences || [];
  const assets = applicant.assets || [];
  const totalAssetsCount = assets.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  // Fill up to 6 rows in custody table to match original form layout
  const paddedAssets = [...assets];
  while (paddedAssets.length < 6) {
    paddedAssets.push({
      id: `empty_${paddedAssets.length}`,
      applicant_id: applicant.id,
      item_number: paddedAssets.length + 1,
      asset_name: '',
      quantity: 0,
      condition: '',
      notes: '',
    });
  }

  // Fill up to 4 rows in experiences table
  const paddedExp = [...experiences];
  while (paddedExp.length < 4) {
    paddedExp.push({
      id: `empty_exp_${paddedExp.length}`,
      applicant_id: applicant.id,
      workplace: '',
      position: '',
      date_from: '',
      date_to: '',
      leaving_reason: '',
    });
  }

  const hasDocumentType = (type: string) => {
    return applicant.documents?.some(d => d.document_type.includes(type) || d.file_name.includes(type));
  };

  return (
    <div className="print-root fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-xs flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Top Action Bar in Non-Print View */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-stone-200 flex items-center gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow transition-all hover:scale-105 active:scale-95"
        >
          <SvgIcons.Print className="w-4 h-4" />
          <span>طباعة الاستمارة الرسمية (A4) / حفظ PDF</span>
        </button>

        <button
          onClick={onClose}
          className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all"
        >
          <SvgIcons.XMark className="w-4 h-4" />
          <span>إغلاق المعاينة</span>
        </button>
      </div>

      {/* Printable Document Container - Strictly A4 210mm x 297mm per page */}
      <div className="bg-white text-stone-900 w-full max-w-[210mm] shadow-2xl print:shadow-none font-sans text-right dir-rtl my-16 print:my-0 rounded-lg print:rounded-none overflow-hidden">
        
        {/* ================= PAGE 1 ================= */}
        <div className="p-6 sm:p-8 print:p-0 min-h-[297mm] print:min-h-[297mm] print:h-[297mm] print-page flex flex-col justify-between relative border-b-4 border-dashed border-stone-300 print:border-none page-break-after">
          <div>
            {/* Page 1 Header */}
            <div className="print-avoid-break flex items-start justify-between border-b-2 border-[#9E1A24] pb-3 mb-3">
              {/* Brand Logo & Title */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-[#9E1A24]/30 bg-[#83141D] flex items-center justify-center">
                  <img
                    src="/bobwich-logo.jpg"
                    alt="BOB WICH Official Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#9E1A24] tracking-tight">استمارة طلب توظيف</h1>
                  <h2 className="text-lg font-bold text-stone-900 tracking-wider">BOB WICH</h2>
                  <p className="text-[11px] text-[#9E1A24] font-semibold mt-0.5">نحن نبحث عن شغفك.. لنصنع أفضل تجربة طعم!</p>
                  <p className="text-[10px] text-stone-500 font-mono">كود الطلب: {applicant.application_code}</p>
                  <p className="text-[10px] text-stone-500 font-mono">تاريخ التقديم: {applicant.created_at?.split('T')[0] || '____ / ____ / ______'}</p>
                </div>
              </div>

              {/* Photo Box (4x6 cm) */}
              <div className="w-20 h-26 border-2 border-stone-400 rounded-sm flex flex-col items-center justify-center bg-stone-50 overflow-hidden text-center p-1">
                {applicant.photo_url ? (
                  <img
                    src={applicant.photo_url}
                    alt={applicant.full_name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-[9px] text-stone-500 font-medium leading-tight">
                    صورة شخصية<br />4×6 سم
                  </div>
                )}
              </div>
            </div>

            {/* Section 1: البيانات الشخصية */}
            <div className="print-avoid-break mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t flex justify-between items-center">
                <span>1. البيانات الشخصية</span>
              </div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-xs space-y-1.5 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-18">الاسم بالكامل:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold text-stone-900 pb-0.5">{applicant.full_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-18">رقم الهاتف:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono text-stone-900 pb-0.5">{applicant.phone || '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-18">تاريخ الميلاد:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono text-stone-900 pb-0.5">{applicant.birth_date || '____ / ____ / ______'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-18">رقم هاتف طوارئ:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono text-stone-900 pb-0.5">{applicant.emergency_phone || '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-18">الرقم القومي:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono font-bold text-stone-900 pb-0.5">{applicant.national_id || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-18">صاحب هاتف الطوارئ:</span>
                    <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5">{applicant.emergency_contact_name || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-700 min-w-18">محل الإقامة:</span>
                  <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5">{applicant.address || '—'}</span>
                </div>

                {/* Marital & Military checkboxes */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-200">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-stone-700">الحالة الاجتماعية:</span>
                    <label className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.marital_status === 'أعزب' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.marital_status === 'أعزب' ? '✓' : ''}
                      </span>
                      <span>أعزب</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.marital_status === 'متزوج' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.marital_status === 'متزوج' ? '✓' : ''}
                      </span>
                      <span>متزوج</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.marital_status === 'أخرى' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.marital_status === 'أخرى' ? '✓' : ''}
                      </span>
                      <span>أخرى</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-700">الموقف من التجنيد:</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.military_status === 'أدى الخدمة' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.military_status === 'أدى الخدمة' ? '✓' : ''}
                      </span>
                      <span>أدى الخدمة</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.military_status === 'إعفاء' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.military_status === 'إعفاء' ? '✓' : ''}
                      </span>
                      <span>إعفاء</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.military_status === 'تأجيل' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.military_status === 'تأجيل' ? '✓' : ''}
                      </span>
                      <span>تأجيل</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.military_status === 'غير مطلوب' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.military_status === 'غير مطلوب' ? '✓' : ''}
                      </span>
                      <span>غير مطلوب</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: الوظيفة المطلوبة */}
            <div className="print-avoid-break mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                2. الوظيفة المطلوبة
              </div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-xs space-y-1.5 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">الفرع المراد العمل به:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold text-stone-900 pb-0.5">{applicant.branch_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">الوظيفة المتقدم إليها:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold text-stone-900 pb-0.5">{applicant.position_name || '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">عدد سنوات الخبرة:</span>
                    <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5">{applicant.experience_years} سنة</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-stone-700">خبرة سابقة بمطاعم:</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.restaurant_experience ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.restaurant_experience ? '✓' : ''}
                      </span>
                      <span>نعم</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${!applicant.restaurant_experience ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {!applicant.restaurant_experience ? '✓' : ''}
                      </span>
                      <span>لا</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">آخر وظيفة عملت بها:</span>
                    <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5">{applicant.last_job || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">سبب ترك العمل:</span>
                    <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5">{applicant.leaving_reason || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sections 3 & 5 side by side (Education & Skills) */}
            <div className="print-avoid-break grid grid-cols-12 gap-2.5 mb-3">
              {/* Section 3: المؤهل الدراسي */}
              <div className="col-span-5">
                <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                  3. المؤهل الدراسي
                </div>
                <div className="border border-stone-300 border-t-0 p-2.5 text-xs space-y-1.5 bg-white h-[calc(100%-24px)]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-14">المؤهل:</span>
                    <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5">{applicant.qualification || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-14">التخصص:</span>
                    <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5">{applicant.specialization || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-14">التخرج:</span>
                    <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5">{applicant.graduation_year || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="font-bold text-stone-700">ما زلت تدرس؟</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.still_studying ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.still_studying ? '✓' : ''}
                      </span>
                      <span>نعم</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${!applicant.still_studying ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {!applicant.still_studying ? '✓' : ''}
                      </span>
                      <span>لا</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 5: المهارات */}
              <div className="col-span-7">
                <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                  5. المهارات
                </div>
                <div className="border border-stone-300 border-t-0 p-2 text-xs bg-white h-[calc(100%-24px)]">
                  <div className="grid grid-cols-3 gap-y-1.5 gap-x-1.5 text-[11px]">
                    {[
                      'المطبخ',
                      'تجهيز الطعام',
                      'الكاشير',
                      'خدمة العملاء',
                      'إدارة المخزون',
                      'النظافة',
                      'تحت ضغط',
                      'ضمن فريق',
                      'الكمبيوتر',
                    ].map(skill => {
                      const isChecked = skillsList.includes(skill);
                      return (
                        <div key={skill} className="flex items-center gap-1">
                          <span className={`w-3 h-3 border border-stone-600 rounded-xs flex items-center justify-center text-[9px] ${isChecked ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                            {isChecked ? '✓' : ''}
                          </span>
                          <span className="text-stone-800 truncate">{skill}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 pt-1 border-t border-stone-200 flex items-center gap-1.5">
                    <span className="flex items-center gap-1">
                      <span className={`w-3 h-3 border border-stone-600 rounded-xs flex items-center justify-center text-[9px] ${Boolean(applicant.custom_skill) ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {Boolean(applicant.custom_skill) ? '✓' : ''}
                      </span>
                      <span className="font-bold text-stone-700 text-[11px]">أخرى:</span>
                    </span>
                    <span className="border-b border-stone-400 flex-1 text-stone-900 pb-0.5 text-[11px]">{applicant.custom_skill || '______________________'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: الخبرات السابقة */}
            <div className="print-avoid-break mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                4. الخبرات السابقة
              </div>
              <div className="border border-stone-300 border-t-0 overflow-hidden">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-red-50/80 text-[#9E1A24] font-bold border-b border-stone-300">
                      <th className="py-1 px-2 border-l border-stone-300 w-1/4">مكان العمل</th>
                      <th className="py-1 px-2 border-l border-stone-300 w-1/4">الوظيفة</th>
                      <th className="py-1 px-2 border-l border-stone-300 w-16">من</th>
                      <th className="py-1 px-2 border-l border-stone-300 w-16">إلى</th>
                      <th className="py-1 px-2">سبب ترك العمل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paddedExp.map((exp, idx) => (
                      <tr key={idx} className="border-b border-stone-200 h-5.5">
                        <td className="py-0.5 px-2 border-l border-stone-300 text-stone-800">{exp.workplace || ''}</td>
                        <td className="py-0.5 px-2 border-l border-stone-300 text-stone-800">{exp.position || ''}</td>
                        <td className="py-0.5 px-2 border-l border-stone-300 text-stone-800 font-mono text-[11px]">{exp.date_from || ''}</td>
                        <td className="py-0.5 px-2 border-l border-stone-300 text-stone-800 font-mono text-[11px]">{exp.date_to || ''}</td>
                        <td className="py-0.5 px-2 text-stone-800">{exp.leaving_reason || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 6: أوقات العمل */}
            <div className="print-avoid-break mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                6. أوقات العمل
              </div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-xs space-y-1.5 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-stone-700">الورديات المتاحة:</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.shift_morning ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.shift_morning ? '✓' : ''}
                      </span>
                      <span>صباحية</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.shift_night ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.shift_night ? '✓' : ''}
                      </span>
                      <span>ليلية</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-stone-700">وسيلة مواصلات خاصة؟</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.can_work_shifts ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.can_work_shifts ? '✓' : ''}
                      </span>
                      <span>نعم</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${!applicant.can_work_shifts ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {!applicant.can_work_shifts ? '✓' : ''}
                      </span>
                      <span>لا</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-200">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-stone-700">ساعات إضافية عند الحاجة؟</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.can_work_overtime ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.can_work_overtime ? '✓' : ''}
                      </span>
                      <span>نعم</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${!applicant.can_work_overtime ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {!applicant.can_work_overtime ? '✓' : ''}
                      </span>
                      <span>لا</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-stone-700">العمل في العطلات الرسمية؟</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.can_work_holidays ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.can_work_holidays ? '✓' : ''}
                      </span>
                      <span>نعم</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${!applicant.can_work_holidays ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {!applicant.can_work_holidays ? '✓' : ''}
                      </span>
                      <span>لا</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 8: المرفقات */}
            <div className="print-avoid-break">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                8. المرفقات
              </div>
              <div className="border border-stone-300 border-t-0 p-2.5 text-xs bg-white flex items-center justify-around">
                <span className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${hasDocumentType('بطاقة') || hasDocumentType('قومي') ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                    {hasDocumentType('بطاقة') || hasDocumentType('قومي') ? '✓' : ''}
                  </span>
                  <span>صورة بطاقة الرقم القومي</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${hasDocumentType('شخصية') || Boolean(applicant.photo_url) ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                    {hasDocumentType('شخصية') || Boolean(applicant.photo_url) ? '✓' : ''}
                  </span>
                  <span>صور شخصية</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${hasDocumentType('صحية') ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                    {hasDocumentType('صحية') ? '✓' : ''}
                  </span>
                  <span>شهادة صحية – إن وجدت</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PAGE 2 ================= */}
        <div className="p-6 sm:p-8 print:p-0 min-h-[297mm] print:min-h-[297mm] print:h-[297mm] print-page flex flex-col justify-between relative">
          <div>
            {/* Page 2 Header */}
            <div className="print-avoid-break flex items-center justify-between border-b-2 border-[#9E1A24] pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden shadow-sm border border-[#9E1A24]/30 bg-[#83141D] flex items-center justify-center">
                  <img
                    src="/bobwich-logo.jpg"
                    alt="BOB WICH Official Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-black text-[#9E1A24]">استمارة طلب توظيف</h1>
                  <h2 className="text-base font-bold text-stone-900">BOB WICH</h2>
                  <p className="text-[11px] text-stone-600 font-semibold mt-0.5">إقرار المتقدم والعهدة وإدارة الموارد البشرية</p>
                </div>
              </div>
              <div className="text-left text-xs font-mono text-stone-500">
                <div>الكود: {applicant.application_code}</div>
                <div>المتقدم: {applicant.full_name}</div>
              </div>
            </div>

            {/* Section 9: إقرار المتقدم والعهدة */}
            <div className="print-avoid-break mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                9. إقرار المتقدم والعهدة
              </div>
              <div className="border border-stone-300 border-t-0 p-3 text-[11px] text-stone-800 leading-relaxed bg-white space-y-1.5 text-justify">
                <p>
                  أقر أنا الموقع أدناه بأن جميع البيانات والمعلومات المذكورة في هذه الاستمارة صحيحة، وأتحمل كامل المسؤولية عن صحة البيانات المقدمة، وأوافق على قيام إدارة <span className="font-bold">BOB WICH</span> بمراجعة البيانات والخبرات المذكورة واتخاذ ما تراه مناسبًا بشأن طلب التوظيف.
                </p>
                <p>
                  كما أقر باستلامي للعهدة الموضحة أدناه، وأتعهد بالمحافظة عليها وعدم إتالفها أو إساءة استخدامها، وتسليمها عند ترك العمل أو انتهاء علاقة العمل بنفس الحالة التي استلمتها بها، مع مراعاة الاستهلاك الطبيعي.
                </p>
                <p>
                  وفي حالة عدم تسليم العهدة المستلمة أو وجود تلف بها بسبب الإهمال أو سوء الاستخدام، يتم تسوية قيمة العهدة أو التلف من المستحقات المالية وفقًا للوائح الشركة والقانون.
                </p>
              </div>
            </div>

            {/* Custody / Assets Table */}
            <div className="print-avoid-break mb-3">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                العهدة المستلمة
              </div>
              <div className="border border-stone-300 border-t-0 overflow-hidden bg-white">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-red-50/80 text-[#9E1A24] font-bold border-b border-stone-300">
                      <th className="py-1 px-2 border-l border-stone-300 w-10">م</th>
                      <th className="py-1 px-2 border-l border-stone-300 w-2/5">بيان العهدة</th>
                      <th className="py-1 px-2 border-l border-stone-300 w-16">العدد</th>
                      <th className="py-1 px-2 border-l border-stone-300 w-1/4">الحالة عند الاستلام</th>
                      <th className="py-1 px-2">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paddedAssets.map((ast, idx) => (
                      <tr key={idx} className="border-b border-stone-200 h-6">
                        <td className="py-0.5 px-2 border-l border-stone-300 font-mono text-stone-600">{idx + 1}</td>
                        <td className="py-0.5 px-2 border-l border-stone-300 text-stone-900 text-right">{ast.asset_name || ''}</td>
                        <td className="py-0.5 px-2 border-l border-stone-300 font-mono text-stone-900">{ast.quantity ? ast.quantity : ''}</td>
                        <td className="py-0.5 px-2 border-l border-stone-300 text-stone-800">{ast.condition || ''}</td>
                        <td className="py-0.5 px-2 text-stone-800">{ast.notes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Custody summary and signature */}
                <div className="p-2.5 border-t border-stone-300 bg-stone-50/50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-700">إجمالي العهد المستلمة:</span>
                      <span className="border-b border-stone-400 font-mono font-bold px-3">{totalAssetsCount > 0 ? totalAssetsCount : '______'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-700">التاريخ:</span>
                      <span className="border-b border-stone-400 font-mono px-3">{applicant.declaration_date || '____ / ____ / ______'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-700 min-w-22">اسم المتقدم:</span>
                      <span className="border-b border-stone-400 flex-1 font-semibold text-stone-900">{applicant.applicant_signature_name || applicant.full_name || '______________'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-700 min-w-20">التوقيع:</span>
                      <span className="border-b border-stone-400 flex-1 font-signature text-stone-800">{applicant.applicant_signature_name ? `توقيع: ${applicant.applicant_signature_name}` : '______________________'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: للاستخدام بواسطة إدارة BOB WICH */}
            <div className="print-avoid-break">
              <div className="bg-[#9E1A24] text-white px-2.5 py-0.5 text-[11px] font-bold rounded-t">
                للاستخدام بواسطة إدارة BOB WICH
              </div>
              <div className="border border-stone-300 border-t-0 p-3 text-xs space-y-2 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">الوظيفة المقترحة:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold text-stone-900 pb-0.5">
                      {applicant.hr_decision?.proposed_position || applicant.position_name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">تاريخ استلام الطلب:</span>
                    <span className="border-b border-stone-400 flex-1 font-mono text-stone-900 pb-0.5">
                      {applicant.hr_decision?.application_date || applicant.created_at?.split('T')[0] || '____ / ____ / ______'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">الراتب المقترح:</span>
                    <span className="border-b border-stone-400 flex-1 font-bold text-stone-900 pb-0.5">
                      {applicant.hr_decision?.proposed_salary ? `${applicant.hr_decision.proposed_salary} ج.م` : '________________'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-700 min-w-22">المقابلة الأولى:</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.hr_decision?.first_interview_status === 'مقبول' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.hr_decision?.first_interview_status === 'مقبول' ? '✓' : ''}
                      </span>
                      <span>مقبول</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.hr_decision?.first_interview_status === 'مرفوض' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.hr_decision?.first_interview_status === 'مرفوض' ? '✓' : ''}
                      </span>
                      <span>مرفوض</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.hr_decision?.first_interview_status === 'إعادة مقابلة' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.hr_decision?.first_interview_status === 'إعادة مقابلة' ? '✓' : ''}
                      </span>
                      <span>إعادة</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-700 min-w-26">الفرع:</span>
                    <span className="border-b border-stone-400 flex-1 font-semibold text-stone-900 pb-0.5">
                      {applicant.hr_decision?.branch_name || applicant.branch_name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-700 min-w-22">المقابلة الثانية:</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.hr_decision?.second_interview_status === 'حضر' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.hr_decision?.second_interview_status === 'حضر' ? '✓' : ''}
                      </span>
                      <span>حضر</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.hr_decision?.second_interview_status === 'لم يحضر' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                        {applicant.hr_decision?.second_interview_status === 'لم يحضر' ? '✓' : ''}
                      </span>
                      <span>لم يحضر</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-700 min-w-26">تاريخ مباشرة العمل:</span>
                  <span className="border-b border-stone-400 flex-1 font-mono text-stone-900 pb-0.5">
                    {applicant.hr_decision?.joining_date || '____ / ____ / ______'}
                  </span>
                </div>

                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-stone-700 min-w-26 pt-0.5">ملاحظات الإدارة:</span>
                  <span className="border-b border-stone-400 flex-1 text-stone-900 min-h-5 pb-0.5">
                    {applicant.hr_decision?.hr_notes || 'لا توجد ملاحظات إضافية'}
                  </span>
                </div>

                {/* Final Decision */}
                <div className="pt-1.5 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-stone-900 text-xs">قرار التوظيف:</span>
                      <span className="flex items-center gap-1">
                        <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.status === 'مقبول' || applicant.hr_decision?.hiring_decision === 'قبول' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                          {applicant.status === 'مقبول' || applicant.hr_decision?.hiring_decision === 'قبول' ? '✓' : ''}
                        </span>
                        <span className="font-bold">قبول</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.status === 'مرفوض' || applicant.hr_decision?.hiring_decision === 'رفض' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                          {applicant.status === 'مرفوض' || applicant.hr_decision?.hiring_decision === 'رفض' ? '✓' : ''}
                        </span>
                        <span className="font-bold">رفض</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-3.5 h-3.5 border border-stone-600 rounded-xs flex items-center justify-center text-[10px] ${applicant.status === 'قائمة انتظار' || applicant.hr_decision?.hiring_decision === 'قائمة انتظار' ? 'bg-[#9E1A24] text-white font-bold' : ''}`}>
                          {applicant.status === 'قائمة انتظار' || applicant.hr_decision?.hiring_decision === 'قائمة انتظار' ? '✓' : ''}
                        </span>
                        <span className="font-bold">قائمة انتظار</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 mt-1.5 border-t border-dashed border-stone-200">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-700 min-w-26">مسؤول التوظيف:</span>
                      <span className="border-b border-stone-400 flex-1 font-semibold text-stone-900 pb-0.5">
                        {applicant.hr_decision?.recruiter_name || 'أ. سارة أحمد'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-700 min-w-16">التوقيع:</span>
                      <span className="border-b border-stone-400 flex-1 text-stone-800 font-mono pb-0.5">
                        {applicant.hr_decision?.recruiter_name ? `إدارة HR: ${applicant.hr_decision.recruiter_name}` : '______________________'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};