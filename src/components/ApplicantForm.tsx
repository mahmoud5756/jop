import React, { useState, useEffect } from 'react';
import {
  Applicant,
  ApplicantExperience,
  ApplicantAsset,
  ApplicantDocument,
  Interview,
  HRDecision,
  Branch,
  JobPosition,
  CurrentUser
} from '../types';
import { ApiService } from '../services/api';
import { SvgIcons } from './BobWichLogo';
import { uploadFileDirectToStorage } from '../utils/imageCompression';

interface ApplicantFormProps {
  initialData?: Applicant | null;
  currentUser: CurrentUser;
  onSaveSuccess: (applicant: Applicant) => void;
  onCancel: () => void;
}

export const ApplicantForm: React.FC<ApplicantFormProps> = ({
  initialData,
  currentUser,
  onSaveSuccess,
  onCancel,
}) => {
  const isEditing = Boolean(initialData?.id);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [nationalIdDuplicateWarning, setNationalIdDuplicateWarning] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Applicant>>({
    full_name: initialData?.full_name || '',
    national_id: initialData?.national_id || '',
    phone: initialData?.phone || '',
    birth_date: initialData?.birth_date || '',
    emergency_phone: initialData?.emergency_phone || '',
    emergency_contact_name: initialData?.emergency_contact_name || '',
    address: initialData?.address || '',
    marital_status: initialData?.marital_status || 'أعزب',
    military_status: initialData?.military_status || 'أدى الخدمة',
    photo_url: initialData?.photo_url || '',

    branch_id: initialData?.branch_id || '',
    branch_name: initialData?.branch_name || '',
    position_id: initialData?.position_id || '',
    position_name: initialData?.position_name || '',
    experience_years: initialData?.experience_years ?? 1,
    restaurant_experience: initialData?.restaurant_experience ?? true,
    last_job: initialData?.last_job || '',
    leaving_reason: initialData?.leaving_reason || '',

    qualification: initialData?.qualification || 'مؤهل عالي',
    specialization: initialData?.specialization || '',
    graduation_year: initialData?.graduation_year || '',
    still_studying: initialData?.still_studying ?? false,

    shift_morning: initialData?.shift_morning ?? true,
    shift_night: initialData?.shift_night ?? true,
    can_work_shifts: initialData?.can_work_shifts ?? true,
    can_work_overtime: initialData?.can_work_overtime ?? true,
    can_work_holidays: initialData?.can_work_holidays ?? true,

    skills: initialData?.skills || ['خدمة العملاء', 'العمل ضمن فريق'],
    custom_skill: initialData?.custom_skill || '',

    declaration_accepted: initialData?.declaration_accepted ?? true,
    applicant_signature_name: initialData?.applicant_signature_name || initialData?.full_name || '',
    declaration_date: initialData?.declaration_date || new Date().toISOString().split('T')[0],

    status: initialData?.status || 'طلب جديد',
  });

  const [experiences, setExperiences] = useState<ApplicantExperience[]>(
    initialData?.experiences && initialData.experiences.length > 0
      ? initialData.experiences
      : [
          {
            id: 'exp_1',
            applicant_id: initialData?.id || '',
            workplace: '',
            position: '',
            date_from: '',
            date_to: '',
            leaving_reason: '',
          },
        ]
  );

  const [assets, setAssets] = useState<ApplicantAsset[]>(
    initialData?.assets && initialData.assets.length > 0
      ? initialData.assets
      : [
          {
            id: 'ast_1',
            applicant_id: initialData?.id || '',
            item_number: 1,
            asset_name: 'يونيفورم BOB WICH (قميص + مريلة)',
            quantity: 2,
            condition: 'جديد',
            notes: 'تم التسليم عند التعيين',
          },
          {
            id: 'ast_2',
            applicant_id: initialData?.id || '',
            item_number: 2,
            asset_name: 'كاب BOB WICH الرسمي',
            quantity: 1,
            condition: 'جديد',
            notes: 'سليم',
          },
          {
            id: 'ast_3',
            applicant_id: initialData?.id || '',
            item_number: 3,
            asset_name: 'كارت تعريف ومغناطيس اسم (Name Tag)',
            quantity: 1,
            condition: 'جديد',
            notes: 'سليم',
          },
        ]
  );

  const [documents, setDocuments] = useState<ApplicantDocument[]>(initialData?.documents || []);

  const [hrDecision, setHrDecision] = useState<HRDecision>(
    initialData?.hr_decision || {
      applicant_id: initialData?.id || '',
      proposed_position: initialData?.position_name || '',
      proposed_salary: '',
      branch_name: initialData?.branch_name || '',
      application_date: initialData?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      first_interview_status: 'مقبول',
      second_interview_status: 'حضر',
      joining_date: '',
      hr_notes: '',
      recruiter_name: currentUser.name,
      hiring_decision: 'قبول',
    }
  );

  const [interviews, setInterviews] = useState<Interview[]>(
    initialData?.interviews && initialData.interviews.length > 0
      ? initialData.interviews
      : [
          {
            id: 'int_1',
            applicant_id: initialData?.id || '',
            interview_number: 1,
            interview_date: new Date().toISOString().split('T')[0],
            interviewer_name: currentUser.name,
            status: 'مقبول',
            evaluation: 5,
            notes: 'مظهر ممتاز ولباقة وخبرة سابقة في مطاعم الوجبات السريعة',
            created_at: new Date().toISOString(),
          },
        ]
  );

  // Load master branches & positions
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [branchList, posList] = await Promise.all([
          ApiService.getBranches(),
          ApiService.getPositions(),
        ]);
        setBranches(branchList);
        setPositions(posList);

        if (!formData.branch_name && branchList.length > 0) {
          setFormData(prev => ({
            ...prev,
            branch_id: branchList[0].id,
            branch_name: branchList[0].name,
          }));
        }
        if (!formData.position_name && posList.length > 0) {
          setFormData(prev => ({
            ...prev,
            position_id: posList[0].id,
            position_name: posList[0].title,
          }));
        }
      } catch (err) {
        console.error('Error loading master data:', err);
      }
    }
    loadMasterData();
  }, []);

  // Real-time National ID duplicate verification
  useEffect(() => {
    const id = formData.national_id?.trim();
    if (!id || id.length !== 14) {
      setNationalIdDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const check = await ApiService.checkNationalId(id, initialData?.id);
        if (check.exists && check.applicant) {
          setNationalIdDuplicateWarning(
            `تنبيه: الرقم القومي مسجل مسبقًا باسم "${check.applicant.full_name}" بكود (${check.applicant.application_code})`
          );
        } else {
          setNationalIdDuplicateWarning(null);
        }
      } catch (err) {
        console.error(err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.national_id, initialData?.id]);

  // Handle Photo upload — uploads directly to Supabase Storage from the
  // browser (bypassing our own serverless function's ~4.5MB request-body
  // limit on Vercel entirely) and stores only the resulting short public
  // URL, instead of embedding the full file as base64 in the applicant JSON.
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('حجم الصورة يجب ألا يتعدى 8 ميجابايت');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const publicUrl = await uploadFileDirectToStorage(file, {
        isImage: true,
        maxDimension: 1000,
        quality: 0.75,
      });
      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
    } catch (err: any) {
      alert(err.message || 'فشل رفع الصورة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Add Document — same direct-to-storage approach as the photo above.
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الملف يجب ألا يتعدى 5 ميجابايت');
      return;
    }

    setUploadingDocType(docType);
    try {
      const isImage = file.type !== 'application/pdf';
      const publicUrl = await uploadFileDirectToStorage(file, {
        isImage,
        maxDimension: 1400,
        quality: 0.75,
      });

      const newDoc: ApplicantDocument = {
        id: 'doc_' + Date.now(),
        applicant_id: initialData?.id || '',
        document_type: docType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: (file.size / 1024).toFixed(1) + ' KB',
        uploaded_by: currentUser.name,
        uploaded_at: new Date().toISOString(),
      };
      setDocuments(prev => [...prev, newDoc]);
    } catch (err: any) {
      alert(err.message || 'فشل رفع الملف، يرجى المحاولة مرة أخرى');
    } finally {
      setUploadingDocType(null);
    }
  };

  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  // Skills toggle
  const availableSkills = [
    'المطبخ',
    'تجهيز الطعام',
    'الكاشير',
    'خدمة العملاء',
    'إدارة المخزون',
    'النظافة',
    'العمل تحت ضغط',
    'العمل ضمن فريق',
    'استخدام الكمبيوتر',
  ];

  const toggleSkill = (skill: string) => {
    const currentSkills = formData.skills || [];
    if (currentSkills.includes(skill)) {
      setFormData(prev => ({ ...prev, skills: currentSkills.filter(s => s !== skill) }));
    } else {
      setFormData(prev => ({ ...prev, skills: [...currentSkills, skill] }));
    }
  };

  // Experience row helpers
  const addExperienceRow = () => {
    setExperiences(prev => [
      ...prev,
      {
        id: 'exp_' + Date.now(),
        applicant_id: initialData?.id || '',
        workplace: '',
        position: '',
        date_from: '',
        date_to: '',
        leaving_reason: '',
      },
    ]);
  };

  const updateExperienceRow = (index: number, field: keyof ApplicantExperience, value: string) => {
    setExperiences(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const deleteExperienceRow = (index: number) => {
    setExperiences(prev => prev.filter((_, i) => i !== index));
  };

  // Assets row helpers
  const addAssetRow = () => {
    setAssets(prev => [
      ...prev,
      {
        id: 'ast_' + Date.now(),
        applicant_id: initialData?.id || '',
        item_number: prev.length + 1,
        asset_name: '',
        quantity: 1,
        condition: 'سليم ومستعمل',
        notes: '',
      },
    ]);
  };

  const updateAssetRow = (index: number, field: keyof ApplicantAsset, value: any) => {
    setAssets(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const deleteAssetRow = (index: number) => {
    setAssets(prev => prev.filter((_, i) => i !== index));
  };

  // Interviews helper
  const addInterviewRow = () => {
    setInterviews(prev => [
      ...prev,
      {
        id: 'int_' + Date.now(),
        applicant_id: initialData?.id || '',
        interview_number: (prev.length + 1) as any,
        interview_date: new Date().toISOString().split('T')[0],
        interviewer_name: currentUser.name,
        status: 'مقبول',
        evaluation: 5,
        notes: '',
        created_at: new Date().toISOString(),
      },
    ]);
  };

  // Main Submit Form
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!formData.full_name?.trim()) {
      setErrorMessage('يرجى إدخال الاسم بالكامل');
      setActiveTab(1);
      return;
    }
    const nid = formData.national_id?.trim() || '';
    if (!nid || nid.length !== 14 || !/^\d{14}$/.test(nid)) {
      setErrorMessage('الرقم القومي يجب أن يتكون من 14 رقمًا صحيحًا');
      setActiveTab(1);
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMessage('يرجى إدخال رقم الهاتف للتواصل');
      setActiveTab(1);
      return;
    }

    if (nationalIdDuplicateWarning && !isEditing) {
      setErrorMessage(nationalIdDuplicateWarning);
      setActiveTab(1);
      return;
    }

    setIsSaving(true);

    try {
      const payload: Partial<Applicant> = {
        ...formData,
        experiences: experiences.filter(exp => exp.workplace || exp.position),
        assets: assets.filter(a => a.asset_name),
        documents,
        interviews,
        hr_decision: {
          ...hrDecision,
          proposed_position: hrDecision.proposed_position || formData.position_name || '',
          branch_name: hrDecision.branch_name || formData.branch_name || '',
        },
      };

      let result: Applicant;
      if (isEditing && initialData?.id) {
        result = await ApiService.updateApplicant(initialData.id, payload, currentUser);
        setSuccessToast('تم تحديث بيانات طلب التوظيف بنجاح');
      } else {
        result = await ApiService.createApplicant(payload, currentUser);
        setSuccessToast('تم حفظ طلب التوظيف الجديد بنجاح');
      }

      setTimeout(() => {
        onSaveSuccess(result);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ البيانات');
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 1, label: '1. البيانات الشخصية', icon: '👤' },
    { id: 2, label: '2. الوظيفة المطلوبة', icon: '💼' },
    { id: 3, label: '3. التعليم والمهارات', icon: '🎓' },
    { id: 4, label: '4. الخبرات السابقة', icon: '📋' },
    { id: 5, label: '5. أوقات العمل والمرفقات', icon: '📎' },
    { id: 6, label: '6. إقرار المتقدم والعهدة', icon: '⚖️' },
    ...(currentUser.role === 'admin' || currentUser.role === 'hr' || currentUser.role === 'manager'
      ? [{ id: 7, label: '7. إدارة HR والمقابلات والقرار', icon: '⭐' }]
      : []),
  ];

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      {/* Top Breadcrumb & Status bar */}
      <div className="bg-white border-b border-stone-200 py-4 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span className="cursor-pointer hover:text-stone-800" onClick={onCancel}>
                المتقدمون
              </span>
              <span>/</span>
              <span className="text-[#9E1A24] font-bold">
                {isEditing ? `تعديل طلب (${initialData?.application_code})` : 'استمارة طلب توظيف جديدة'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2">
              <span>{isEditing ? `تعديل بيانات: ${initialData?.full_name}` : 'استمارة طلب توظيف – BOB WICH'}</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري الحفظ في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <SvgIcons.Check className="w-4 h-4" />
                  <span>{isEditing ? 'حفظ التعديلات' : 'حفظ طلب التوظيف'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border-r-4 border-red-600 p-4 rounded-xl text-red-800 flex items-center justify-between text-sm shadow-xs animate-shake">
            <div className="flex items-center gap-2 font-bold">
              <SvgIcons.AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="mb-6 bg-emerald-50 border-r-4 border-emerald-600 p-4 rounded-xl text-emerald-800 flex items-center gap-2 text-sm font-bold shadow-xs">
            <SvgIcons.Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Stepper Tabs Bar */}
        <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-xs mb-6 overflow-x-auto flex gap-1 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-40 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#9E1A24] text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Box */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 sm:p-8">
          {/* TAB 1: البيانات الشخصية */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                  <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                  <span>1. البيانات الشخصية</span>
                </h3>
                <span className="text-xs text-stone-500 font-medium">كل الحقول مطلوبة لدقة الملف</span>
              </div>

              {/* Photo Upload & Preview 4x6 */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <div className="w-28 h-36 border-2 border-dashed border-[#9E1A24] rounded-xl bg-white flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                  {formData.photo_url ? (
                    <img
                      src={formData.photo_url}
                      alt="صورة المتقدم"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-2 text-stone-400">
                      <SvgIcons.Upload className="w-6 h-6 mx-auto mb-1 text-stone-400" />
                      <span className="text-[11px] font-bold block text-stone-500">صورة شخصية 4×6</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-right">
                  <label className="text-sm font-bold text-stone-800 block">رفع الصورة الشخصية للمتقدم</label>
                  <p className="text-xs text-stone-500">
                    يفضل صورة حديثة بخلفية بيضاء (4×6 سم) بصيغة JPG أو PNG.
                  </p>
                  <label className={`inline-flex items-center gap-2 border px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs ${isUploadingPhoto ? 'bg-stone-100 text-stone-400 border-stone-300 cursor-wait' : 'bg-white hover:bg-stone-100 text-[#9E1A24] border-[#9E1A24] cursor-pointer'}`}>
                    <SvgIcons.Upload className="w-4 h-4" />
                    <span>{isUploadingPhoto ? 'جاري رفع الصورة...' : 'اختر صورة من الجهاز'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={isUploadingPhoto} className="hidden" />
                  </label>
                  {formData.photo_url && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                      className="text-xs text-red-600 hover:underline mr-3 font-semibold"
                    >
                      حذف الصورة
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    الاسم بالكامل <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="الاسم رباعي كما في بطاقة الرقم القومي"
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    رقم الهاتف للتواصل <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="مثال: 01012345678"
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm font-mono"
                  />
                </div>

                {/* National ID (14 digits) */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    الرقم القومي (14 رقم) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={formData.national_id}
                    onChange={e => setFormData(prev => ({ ...prev, national_id: e.target.value.replace(/\D/g, '') }))}
                    placeholder="الرقم القومي المكون من 14 رقم"
                    className={`w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border text-sm font-mono font-bold focus:outline-none focus:ring-2 ${
                      nationalIdDuplicateWarning
                        ? 'border-red-500 focus:ring-red-500 bg-red-50/50'
                        : 'border-stone-300 focus:ring-[#9E1A24]'
                    }`}
                  />
                  {nationalIdDuplicateWarning && (
                    <p className="text-xs text-red-600 mt-1 font-bold flex items-center gap-1">
                      <SvgIcons.AlertCircle className="w-3.5 h-3.5" />
                      <span>{nationalIdDuplicateWarning}</span>
                    </p>
                  )}
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={e => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                  />
                </div>

                {/* Emergency Phone */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">رقم هاتف طوارئ</label>
                  <input
                    type="tel"
                    value={formData.emergency_phone}
                    onChange={e => setFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                    placeholder="رقم هاتف للطوارئ"
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm font-mono"
                  />
                </div>

                {/* Emergency Contact Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">صاحب رقم هاتف الطوارئ</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={e => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                    placeholder="مثال: الوالد / الأخ / الزوجة"
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">محل الإقامة بالتفصيل</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="المحافظة - المنطقة - الشارع - رقم العقار"
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                  />
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">الحالة الاجتماعية</label>
                  <div className="flex items-center gap-4">
                    {(['أعزب', 'متزوج', 'مطلق', 'أرمل'] as const).map(item => (
                      <label
                        key={item}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          formData.marital_status === item
                            ? 'bg-red-50 border-[#9E1A24] text-[#9E1A24]'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="marital_status"
                          value={item}
                          checked={formData.marital_status === item}
                          onChange={() => setFormData(prev => ({ ...prev, marital_status: item }))}
                          className="text-[#9E1A24] focus:ring-[#9E1A24]"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Military Status */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">الموقف من التجنيد</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['أدى الخدمة', 'إعفاء نهائي', 'إعفاء مؤقت', 'تأجيل', 'غير مطلوب (إناث)'] as const).map(item => (
                      <label
                        key={item}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          formData.military_status === item
                            ? 'bg-red-50 border-[#9E1A24] text-[#9E1A24]'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="military_status"
                          value={item}
                          checked={formData.military_status === item}
                          onChange={() => setFormData(prev => ({ ...prev, military_status: item }))}
                          className="text-[#9E1A24] focus:ring-[#9E1A24]"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveTab(2)}
                  className="bg-[#9E1A24] text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#85151e]"
                >
                  <span>التالي: الوظيفة المطلوبة</span>
                  <SvgIcons.ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: الوظيفة المطلوبة */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                  <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                  <span>2. الوظيفة المطلوبة</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Branch Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    الفرع المراد العمل به <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.branch_name}
                    onChange={e => {
                      const sel = branches.find(b => b.name === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        branch_name: e.target.value,
                        branch_id: sel?.id || '',
                      }));
                    }}
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm font-semibold text-stone-800"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Position Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    الوظيفة المتقدم إليها <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.position_name}
                    onChange={e => {
                      const sel = positions.find(p => p.title === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        position_name: e.target.value,
                        position_id: sel?.id || '',
                      }));
                    }}
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm font-semibold text-stone-800"
                  >
                    {positions.map(p => (
                      <option key={p.id} value={p.title}>
                        {p.title} ({p.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience Years */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">عدد سنوات الخبرة</label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={formData.experience_years}
                    onChange={e => setFormData(prev => ({ ...prev, experience_years: e.target.value }))}
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                  />
                </div>

                {/* Restaurant Experience Yes/No */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">هل لديك خبرة سابقة في المطاعم؟</label>
                  <div className="flex gap-4 mt-2">
                    <label
                      className={`flex-1 py-2 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        formData.restaurant_experience
                          ? 'bg-red-50 border-[#9E1A24] text-[#9E1A24]'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restaurant_exp"
                        checked={formData.restaurant_experience === true}
                        onChange={() => setFormData(prev => ({ ...prev, restaurant_experience: true }))}
                        className="text-[#9E1A24]"
                      />
                      <span>نعم</span>
                    </label>
                    <label
                      className={`flex-1 py-2 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        formData.restaurant_experience === false
                          ? 'bg-red-50 border-[#9E1A24] text-[#9E1A24]'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restaurant_exp"
                        checked={formData.restaurant_experience === false}
                        onChange={() => setFormData(prev => ({ ...prev, restaurant_experience: false }))}
                        className="text-[#9E1A24]"
                      />
                      <span>لا</span>
                    </label>
                  </div>
                </div>

                {/* Last Job */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">آخر وظيفة عملت بها</label>
                  <input
                    type="text"
                    value={formData.last_job}
                    onChange={e => setFormData(prev => ({ ...prev, last_job: e.target.value }))}
                    placeholder="المسمى الوظيفي في آخر مكان عمل"
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                  />
                </div>

                {/* Leaving Reason */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">سبب ترك العمل السابق</label>
                  <input
                    type="text"
                    value={formData.leaving_reason}
                    onChange={e => setFormData(prev => ({ ...prev, leaving_reason: e.target.value }))}
                    placeholder="سبب انتهاء العمل السابق"
                    className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveTab(1)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <SvgIcons.ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(3)}
                  className="bg-[#9E1A24] text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#85151e]"
                >
                  <span>التالي: التعليم والمهارات</span>
                  <SvgIcons.ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: التعليم والمهارات */}
          {activeTab === 3 && (
            <div className="space-y-8">
              {/* Section 3: المؤهل الدراسي */}
              <div>
                <div className="border-b border-stone-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                    <span>3. المؤهل الدراسي</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">المؤهل</label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={e => setFormData(prev => ({ ...prev, qualification: e.target.value }))}
                      placeholder="مثال: بكالوريوس تجارة / دبلوم سياحة وفنادق / ثانوية عامة"
                      className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">التخصص</label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={e => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                      placeholder="مجال التخصص الدراسي"
                      className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">سنة التخرج</label>
                    <input
                      type="text"
                      value={formData.graduation_year}
                      onChange={e => setFormData(prev => ({ ...prev, graduation_year: e.target.value }))}
                      placeholder="مثال: 2024"
                      className="w-full bg-stone-50 rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">هل ما زلت تدرس؟</label>
                    <div className="flex gap-4 mt-2">
                      <label
                        className={`flex-1 py-2 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                          formData.still_studying ? 'bg-red-50 border-[#9E1A24] text-[#9E1A24]' : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="still_studying"
                          checked={formData.still_studying === true}
                          onChange={() => setFormData(prev => ({ ...prev, still_studying: true }))}
                          className="text-[#9E1A24]"
                        />
                        <span>نعم</span>
                      </label>
                      <label
                        className={`flex-1 py-2 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                          formData.still_studying === false ? 'bg-red-50 border-[#9E1A24] text-[#9E1A24]' : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="still_studying"
                          checked={formData.still_studying === false}
                          onChange={() => setFormData(prev => ({ ...prev, still_studying: false }))}
                          className="text-[#9E1A24]"
                        />
                        <span>لا</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: المهارات */}
              <div>
                <div className="border-b border-stone-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                    <span>5. المهارات</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">حدد المهارات التي يجيدها المتقدم (مطابقة لاستمارة BOB WICH الأصلية)</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableSkills.map(skill => {
                    const checked = (formData.skills || []).includes(skill);
                    return (
                      <div
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          checked
                            ? 'bg-red-50/80 border-[#9E1A24] text-[#9E1A24] font-bold shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-xs border flex items-center justify-center text-xs ${
                            checked ? 'bg-[#9E1A24] text-white border-[#9E1A24]' : 'border-stone-400 bg-white'
                          }`}
                        >
                          {checked ? '✓' : ''}
                        </div>
                        <span className="text-xs sm:text-sm">{skill}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom skill */}
                <div className="mt-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">مهارات أخرى إضافية:</label>
                  <input
                    type="text"
                    value={formData.custom_skill}
                    onChange={e => setFormData(prev => ({ ...prev, custom_skill: e.target.value }))}
                    placeholder="أدخل أي مهارات أخرى (مثل: لغات، مهارات بيع، خبرة POS معينة...)"
                    className="w-full bg-white rounded-xl px-3.5 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveTab(2)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <SvgIcons.ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(4)}
                  className="bg-[#9E1A24] text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#85151e]"
                >
                  <span>التالي: الخبرات السابقة</span>
                  <SvgIcons.ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: الخبرات السابقة */}
          {activeTab === 4 && (
            <div className="space-y-6">
              <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                    <span>4. الخبرات السابقة</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">جدول ديناميكي لإضافة وتعديل سجل الخبرات السابقة</p>
                </div>
                <button
                  type="button"
                  onClick={addExperienceRow}
                  className="bg-red-50 hover:bg-red-100 text-[#9E1A24] border border-[#9E1A24] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <SvgIcons.Plus className="w-4 h-4" />
                  <span>+ إضافة خبرة</span>
                </button>
              </div>

              {experiences.length === 0 ? (
                <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                  <p className="text-sm font-semibold">لا توجد خبرات سابقة مضافة</p>
                  <button
                    type="button"
                    onClick={addExperienceRow}
                    className="mt-2 text-xs font-bold text-[#9E1A24] hover:underline"
                  >
                    اضغط هنا لإضافة خبرة سابقة
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {experiences.map((exp, idx) => (
                    <div
                      key={exp.id || idx}
                      className="bg-stone-50 p-4 rounded-2xl border border-stone-200 relative space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                        <span className="bg-[#9E1A24] text-white px-2 py-0.5 rounded text-[11px]">
                          الخبرة رقم {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteExperienceRow(idx)}
                          className="text-red-600 hover:text-red-800 text-xs font-bold flex items-center gap-1"
                        >
                          <SvgIcons.Trash className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                        <div className="lg:col-span-2">
                          <label className="block font-bold text-stone-700 mb-1">مكان العمل / الشركة</label>
                          <input
                            type="text"
                            value={exp.workplace}
                            onChange={e => updateExperienceRow(idx, 'workplace', e.target.value)}
                            placeholder="اسم المطعم أو الشركة"
                            className="w-full bg-white rounded-lg p-2 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#9E1A24]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-stone-700 mb-1">الوظيفة</label>
                          <input
                            type="text"
                            value={exp.position}
                            onChange={e => updateExperienceRow(idx, 'position', e.target.value)}
                            placeholder="المسمى الوظيفي"
                            className="w-full bg-white rounded-lg p-2 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#9E1A24]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-stone-700 mb-1">من (سنة/شهر)</label>
                          <input
                            type="text"
                            value={exp.date_from}
                            onChange={e => updateExperienceRow(idx, 'date_from', e.target.value)}
                            placeholder="مثال: 2022"
                            className="w-full bg-white rounded-lg p-2 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#9E1A24] font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-stone-700 mb-1">إلى (سنة/شهر)</label>
                          <input
                            type="text"
                            value={exp.date_to}
                            onChange={e => updateExperienceRow(idx, 'date_to', e.target.value)}
                            placeholder="مثال: 2024 أو حتى الآن"
                            className="w-full bg-white rounded-lg p-2 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#9E1A24] font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-5">
                          <label className="block font-bold text-stone-700 mb-1">سبب ترك العمل</label>
                          <input
                            type="text"
                            value={exp.leaving_reason}
                            onChange={e => updateExperienceRow(idx, 'leaving_reason', e.target.value)}
                            placeholder="سبب انتهاء العمل"
                            className="w-full bg-white rounded-lg p-2 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#9E1A24]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveTab(3)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <SvgIcons.ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(5)}
                  className="bg-[#9E1A24] text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#85151e]"
                >
                  <span>التالي: أوقات العمل والمرفقات</span>
                  <SvgIcons.ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: أوقات العمل والمرفقات */}
          {activeTab === 5 && (
            <div className="space-y-8">
              {/* Section 6: أوقات العمل */}
              <div>
                <div className="border-b border-stone-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                    <span>6. أوقات العمل</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50 p-5 rounded-2xl border border-stone-200">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">الورديات المتاحة للعمل بها:</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="checkbox"
                          checked={formData.shift_morning}
                          onChange={e => setFormData(prev => ({ ...prev, shift_morning: e.target.checked }))}
                          className="w-4 h-4 text-[#9E1A24] rounded focus:ring-[#9E1A24]"
                        />
                        <span>صباحية</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="checkbox"
                          checked={formData.shift_night}
                          onChange={e => setFormData(prev => ({ ...prev, shift_night: e.target.checked }))}
                          className="w-4 h-4 text-[#9E1A24] rounded focus:ring-[#9E1A24]"
                        />
                        <span>ليلية</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">هل يمتلك وسيلة مواصلات خاصة (موتوسيكل/عربية)؟</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="radio"
                          name="has_transport"
                          checked={formData.can_work_shifts === true}
                          onChange={() => setFormData(prev => ({ ...prev, can_work_shifts: true }))}
                          className="text-[#9E1A24]"
                        />
                        <span>نعم</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="radio"
                          name="has_transport"
                          checked={formData.can_work_shifts === false}
                          onChange={() => setFormData(prev => ({ ...prev, can_work_shifts: false }))}
                          className="text-[#9E1A24]"
                        />
                        <span>لا</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
                      هل تستطيع العمل لساعات إضافية عند الحاجة؟
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="radio"
                          name="can_overtime"
                          checked={formData.can_work_overtime === true}
                          onChange={() => setFormData(prev => ({ ...prev, can_work_overtime: true }))}
                          className="text-[#9E1A24]"
                        />
                        <span>نعم</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="radio"
                          name="can_overtime"
                          checked={formData.can_work_overtime === false}
                          onChange={() => setFormData(prev => ({ ...prev, can_work_overtime: false }))}
                          className="text-[#9E1A24]"
                        />
                        <span>لا</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-2">
                      هل تستطيع العمل في أيام العطلات الرسمية؟
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="radio"
                          name="can_holidays"
                          checked={formData.can_work_holidays === true}
                          onChange={() => setFormData(prev => ({ ...prev, can_work_holidays: true }))}
                          className="text-[#9E1A24]"
                        />
                        <span>نعم</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="radio"
                          name="can_holidays"
                          checked={formData.can_work_holidays === false}
                          onChange={() => setFormData(prev => ({ ...prev, can_work_holidays: false }))}
                          className="text-[#9E1A24]"
                        />
                        <span>لا</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 8: المرفقات والمستندات */}
              <div>
                <div className="border-b border-stone-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                    <span>8. المرفقات والمستندات</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    رفع صورة بطاقة الرقم القومي، الشهادة الصحية، والصور الشخصية
                  </p>
                </div>

                {/* Upload Buttons Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {/* National ID Scan */}
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center space-y-2">
                    <div className="font-bold text-xs text-stone-800">بطاقة الرقم القومي</div>
                    <p className="text-[11px] text-stone-500">وجه أو ظهر البطاقة</p>
                    <label className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${uploadingDocType === 'صورة بطاقة الرقم القومي' ? 'bg-stone-100 text-stone-400 border-stone-300 cursor-wait' : 'bg-white hover:bg-stone-100 text-[#9E1A24] border-[#9E1A24] cursor-pointer'}`}>
                      <SvgIcons.Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDocType === 'صورة بطاقة الرقم القومي' ? 'جاري الرفع...' : 'رفع صورة البطاقة'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={e => handleDocumentUpload(e, 'صورة بطاقة الرقم القومي')}
                        disabled={uploadingDocType !== null}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Health Certificate */}
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center space-y-2">
                    <div className="font-bold text-xs text-stone-800">شهادة صحية (سارية)</div>
                    <p className="text-[11px] text-stone-500">خاصة بالعاملين بالمطاعم</p>
                    <label className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${uploadingDocType === 'شهادة صحية' ? 'bg-stone-100 text-stone-400 border-stone-300 cursor-wait' : 'bg-white hover:bg-stone-100 text-[#9E1A24] border-[#9E1A24] cursor-pointer'}`}>
                      <SvgIcons.Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDocType === 'شهادة صحية' ? 'جاري الرفع...' : 'رفع الشهادة الصحية'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={e => handleDocumentUpload(e, 'شهادة صحية')}
                        disabled={uploadingDocType !== null}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Other Attachments */}
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center space-y-2">
                    <div className="font-bold text-xs text-stone-800">مستندات أخرى</div>
                    <p className="text-[11px] text-stone-500">فيش جنائي / مؤهل / سيرة ذاتية</p>
                    <label className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${uploadingDocType === 'أخرى' ? 'bg-stone-100 text-stone-400 border-stone-300 cursor-wait' : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300 cursor-pointer'}`}>
                      <SvgIcons.Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDocType === 'أخرى' ? 'جاري الرفع...' : 'رفع مستند إضافي'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={e => handleDocumentUpload(e, 'أخرى')}
                        disabled={uploadingDocType !== null}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                {documents.length > 0 && (
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700">
                      المستندات المرفوعة ({documents.length})
                    </div>
                    <div className="divide-y divide-stone-100">
                      {documents.map((doc, idx) => (
                        <div key={doc.id || idx} className="p-3 bg-white flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <SvgIcons.Paperclip className="w-4 h-4 text-[#9E1A24]" />
                            <div>
                              <div className="font-bold text-stone-900">{doc.file_name}</div>
                              <div className="text-[11px] text-stone-500">
                                {doc.document_type} • {doc.file_size} • رافع الملف: {doc.uploaded_by}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.file_url && (
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg"
                                title="معاينة"
                              >
                                <SvgIcons.Eye className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => removeDocument(doc.id)}
                              className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg"
                              title="حذف"
                            >
                              <SvgIcons.Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveTab(4)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <SvgIcons.ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(6)}
                  className="bg-[#9E1A24] text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#85151e]"
                >
                  <span>التالي: إقرار المتقدم والعهدة</span>
                  <SvgIcons.ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: إقرار المتقدم والعهدة */}
          {activeTab === 6 && (
            <div className="space-y-6">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                  <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                  <span>9. إقرار المتقدم والعهدة</span>
                </h3>
              </div>

              {/* Exact Declaration Text from Original Form */}
              <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl text-xs text-stone-800 leading-relaxed space-y-2 text-justify">
                <div className="font-bold text-amber-900 mb-1 text-sm">نص الإقرار القانوني الرسمي:</div>
                <p>
                  أقر أنا الموقع أدناه بأن جميع البيانات والمعلومات المذكورة في هذه الاستمارة صحيحة، وأتحمل كامل المسؤولية عن صحة البيانات المقدمة، وأوافق على قيام إدارة <span className="font-bold text-[#9E1A24]">BOB WICH</span> بمراجعة البيانات والخبرات المذكورة واتخاذ ما تراه مناسبًا بشأن طلب التوظيف.
                </p>
                <p>
                  كما أقر باستلامي للعهدة الموضحة أدناه، وأتعهد بالمحافظة عليها وعدم إتالفها أو إساءة استخدامها، وتسليمها عند ترك العمل أو انتهاء علاقة العمل بنفس الحالة التي استلمتها بها، مع مراعاة الاستهلاك الطبيعي.
                </p>
                <p>
                  وفي حالة عدم تسليم العهدة المستلمة أو وجود تلف بها بسبب الإهمال أو سوء الاستخدام، يتم تسوية قيمة العهدة أو التلف من المستحقات المالية وفقًا للوائح الشركة والقانون.
                </p>
              </div>

              {/* Custody / Assets Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-stone-800">بيان العهدة المستلمة</h4>
                  <button
                    type="button"
                    onClick={addAssetRow}
                    className="bg-red-50 hover:bg-red-100 text-[#9E1A24] border border-[#9E1A24] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <SvgIcons.Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة عهدة</span>
                  </button>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-stone-100 font-bold text-stone-700">
                      <tr>
                        <th className="p-2 border-l border-stone-200 w-12">م</th>
                        <th className="p-2 border-l border-stone-200 text-right">بيان العهدة</th>
                        <th className="p-2 border-l border-stone-200 w-20">العدد</th>
                        <th className="p-2 border-l border-stone-200 w-36">الحالة عند الاستلام</th>
                        <th className="p-2 border-l border-stone-200">ملاحظات</th>
                        <th className="p-2 w-16">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {assets.map((ast, idx) => (
                        <tr key={ast.id || idx} className="bg-white">
                          <td className="p-2 border-l border-stone-200 font-mono">{idx + 1}</td>
                          <td className="p-2 border-l border-stone-200">
                            <input
                              type="text"
                              value={ast.asset_name}
                              onChange={e => updateAssetRow(idx, 'asset_name', e.target.value)}
                              placeholder="اسم أو بيان العهدة"
                              className="w-full bg-stone-50 rounded p-1.5 text-xs text-right border border-stone-200 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 border-l border-stone-200">
                            <input
                              type="number"
                              min="1"
                              value={ast.quantity}
                              onChange={e => updateAssetRow(idx, 'quantity', e.target.value)}
                              className="w-full bg-stone-50 rounded p-1.5 text-xs text-center border border-stone-200 font-mono"
                            />
                          </td>
                          <td className="p-2 border-l border-stone-200">
                            <select
                              value={ast.condition}
                              onChange={e => updateAssetRow(idx, 'condition', e.target.value)}
                              className="w-full bg-stone-50 rounded p-1.5 text-xs border border-stone-200"
                            >
                              <option value="جديد">جديد</option>
                              <option value="سليم ومستعمل">سليم ومستعمل</option>
                              <option value="جيد">جيد</option>
                              <option value="بحالة الاستلام">بحالة الاستلام</option>
                            </select>
                          </td>
                          <td className="p-2 border-l border-stone-200">
                            <input
                              type="text"
                              value={ast.notes}
                              onChange={e => updateAssetRow(idx, 'notes', e.target.value)}
                              placeholder="ملاحظات"
                              className="w-full bg-stone-50 rounded p-1.5 text-xs border border-stone-200"
                            />
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => deleteAssetRow(idx)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <SvgIcons.Trash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Total */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">إجمالي العهد المستلمة:</label>
                  <div className="font-mono font-black text-base text-[#9E1A24]">
                    {assets.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)} قطعة
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">اسم المتقدم المقر:</label>
                  <input
                    type="text"
                    value={formData.applicant_signature_name || formData.full_name}
                    onChange={e => setFormData(prev => ({ ...prev, applicant_signature_name: e.target.value }))}
                    className="w-full bg-white rounded-lg p-2 border border-stone-300 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">تاريخ الإقرار:</label>
                  <input
                    type="date"
                    value={formData.declaration_date}
                    onChange={e => setFormData(prev => ({ ...prev, declaration_date: e.target.value }))}
                    className="w-full bg-white rounded-lg p-2 border border-stone-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveTab(5)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <SvgIcons.ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                {currentUser.role === 'admin' || currentUser.role === 'hr' || currentUser.role === 'manager' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab(7)}
                    className="bg-[#9E1A24] text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#85151e]"
                  >
                    <span>التالي: قسم إدارة HR وقرار التوظيف</span>
                    <SvgIcons.ChevronLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="bg-[#9E1A24] text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#85151e]"
                  >
                    <SvgIcons.Check className="w-4 h-4" />
                    <span>حفظ الاستمارة بالكامل</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: للاستخدام بواسطة إدارة BOB WICH & المقابلات والقرار */}
          {activeTab === 7 && (
            <div className="space-y-8">
              {/* HR Administrative Fields */}
              <div>
                <div className="border-b border-stone-100 pb-3 mb-4">
                  <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                    <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                    <span>للاستخدام بواسطة إدارة BOB WICH</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    قسم خاص بموظفي الموارد البشرية والإدارة فقط
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-red-50/30 p-5 rounded-2xl border border-red-100">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">الوظيفة المقترحة</label>
                    <input
                      type="text"
                      value={hrDecision.proposed_position}
                      onChange={e => setHrDecision(prev => ({ ...prev, proposed_position: e.target.value }))}
                      placeholder={formData.position_name || 'الوظيفة المقترحة'}
                      className="w-full bg-white rounded-xl px-3.5 py-2 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">الراتب المقترح (ج.م)</label>
                    <input
                      type="number"
                      value={hrDecision.proposed_salary}
                      onChange={e => setHrDecision(prev => ({ ...prev, proposed_salary: e.target.value }))}
                      placeholder="مثال: 7500"
                      className="w-full bg-white rounded-xl px-3.5 py-2 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-xs font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">تاريخ استلام الطلب</label>
                    <input
                      type="date"
                      value={hrDecision.application_date}
                      onChange={e => setHrDecision(prev => ({ ...prev, application_date: e.target.value }))}
                      className="w-full bg-white rounded-xl px-3.5 py-2 border border-stone-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">تاريخ مباشرة العمل</label>
                    <input
                      type="date"
                      value={hrDecision.joining_date}
                      onChange={e => setHrDecision(prev => ({ ...prev, joining_date: e.target.value }))}
                      className="w-full bg-white rounded-xl px-3.5 py-2 border border-stone-300 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">اسم مسؤول التوظيف</label>
                    <input
                      type="text"
                      value={hrDecision.recruiter_name}
                      onChange={e => setHrDecision(prev => ({ ...prev, recruiter_name: e.target.value }))}
                      className="w-full bg-white rounded-xl px-3.5 py-2 border border-stone-300 text-xs font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">ملاحظات الإدارة</label>
                    <textarea
                      rows={2}
                      value={hrDecision.hr_notes}
                      onChange={e => setHrDecision(prev => ({ ...prev, hr_notes: e.target.value }))}
                      placeholder="أدخل أي ملاحظات فنية أو تشغيلية خاصة بالمرشح..."
                      className="w-full bg-white rounded-xl px-3.5 py-2 border border-stone-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section: المقابلات (Interviews) */}
              <div>
                <div className="border-b border-stone-100 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#9E1A24] flex items-center gap-2">
                      <span className="w-2 h-6 bg-[#9E1A24] rounded-full inline-block"></span>
                      <span>المقابلات الشخصية (Interviews)</span>
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addInterviewRow}
                    className="bg-red-50 hover:bg-red-100 text-[#9E1A24] border border-[#9E1A24] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <SvgIcons.Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة مقابلة</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interviews.map((interview, idx) => (
                    <div key={interview.id || idx} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#9E1A24] bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                          المقابلة رقم {interview.interview_number || idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => {
                                setInterviews(prev => {
                                  const copy = [...prev];
                                  copy[idx].evaluation = star;
                                  return copy;
                                });
                              }}
                            >
                              <SvgIcons.Star
                                className="w-4 h-4 cursor-pointer"
                                filled={star <= interview.evaluation}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-stone-700 mb-1">تاريخ المقابلة</label>
                          <input
                            type="date"
                            value={interview.interview_date}
                            onChange={e => {
                              const val = e.target.value;
                              setInterviews(prev => {
                                const copy = [...prev];
                                copy[idx].interview_date = val;
                                return copy;
                              });
                            }}
                            className="w-full bg-white rounded-lg p-2 border border-stone-300 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-stone-700 mb-1">المسؤول عن المقابلة</label>
                          <input
                            type="text"
                            value={interview.interviewer_name}
                            onChange={e => {
                              const val = e.target.value;
                              setInterviews(prev => {
                                const copy = [...prev];
                                copy[idx].interviewer_name = val;
                                return copy;
                              });
                            }}
                            className="w-full bg-white rounded-lg p-2 border border-stone-300"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block font-bold text-stone-700 mb-1">حالة المقابلة</label>
                          <div className="flex gap-2">
                            {(['مقبول', 'مرفوض', 'إعادة مقابلة', 'حضر', 'لم يحضر'] as const).map(st => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => {
                                  setInterviews(prev => {
                                    const copy = [...prev];
                                    copy[idx].status = st;
                                    return copy;
                                  });
                                  if (idx === 0) {
                                    setHrDecision(prev => ({
                                      ...prev,
                                      first_interview_status: (st === 'مقبول' || st === 'مرفوض' || st === 'إعادة مقابلة') ? st : '',
                                    }));
                                  } else if (idx === 1) {
                                    setHrDecision(prev => ({
                                      ...prev,
                                      second_interview_status: (st === 'حضر' || st === 'لم يحضر') ? st : '',
                                    }));
                                  }
                                }}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                  interview.status === st
                                    ? 'bg-[#9E1A24] text-white'
                                    : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="block font-bold text-stone-700 mb-1">تقييم وملاحظات المقابلة</label>
                          <textarea
                            rows={2}
                            value={interview.notes}
                            onChange={e => {
                              const val = e.target.value;
                              setInterviews(prev => {
                                const copy = [...prev];
                                copy[idx].notes = val;
                                return copy;
                              });
                            }}
                            placeholder="ملاحظات القائم بالمقابلة حول السلوك والمظهر والخبرة..."
                            className="w-full bg-white rounded-lg p-2 border border-stone-300 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: قرار التوظيف النهائي */}
              <div className="bg-stone-900 text-white p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-black text-amber-400 flex items-center gap-2">
                    <SvgIcons.Star className="w-5 h-5" filled />
                    <span>قرار التوظيف النهائي (Hiring Decision)</span>
                  </h4>
                  <span className="text-xs text-stone-300">يحدد القرار مصير طلب التوظيف في النظام</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: 'قبول', label: 'قبول وتعيين', bg: 'bg-emerald-600 hover:bg-emerald-700' },
                    { val: 'قائمة انتظار', label: 'قائمة انتظار', bg: 'bg-amber-600 hover:bg-amber-700' },
                    { val: 'رفض', label: 'رفض الطلب', bg: 'bg-red-700 hover:bg-red-800' },
                  ].map(decision => {
                    const isSelected = hrDecision.hiring_decision === decision.val || formData.status === decision.val;
                    return (
                      <button
                        key={decision.val}
                        type="button"
                        onClick={() => {
                          setHrDecision(prev => ({ ...prev, hiring_decision: decision.val as any }));
                          setFormData(prev => ({ ...prev, status: decision.val as any }));
                        }}
                        className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                          isSelected
                            ? `${decision.bg} text-white ring-2 ring-white scale-102`
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                        }`}
                      >
                        {decision.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActiveTab(6)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <SvgIcons.ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSaving}
                  className="bg-[#9E1A24] text-white px-8 py-2.5 rounded-xl text-sm font-black shadow-lg hover:bg-[#85151e] flex items-center gap-2"
                >
                  <SvgIcons.Check className="w-5 h-5" />
                  <span>حفظ استمارة التوظيف بالكامل</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};