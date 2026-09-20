import React, { useState, useEffect } from 'react';
import { Branch, JobPosition, CurrentUser, StaffingRequirement } from '../types';
import { ApiService } from '../services/api';
import { Building2, Briefcase, Plus, Trash2, Edit2, CheckCircle2, XCircle, MapPin, Save, X, AlertCircle, Users } from 'lucide-react';

interface Props {
  currentUser: CurrentUser;
  showToast: (msg: string) => void;
}

export function BranchesAndPositionsView({ currentUser, showToast }: Props) {
  const [activeTab, setActiveTab] = useState<'branches' | 'positions' | 'staffing'>('branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // العدد المطلوب من كل وظيفة في كل فرع (بيستخدمها مدير الفرع في شاشة "متابعة الفرع")
  const [staffing, setStaffing] = useState<StaffingRequirement[]>([]);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Branch Modal State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({ name: '', location: '', is_active: true });

  // Position Modal State
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [positionForm, setPositionForm] = useState({ title: '', department: 'المطعم', is_active: true });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [brs, pos, stf] = await Promise.all([
        ApiService.getAdminBranches(),
        ApiService.getAdminPositions(),
        ApiService.getStaffingRequirements(),
      ]);
      setBranches(brs);
      setPositions(pos);
      setStaffing(stf);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'فشل تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Branch Handlers
  const handleOpenNewBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', location: '', is_active: true });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm({ name: branch.name, location: branch.location || '', is_active: branch.is_active });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      showToast('يرجى إدخال اسم الفرع');
      return;
    }
    try {
      if (editingBranch) {
        await ApiService.updateBranch(editingBranch.id, branchForm);
        showToast('تم تحديث الفرع بنجاح');
      } else {
        await ApiService.createBranch(branchForm);
        showToast('تم إضافة الفرع الجديد بنجاح');
      }
      setIsBranchModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ الفرع');
    }
  };

  const handleDeleteBranch = async (id: string, name: string) => {
    if (currentUser.role !== 'admin') {
      alert('عذراً، حذف الفروع مقتصر على مدير النظام (Admin) فقط.');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف الفرع "${name}"؟`)) return;
    try {
      await ApiService.deleteBranch(id);
      showToast('تم حذف الفرع بنجاح');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف الفرع');
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    try {
      await ApiService.updateBranch(branch.id, { is_active: !branch.is_active });
      showToast(`تم ${!branch.is_active ? 'تنشيط' : 'إيقاف'} الفرع بنجاح`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث حالة الفرع');
    }
  };

  // Position Handlers
  const handleOpenNewPosition = () => {
    setEditingPosition(null);
    setPositionForm({ title: '', department: 'المطعم', is_active: true });
    setIsPositionModalOpen(true);
  };

  const handleOpenEditPosition = (pos: JobPosition) => {
    setEditingPosition(pos);
    setPositionForm({ title: pos.title, department: pos.department || 'المطعم', is_active: pos.is_active });
    setIsPositionModalOpen(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionForm.title.trim()) {
      showToast('يرجى إدخال المسمى الوظيفي');
      return;
    }
    try {
      if (editingPosition) {
        await ApiService.updatePosition(editingPosition.id, positionForm);
        showToast('تم تحديث المسمى الوظيفي بنجاح');
      } else {
        await ApiService.createPosition(positionForm);
        showToast('تم إضافة المسمى الوظيفي الجديد بنجاح');
      }
      setIsPositionModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ المسمى الوظيفي');
    }
  };

  const handleDeletePosition = async (id: string, title: string) => {
    if (currentUser.role !== 'admin') {
      alert('عذراً، حذف الوظائف مقتصر على مدير النظام (Admin) فقط.');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف المسمى الوظيفي "${title}"؟`)) return;
    try {
      await ApiService.deletePosition(id);
      showToast('تم حذف المسمى الوظيفي بنجاح');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف المسمى الوظيفي');
    }
  };

  const handleTogglePositionStatus = async (pos: JobPosition) => {
    try {
      await ApiService.updatePosition(pos.id, { is_active: !pos.is_active });
      showToast(`تم ${!pos.is_active ? 'تنشيط' : 'إيقاف'} المسمى الوظيفي بنجاح`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث حالة الوظيفة');
    }
  };

  // Staffing Handlers — العدد المطلوب من كل وظيفة في كل فرع
  const getRequiredCount = (branchName: string, positionTitle: string): number =>
    staffing.find(s => s.branch_name === branchName && s.position_name === positionTitle)?.required_count || 0;

  const handleSaveRequiredCount = async (branchName: string, positionTitle: string, value: number) => {
    const cellKey = `${branchName}__${positionTitle}`;
    const clean = Math.max(0, Math.floor(Number(value)) || 0);
    if (clean === getRequiredCount(branchName, positionTitle)) return; // مفيش تغيير
    setSavingCell(cellKey);
    try {
      const saved = await ApiService.setStaffingRequirement({
        branch_name: branchName,
        position_name: positionTitle,
        required_count: clean,
      });
      setStaffing(prev => {
        const rest = prev.filter(s => !(s.branch_name === branchName && s.position_name === positionTitle));
        return [...rest, saved];
      });
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ العدد المطلوب');
    } finally {
      setSavingCell(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-700 via-amber-800 to-stone-900 rounded-2xl p-6 text-white shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-600/30 px-3 py-1 rounded-full text-amber-200 text-xs font-semibold mb-2 border border-amber-500/30">
            <Building2 className="w-4 h-4" /> إعدادات النظام الإدارية
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة الفروع والمسميات الوظيفية</h1>
          <p className="text-amber-100/80 text-sm mt-1">
            التحكم الكامل في الفروع المتاحة للتقديم وللموظفين، وكذلك المسميات الوظيفية المعتمدة في النظام.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'branches' ? (
            <button
              onClick={handleOpenNewBranch}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> إضافة فرع جديد
            </button>
          ) : activeTab === 'positions' ? (
            <button
              onClick={handleOpenNewPosition}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> إضافة مسمى وظيفي جديد
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 mb-6">
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === 'branches'
              ? 'border-amber-600 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> الفروع ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === 'positions'
              ? 'border-amber-600 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Briefcase className="w-4 h-4" /> المسميات الوظيفية ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('staffing')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === 'staffing'
              ? 'border-amber-600 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" /> العدد المطلوب لكل فرع
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="text-center py-16 text-stone-500">جاري تحميل البيانات...</div>
      ) : activeTab === 'branches' ? (
        /* Branches List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map(branch => (
            <div
              key={branch.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border transition flex flex-col justify-between ${
                branch.is_active ? 'border-stone-200 hover:border-amber-300' : 'border-stone-200 bg-stone-50 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      branch.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {branch.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {branch.is_active ? 'نشط (يظهر للمتقدمين)' : 'متوقف'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">{branch.name}</h3>
                <p className="text-sm text-stone-500 flex items-center gap-1.5 mb-4">
                  <MapPin className="w-4 h-4 text-stone-400" /> {branch.location || 'لم يتم تحديد العنوان'}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <button
                  onClick={() => handleToggleBranchStatus(branch)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    branch.is_active
                      ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {branch.is_active ? 'إيقاف مؤقت' : 'تنشيط'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditBranch(branch)}
                    className="p-2 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                    title="تعديل الفرع"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteBranch(branch.id, branch.name)}
                      className="p-2 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="حذف الفرع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-stone-200">
              <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-600 font-medium">لا توجد فروع مضافة حالياً</p>
              <button
                onClick={handleOpenNewBranch}
                className="mt-3 text-sm text-amber-700 font-bold hover:underline"
              >
                + إضافة أول فرع
              </button>
            </div>
          )}
        </div>
      ) : activeTab === 'positions' ? (
        /* Positions List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {positions.map(pos => (
            <div
              key={pos.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border transition flex flex-col justify-between ${
                pos.is_active ? 'border-stone-200 hover:border-amber-300' : 'border-stone-200 bg-stone-50 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      pos.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {pos.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {pos.is_active ? 'نشط' : 'متوقف'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">{pos.title}</h3>
                <span className="inline-block bg-stone-100 text-stone-700 text-xs px-2.5 py-1 rounded-md font-medium mb-4">
                  {pos.department || 'المطعم'}
                </span>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <button
                  onClick={() => handleTogglePositionStatus(pos)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    pos.is_active
                      ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {pos.is_active ? 'إيقاف مؤقت' : 'تنشيط'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditPosition(pos)}
                    className="p-2 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                    title="تعديل المسمى"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => handleDeletePosition(pos.id, pos.title)}
                      className="p-2 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="حذف المسمى"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {positions.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-stone-200">
              <Briefcase className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-600 font-medium">لا توجد مسميات وظيفية مضافة حالياً</p>
              <button
                onClick={handleOpenNewPosition}
                className="mt-3 text-sm text-amber-700 font-bold hover:underline"
              >
                + إضافة أول مسمى وظيفي
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Staffing Requirements Matrix — العدد المطلوب من كل وظيفة في كل فرع.
           مدير الفرع مايشوفش التاب ده أصلاً (شاشة إدارة الفروع مقصورة على
           الأدمن/الموارد البشرية)، وده بيستخدمه في شاشة "متابعة الفرع" بتاعته
           كمرجع (Read-only) — هو نفسه ميقدرش يعدّل الأرقام دي. */
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 text-xs text-stone-500">
            حدّد العدد المطلوب من كل وظيفة في كل فرع. مدير الفرع بيشوف الأرقام دي في شاشة "متابعة الفرع" بتاعته للمقارنة بالموجود فعليًا — وهو مايقدرش يعدّلها، التعديل هنا بس.
          </div>
          {branches.filter(b => b.is_active).length === 0 || positions.filter(p => p.is_active).length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-400">
              محتاج فرع نشط واحد ووظيفة نشطة واحدة على الأقل عشان تقدر تحدد الاحتياج.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-[11px] font-bold">
                    <th className="text-right px-4 py-2 sticky right-0 bg-stone-50">الفرع \ الوظيفة</th>
                    {positions.filter(p => p.is_active).map(pos => (
                      <th key={pos.id} className="text-center px-3 py-2 whitespace-nowrap">{pos.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {branches.filter(b => b.is_active).map(branch => (
                    <tr key={branch.id} className="border-t border-stone-100">
                      <td className="px-4 py-2 font-bold text-stone-800 sticky right-0 bg-white whitespace-nowrap">{branch.name}</td>
                      {positions.filter(p => p.is_active).map(pos => {
                        const cellKey = `${branch.name}__${pos.title}`;
                        return (
                          <td key={pos.id} className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              defaultValue={getRequiredCount(branch.name, pos.title)}
                              key={`${cellKey}_${getRequiredCount(branch.name, pos.title)}`}
                              onBlur={e => handleSaveRequiredCount(branch.name, pos.title, Number(e.target.value))}
                              disabled={savingCell === cellKey}
                              className="w-16 text-center border border-stone-300 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-700" />
                {editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}
              </h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">اسم الفرع *</label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="مثال: فرع الزمالك"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">العنوان / الموقع</label>
                <input
                  type="text"
                  value={branchForm.location}
                  onChange={e => setBranchForm({ ...branchForm, location: e.target.value })}
                  placeholder="مثال: شارع البرازيل، الزمالك"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="branch_active"
                  checked={branchForm.is_active}
                  onChange={e => setBranchForm({ ...branchForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                />
                <label htmlFor="branch_active" className="text-sm font-semibold text-stone-700 cursor-pointer">
                  فرع نشط (يظهر للمتقدمين في استمارة التوظيف)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md"
                >
                  <Save className="w-4 h-4" /> حفظ الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Position Modal */}
      {isPositionModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-700" />
                {editingPosition ? 'تعديل المسمى الوظيفي' : 'إضافة مسمى وظيفي جديد'}
              </h3>
              <button
                onClick={() => setIsPositionModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">المسمى الوظيفي *</label>
                <input
                  type="text"
                  required
                  value={positionForm.title}
                  onChange={e => setPositionForm({ ...positionForm, title: e.target.value })}
                  placeholder="مثال: شيف مطبخ، كاشير، طباخ"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">القسم</label>
                <input
                  type="text"
                  value={positionForm.department}
                  onChange={e => setPositionForm({ ...positionForm, department: e.target.value })}
                  placeholder="مثال: المطعم، الإدارة، خدمة العملاء"
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pos_active"
                  checked={positionForm.is_active}
                  onChange={e => setPositionForm({ ...positionForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                />
                <label htmlFor="pos_active" className="text-sm font-semibold text-stone-700 cursor-pointer">
                  مسمى وظيفي نشط (يظهر للمتقدمين في استمارة التوظيف)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsPositionModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md"
                >
                  <Save className="w-4 h-4" /> حفظ الوظيفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
