import React, { useState } from 'react';
import { Applicant, CurrentUser, Employee } from '../types';
import { ApiService } from '../services/api';
import { SvgIcons } from './BobWichLogo';

interface ApplicantDetailsModalProps {
  applicant: Applicant;
  currentUser: CurrentUser;
  onClose: () => void;
  onEdit: (applicant: Applicant) => void;
  onPrint: (applicant: Applicant) => void;
  onConverted: (employee: Employee) => void;
  onDelete: (applicantId: string) => void;
}

export const ApplicantDetailsModal: React.FC<ApplicantDetailsModalProps> = ({
  applicant,
  currentUser,
  onClose,
  onEdit,
  onPrint,
  onConverted,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'interviews' | 'assets' | 'documents' | 'audit'>('overview');
  const [isConverting, setIsConverting] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertForm, setConvertForm] = useState({
    hire_date: new Date().toISOString().split('T')[0],
    salary: applicant.hr_decision?.proposed_salary || 7000,
    branch_name: applicant.branch_name,
    position_name: applicant.position_name,
    status: 'تحت الاختبار' as const,
  });
  const [convertError, setConvertError] = useState<string | null>(null);

  const canManageHR = currentUser.role === 'admin' || currentUser.role === 'hr';
  const canDelete = currentUser.role === 'admin';

  const handleConvertToEmployee = async () => {
    setIsConverting(true);
    setConvertError(null);
    try {
      const employee = await ApiService.convertToEmployee(applicant.id, convertForm, currentUser);
      setShowConvertDialog(false);
      onConverted(employee);
    } catch (err: any) {
      setConvertError(err.message || 'فشل في تحويل المتقدم إلى موظف');
    } finally {
      setIsConverting(false);
    }
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-right dir-rtl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-stone-900 via-[#8B1E22] to-[#9E1A24] text-white p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-20 sm:w-20 sm:h-24 bg-white/10 rounded-2xl border-2 border-white/20 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
              {applicant.photo_url ? (
                <img
                  src={applicant.photo_url}
                  alt={applicant.full_name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-2xl font-bold text-white/50">4×6</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black">{applicant.full_name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStatusBadge(applicant.status)}`}>
                  {applicant.status}
                </span>
                {applicant.is_converted_to_employee && (
                  <span className="bg-emerald-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                    موظف رسمي ({applicant.employee_code})
                  </span>
                )}
              </div>

              <div className="text-xs text-stone-200 mt-1.5 flex items-center gap-4 flex-wrap font-mono">
                <span>كود الطلب: <strong className="text-white">{applicant.application_code}</strong></span>
                <span>الرقم القومي: <strong className="text-white">{applicant.national_id}</strong></span>
                <span>الهاتف: <strong className="text-white">{applicant.phone}</strong></span>
                <span>الفرع: <strong className="text-white">{applicant.branch_name}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
          >
            <SvgIcons.XMark className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview' ? 'bg-[#9E1A24] text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              البيانات الشاملة
            </button>
            <button
              onClick={() => setActiveTab('interviews')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === 'interviews' ? 'bg-[#9E1A24] text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>المقابلات</span>
              <span className="bg-white/20 px-1.5 rounded-full text-[10px]">
                {applicant.interviews?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === 'assets' ? 'bg-[#9E1A24] text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>العهدة المستلمة</span>
              <span className="bg-white/20 px-1.5 rounded-full text-[10px]">
                {applicant.assets?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === 'documents' ? 'bg-[#9E1A24] text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>المرفقات</span>
              <span className="bg-white/20 px-1.5 rounded-full text-[10px]">
                {applicant.documents?.length || 0}
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => onPrint(applicant)}
              className="bg-stone-800 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
            >
              <SvgIcons.Print className="w-3.5 h-3.5" />
              <span>طباعة الاستمارة (A4)</span>
            </button>

            {canManageHR && (
              <button
                onClick={() => onEdit(applicant)}
                className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              >
                <SvgIcons.Edit className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            )}

            {canManageHR && !applicant.is_converted_to_employee && (
              <button
                onClick={() => setShowConvertDialog(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all animate-pulse"
              >
                <SvgIcons.UserCheck className="w-4 h-4" />
                <span>تحويل إلى موظف</span>
              </button>
            )}

            {canDelete && !applicant.is_converted_to_employee && (
              <button
                onClick={() => {
                  if (confirm(`هل أنت متأكد من حذف طلب التوظيف للمتقدم ${applicant.full_name}؟`)) {
                    onDelete(applicant.id);
                  }
                }}
                className="text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all"
                title="حذف الطلب"
              >
                <SvgIcons.Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6 text-sm">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Personal & Job Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. البيانات الشخصية */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5">
                  <h4 className="font-bold text-[#9E1A24] text-xs pb-1.5 border-b border-stone-200">
                    1. البيانات الشخصية
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-500 block">تاريخ الميلاد:</span>
                      <span className="font-semibold">{applicant.birth_date || '—'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">الحالة الاجتماعية:</span>
                      <span className="font-semibold">{applicant.marital_status}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">الموقف من التجنيد:</span>
                      <span className="font-semibold">{applicant.military_status}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">هاتف الطوارئ:</span>
                      <span className="font-mono font-semibold">{applicant.emergency_phone || '—'} ({applicant.emergency_contact_name || 'طوارئ'})</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-stone-500 block">محل الإقامة:</span>
                      <span className="font-semibold">{applicant.address || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. الوظيفة المطلوبة */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5">
                  <h4 className="font-bold text-[#9E1A24] text-xs pb-1.5 border-b border-stone-200">
                    2. الوظيفة والخبرات
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-500 block">الوظيفة المتقدم إليها:</span>
                      <span className="font-bold text-[#9E1A24]">{applicant.position_name}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">الفرع المراد العمل به:</span>
                      <span className="font-bold">{applicant.branch_name}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">سنوات الخبرة:</span>
                      <span className="font-semibold">{applicant.experience_years} سنة</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">خبرة مطاعم سابقة:</span>
                      <span className="font-semibold">{applicant.restaurant_experience ? 'نعم' : 'لا'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">آخر وظيفة:</span>
                      <span className="font-semibold">{applicant.last_job || '—'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">سبب ترك العمل:</span>
                      <span className="font-semibold">{applicant.leaving_reason || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Education & Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 3. المؤهل الدراسي */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5">
                  <h4 className="font-bold text-[#9E1A24] text-xs pb-1.5 border-b border-stone-200">
                    3. المؤهل الدراسي
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-500 block">المؤهل:</span>
                      <span className="font-semibold">{applicant.qualification || '—'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">التخصص:</span>
                      <span className="font-semibold">{applicant.specialization || '—'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">سنة التخرج:</span>
                      <span className="font-semibold font-mono">{applicant.graduation_year || '—'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">ما زال يدرس:</span>
                      <span className="font-semibold">{applicant.still_studying ? 'نعم' : 'لا'}</span>
                    </div>
                  </div>
                </div>

                {/* 5. المهارات */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5">
                  <h4 className="font-bold text-[#9E1A24] text-xs pb-1.5 border-b border-stone-200">
                    5. المهارات المسجلة
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(applicant.skills || []).map(skill => (
                      <span key={skill} className="bg-white border border-stone-300 text-stone-800 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs">
                        ✓ {skill}
                      </span>
                    ))}
                    {applicant.custom_skill && (
                      <span className="bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-bold">
                        أخرى: {applicant.custom_skill}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Working Shifts & Declarations */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                <h4 className="font-bold text-[#9E1A24] text-xs pb-1.5 border-b border-stone-200">
                  6. أوقات العمل
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">الورديات:</span>
                    <span className="font-bold">
                      {applicant.shift_morning ? 'صباحية ' : ''}
                      {applicant.shift_night ? 'ليلية' : ''}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">وسيلة مواصلات خاصة:</span>
                    <span className="font-bold">{applicant.can_work_shifts ? 'نعم' : 'لا'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">ساعات إضافية:</span>
                    <span className="font-bold">{applicant.can_work_overtime ? 'موافق' : 'غير موافق'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">أيام العطلات:</span>
                    <span className="font-bold">{applicant.can_work_holidays ? 'موافق' : 'غير موافق'}</span>
                  </div>
                </div>
              </div>

              {/* 9. إقرار المتقدم والعهدة */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                <h4 className="font-bold text-[#9E1A24] text-xs pb-1.5 border-b border-stone-200">
                  9. إقرار المتقدم والعهدة
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">حالة الإقرار:</span>
                    <span className={`font-bold ${applicant.declaration_accepted ? 'text-emerald-700' : 'text-red-700'}`}>
                      {applicant.declaration_accepted ? '✓ تم الإقرار والموافقة' : '✗ لم يوافق'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">اسم الموقّع:</span>
                    <span className="font-bold">{applicant.applicant_signature_name || applicant.full_name || '—'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">تاريخ الإقرار:</span>
                    <span className="font-bold font-mono">{applicant.declaration_date || '—'}</span>
                  </div>
                </div>
              </div>

              {/* HR Decision Preview */}
              {applicant.hr_decision && (
                <div className="bg-red-50/40 p-4 rounded-2xl border border-red-200 space-y-2">
                  <h4 className="font-bold text-[#9E1A24] text-xs pb-1.5 border-b border-red-200 flex items-center justify-between">
                    <span>بيانات إدارة BOB WICH وقرار التوظيف</span>
                    <span className="font-bold text-stone-800">
                      القرار: <strong className="text-[#9E1A24]">{applicant.hr_decision.hiring_decision || applicant.status}</strong>
                    </span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-stone-500 block">الراتب المقترح:</span>
                      <span className="font-bold font-mono text-emerald-800">
                        {applicant.hr_decision.proposed_salary ? `${applicant.hr_decision.proposed_salary} ج.م` : 'غير محدد'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">تاريخ مباشرة العمل:</span>
                      <span className="font-semibold font-mono">{applicant.hr_decision.joining_date || '—'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">المسؤول:</span>
                      <span className="font-semibold">{applicant.hr_decision.recruiter_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">تاريخ استلام الطلب:</span>
                      <span className="font-semibold font-mono">{applicant.hr_decision.application_date || applicant.created_at.split('T')[0]}</span>
                    </div>
                  </div>
                  {applicant.hr_decision.hr_notes && (
                    <div className="text-xs bg-white p-2.5 rounded-xl border border-red-100 mt-2">
                      <span className="font-bold text-stone-700 block mb-0.5">ملاحظات الإدارة:</span>
                      <p className="text-stone-800">{applicant.hr_decision.hr_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: INTERVIEWS */}
          {activeTab === 'interviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-sm">سجل المقابلات الشخصية</h4>
              </div>

              {!applicant.interviews || applicant.interviews.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500 text-xs">
                  لم يتم تسجيل مقابلات بعد للمتقدم
                </div>
              ) : (
                <div className="space-y-3">
                  {applicant.interviews.map((int, i) => (
                    <div key={int.id || i} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs bg-[#9E1A24] text-white px-2.5 py-0.5 rounded-lg">
                          المقابلة رقم {int.interview_number || i + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <SvgIcons.Star key={star} className="w-4 h-4" filled={star <= int.evaluation} />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-stone-500 block">التاريخ:</span>
                          <span className="font-mono font-semibold">{int.interview_date}</span>
                        </div>
                        <div>
                          <span className="text-stone-500 block">المسؤول:</span>
                          <span className="font-semibold">{int.interviewer_name}</span>
                        </div>
                        <div>
                          <span className="text-stone-500 block">النتيجة:</span>
                          <span className="font-bold text-[#9E1A24]">{int.status}</span>
                        </div>
                      </div>
                      {int.notes && (
                        <div className="bg-white p-2.5 rounded-xl text-xs text-stone-700 border border-stone-200">
                          {int.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ASSETS */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-sm">العهدة المستلمة</h4>
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
                  إجمالي القطع: {applicant.assets?.reduce((s, a) => s + (Number(a.quantity) || 1), 0) || 0}
                </span>
              </div>

              {!applicant.assets || applicant.assets.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500 text-xs">
                  لا توجد عهد مسجلة
                </div>
              ) : (
                <div className="border border-stone-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-stone-100 font-bold text-stone-700">
                      <tr>
                        <th className="p-2 border-l border-stone-200 w-12">م</th>
                        <th className="p-2 border-l border-stone-200 text-right">بيان العهدة</th>
                        <th className="p-2 border-l border-stone-200 w-20">العدد</th>
                        <th className="p-2 border-l border-stone-200 w-36">الحالة عند الاستلام</th>
                        <th className="p-2">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {applicant.assets.map((ast, i) => (
                        <tr key={ast.id || i} className="bg-white">
                          <td className="p-2 border-l border-stone-200 font-mono">{i + 1}</td>
                          <td className="p-2 border-l border-stone-200 text-right font-semibold">{ast.asset_name}</td>
                          <td className="p-2 border-l border-stone-200 font-mono font-bold">{ast.quantity}</td>
                          <td className="p-2 border-l border-stone-200">{ast.condition}</td>
                          <td className="p-2 text-stone-600">{ast.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-sm">المرفقات والوثائق الرسمية</h4>
              </div>

              {!applicant.documents || applicant.documents.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500 text-xs">
                  لا توجد مرفقات مرفوعة
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {applicant.documents.map((doc, idx) => (
                    <div key={doc.id || idx} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SvgIcons.FileText className="w-6 h-6 text-[#9E1A24]" />
                        <div>
                          <div className="font-bold text-stone-900 text-xs">{doc.file_name}</div>
                          <div className="text-[11px] text-stone-500">
                            {doc.document_type} • {doc.file_size}
                          </div>
                        </div>
                      </div>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs"
                        >
                          <SvgIcons.Eye className="w-3.5 h-3.5" />
                          <span>عرض</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 flex items-center justify-between text-xs text-stone-500">
          <div>
            تاريخ التقديم: <span className="font-mono text-stone-800">{new Date(applicant.created_at).toLocaleString('ar-EG')}</span>
          </div>
          <button
            onClick={onClose}
            className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-5 py-2 rounded-xl font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Convert to Employee Modal Dialog */}
      {showConvertDialog && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-right dir-rtl shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <SvgIcons.UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-stone-900">تحويل إلى موظف رسمي</h4>
                <p className="text-xs text-stone-500">سيتم إنشاء كود موظف جديد ونقل بيانات التعيين</p>
              </div>
            </div>

            {convertError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl font-bold border border-red-200">
                {convertError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">اسم الموظف:</label>
                <div className="p-2.5 bg-stone-100 rounded-xl font-bold text-stone-900">{applicant.full_name}</div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">تاريخ مباشرة العمل:</label>
                <input
                  type="date"
                  value={convertForm.hire_date}
                  onChange={e => setConvertForm(prev => ({ ...prev, hire_date: e.target.value }))}
                  className="w-full bg-stone-50 rounded-xl p-2.5 border border-stone-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">الراتب الشهري (ج.م):</label>
                <input
                  type="number"
                  value={convertForm.salary}
                  onChange={e => setConvertForm(prev => ({ ...prev, salary: e.target.value }))}
                  className="w-full bg-stone-50 rounded-xl p-2.5 border border-stone-300 font-mono font-bold text-emerald-800 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">الفرع المعين به:</label>
                <input
                  type="text"
                  value={convertForm.branch_name}
                  onChange={e => setConvertForm(prev => ({ ...prev, branch_name: e.target.value }))}
                  className="w-full bg-stone-50 rounded-xl p-2.5 border border-stone-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">المسمى الوظيفي:</label>
                <input
                  type="text"
                  value={convertForm.position_name}
                  onChange={e => setConvertForm(prev => ({ ...prev, position_name: e.target.value }))}
                  className="w-full bg-stone-50 rounded-xl p-2.5 border border-stone-300 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowConvertDialog(false)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConvertToEmployee}
                disabled={isConverting}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isConverting ? 'جاري التحويل...' : 'تأكيد التعيين والتحويل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};