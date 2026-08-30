import React, { useState, useEffect, useMemo } from 'react';
import {
  Applicant,
  ApplicantExperience,
  ApplicantDocument,
  Branch,
  JobPosition
} from '../types';
import { ApiService } from '../services/api';
import { SvgIcons, BobWichHeaderLogo } from './BobWichLogo';
import { uploadFileDirectToStorage } from '../utils/imageCompression';

interface PublicApplicantPortalProps {
  onGoToAdmin?: () => void;
  onApplicationSubmitted?: (newApp: Applicant) => void;
}

export const PublicApplicantPortal: React.FC<PublicApplicantPortalProps> = ({
  onGoToAdmin,
  onApplicationSubmitted,
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  // Steps in public form
  // 1: Personal Info & Photo
  // 2: Desired Job & Education
  // 3: Experience & Skills & Shifts
  // 4: Attachments (ID, Health cert)
  // 5: Declaration & Final Submission
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(1);
  const [formData, setFormData] = useState<Partial<Applicant>>({
    full_name: '',
    national_id: '',
    phone: '',
    birth_date: '',
    emergency_phone: '',
    emergency_contact_name: '',
    address: '',
    marital_status: '',
    military_status: '',
    photo_url: '',

    branch_id: '',
    branch_name: '',
    position_id: '',
    position_name: '',
    experience_years: 0,
    restaurant_experience: false,
    last_job: '',
    leaving_reason: '',

    qualification: '',
    specialization: '',
    graduation_year: '',
    still_studying: false,

    shift_morning: false,
    shift_night: false,
    can_work_shifts: false,
    can_work_overtime: false,
    can_work_holidays: false,

    skills: [],
    custom_skill: '',

    declaration_accepted: false,
    applicant_signature_name: '',
    declaration_date: new Date().toISOString().split('T')[0],
  });

  const [experiences, setExperiences] = useState<ApplicantExperience[]>([
    {
      id: 'exp_1',
      applicant_id: '',
      workplace: '',
      position: '',
      date_from: '',
      date_to: '',
      leaving_reason: '',
    },
  ]);

  const [documents, setDocuments] = useState<ApplicantDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nationalIdDuplicateWarning, setNationalIdDuplicateWarning] = useState<string | null>(null);
  const [submittedApplicant, setSubmittedApplicant] = useState<Applicant | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<ApplicantDocument['document_type'] | null>(null);

  // Birth date picker (day/month/year selects) — mobile-friendly replacement
  // for the native <input type="date">, whose calendar widget forces
  // applicants to scroll back years one month at a time to reach their
  // birth year. Derived straight from formData.birth_date ('YYYY-MM-DD')
  // so it stays in sync without extra state.
  // formData.birth_date is stored as 'YYYY-MM-DD', so the split parts are
  // [year, month, day] in that order — the destructured names must match
  // that order, or the year/day values end up swapped between variables.
  const [birthYear, birthMonth, birthDay] = useMemo(() => {
    const parts = (formData.birth_date || '').split('-');
    return parts.length === 3 ? parts : ['', '', ''];
  }, [formData.birth_date]);

  const currentYear = new Date().getFullYear();
  const birthYearOptions = useMemo(
    () => Array.from({ length: 65 - 14 + 1 }, (_, i) => currentYear - 14 - i),
    [currentYear]
  );
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  const handleBirthDatePartChange = (part: 'day' | 'month' | 'year', value: string) => {
    const day = part === 'day' ? value : birthDay;
    const month = part === 'month' ? value : birthMonth;
    const year = part === 'year' ? value : birthYear;
    if (day && month && year) {
      setFormData(prev => ({
        ...prev,
        birth_date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      }));
    } else {
      // Keep partial selections around (e.g. only year picked so far) by
      // stashing them in a still-incomplete, non-ISO string. Positions must
      // stay fixed (year-month-day) even when a part is empty — filtering
      // out empty parts here would shift the remaining values into the
      // wrong slot on the next parse and silently drop whatever was
      // already picked (e.g. picking the year after the day would wipe
      // the day out again).
      setFormData(prev => ({ ...prev, birth_date: `${year}-${month}-${day}` }));
    }
  };


  // Load branches & positions (Do NOT auto-select first item)
  useEffect(() => {
    async function loadMaster() {
      try {
        setIsLoadingMaster(true);
        const [bList, pList] = await Promise.all([
          ApiService.getBranches(),
          ApiService.getPositions(),
        ]);
        setBranches(bList.filter(b => b.is_active));
        setPositions(pList.filter(p => p.is_active));
      } catch (err) {
        console.error('Failed to load branches/positions', err);
      } finally {
        setIsLoadingMaster(false);
      }
    }
    loadMaster();
  }, []);

  // Real-time National ID duplicate verification (Secure Public Endpoint - Zero data leakage)
  useEffect(() => {
    const id = formData.national_id?.trim();
    if (!id || id.length !== 14) {
      setNationalIdDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const check = await ApiService.checkNationalIdPublic(id);
        if (check.exists) {
          setNationalIdDuplicateWarning(
            'تنبيه: هذا الرقم القومي مسجل مسبقاً في النظام. يرجى التواصل مع إدارة التوظيف للمتابعة.'
          );
        } else {
          setNationalIdDuplicateWarning(null);
        }
      } catch (err) {
        console.error(err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.national_id]);

  // Handle Photo upload — uploads directly to Supabase Storage from the
  // browser (compressing images on-device first) and stores only the
  // resulting short public URL in form state, so the eventual submit
  // request stays tiny regardless of the original photo's size.
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت');
      return;
    }

    setErrorMessage(null);
    setIsUploadingPhoto(true);
    try {
      const publicUrl = await uploadFileDirectToStorage(file, {
        isImage: true,
        maxDimension: 1000,
        quality: 0.75,
      });
      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل رفع الصورة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle Document upload with file type & size check — same direct-to-
  // storage approach as the photo above; PDFs are uploaded as-is (only
  // images get compressed).
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: ApplicantDocument['document_type']) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('نوع الملف غير مسموح به. يرجى رفع صور (JPEG, PNG, WEBP) أو ملفات PDF فقط.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.');
      return;
    }

    setErrorMessage(null);
    setUploadingDocType(docType);
    try {
      const isImage = file.type !== 'application/pdf';
      const publicUrl = await uploadFileDirectToStorage(file, {
        isImage,
        maxDimension: 1400,
        quality: 0.75,
      });

      const newDoc: ApplicantDocument = {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        applicant_id: '',
        document_type: docType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: `${(file.size / 1024).toFixed(1)} KB`,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'المتقدم نفسه',
      };
      setDocuments(prev => [...prev.filter(d => d.document_type !== docType), newDoc]);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل رفع الملف، يرجى المحاولة مرة أخرى');
    } finally {
      setUploadingDocType(null);
    }
  };

  // Experience handlers
  const handleAddExperience = () => {
    setExperiences(prev => [
      ...prev,
      {
        id: 'exp_' + Date.now(),
        applicant_id: '',
        workplace: '',
        position: '',
        date_from: '',
        date_to: '',
        leaving_reason: '',
      },
    ]);
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExperience = (index: number, field: keyof ApplicantExperience, value: any) => {
    setExperiences(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Skills toggle
  const availableSkills = [
    'خدمة العملاء',
    'العمل ضمن فريق',
    'الالتزام بالنظافة',
    'مهارات المطبخ والطهي',
    'تجهيز السندوتشات',
    'استخدام الكاشير ونقاط البيع',
    'إدارة المخزون والتوريدات',
    'تحمل ضغط العمل',
    'اللباقة وحسن المظهر',
    'استخدام الحاسب الآلي',
    'سرعة البديهة والتعلم السريع',
  ];

  const handleToggleSkill = (skill: string) => {
    const currentSkills = formData.skills || [];
    if (currentSkills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: currentSkills.filter(s => s !== skill),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        skills: [...currentSkills, skill],
      }));
    }
  };

  // Rigorous Step Validation
  const validateStep = (step: number): boolean => {
    setErrorMessage(null);
    if (step === 1) {
      if (!formData.full_name?.trim()) {
        setErrorMessage('يرجى كتابة الاسم الرباعي بالكامل');
        return false;
      }
      const parts = formData.full_name.trim().split(/\s+/);
      if (parts.length < 4) {
        setErrorMessage('يرجى كتابة الاسم الرباعي بالكامل (4 أسماء على الأقل)');
        return false;
      }
      if (!formData.national_id?.trim() || formData.national_id.length !== 14 || !/^\d{14}$/.test(formData.national_id)) {
        setErrorMessage('يرجى إدخال الرقم القومي الصحيح المكون من 14 رقم بالضبط');
        return false;
      }
      if (nationalIdDuplicateWarning) {
        setErrorMessage('الرقم القومي مسجل مسبقاً في النظام');
        return false;
      }
      if (!formData.phone?.trim() || formData.phone.length !== 11 || !/^01[0125]\d{8}$/.test(formData.phone)) {
        setErrorMessage('يرجى إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقم (يبدأ بـ 010, 011, 012, 015)');
        return false;
      }
      if (!formData.birth_date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.birth_date)) {
        setErrorMessage('يرجى اختيار تاريخ الميلاد كاملاً (اليوم والشهر والسنة)');
        return false;
      }
      const bDate = new Date(formData.birth_date);
      if (bDate > new Date()) {
        setErrorMessage('تاريخ الميلاد لا يمكن أن يكون في المستقبل');
        return false;
      }
      if (!formData.address?.trim()) {
        setErrorMessage('يرجى إدخال محل الإقامة بالتفصيل');
        return false;
      }
      if (!formData.marital_status) {
        setErrorMessage('يرجى اختيار الحالة الاجتماعية');
        return false;
      }
      if (!formData.military_status) {
        setErrorMessage('يرجى اختيار الحالة العسكرية');
        return false;
      }
    } else if (step === 2) {
      if (!formData.branch_id || !formData.branch_name) {
        setErrorMessage('يرجى اختيار الفرع المطلوب');
        return false;
      }
      if (!formData.position_id || !formData.position_name) {
        setErrorMessage('يرجى اختيار الوظيفة المتقدم إليها');
        return false;
      }
      if (!formData.qualification) {
        setErrorMessage('يرجى تحديد المؤهل الدراسي');
        return false;
      }
      if (!formData.specialization?.trim()) {
        setErrorMessage('يرجى إدخال التخصص الدراسي');
        return false;
      }
      if (!formData.graduation_year?.trim()) {
        setErrorMessage('يرجى إدخال سنة التخرج أو السنة الدراسية الحالية');
        return false;
      }
    } else if (step === 3) {
      if (formData.restaurant_experience) {
        for (const exp of experiences) {
          if (exp.workplace.trim() || exp.position.trim()) {
            if (!exp.workplace.trim() || !exp.position.trim() || !exp.date_from || !exp.date_to || !exp.leaving_reason.trim()) {
              setErrorMessage('يرجى استكمال كافة بيانات الخبرات السابقة (مكان العمل، المسمى، تاريخ البداية والنهاية، وسبب الترك)');
              return false;
            }
          }
        }
      }
      const currentSkills = formData.skills || [];
      if (currentSkills.length === 0 && !formData.custom_skill?.trim()) {
        setErrorMessage('يرجى اختيار مهارة واحدة على الأقل أو كتابة مهارة أخرى');
        return false;
      }
      if (!formData.shift_morning && !formData.shift_night) {
        setErrorMessage('يرجى اختيار وردية عمل واحدة على الأقل (صباحية أو ليلية)');
        return false;
      }
    } else if (step === 4) {
      const hasIdDoc = documents.some(d => d.document_type === 'national_id_front' || d.document_type === 'national_id' || d.document_type === 'بطاقة الرقم القومي');
      if (!hasIdDoc && documents.length === 0) {
        setErrorMessage('يرجى رفع صورة بطاقة الرقم القومي (وجه أول على الأقل) للمتابعة');
        return false;
      }
    } else if (step === 5) {
      if (!formData.declaration_accepted) {
        setErrorMessage('يجب الموافقة والتعهد بصحة كافة البيانات المدونة للمتابعة');
        return false;
      }
      if (!formData.applicant_signature_name?.trim()) {
        setErrorMessage('يرجى كتابة اسمك في خانة توقيع المتقدم كإقرار رسمي');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const nextStep = Math.min(currentStep + 1, 5);
      setMaxReachedStep(prev => Math.max(prev, nextStep));
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setErrorMessage(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= maxReachedStep || targetStep < currentStep) {
      setErrorMessage(null);
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      let canJump = true;
      for (let s = currentStep; s < targetStep; s++) {
        if (!validateStep(s)) {
          canJump = false;
          break;
        }
      }
      if (canJump) {
        setMaxReachedStep(prev => Math.max(prev, targetStep));
        setCurrentStep(targetStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Submit Application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Clean experiences
      const validExperiences = experiences.filter(
        exp => exp.workplace.trim() || exp.position.trim()
      );

      const payload: Partial<Applicant> = {
        ...formData,
        experiences: validExperiences,
        documents: documents,
        status: 'طلب جديد',
        is_converted_to_employee: false,
      };

      const result = await ApiService.publicApply(payload);

      setSubmittedApplicant(result);
      if (onApplicationSubmitted) {
        onApplicationSubmitted(result);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If submitted successfully, show confirmation screen
  if (submittedApplicant) {
    return (
      <div className="min-h-screen bg-stone-100 py-10 px-4 sm:px-6 lg:px-8 font-sans dir-rtl" dir="rtl">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="bg-[#9E1A24] p-8 text-center text-white relative">
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
              <span className="text-4xl">🎉</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mb-2">تم استلام طلب التوظيف بنجاح!</h1>
            <p className="text-amber-200 text-sm font-medium">
              أهلاً بك في عائلة مطاعم BOB WICH
            </p>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <p className="text-xs font-bold text-amber-800 mb-1">كود طلب التوظيف الخاص بك</p>
              <div className="text-2xl sm:text-3xl font-mono font-black text-[#9E1A24] tracking-wider">
                {submittedApplicant.application_code}
              </div>
              <p className="text-xs text-stone-500 mt-2">
                احتفظ بهذا الكود لمتابعة حالة طلبك أو تقديمه لمسؤول الموارد البشرية أثناء المقابلة
              </p>
            </div>

            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3 text-sm">
              <h3 className="font-bold text-stone-900 border-b border-stone-200 pb-2">ملخص بيانات الطلب:</h3>
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div><span className="text-stone-500">الاسم:</span> <strong className="text-stone-800">{submittedApplicant.full_name}</strong></div>
                <div><span className="text-stone-500">الوظيفة:</span> <strong className="text-[#9E1A24]">{submittedApplicant.position_name}</strong></div>
                <div><span className="text-stone-500">الفرع المفضل:</span> <strong className="text-stone-800">{submittedApplicant.branch_name}</strong></div>
                <div><span className="text-stone-500">رقم الهاتف:</span> <strong className="text-stone-800" dir="ltr">{submittedApplicant.phone}</strong></div>
                <div><span className="text-stone-500">تاريخ التقديم:</span> <strong className="text-stone-800">{new Date(submittedApplicant.created_at).toLocaleDateString('ar-EG')}</strong></div>
                <div><span className="text-stone-500">حالة الطلب:</span> <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">طلب جديد قيد الفحص</span></div>
              </div>
            </div>

            <div className="border-r-4 border-[#9E1A24] bg-stone-50 p-4 rounded-xl text-xs sm:text-sm text-stone-700 leading-relaxed">
              <strong className="block text-stone-900 font-bold mb-1">الخطوات القادمة:</strong>
              1. سيقوم فريق الموارد البشرية في BOB WICH بمراجعة بياناتك ومؤهلاتك.<br />
              2. سيتم التواصل معك هاتفياً أو عبر رسالة واتساب على رقمك المسجل لتحديد موعد المقابلة الشخصية الأولى.<br />
              3. يرجى إحضار أصل البطاقة الشخصية وصورة المؤهل الدراسي عند الحضور للمقابلة.
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 rounded-xl border border-stone-300 font-bold text-stone-700 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <SvgIcons.Printer className="w-4 h-4" />
                طباعة إيصال استلام الطلب
              </button>
              
              <button
                onClick={() => {
                  setSubmittedApplicant(null);
                  setCurrentStep(1);
                  setMaxReachedStep(1);
                  setFormData({
                    full_name: '',
                    national_id: '',
                    phone: '',
                    birth_date: '',
                    emergency_phone: '',
                    emergency_contact_name: '',
                    address: '',
                    marital_status: '',
                    military_status: '',
                    photo_url: '',
                    branch_id: '',
                    branch_name: '',
                    position_id: '',
                    position_name: '',
                    experience_years: 0,
                    restaurant_experience: false,
                    last_job: '',
                    leaving_reason: '',
                    qualification: '',
                    specialization: '',
                    graduation_year: '',
                    still_studying: false,
                    shift_morning: false,
                    shift_night: false,
                    can_work_shifts: false,
                    can_work_overtime: false,
                    can_work_holidays: false,
                    skills: [],
                    custom_skill: '',
                    declaration_accepted: false,
                    applicant_signature_name: '',
                    declaration_date: new Date().toISOString().split('T')[0],
                  });
                  setExperiences([{ id: 'exp_1', applicant_id: '', workplace: '', position: '', date_from: '', date_to: '', leaving_reason: '' }]);
                  setDocuments([]);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#9E1A24] text-white font-bold hover:bg-[#80141D] transition-all text-sm"
              >
                تقديم طلب آخر
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans dir-rtl" dir="rtl">
      <div className="max-w-3xl mx-auto">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 mb-6 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-50 rounded-full opacity-60 pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-50 rounded-full opacity-60 pointer-events-none"></div>
          
          <div className="flex justify-center mb-4">
            <BobWichHeaderLogo size="md" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            استمارة طلب التوظيف الرسمية
          </h1>
          <p className="text-sm text-stone-600 mt-2 max-w-xl mx-auto leading-relaxed">
            انضم إلى فريق عمل مطاعم <strong>BOB WICH</strong>. يرجى ملء كافة البيانات بدقة وأمانة لاستكمال عملية الفحص وتحديد موعد المقابلة.
          </p>
        </div>

        {/* Multi-step Progress Bar with Locking */}
        <div className="bg-white rounded-2xl shadow-xs border border-stone-200 p-4 mb-6">
          <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
            {[
              { num: 1, label: 'البيانات الشخصية' },
              { num: 2, label: 'الوظيفة والمؤهل' },
              { num: 3, label: 'الخبرات والمهارات' },
              { num: 4, label: 'المرفقات' },
              { num: 5, label: 'الإقرار والإرسال' },
            ].map(tab => {
              const isAccessible = tab.num <= maxReachedStep || tab.num < currentStep;
              const isCurrent = currentStep === tab.num;
              return (
                <button
                  key={tab.num}
                  type="button"
                  onClick={() => handleStepClick(tab.num)}
                  disabled={!isAccessible}
                  className={`py-2 px-1 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
                    isCurrent
                      ? 'bg-[#9E1A24] text-white shadow-sm'
                      : isAccessible
                      ? 'bg-stone-100 text-stone-800 hover:bg-stone-200 cursor-pointer'
                      : 'bg-stone-50 text-stone-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{tab.num}</span>
                    {!isAccessible && <span className="text-[10px]">🔒</span>}
                  </div>
                  <span className="text-[10px] sm:text-xs truncate max-w-full">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[#9E1A24] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border-r-4 border-red-600 p-4 rounded-2xl text-red-800 text-sm font-bold flex items-center gap-2 shadow-xs animate-in slide-in-from-top-2">
            <SvgIcons.AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Personal Info & Photo */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#9E1A24] text-white flex items-center justify-center text-sm font-black">1</span>
                البيانات الشخصية والصورة
              </h2>
              <span className="text-xs text-stone-500 font-bold">* جميع الحقول إلزامية</span>
            </div>

            {/* Photo Upload Box */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="relative w-32 h-40 rounded-2xl border-2 border-dashed border-stone-300 bg-white flex flex-col items-center justify-center overflow-hidden flex-shrink-0 shadow-inner group">
                {formData.photo_url ? (
                  <>
                    <img
                      src={formData.photo_url}
                      alt="صورة المتقدم"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity"
                    >
                      تغيير الصورة
                    </button>
                  </>
                ) : (
                  <div className="text-center p-3">
                    <SvgIcons.Camera className="w-8 h-8 text-stone-400 mx-auto mb-1" />
                    <span className="text-[11px] font-bold text-stone-500 block leading-tight">
                      صورة شخصية حديثة (4×6)
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-right">
                <h4 className="font-bold text-stone-900 text-sm">رفع الصورة الشخصية للمتقدم</h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  يفضل رفع صورة واضحة بخلفية بيضاء أو محايدة بحجم مناسب (اختياري ولكن يفضل للتوظيف).
                </p>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isUploadingPhoto ? 'bg-stone-100 text-stone-400 cursor-wait' : 'bg-stone-200 hover:bg-stone-300 text-stone-800 cursor-pointer'}`}>
                  <SvgIcons.Upload className="w-4 h-4" />
                  <span>{isUploadingPhoto ? 'جاري رفع الصورة...' : 'اختيار صورة من الهاتف أو الكمبيوتر'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  الاسم الرباعي كما هو مدون في البطاقة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمود أحمد محمد إبراهيم"
                  value={formData.full_name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-medium"
                />
              </div>

              {/* National ID */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  الرقم القومي (14 رقم) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  required
                  placeholder="2980101XXXXXXXXX"
                  value={formData.national_id || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, national_id: val }));
                  }}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-stone-900 text-sm font-mono tracking-wider ${
                    nationalIdDuplicateWarning
                      ? 'border-red-500 focus:ring-red-500 bg-red-50/50'
                      : 'border-stone-300 focus:ring-[#9E1A24]'
                  }`}
                />
                {nationalIdDuplicateWarning && (
                  <p className="text-xs text-red-600 font-bold mt-1 animate-pulse">
                    {nationalIdDuplicateWarning}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  رقم الهاتف الشخصي (متاح واتساب) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={11}
                  required
                  placeholder="010XXXXXXXX"
                  value={formData.phone || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, phone: val }));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-mono"
                />
              </div>

              {/* Birth Date — day/month/year selects (easier to use on
                  mobile than the native calendar widget, which forces
                  scrolling back month-by-month to reach a birth year). */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  تاريخ الميلاد <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={birthDay}
                    onChange={e => handleBirthDatePartChange('day', e.target.value)}
                    className="w-full px-2 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm bg-white"
                  >
                    <option value="" disabled>اليوم</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={birthMonth}
                    onChange={e => handleBirthDatePartChange('month', e.target.value)}
                    className="w-full px-2 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm bg-white"
                  >
                    <option value="" disabled>الشهر</option>
                    {arabicMonths.map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={birthYear}
                    onChange={e => handleBirthDatePartChange('year', e.target.value)}
                    className="w-full px-2 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-mono bg-white"
                  >
                    <option value="" disabled>السنة</option>
                    {birthYearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  محل الإقامة الحالي بالتفصيل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="المحافظة - المنطقة - الشارع - رقم العقار"
                  value={formData.address || ''}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
                />
              </div>

              {/* Emergency Contact Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">اسم صاحب هاتف الطوارئ وصلة القرابة</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد محمد (الوالد)"
                  value={formData.emergency_contact_name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
                />
              </div>

              {/* Emergency Phone */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">هاتف الطوارئ</label>
                <input
                  type="tel"
                  maxLength={11}
                  placeholder="01XXXXXXXXX"
                  value={formData.emergency_phone || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, emergency_phone: val }));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-mono"
                />
              </div>

              {/* Marital Status */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">الحالة الاجتماعية</label>
                <select
                  value={formData.marital_status || ''}
                  onChange={e => setFormData(prev => ({ ...prev, marital_status: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-medium bg-white"
                >
                  <option value="" disabled>اختر من القائمة</option>
                  <option value="أعزب">أعزب</option>
                  <option value="متزوج">متزوج</option>
                  <option value="مطلق">مطلق</option>
                  <option value="أرمل">أرمل</option>
                </select>
              </div>

              {/* Military Status */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">الموقف من التجنيد</label>
                <select
                  value={formData.military_status || ''}
                  onChange={e => setFormData(prev => ({ ...prev, military_status: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-medium bg-white"
                >
                  <option value="" disabled>اختر من القائمة</option>
                  <option value="أدى الخدمة">أدى الخدمة العسكرية</option>
                  <option value="إعفاء نهائي">إعفاء نهائي</option>
                  <option value="إعفاء مؤقت">إعفاء مؤقت</option>
                  <option value="تأجيل">تأجيل دراسي</option>
                  <option value="غير مطلوب (إناث)">غير مطلوب (إناث)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Job & Education */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#9E1A24] text-white flex items-center justify-center text-sm font-black">2</span>
                الوظيفة المطلوبة والمؤهل الدراسي
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Branch */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  الفرع المفضل للعمل به <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.branch_name || ''}
                  onChange={e => {
                    const selBranch = branches.find(b => b.name === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      branch_id: selBranch?.id || '',
                      branch_name: e.target.value,
                    }));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-medium bg-white"
                >
                  <option value="" disabled>اختر الفرع من القائمة</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Position */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  الوظيفة المتقدم إليها <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.position_name || ''}
                  onChange={e => {
                    const selPos = positions.find(p => p.title === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      position_id: selPos?.id || '',
                      position_name: e.target.value,
                    }));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-bold text-[#9E1A24] bg-white"
                >
                  <option value="" disabled>اختر الوظيفة من القائمة</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.title}>{p.title} - ({p.department})</option>
                  ))}
                </select>
              </div>

              {/* Restaurant experience checkbox */}
              <div className="sm:col-span-2 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">هل لديك خبرة سابقة في مجال المطاعم والأغذية؟</h4>
                  <p className="text-xs text-stone-600">مطاعم الوجبات السريعة، الكافيهات، الفنادق، أو المطابخ</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-800">
                    <input
                      type="radio"
                      name="restaurant_experience"
                      checked={formData.restaurant_experience === true}
                      onChange={() => setFormData(prev => ({ ...prev, restaurant_experience: true }))}
                      className="accent-[#9E1A24] w-4 h-4"
                    />
                    نعم
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-800">
                    <input
                      type="radio"
                      name="restaurant_experience"
                      checked={formData.restaurant_experience === false}
                      onChange={() => setFormData(prev => ({ ...prev, restaurant_experience: false }))}
                      className="accent-[#9E1A24] w-4 h-4"
                    />
                    لا
                  </label>
                </div>
              </div>

              {/* Total years */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">إجمالي سنوات الخبرة العامة</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={formData.experience_years ?? 0}
                  onChange={e => setFormData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
                />
              </div>

              {/* Last job */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">آخر وظيفة شغلتها</label>
                <input
                  type="text"
                  placeholder="مثال: كاشير في مطعم كذا"
                  value={formData.last_job || ''}
                  onChange={e => setFormData(prev => ({ ...prev, last_job: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
                />
              </div>

              {/* Leaving reason */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-stone-700">سبب ترك العمل السابق</label>
                <input
                  type="text"
                  placeholder="مثال: البحث عن فرصة أفضل للتطوير، بعد المسافة..."
                  value={formData.leaving_reason || ''}
                  onChange={e => setFormData(prev => ({ ...prev, leaving_reason: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
                />
              </div>
            </div>

            {/* Education Sub-section */}
            <div className="pt-4 border-t border-stone-200">
              <h3 className="text-md font-black text-stone-900 mb-3">المؤهل والتعليم:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">المؤهل الدراسي</label>
                  <select
                    value={formData.qualification || ''}
                    onChange={e => setFormData(prev => ({ ...prev, qualification: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-medium bg-white"
                  >
                    <option value="" disabled>اختر من القائمة</option>
                    <option value="مؤهل عالي">مؤهل عالي (بكالوريوس / ليسانس)</option>
                    <option value="فوق متوسط">مؤهل فوق متوسط (معهد سنتين)</option>
                    <option value="مؤهل متوسط">مؤهل متوسط (دبلوم / ثانوية)</option>
                    <option value="طالب جامعي">طالب جامعي</option>
                    <option value="إعدادية">شهادة إعدادية</option>
                    <option value="بدون مؤهل">بدون مؤهل</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">التخصص / الكلية</label>
                  <input
                    type="text"
                    placeholder="مثال: تجارة / سياحة وفنادق / دبلوم صنايع"
                    value={formData.specialization || ''}
                    onChange={e => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">سنة التخرج</label>
                  <input
                    type="text"
                    placeholder="مثال: 2023"
                    value={formData.graduation_year || ''}
                    onChange={e => setFormData(prev => ({ ...prev, graduation_year: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">هل ما زلت تدرس؟</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-800">
                      <input
                        type="radio"
                        name="still_studying"
                        checked={formData.still_studying === true}
                        onChange={() => setFormData(prev => ({ ...prev, still_studying: true }))}
                        className="accent-[#9E1A24] w-4 h-4"
                      />
                      نعم
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-stone-800">
                      <input
                        type="radio"
                        name="still_studying"
                        checked={formData.still_studying === false}
                        onChange={() => setFormData(prev => ({ ...prev, still_studying: false }))}
                        className="accent-[#9E1A24] w-4 h-4"
                      />
                      لا
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Experience & Skills & Shifts */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#9E1A24] text-white flex items-center justify-center text-sm font-black">3</span>
                سجل الخبرات والمهارات والورديات
              </h2>
            </div>

            {/* Experience Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-stone-900">سجل أماكن العمل السابقة:</h4>
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <SvgIcons.Plus className="w-3.5 h-3.5" />
                  إضافة جهة عمل سابقة
                </button>
              </div>

              <div className="space-y-3">
                {experiences.map((exp, idx) => (
                  <div key={exp.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 relative">
                    {experiences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(idx)}
                        className="absolute top-3 left-3 text-red-500 hover:text-red-700 text-xs font-bold p-1"
                        title="حذف هذا السطر"
                      >
                        ✕
                      </button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">اسم المكان / الشركة / المطعم</label>
                        <input
                          type="text"
                          placeholder="مثال: مطعم شاورما"
                          value={exp.workplace}
                          onChange={e => handleUpdateExperience(idx, 'workplace', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">المسمى الوظيفي</label>
                        <input
                          type="text"
                          placeholder="مثال: ويتر / كاشير / شيف"
                          value={exp.position}
                          onChange={e => handleUpdateExperience(idx, 'position', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">المدة (من - إلى)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="من (مثال: 2022)"
                            value={exp.date_from}
                            onChange={e => handleUpdateExperience(idx, 'date_from', e.target.value)}
                            className="w-1/2 px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white"
                          />
                          <input
                            type="text"
                            placeholder="إلى (مثال: 2024)"
                            value={exp.date_to}
                            onChange={e => handleUpdateExperience(idx, 'date_to', e.target.value)}
                            className="w-1/2 px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">سبب ترك العمل</label>
                        <input
                          type="text"
                          placeholder="سبب المغادرة"
                          value={exp.leaving_reason}
                          onChange={e => handleUpdateExperience(idx, 'leaving_reason', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills selection */}
            <div className="pt-4 border-t border-stone-200">
              <h4 className="text-sm font-black text-stone-900 mb-2">المهارات التي تجيدها (اختر كل ما ينطبق):</h4>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map(skill => {
                  const isSelected = (formData.skills || []).includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleToggleSkill(skill)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#9E1A24] text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>{skill}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shifts & Availability */}
            <div className="pt-4 border-t border-stone-200 space-y-3">
              <h4 className="text-sm font-black text-stone-900">أوقات العمل والورديات:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.shift_morning ?? true}
                    onChange={e => setFormData(prev => ({ ...prev, shift_morning: e.target.checked }))}
                    className="accent-[#9E1A24] w-4 h-4 rounded"
                  />
                  <span>الاستعداد للعمل بالوردية الصباحية</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.shift_night ?? true}
                    onChange={e => setFormData(prev => ({ ...prev, shift_night: e.target.checked }))}
                    className="accent-[#9E1A24] w-4 h-4 rounded"
                  />
                  <span>الاستعداد للعمل بالوردية المسائية / السهرة</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.can_work_overtime ?? true}
                    onChange={e => setFormData(prev => ({ ...prev, can_work_overtime: e.target.checked }))}
                    className="accent-[#9E1A24] w-4 h-4 rounded"
                  />
                  <span>الاستعداد للعمل بساعات إضافية (أوفر تايم بأجر)</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.can_work_holidays ?? true}
                    onChange={e => setFormData(prev => ({ ...prev, can_work_holidays: e.target.checked }))}
                    className="accent-[#9E1A24] w-4 h-4 rounded"
                  />
                  <span>الاستعداد للعمل في العطلات الرسمية والمواسم والأعياد</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formData.can_work_shifts ?? false}
                    onChange={e => setFormData(prev => ({ ...prev, can_work_shifts: e.target.checked }))}
                    className="accent-[#9E1A24] w-4 h-4 rounded"
                  />
                  <span>أمتلك وسيلة مواصلات خاصة (موتوسيكل/عربية)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Attachments (ID, Health cert) */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#9E1A24] text-white flex items-center justify-center text-sm font-black">4</span>
                المستندات والمرفقات (اختياري / يفضل)
              </h2>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              يمكنك تصوير ورفع المستندات من هاتفك لتسريع إجراءات فحص طلبك وتحديد المقابلة:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* National ID Front */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900">صورة بطاقة الرقم القومي</h4>
                  <span className="text-[10px] text-stone-500">سارية</span>
                </div>
                {documents.find(d => d.document_type === 'صورة بطاقة الرقم القومي') ? (
                  <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold">
                    <span className="truncate">✓ تم رفع صورة البطاقة</span>
                    <button
                      type="button"
                      onClick={() => setDocuments(prev => prev.filter(d => d.document_type !== 'صورة بطاقة الرقم القومي'))}
                      className="text-red-600 hover:text-red-800 text-[11px] mr-2"
                    >
                      حذف
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all ${uploadingDocType === 'صورة بطاقة الرقم القومي' ? 'border-stone-200 bg-stone-100 cursor-wait' : 'border-stone-300 bg-white hover:bg-stone-50 cursor-pointer'}`}>
                    <SvgIcons.Upload className="w-6 h-6 text-stone-400 mb-1" />
                    <span className="text-xs font-bold text-stone-700">
                      {uploadingDocType === 'صورة بطاقة الرقم القومي' ? 'جاري الرفع...' : 'اضغط لرفع صورة البطاقة'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => handleDocumentUpload(e, 'صورة بطاقة الرقم القومي')}
                      disabled={uploadingDocType !== null}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Health Certificate */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900">الشهادة الصحية لمجال الأغذية</h4>
                  <span className="text-[10px] text-stone-500">إن وجدت</span>
                </div>
                {documents.find(d => d.document_type === 'شهادة صحية') ? (
                  <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold">
                    <span className="truncate">✓ تم رفع الشهادة الصحية</span>
                    <button
                      type="button"
                      onClick={() => setDocuments(prev => prev.filter(d => d.document_type !== 'شهادة صحية'))}
                      className="text-red-600 hover:text-red-800 text-[11px] mr-2"
                    >
                      حذف
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all ${uploadingDocType === 'شهادة صحية' ? 'border-stone-200 bg-stone-100 cursor-wait' : 'border-stone-300 bg-white hover:bg-stone-50 cursor-pointer'}`}>
                    <SvgIcons.Upload className="w-6 h-6 text-stone-400 mb-1" />
                    <span className="text-xs font-bold text-stone-700">
                      {uploadingDocType === 'شهادة صحية' ? 'جاري الرفع...' : 'اضغط لرفع الشهادة الصحية'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => handleDocumentUpload(e, 'شهادة صحية')}
                      disabled={uploadingDocType !== null}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Legal Declaration & Submission */}
        {currentStep === 5 && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#9E1A24] text-white flex items-center justify-center text-sm font-black">5</span>
                إقرار وتعهد المتقدم والتوقيع الإلكتروني
              </h2>
            </div>

            {/* Declaration text from original form */}
            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs sm:text-sm text-stone-800 leading-relaxed space-y-3">
              <div className="flex items-center gap-2 font-bold text-[#9E1A24] text-sm">
                <SvgIcons.FileText className="w-5 h-5" />
                <span>نص الإقرار الرسمي (مطاعم BOB WICH):</span>
              </div>
              <p className="font-medium text-justify">
                "أقر أنا الموقع أدناه بأن جميع البيانات والمستندات المدونة في هذا الطلب صحيحة ودقيقة تماماً ومطابقة للواقع، وأتحمل كامل المسؤولية القانونية والإدارية في حال ثبوت عدم صحة أي بيان منها، كما أوافق على الالتزام بلوائح وسياسات العمل المعتمدة بمطاعم BOB WICH وأن هذا الطلب لا يعد تعييناً نهائياً إلا بعد اجتياز المقابلة والفترة التجريبية وتوقيع عقد العمل الرسمي."
              </p>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-2xl border-2 border-stone-300 bg-stone-50 cursor-pointer text-xs sm:text-sm font-bold text-stone-900 hover:border-[#9E1A24] transition-colors">
              <input
                type="checkbox"
                required
                checked={formData.declaration_accepted ?? false}
                onChange={e => setFormData(prev => ({ ...prev, declaration_accepted: e.target.checked }))}
                className="accent-[#9E1A24] w-5 h-5 rounded mt-0.5"
              />
              <span>قرأت الإقرار أعلاه وأوافق عليه وأتعهد بصحة كافة البيانات الواردة في الطلب <span className="text-red-500">*</span></span>
            </label>

            {/* Signature fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  توقيع المتقدم (الاسم الثلاثي أو الرباعي) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="اكتب اسمك كتوقيع إلكتروني"
                  value={formData.applicant_signature_name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, applicant_signature_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] text-stone-900 text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">تاريخ التقديم</label>
                <input
                  type="date"
                  disabled
                  value={formData.declaration_date || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-stone-100 text-stone-600 text-sm font-mono"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-[#9E1A24] hover:bg-[#80141D] text-white font-black text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري إرسال الطلب وحفظ البيانات...</span>
                  </>
                ) : (
                  <>
                    <span>إرسال طلب التوظيف الآن</span>
                    <span className="text-xl">🚀</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step Navigation Buttons */}
        <div className="flex items-center justify-between pt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs sm:text-sm transition-all"
            >
              ← الخطوة السابقة
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 5 && (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[#9E1A24] hover:bg-[#80141D] text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <span>متابعة للخطوة التالية</span>
              <span>→</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};