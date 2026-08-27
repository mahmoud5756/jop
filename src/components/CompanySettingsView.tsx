import React, { useState, useEffect } from 'react';
import { CurrentUser } from '../types';
import { ApiService } from '../services/api';
import { Building2, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  currentUser: CurrentUser;
  showToast: (msg: string) => void;
}

// Central place to fill in the company's fixed registration numbers
// (السجل التجاري / البطاقة الضريبية) ONCE. Every printed document that
// needs them (payslips, contracts, ...) reads them from here automatically
// instead of relying on someone typing them by hand each time.
export function CompanySettingsView({ currentUser, showToast }: Props) {
  const [commercialRegistry, setCommercialRegistry] = useState('');
  const [taxCard, setTaxCard] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'hr';

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const settings = await ApiService.getCompanySettings();
      setCommercialRegistry(settings.commercial_registry || '');
      setTaxCard(settings.tax_card || '');
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات الشركة');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      setIsSaving(true);
      await ApiService.updateCompanySettings({
        commercial_registry: commercialRegistry,
        tax_card: taxCard,
      });
      showToast('تم حفظ بيانات الشركة بنجاح، وستظهر تلقائيًا في كل المستندات المطبوعة');
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ بيانات الشركة');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-700 via-amber-800 to-stone-900 rounded-2xl p-6 text-white shadow-xl mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-600/30 px-3 py-1 rounded-full text-amber-200 text-xs font-semibold mb-2 border border-amber-500/30">
          <Building2 className="w-4 h-4" /> إعدادات النظام الإدارية
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">بيانات الشركة الثابتة</h1>
        <p className="text-amber-100/80 text-sm mt-1">
          السجل التجاري والبطاقة الضريبية تُدخلان هنا مرة واحدة فقط، وتظهران تلقائيًا في كل المستندات
          المطبوعة (مفردات المرتب وغيرها) بدون الحاجة لكتابتهما يدويًا في كل مرة.
        </p>
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
          <p className="text-sm font-bold text-stone-600">جاري تحميل بيانات الشركة...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-stone-200 shadow-lg p-6 space-y-5">
          {!canEdit && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              يمكنك الاطلاع على هذه البيانات فقط، وتعديلها متاح لمدير النظام أو الموارد البشرية.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">السجل التجاري</label>
            <input
              type="text"
              value={commercialRegistry}
              onChange={e => setCommercialRegistry(e.target.value)}
              disabled={!canEdit}
              placeholder="رقم السجل التجاري"
              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono disabled:bg-stone-50 disabled:text-stone-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">البطاقة الضريبية</label>
            <input
              type="text"
              value={taxCard}
              onChange={e => setTaxCard(e.target.value)}
              disabled={!canEdit}
              placeholder="رقم البطاقة الضريبية"
              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono disabled:bg-stone-50 disabled:text-stone-500"
            />
          </div>

          {canEdit && (
            <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
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
                    <Save className="w-4 h-4" /> حفظ البيانات
                  </>
                )}
              </button>
            </div>
          )}

          {(commercialRegistry || taxCard) && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>هذه البيانات محفوظة الآن وستظهر تلقائيًا في مفردات المرتب وباقي المستندات المطبوعة لكل الموظفين والفروع.</span>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
