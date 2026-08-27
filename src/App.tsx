import React, { useState, useEffect, useCallback } from 'react';
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
import { EmployeesView } from './components/EmployeesView';
import { AuditLogsView } from './components/AuditLogsView';
import { BranchesAndPositionsView } from './components/BranchesAndPositionsView';
import { CompanySettingsView } from './components/CompanySettingsView';
import { PublicApplicantPortal } from './components/PublicApplicantPortal';
import { SharePortalModal } from './components/SharePortalModal';
import { LoginView } from './components/LoginView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SvgIcons } from './components/BobWichLogo';

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

  const [isPublicPortal, setIsPublicPortal] = useState<boolean>(checkInitialPortalMode);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => ApiService.getSavedUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Navigation & View State
  const [currentView, setCurrentView] = useState<'applicants' | 'employees' | 'new_applicant' | 'edit_applicant' | 'audit_logs' | 'branches_positions' | 'company_settings' | 'print'>('applicants');

  // Share & QR Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Data Collections
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected item states
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null);
  const [printingApplicant, setPrintingApplicant] = useState<Applicant | null>(null);
  const [printingContractEmployee, setPrintingContractEmployee] = useState<Employee | null>(null);
  const [printingResignationEmployee, setPrintingResignationEmployee] = useState<Employee | null>(null);
  const [printingPayslipEmployee, setPrintingPayslipEmployee] = useState<Employee | null>(null);

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

  // Fetch all initial authenticated dashboard data
  const fetchData = useCallback(async () => {
    if (!currentUser || isPublicPortal) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
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
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      if (err.message?.includes('غير مصرح') || err.message?.includes('جلسة')) {
        handleLogout();
      } else {
        setErrorMessage(err.message || 'فشل في الاتصال بقاعدة البيانات');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isPublicPortal]);

  useEffect(() => {
    if (currentUser && !isPublicPortal) {
      fetchData();
    }
  }, [currentUser, isPublicPortal, fetchData]);

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
    showToast('تم تسجيل الخروج بنجاح');
  };

  // Navigation Handlers
  const handleAddNewApplicant = () => {
    setEditingApplicant(null);
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

  const handlePrintCashierContract = (employee: Employee) => {
    setPrintingContractEmployee(employee);
  };

  const handlePrintResignation = (employee: Employee) => {
    setPrintingResignationEmployee(employee);
  };

  const handlePrintPayslip = (employee: Employee) => {
    setPrintingPayslipEmployee(employee);
  };

  const handleSaveSuccess = (savedApplicant: Applicant) => {
    fetchData();
    setCurrentView('applicants');
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

  const handleUpdateEmployeeStatus = async (employeeId: string, newStatus: string) => {
    try {
      const updated = await ApiService.updateEmployeeStatus(employeeId, newStatus);
      setEmployees(prev => prev.map(e => e.id === employeeId ? updated : e));
      showToast(`تم تحديث حالة الموظف إلى "${newStatus}" بنجاح`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'فشل تحديث حالة الموظف');
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

      {/* Share Portal Modal */}
      <SharePortalModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
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

      {/* When in Print View: Render Print Layout */}
      {currentView === 'print' && printingApplicant ? (
        <PrintApplicationView
          applicant={printingApplicant}
          onBack={() => setCurrentView('applicants')}
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
            {isLoading && currentView === 'applicants' && applicants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-12 h-12 border-4 border-[#9E1A24] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-stone-600">جاري الاتصال بنظام BOB WICH وقاعدة البيانات...</p>
              </div>
            ) : (
              <>
                {/* VIEW: APPLICANTS LIST */}
                {currentView === 'applicants' && (
                  <ApplicantsList
                    applicants={applicants}
                    branches={branches}
                    positions={positions}
                    currentUser={currentUser}
                    onAddNew={handleAddNewApplicant}
                    onView={handleViewApplicant}
                    onEdit={handleEditApplicant}
                    onPrint={handlePrintApplicant}
                    onDelete={handleDeleteApplicant}
                    onOpenShareModal={() => setIsShareModalOpen(true)}
                  />
                )}

                {/* VIEW: NEW / EDIT FORM */}
                {(currentView === 'new_applicant' || currentView === 'edit_applicant') && (
                  <ApplicantForm
                    initialData={editingApplicant}
                    currentUser={currentUser}
                    onSaveSuccess={handleSaveSuccess}
                    onCancel={() => setCurrentView('applicants')}
                  />
                )}

                {/* VIEW: EMPLOYEES */}
                {currentView === 'employees' && (
                  <EmployeesView
                    employees={employees}
                    applicants={applicants}
                    currentUser={currentUser}
                    onViewApplicant={handleViewApplicant}
                    onPrintApplicant={handlePrintApplicant}
                    onPrintContract={handlePrintCashierContract}
                    onPrintResignation={handlePrintResignation}
                    onPrintPayslip={handlePrintPayslip}
                    onUpdateStatus={handleUpdateEmployeeStatus}
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
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
