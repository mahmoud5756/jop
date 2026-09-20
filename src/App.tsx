import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Applicant,
  Employee,
  Branch,
  JobPosition,
  CurrentUser,
} from './types';
import { ApiService } from './services/api';
import { Navbar } from './components/Navbar';
import { ApplicantsList } from './components/ApplicantsList';
import { ApplicantForm } from './components/ApplicantForm';
import { ApplicantDetailsModal } from './components/ApplicantDetailsModal';
import { PrintApplicationView } from './components/PrintApplicationView';
import { CashierContractView } from './components/CashierContractView';
import { ResignationClearanceView } from './components/ResignationClearanceView';
import { PayslipView } from './components/PayslipView';
import { EmployeeCardView } from './components/EmployeeCardView';
import { DocumentsPrintView } from './components/DocumentsPrintView';
import { RejectedArchiveView } from './components/RejectedArchiveView';
import { DepartedArchiveView } from './components/DepartedArchiveView';
import { EmployeesView } from './components/EmployeesView';
import { AuditLogsView } from './components/AuditLogsView';
import { BranchesAndPositionsView } from './components/BranchesAndPositionsView';
import { CompanySettingsView } from './components/CompanySettingsView';
import { FormFieldsSettingsView } from './components/FormFieldsSettingsView';
import { PublicApplicantPortal } from './components/PublicApplicantPortal';
import { SharePortalModal } from './components/SharePortalModal';
import { LoginView } from './components/LoginView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SvgIcons } from './components/BobWichLogo';
import { isDepartedEmployee } from './utils/employeeStatus';
import { isRejectedApplicant, buildStatusChangePayload, REJECTED_STATUS } from './utils/applicantStatus';

export function App() {
  // Check if URL has public apply parameter
  const checkInitialPortalMode = (): boolean => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'apply' || window.location.hash === '#apply') {
        return true;
      }
    }
    return false;
  };

  // لينك التسجيل المخصص للموظفين الحاليين: ?mode=apply&type=staff
  const checkInitialPortalCategory = (): 'external' | 'internal_staff' => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('type') === 'staff') {
        return 'internal_staff';
      }
    }
    return 'external';
  };

  const [isPublicPortal, setIsPublicPortal] = useState<boolean>(checkInitialPortalMode);
  const [portalCategory, setPortalCategory] = useState<'external' | 'internal_staff'>(checkInitialPortalCategory);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => ApiService.getSavedUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Navigation & View State
  const [currentView, setCurrentView] = useState<'applicants' | 'employees' | 'internal_staff_applicants' | 'new_applicant' | 'edit_applicant' | 'audit_logs' | 'branches_positions' | 'company_settings' | 'form_fields' | 'rejected_archive' | 'departed_archive' | 'print'>('applicants');

  // Share & QR Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isStaffShareModalOpen, setIsStaffShareModalOpen] = useState(false);

  // Data Collections
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // فصل أرشيف المتقدمين الجدد عن أرشيف الموظفين الحاليين اللي بيسجلوا
  // بياناتهم من اللينك المخصص لهم — بيانات المصدر الواحد applicants بس
  // بنعرضها في تابين منفصلين حسب التصنيف.
  //
  // المرفوضين بيتنقلوا تلقائيًا من التابين دول لتاب "أرشيف المرفوضين"
  // (نفس البيانات ونفس الجدول، بس معروضين منفصلين).
  const externalApplicants = useMemo(
    () => applicants.filter(a => a.applicant_category !== 'internal_staff' && !isRejectedApplicant(a)),
    [applicants]
  );
  const staffApplicants = useMemo(
    () => applicants.filter(a => a.applicant_category === 'internal_staff' && !isRejectedApplicant(a)),
    [applicants]
  );
  // الموظفين النشطين بيفضلوا في سجل الموظفين، والمستقيلين/منهيي التعاقد في أرشيفهم
  const activeEmployees = useMemo(() => employees.filter(e => !isDepartedEmployee(e)), [employees]);
  const departedEmployees = useMemo(() => employees.filter(e => isDepartedEmployee(e)), [employees]);
  const rejectedApplicants = useMemo(
    () => applicants.filter(a => isRejectedApplicant(a)),
    [applicants]
  );

  // Selected item states
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null);
  const [newApplicantCategory, setNewApplicantCategory] = useState<'external' | 'internal_staff'>('external');
  const [printingApplicant, setPrintingApplicant] = useState<Applicant | null>(null);
  const [printingContractEmployee, setPrintingContractEmployee] = useState<Employee | null>(null);
  const [printingResignationEmployee, setPrintingResignationEmployee] = useState<Employee | null>(null);
  const [printingPayslipEmployee, setPrintingPayslipEmployee] = useState<Employee | null>(null);
  const [printingCardEmployee, setPrintingCardEmployee] = useState<Employee | null>(null);
  // طباعة البطاقة (وش وضهر) والشهادة الصحية
  const [printingDocsApplicant, setPrintingDocsApplicant] = useState<Applicant | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Verify session on mount
  useEffect(() => {
    async function checkAuth() {
      const token = ApiService.getToken();
      if (!token) {
        setCurrentUser(null);
        setIsCheckingAuth(false);
        return;
      }
      try {
        const user = await ApiService.getMe();
        setCurrentUser(user);
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        ApiService.clearSession();
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    if (!isPublicPortal) {
      checkAuth();
    } else {
      setIsCheckingAuth(false);
    }
  }, [isPublicPortal]);

  // Fetch all authenticated dashboard data.
  // silent = true: تحديث في الخلفية (بدون لودر ولا رسالة خطأ) — بيتستخدم في التحديث التلقائي.
  const lastFetchRef = useRef(0);
  const inFlightRef = useRef(false);

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!currentUser || isPublicPortal) return;
    // التحديث الصامت بيتخطى لو فيه تحديث صامت شغال؛ لكن التحديث بعد أي حفظ/تعديل بيشتغل دايمًا
    if (silent && inFlightRef.current) return;
    if (silent) inFlightRef.current = true;
    lastFetchRef.current = Date.now();
    try {
      if (!silent) {
        setIsLoading(true);
        setErrorMessage(null);
      }
      const [apps, emps, brs, pos] = await Promise.all([
        ApiService.getApplicants(),
        ApiService.getEmployees(),
        ApiService.getBranches(),
        ApiService.getPositions(),
      ]);
      setApplicants(Array.isArray(apps) ? apps : []);
      setEmployees(Array.isArray(emps) ? emps : []);
      setBranches(Array.isArray(brs) ? brs : []);
      setPositions(Array.isArray(pos) ? pos : []);
      if (silent) setErrorMessage(null);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      if (err.message?.includes('غير مصرح') || err.message?.includes('جلسة')) {
        handleLogout();
      } else if (!silent) {
        setErrorMessage(err.message || 'فشل في الاتصال بقاعدة البيانات');
      }
    } finally {
      if (silent) inFlightRef.current = false;
      if (!silent) setIsLoading(false);
    }
  }, [currentUser, isPublicPortal]);

  useEffect(() => {
    if (currentUser && !isPublicPortal) {
      fetchData();
    }
  }, [currentUser, isPublicPortal, fetchData]);

  // تحديث تلقائي: بدل ما تعمل ريفريش كل شوية، الطلبات الجديدة (من لينك التقديم) والتعديلات
  // اللي بتتم من أجهزة تانية بتظهر لوحدها —
  //   • كل 45 ثانية طول ما التاب مفتوح ومعروض
  //   • أول ما ترجع للتاب أو للنافذة بعد ما كنت في حاجة تانية
  //   • أول ما تنتقل بين الشاشات (لو عدّى أكتر من 5 ثواني من آخر تحديث)
  useEffect(() => {
    if (!currentUser || isPublicPortal) return;
    const refreshIfStale = (minAgeMs: number) => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current < minAgeMs) return;
      fetchData(true);
    };
    const interval = window.setInterval(() => refreshIfStale(40_000), 45_000);
    const onVisible = () => refreshIfStale(10_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [currentUser, isPublicPortal, fetchData]);

  useEffect(() => {
    if (!currentUser || isPublicPortal) return;
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastFetchRef.current < 5_000) return;
    fetchData(true);
  }, [currentView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auth Handlers
  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    showToast(`مرحباً بك مجدداً ${user.name}`);
  };

  const handleLogout = () => {
    ApiService.clearSession();
    setCurrentUser(null);
    setSelectedApplicant(null);
    setEditingApplicant(null);
    setPrintingApplicant(null);
    setPrintingCardEmployee(null);
    setPrintingDocsApplicant(null);
    showToast('تم تسجيل الخروج بنجاح');
  };

  // Navigation Handlers
  const handleAddNewApplicant = (category: 'external' | 'internal_staff' = 'external') => {
    setEditingApplicant(null);
    setNewApplicantCategory(category);
    setCurrentView('new_applicant');
  };

  const handleEditApplicant = (applicant: Applicant) => {
    setSelectedApplicant(null);
    setEditingApplicant(applicant);
    setCurrentView('edit_applicant');
  };

  const handleViewApplicant = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
  };

  const handlePrintApplicant = (applicant: Applicant) => {
    setPrintingApplicant(applicant);
    setCurrentView('print');
  };

  const handlePrintApplicantDocs = (applicant: Applicant) => {
    setPrintingDocsApplicant(applicant);
  };

  const canManageHR = currentUser?.role === 'admin' || currentUser?.role === 'hr';

  // رفض متقدم ونقله لأرشيف المرفوضين
  const handleRejectApplicant = async (applicant: Applicant) => {
    if (!canManageHR) {
      alert('عذراً، رفض الطلبات مقتصر على مدير النظام والموارد البشرية');
      return;
    }
    if (applicant.is_converted_to_employee) {
      alert('لا يمكن رفض متقدم تم تحويله إلى موظف بالفعل.');
      return;
    }
    if (!window.confirm(`هل تريد رفض طلب "${applicant.full_name}" ونقله إلى أرشيف المرفوضين؟\nتقدر ترجّعه من الأرشيف في أي وقت.`)) {
      return;
    }
    try {
      await ApiService.updateApplicant(applicant.id, buildStatusChangePayload(applicant, REJECTED_STATUS), currentUser || undefined);
      setSelectedApplicant(null);
      await fetchData();
      showToast(`تم رفض طلب "${applicant.full_name}" ونقله إلى أرشيف المرفوضين`);
    } catch (err: any) {
      alert(err.message || 'فشل رفض الطلب');
    }
  };

  // استرجاع طلب مرفوض من الأرشيف لقائمة المتقدمين (تحت المراجعة)
  const handleRestoreApplicant = async (applicant: Applicant) => {
    if (!canManageHR) {
      alert('عذراً، استرجاع الطلبات مقتصر على مدير النظام والموارد البشرية');
      return;
    }
    if (!window.confirm(`هل تريد إرجاع طلب "${applicant.full_name}" من الأرشيف إلى قائمة المتقدمين (تحت المراجعة)؟`)) {
      return;
    }
    try {
      await ApiService.updateApplicant(applicant.id, buildStatusChangePayload(applicant, 'تحت المراجعة'), currentUser || undefined);
      setSelectedApplicant(null);
      await fetchData();
      showToast(`تم استرجاع طلب "${applicant.full_name}" إلى قائمة المتقدمين`);
    } catch (err: any) {
      alert(err.message || 'فشل استرجاع الطلب');
    }
  };

  const handlePrintCashierContract = (employee: Employee) => {
    setPrintingContractEmployee(employee);
  };

  const handlePrintResignation = (employee: Employee) => {
    setPrintingResignationEmployee(employee);
  };

  const handlePrintPayslip = (employee: Employee) => {
    setPrintingPayslipEmployee(employee);
  };

  const handlePrintEmployeeCard = (employee: Employee) => {
    setPrintingCardEmployee(employee);
  };

  /**
   * صورة كارت الموظف: لو ملف الموظف نفسه مفيهوش صورة، نجيبها من ملف
   * التقديم الأصلي (الصورة الشخصية أو المرفق "صور شخصية").
   */
  const getEmployeeCardPhoto = (employee: Employee): string | undefined => {
    if (employee.photo_url) return employee.photo_url;
    const linked = applicants.find(a => a.id === employee.applicant_id);
    if (!linked) return undefined;
    if (linked.photo_url) return linked.photo_url;
    const personalDoc = linked.documents?.find(d => d.document_type === 'صور شخصية');
    return personalDoc?.file_url;
  };

  // إغلاق معاينة الطباعة والرجوع لشاشة الطلبات — مع تنظيف حالة الطباعة
  // بالكامل حتى يمكن طباعة استمارة أخرى مباشرة بدون تحديث الصفحة.
  const handleClosePrintView = () => {
    setPrintingApplicant(null);
    setCurrentView('applicants');
  };

  const handleEmployeeUpdated = (updated: Employee) => {
    setEmployees(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    showToast(`تم تحديث بيانات الموظف "${updated.full_name}" بنجاح`);
    fetchData();
  };

  const handleSaveSuccess = (savedApplicant: Applicant) => {
    fetchData();
    setCurrentView(savedApplicant.applicant_category === 'internal_staff' ? 'internal_staff_applicants' : 'applicants');
    showToast(`تم حفظ طلب التوظيف للمتقدم "${savedApplicant.full_name}" بنجاح.`);
  };

  const handleDeleteApplicant = async (applicantId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('عذراً، صلاحية حذف طلبات التوظيف مقتصرة حصرياً على مدير النظام (Admin)');
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً من قاعدة البيانات؟')) {
      return;
    }
    try {
      await ApiService.deleteApplicant(applicantId);
      setSelectedApplicant(null);
      fetchData();
      showToast('تم حذف طلب التوظيف بنجاح من قاعدة البيانات.');
    } catch (err: any) {
      alert(err.message || 'فشل في حذف طلب التوظيف');
    }
  };

  const handleConvertedToEmployee = (employee: Employee) => {
    fetchData();
    showToast(`تم تحويل المتقدم إلى موظف بنجاح بكود (${employee.employee_code})`);
  };

  const handleUpdateEmployeeStatus = async (
    employeeId: string,
    newStatus: string,
    extra?: { separation_date?: string; separation_reason?: string },
  ) => {
    try {
      const { employee: updated, warning } = await ApiService.updateEmployeeStatus(employeeId, newStatus, extra);
      setEmployees(prev => prev.map(e => e.id === employeeId ? updated : e));
      showToast(
        isDepartedEmployee(updated)
          ? `تم تسجيل "${newStatus}" للموظف "${updated.full_name}" ونقله إلى أرشيف المستقيلين`
          : `تم تحديث حالة الموظف إلى "${newStatus}" بنجاح`
      );
      if (warning) alert(warning);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'فشل تحديث حالة الموظف');
      throw err;
    }
  };

  // إعادة موظف من أرشيف المستقيلين للشغل (حالة: نشط)
  const handleReinstateEmployee = async (employee: Employee) => {
    if (!canManageHR) {
      alert('عذراً، إعادة التعيين مقتصرة على مدير النظام والموارد البشرية');
      return;
    }
    if (!window.confirm(`هل تريد إعادة تعيين "${employee.full_name}" وإرجاعه إلى سجل الموظفين (نشط)؟`)) {
      return;
    }
    try {
      await handleUpdateEmployeeStatus(employee.id, 'نشط');
    } catch {
      /* التنبيه اتعرض داخل handleUpdateEmployeeStatus */
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الموظف نهائياً من النظام؟')) {
      return;
    }
    try {
      await ApiService.deleteEmployee(employeeId);
      setEmployees(prev => prev.filter(e => e.id !== employeeId));
      showToast('تم حذف الموظف بنجاح');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'فشل حذف الموظف');
    }
  };

  // =========================================================================
  // VIEW 1: PUBLIC CANDIDATE PORTAL (مفتوحة لعامة المتقدمين بدون تسجيل دخول)
  // =========================================================================
  if (isPublicPortal) {
    return (
      <>
        <PublicApplicantPortal
          category={portalCategory}
          onGoToAdmin={() => {
            setIsPublicPortal(false);
            if (window.history.pushState) {
              window.history.pushState({}, '', window.location.pathname);
            }
          }}
          onApplicationSubmitted={(newApp) => {
            showToast(`تم استلام طلب التوظيف بنجاح لكود (${newApp.application_code})`);
          }}
        />
        {/* Toast popup */}
        {toastMessage && (
          <div className="fixed bottom-6 left-6 z-70 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-stone-400 hover:text-white mr-2 text-xs cursor-pointer">
              ✕
            </button>
          </div>
        )}
      </>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATION LOADING SCREEN
  // =========================================================================
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#9E1A24] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-stone-600">جاري التحقق من جلسة الدخول...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: STAFF LOGIN SCREEN (إذا لم يكن مسجل الدخول)
  // =========================================================================
  if (!currentUser) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onGoToPublicPortal={() => {
            setPortalCategory('external');
            setIsPublicPortal(true);
            if (window.history.pushState) {
              window.history.pushState({}, '', '?mode=apply');
            }
          }}
        />
        {/* Toast popup */}
        {toastMessage && (
          <div className="fixed bottom-6 left-6 z-70 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-stone-400 hover:text-white mr-2 text-xs cursor-pointer">
              ✕
            </button>
          </div>
        )}
      </>
    );
  }

  // =========================================================================
  // VIEW 4: SECURED HR & ADMIN MANAGEMENT DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans dir-rtl" dir="rtl">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-70 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 print:hidden">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-stone-400 hover:text-white mr-2 text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
      />

      {/* Share Portal Modal — لينك المتقدمين الجدد */}
      <SharePortalModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Share Portal Modal — لينك تسجيل الموظفين الحاليين */}
      <SharePortalModal
        isOpen={isStaffShareModalOpen}
        onClose={() => setIsStaffShareModalOpen(false)}
        category="internal_staff"
      />

      {/* Cashier Contract Print Overlay */}
      {printingContractEmployee && (
        <CashierContractView
          employee={printingContractEmployee}
          onBack={() => setPrintingContractEmployee(null)}
        />
      )}

      {/* Resignation & Custody Clearance Print Overlay (covers any role leaving) */}
      {printingResignationEmployee && (
        <ResignationClearanceView
          employee={printingResignationEmployee}
          onBack={() => setPrintingResignationEmployee(null)}
        />
      )}

      {/* Monthly Payslip ("مفردات المرتب") Print Overlay */}
      {printingPayslipEmployee && (
        <PayslipView
          employee={printingPayslipEmployee}
          onBack={() => setPrintingPayslipEmployee(null)}
        />
      )}

      {/* Official Employee ID Card (كارت الموظف) — card-sized PDF */}
      {printingCardEmployee && (
        <EmployeeCardView
          employee={printingCardEmployee}
          fallbackPhotoUrl={getEmployeeCardPhoto(printingCardEmployee)}
          onBack={() => setPrintingCardEmployee(null)}
        />
      )}

      {/* طباعة مستندات المتقدم: بطاقة الرقم القومي (وش وضهر) + الشهادة الصحية */}
      {printingDocsApplicant && (
        <DocumentsPrintView
          applicant={printingDocsApplicant}
          onBack={() => setPrintingDocsApplicant(null)}
        />
      )}

      {/* When in Print View: Render Print Layout */}
      {currentView === 'print' && printingApplicant ? (
        <PrintApplicationView
          applicant={printingApplicant}
          onBack={handleClosePrintView}
        />
      ) : (
        <div className="print:hidden">
          {/* Top Authenticated Navbar */}
          <Navbar
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            onSelectApplicant={handleViewApplicant}
            currentView={currentView}
            onNavigate={(view: any) => setCurrentView(view)}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            rejectedCount={rejectedApplicants.length}
            departedCount={departedEmployees.length}
          />

          {/* Main Content Area */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Database Connection Error */}
            {errorMessage && (
              <div className="mb-6 bg-red-50 border-r-4 border-red-600 p-4 rounded-2xl text-red-800 flex items-center justify-between text-sm shadow-xs">
                <div className="flex items-center gap-2 font-bold">
                  <SvgIcons.AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => fetchData()}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (currentView === 'applicants' || currentView === 'internal_staff_applicants' || currentView === 'rejected_archive') && applicants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-12 h-12 border-4 border-[#9E1A24] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-stone-600">جاري الاتصال بنظام BOB WICH وقاعدة البيانات...</p>
              </div>
            ) : (
              <>
                {/* VIEW: APPLICANTS LIST */}
                {currentView === 'applicants' && (
                  <ApplicantsList
                    applicants={externalApplicants}
                    branches={branches}
                    positions={positions}
                    currentUser={currentUser}
                    onAddNew={() => handleAddNewApplicant('external')}
                    onView={handleViewApplicant}
                    onEdit={handleEditApplicant}
                    onPrint={handlePrintApplicant}
                    onDelete={handleDeleteApplicant}
                    onOpenShareModal={() => setIsShareModalOpen(true)}
                    onPrintDocs={handlePrintApplicantDocs}
                    onReject={handleRejectApplicant}
                  />
                )}

                {/* VIEW: تسجيل الموظفين الحاليين — أرشيف منفصل تماماً */}
                {currentView === 'internal_staff_applicants' && (
                  <ApplicantsList
                    applicants={staffApplicants}
                    branches={branches}
                    positions={positions}
                    currentUser={currentUser}
                    onAddNew={() => handleAddNewApplicant('internal_staff')}
                    onView={handleViewApplicant}
                    onEdit={handleEditApplicant}
                    onPrint={handlePrintApplicant}
                    onDelete={handleDeleteApplicant}
                    onOpenShareModal={() => setIsStaffShareModalOpen(true)}
                    onPrintDocs={handlePrintApplicantDocs}
                    onReject={handleRejectApplicant}
                    title="تسجيل الموظفين الحاليين"
                    subtitle="أرشيف منفصل لتسجيلات الموظفين الحاليين في النظام الجديد — لا يتداخل مع المتقدمين الجدد"
                    shareButtonLabel="رابط تسجيل الموظفين الحاليين"
                    addNewLabel="تسجيل موظف يدوياً"
                    emptyStateLabel="لسه مفيش أي موظف سجّل بياناته من اللينك المخصص"
                  />
                )}

                {/* VIEW: أرشيف المرفوضين */}
                {currentView === 'rejected_archive' && canManageHR && (
                  <RejectedArchiveView
                    applicants={rejectedApplicants}
                    branches={branches}
                    positions={positions}
                    currentUser={currentUser}
                    onView={handleViewApplicant}
                    onPrint={handlePrintApplicant}
                    onPrintDocs={handlePrintApplicantDocs}
                    onRestore={handleRestoreApplicant}
                    onDelete={handleDeleteApplicant}
                  />
                )}

                {/* VIEW: أرشيف المستقيلين */}
                {currentView === 'departed_archive' && canManageHR && (
                  <DepartedArchiveView
                    employees={departedEmployees}
                    applicants={applicants}
                    branches={branches}
                    positions={positions}
                    currentUser={currentUser}
                    onViewApplicant={handleViewApplicant}
                    onPrintDocs={handlePrintApplicantDocs}
                    onPrintResignation={handlePrintResignation}
                    onReinstate={handleReinstateEmployee}
                    onDelete={handleDeleteEmployee}
                  />
                )}

                {/* VIEW: NEW / EDIT FORM */}
                {(currentView === 'new_applicant' || currentView === 'edit_applicant') && (
                  <ApplicantForm
                    initialData={editingApplicant}
                    currentUser={currentUser}
                    defaultCategory={newApplicantCategory}
                    onSaveSuccess={handleSaveSuccess}
                    onCancel={() => setCurrentView(
                      (editingApplicant?.applicant_category || newApplicantCategory) === 'internal_staff'
                        ? 'internal_staff_applicants'
                        : 'applicants'
                    )}
                  />
                )}

                {/* VIEW: EMPLOYEES */}
                {currentView === 'employees' && (
                  <EmployeesView
                    employees={activeEmployees}
                    applicants={applicants}
                    branches={branches}
                    positions={positions}
                    currentUser={currentUser}
                    onViewApplicant={handleViewApplicant}
                    onPrintApplicant={handlePrintApplicant}
                    onPrintDocs={handlePrintApplicantDocs}
                    onPrintContract={handlePrintCashierContract}
                    onPrintResignation={handlePrintResignation}
                    onPrintPayslip={handlePrintPayslip}
                    onPrintCard={handlePrintEmployeeCard}
                    onUpdateStatus={handleUpdateEmployeeStatus}
                    onEmployeeUpdated={handleEmployeeUpdated}
                    onDelete={handleDeleteEmployee}
                  />
                )}

                {/* VIEW: AUDIT LOGS */}
                {currentView === 'audit_logs' && <AuditLogsView />}

                {/* VIEW: BRANCHES & POSITIONS */}
                {currentView === 'branches_positions' && currentUser && (
                  <BranchesAndPositionsView currentUser={currentUser} showToast={showToast} />
                )}

                {/* VIEW: COMPANY SETTINGS (السجل التجاري / البطاقة الضريبية) */}
                {currentView === 'company_settings' && currentUser && (
                  <CompanySettingsView currentUser={currentUser} showToast={showToast} />
                )}

                {/* VIEW: FORM FIELDS SETTINGS (إعدادات نموذج التقديم) */}
                {currentView === 'form_fields' && currentUser && (
                  <FormFieldsSettingsView currentUser={currentUser} showToast={showToast} />
                )}
              </>
            )}
          </main>

          {/* Applicant Details Modal */}
          {selectedApplicant && (
            <ApplicantDetailsModal
              applicant={selectedApplicant}
              currentUser={currentUser}
              onClose={() => setSelectedApplicant(null)}
              onEdit={handleEditApplicant}
              onPrint={handlePrintApplicant}
              onConverted={handleConvertedToEmployee}
              onDelete={handleDeleteApplicant}
              onPrintDocs={handlePrintApplicantDocs}
              onReject={handleRejectApplicant}
              onRestore={handleRestoreApplicant}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
