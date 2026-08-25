import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { CurrentUser } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!oldPassword) {
      setError('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف أو أرقام على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    try {
      setIsLoading(true);
      await ApiService.changePassword(oldPassword, newPassword);
      setSuccessMsg('تم تغيير كلمة المرور بنجاح');
      setTimeout(() => {
        onClose();
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs font-sans dir-rtl" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden">
        <div className="bg-[#9E1A24] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <h3 className="font-bold text-lg">تغيير كلمة المرور</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
            حساب المستخدم: <strong className="text-stone-900">{currentUser.name}</strong> ({currentUser.username})
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold">
              ✓ {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">كلمة المرور الحالية</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">كلمة المرور الجديدة (6 أحرف على الأقل)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
            />
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-[#9E1A24] hover:bg-[#83141D] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold text-sm transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
