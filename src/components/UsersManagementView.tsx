import React, { useState, useEffect } from 'react';
import { CurrentUser, UserRole, Branch } from '../types';
import { ApiService } from '../services/api';
import { UserPlus, Edit2, Trash2, ShieldCheck, ShieldOff, X, Save, AlertCircle, KeyRound } from 'lucide-react';

interface Props {
  currentUser: CurrentUser;
  branches: Branch[];
  showToast: (msg: string) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدير النظام',
  hr: 'الموارد البشرية',
  manager: 'مدير فرع',
  employee: 'موظف',
};

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  hr: 'bg-amber-50 text-amber-700 border-amber-200',
  manager: 'bg-blue-50 text-blue-700 border-blue-200',
  employee: 'bg-stone-100 text-stone-700 border-stone-200',
};

interface UserFormState {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  branch: string;
  password: string;
}

const EMPTY_FORM: UserFormState = { username: '', name: '', email: '', role: 'hr', branch: '', password: '' };

export function UsersManagementView({ currentUser, branches, showToast }: Props) {
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CurrentUser | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ApiService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل قائمة المستخدمين');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenNew = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: CurrentUser) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      name: u.name,
      email: u.email || '',
      role: u.role,
      branch: u.branch || '',
      password: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim() || (!editingUser && !form.username.trim())) {
      setFormError('الاسم الكامل واسم المستخدم مطلوبين');
      return;
    }
    if (!editingUser && form.password.trim().length < 6) {
      setFormError('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
      return;
    }
    if (form.role === 'manager' && !form.branch.trim()) {
      setFormError('يرجى اختيار الفرع الخاص بمدير الفرع');
      return;
    }

    try {
      setIsSaving(true);
      if (editingUser) {
        const updated = await ApiService.updateUser(editingUser.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          branch: form.role === 'manager' ? form.branch : undefined,
          password: form.password.trim() || undefined,
        });
        setUsers(prev => prev.map(u => (u.id === updated.id ? { ...u, ...updated } : u)));
        showToast(`تم تحديث حساب (${updated.name}) بنجاح`);
      } else {
        const created = await ApiService.createUser({
          username: form.username,
          name: form.name,
          email: form.email,
          role: form.role,
          branch: form.role === 'manager' ? form.branch : undefined,
          password: form.password,
        });
        setUsers(prev => [...prev, created]);
        showToast(`تم إنشاء حساب (${created.name}) بصلاحية ${ROLE_LABELS[created.role]} بنجاح`);
      }
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.message || 'فشل حفظ بيانات المستخدم');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (u: CurrentUser) => {
    if (u.id === currentUser.id) {
      showToast('لا يمكنك تعطيل حسابك الخاص');
      return;
    }
    try {
      const updated = await ApiService.updateUser(u.id, { is_active: !u.is_active });
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, ...updated } : x)));
      showToast(updated.is_active ? `تم تفعيل حساب (${u.name})` : `تم تعطيل حساب (${u.name})`);
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث حالة الحساب');
    }
  };

  const handleDelete = async (u: CurrentUser) => {
    if (u.id === currentUser.id) {
      showToast('لا يمكنك حذف حسابك الخاص');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف حساب (${u.name}) نهائيًا؟`)) return;
    try {
      await ApiService.deleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      showToast(`تم حذف حساب (${u.name}) بنجاح`);
    } catch (err: any) {
      showToast(err.message || 'فشل حذف المستخدم');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-700 via-amber-800 to-stone-900 rounded-2xl p-6 text-white shadow-xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-600/30 px-3 py-1 rounded-full text-amber-200 text-xs font-semibold mb-2 border border-amber-500/30">
            <ShieldCheck className="w-4 h-4" /> إعدادات النظام الإدارية
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
          <p className="text-amber-100/80 text-sm mt-1">
            إنشاء حسابات جديدة لمديري النظام والموارد البشرية ومديري الفروع، وتحديد صلاحياتهم.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="shrink-0 px-5 py-2.5 bg-white/95 hover:bg-white text-amber-900 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all"
        >
          <UserPlus className="w-4 h-4" /> إضافة مستخدم جديد
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-r-4 border-red-600 p-4 rounded-2xl text-red-800 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-10 h-10 border-4 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-stone-600">جاري تحميل المستخدمين...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold">
                  <th className="text-right px-4 py-3">الاسم</th>
                  <th className="text-right px-4 py-3">اسم المستخدم</th>
                  <th className="text-right px-4 py-3">الصلاحية</th>
                  <th className="text-right px-4 py-3">الفرع</th>
                  <th className="text-right px-4 py-3">الحالة</th>
                  <th className="text-right px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                    <td className="px-4 py-3 font-bold text-stone-800">
                      {u.name}
                      {u.id === currentUser.id && (
                        <span className="mr-2 text-[10px] text-stone-400 font-normal">(حسابك)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-mono">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${ROLE_BADGE_STYLES[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{u.branch || '—'}</td>
                    <td className="px-4 py-3">
                      {u.is_active === false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500">
                          <ShieldOff className="w-3.5 h-3.5" /> معطّل
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <ShieldCheck className="w-3.5 h-3.5" /> نشط
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="تعديل"
                          className="p-2 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === currentUser.id}
                          title={u.is_active === false ? 'تفعيل الحساب' : 'تعطيل الحساب'}
                          className="p-2 rounded-lg text-stone-500 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {u.is_active === false ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.id === currentUser.id}
                          title="حذف"
                          className="p-2 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-stone-400 py-10 text-sm">
                      لا يوجد مستخدمون بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-800">
                {editingUser ? `تعديل حساب: ${editingUser.name}` : 'إضافة مستخدم جديد'}
              </h2>
              <button onClick={handleCloseModal} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border-r-4 border-red-600 p-3 rounded-xl text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">الاسم الكامل</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">اسم المستخدم</label>
                <input
                  type="text"
                  value={form.username}
                  disabled={!!editingUser}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="بالإنجليزي، بدون مسافات"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono disabled:bg-stone-50 disabled:text-stone-500"
                />
                {editingUser && <p className="text-[11px] text-stone-400 mt-1">لا يمكن تغيير اسم المستخدم بعد الإنشاء</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">الصلاحية</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                >
                  <option value="admin">مدير النظام</option>
                  <option value="hr">الموارد البشرية</option>
                  <option value="manager">مدير فرع</option>
                  <option value="employee">موظف</option>
                </select>
              </div>

              {form.role === 'manager' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">الفرع</label>
                  <select
                    value={form.branch}
                    onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                  >
                    <option value="">اختر الفرع...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  {editingUser ? 'كلمة مرور جديدة (اتركها فارغة إذا لم ترغب في تغييرها)' : 'كلمة المرور'}
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="6 أحرف أو أرقام على الأقل"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl text-sm font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> {editingUser ? 'حفظ التعديلات' : 'إنشاء الحساب'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
