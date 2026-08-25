import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { CurrentUser } from '../types';
import { SvgIcons } from './BobWichLogo';

interface LoginViewProps {
  onLoginSuccess: (user: CurrentUser) => void;
  onGoToPublicPortal?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onGoToPublicPortal }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await ApiService.login(username.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل الدخول، يرجى التأكد من البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans dir-rtl selection:bg-[#9E1A24] selection:text-white" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center mb-4">
          <div className="w-28 h-28 bg-[#83141D] rounded-3xl p-1.5 shadow-xl border-2 border-[#9E1A24]/30 flex items-center justify-center overflow-hidden">
            <img
              src="/bobwich-logo.jpg"
              alt="BOB WICH Official Mascot Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
        </div>

        <h2 className="text-center text-3xl font-black tracking-tight text-stone-900">
          نظام التوظيف وإدارة الموارد البشرية
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          منظومة إدارة الكفاءات والتعيينات الرسمية - <strong className="text-[#9E1A24]">BOB WICH</strong>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-stone-200/80">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <p className="font-medium leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-1.5">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="مثال: admin أو hr"
                  autoComplete="username"
                  className="block w-full px-4 py-3 rounded-xl border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-stone-800">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-stone-500 hover:text-[#9E1A24] font-medium"
                >
                  {showPassword ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="block w-full px-4 py-3 rounded-xl border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#9E1A24] focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-[#9E1A24] hover:bg-[#83141D] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9E1A24] disabled:opacity-60 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>جاري التحقق وتسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول إلى النظام</span>
                  <span>←</span>
                </>
              )}
            </button>
          </form>

          {/* Candidate Portal Link */}
          {onGoToPublicPortal && (
            <div className="mt-6 pt-4 text-center border-t border-stone-100">
              <p className="text-xs text-stone-500 mb-1.5">هل أنت متقدم ترغب في الانضمام لفريقنا؟</p>
              <button
                type="button"
                onClick={onGoToPublicPortal}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#9E1A24] hover:underline"
              >
                <span>الانتقال إلى استمارة التقديم على وظيفة</span>
                <span>←</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
