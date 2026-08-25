import React, { useState, useEffect, useRef } from 'react';
import { BobWichLogo, SvgIcons } from './BobWichLogo';
import { CurrentUser, Applicant, Employee } from '../types';
import { ApiService } from '../services/api';

interface NavbarProps {
  currentView?: string;
  activeView?: string;
  onNavigate: (view: any) => void;
  currentUser: CurrentUser;
  onLogout: () => void;
  onOpenChangePassword?: () => void;
  onSelectApplicant: (applicant: Applicant) => void;
  onSelectEmployee?: (employee: Employee) => void;
  onOpenShareModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  activeView,
  onNavigate,
  currentUser,
  onLogout,
  onOpenChangePassword,
  onSelectApplicant,
  onSelectEmployee,
  onOpenShareModal,
}) => {
  const currentActive = currentView || activeView || 'applicants';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ applicants: Applicant[]; employees: Employee[] }>({
    applicants: [],
    employees: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isOpenSearch, setIsOpenSearch] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ applicants: [], employees: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await ApiService.globalSearch(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpenSearch(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-100 text-[#9E1A24] text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">👑 مدير النظام</span>;
      case 'hr':
        return <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">💼 الموارد البشرية</span>;
      case 'manager':
        return <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200">🏪 مدير فرع</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full">مستخدم</span>;
    }
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner with Brand Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
          {/* Logo */}
          <div
            className="cursor-pointer transition-transform hover:scale-[1.01]"
            onClick={() => onNavigate('applicants')}
          >
            <BobWichLogo size="md" />
          </div>

          {/* Quick Search & Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Global HR Search Bar */}
            <div className="relative flex-1 md:w-80" ref={searchRef}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setIsOpenSearch(true);
                  }}
                  onFocus={() => setIsOpenSearch(true)}
                  placeholder="بحث سريع (بالاسم، الرقم القومي، الهاتف، الكود)..."
                  className="w-full pl-8 pr-10 py-2 rounded-xl bg-stone-100 border border-stone-300/80 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9E1A24] focus:border-transparent transition-all placeholder:text-stone-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <SvgIcons.Search className="w-4 h-4" />
                </span>
                {isSearching && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <div className="w-3.5 h-3.5 border-2 border-[#9E1A24] border-t-transparent rounded-full animate-spin"></div>
                  </span>
                )}
              </div>

              {/* Search Results Dropdown */}
              {isOpenSearch && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 max-h-96 overflow-y-auto">
                  {searchResults.applicants.length === 0 && searchResults.employees.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-500">
                      {isSearching ? 'جاري البحث في قاعدة البيانات...' : 'لا توجد نتائج مطابقة لبحثك'}
                    </div>
                  ) : (
                    <div>
                      {/* Applicants Results */}
                      {searchResults.applicants.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 bg-stone-50 border-y border-stone-100">
                            طلبات التوظيف والمتقدمين ({searchResults.applicants.length})
                          </div>
                          {searchResults.applicants.map(app => (
                            <div
                              key={app.id}
                              onClick={() => {
                                onSelectApplicant(app);
                                onNavigate('applicant_detail');
                                setIsOpenSearch(false);
                                setSearchQuery('');
                              }}
                              className="px-3 py-2.5 hover:bg-amber-50/70 cursor-pointer border-b border-stone-100 flex items-center justify-between transition-colors"
                            >
                              <div>
                                <div className="font-bold text-stone-900 text-xs">{app.full_name}</div>
                                <div className="text-[11px] text-stone-500 flex items-center gap-2">
                                  <span className="font-mono text-[#9E1A24] font-bold">{app.application_code}</span>
                                  <span>•</span>
                                  <span>{app.position_name}</span>
                                </div>
                              </div>
                              <span className="text-stone-500 font-mono text-[11px]">{app.phone}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Employees Results */}
                      {searchResults.employees.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 bg-stone-50 border-y border-stone-100">
                            سجل الموظفين المعينين ({searchResults.employees.length})
                          </div>
                          {searchResults.employees.map(emp => (
                            <div
                              key={emp.id}
                              onClick={() => {
                                if (onSelectEmployee) onSelectEmployee(emp);
                                onNavigate('employee_detail');
                                setIsOpenSearch(false);
                                setSearchQuery('');
                              }}
                              className="px-3 py-2.5 hover:bg-red-50/70 cursor-pointer border-b border-stone-100 flex items-center justify-between transition-colors"
                            >
                              <div>
                                <div className="font-bold text-stone-900 text-xs">{emp.full_name}</div>
                                <div className="text-[11px] text-stone-500 flex items-center gap-2">
                                  <span className="font-mono text-emerald-700 font-bold">{emp.employee_code}</span>
                                  <span>•</span>
                                  <span>{emp.position_name}</span>
                                </div>
                              </div>
                              <span className="text-stone-500 font-mono text-[11px]">{emp.phone}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Authenticated User Profile & Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-xl border border-stone-200 text-xs transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#9E1A24] text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-right hidden sm:block">
                  <div className="font-bold text-stone-900 text-xs leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-stone-500">{currentUser.username}</div>
                </div>
                {getRoleBadge(currentUser.role)}
                <span className="text-stone-400 text-[10px]">▼</span>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="font-bold text-stone-900">{currentUser.name}</p>
                    <p className="text-stone-500 text-[11px] font-mono">{currentUser.email || currentUser.username}</p>
                    {currentUser.branch && (
                      <p className="text-[10px] text-stone-600 mt-0.5">{currentUser.branch}</p>
                    )}
                  </div>

                  {onOpenChangePassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenChangePassword();
                      }}
                      className="w-full text-right px-4 py-2.5 hover:bg-stone-50 text-stone-700 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>🔒</span>
                      <span>تغيير كلمة المرور</span>
                    </button>
                  )}

                  <div className="border-t border-stone-100 my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-right px-4 py-2.5 hover:bg-red-50 text-red-700 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>🚪</span>
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share QR / Public Link Button */}
            {onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="مشاركة رابط التقديم والـ QR Code"
              >
                <SvgIcons.QrCode className="w-4 h-4 text-amber-700" />
                <span className="hidden sm:inline">رابط التقديم والـ QR</span>
              </button>
            )}

            {/* New Applicant Action Button */}
            {(currentUser.role === 'admin' || currentUser.role === 'hr' || currentUser.role === 'manager') && (
              <button
                onClick={() => onNavigate('new_applicant')}
                className="bg-[#9E1A24] hover:bg-[#85151e] text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
              >
                <SvgIcons.Plus className="w-4 h-4 stroke-[3]" />
                <span className="whitespace-nowrap">+ إضافة متقدم</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-t border-stone-100 pt-2 pb-1 overflow-x-auto text-sm">
          <button
            onClick={() => onNavigate('applicants')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              currentActive === 'applicants'
                ? 'bg-red-50 text-[#9E1A24] border-b-2 border-[#9E1A24]'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <SvgIcons.FileText className="w-4 h-4" />
            <span>المتقدمون وطلبات التوظيف</span>
          </button>

          <button
            onClick={() => onNavigate('employees')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              currentActive === 'employees'
                ? 'bg-red-50 text-[#9E1A24] border-b-2 border-[#9E1A24]'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <SvgIcons.Users className="w-4 h-4" />
            <span>سجل الموظفين (Employees)</span>
          </button>

          <button
            onClick={() => onNavigate('audit_logs')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              currentActive === 'audit_logs' || currentActive === 'audit'
                ? 'bg-red-50 text-[#9E1A24] border-b-2 border-[#9E1A24]'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <SvgIcons.History className="w-4 h-4" />
            <span>لوحة المؤشرات وسجل التعديلات</span>
          </button>

          {(currentUser.role === 'admin' || currentUser.role === 'hr') && (
            <button
              onClick={() => onNavigate('branches_positions')}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                currentActive === 'branches_positions'
                  ? 'bg-red-50 text-[#9E1A24] border-b-2 border-[#9E1A24]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <span className="text-base">🏢</span>
              <span>إدارة الفروع والوظائف</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
