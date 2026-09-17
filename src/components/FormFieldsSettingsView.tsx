import React, { useState, useEffect } from 'react';
import { CurrentUser, FormFieldConfig, FormFieldType, FormSectionKey } from '../types';
import { ApiService } from '../services/api';
import {
  FORM_SECTIONS,
  BUILT_IN_FIELDS,
  FIELD_TYPE_LABELS,
  mergeFieldConfig,
  defaultFieldConfig,
  generateCustomFieldKey,
  generateDeclarationKey,
  declarationText,
  DEFAULT_FIELD_OPTIONS,
} from '../formFields';
import {
  ListChecks,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCcw,
  Lock,
  Printer,
  List,
  X,
  FileText,
} from 'lucide-react';

interface Props {
  currentUser: CurrentUser;
  showToast: (msg: string) => void;
}

/**
 * شاشة تحكم مدير النظام في نموذج التقديم.
 *
 * كل حقل هنا هو نفسه الحقل الذي يراه المتقدم في البوابة العامة، ونفسه الذي
 * يظهر للأدمن في شاشة الطلب، ونفسه الذي يُطبع في الورقة الرسمية — مصدر واحد
 * فقط لكل الشاشات.
 */
export function FormFieldsSettingsView({ currentUser, showToast }: Props) {
  const [config, setConfig] = useState<FormFieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [addingToSection, setAddingToSection] = useState<FormSectionKey | null>(null);

  // نموذج إضافة حقل جديد
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FormFieldType>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState('');
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [newContent, setNewContent] = useState('');

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'hr';

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const saved = await ApiService.getFormFields();
      setConfig(mergeFieldConfig(saved));
      setIsDirty(false);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل إعدادات نموذج التقديم');
      setConfig(defaultFieldConfig());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (key: string, patch: Partial<FormFieldConfig>) => {
    setConfig(prev => prev.map(f => (f.key === key ? { ...f, ...patch } : f)));
    setIsDirty(true);
  };

  const builtInDef = (key: string) => BUILT_IN_FIELDS.find(b => b.key === key);

  // ---- تعديل قوائم الاختيارات (الحالة الاجتماعية، التجنيد، المؤهل، المهارات...) ----
  const [openOptionsFor, setOpenOptionsFor] = useState<string | null>(null);
  const [openContentFor, setOpenContentFor] = useState<string | null>(null);

  const supportsOptions = (field: FormFieldConfig) =>
    field.is_custom ? field.type === 'select' : !!builtInDef(field.key)?.hasOptions;

  const setOptions = (key: string, options: string[]) => updateField(key, { options });

  const updateOption = (field: FormFieldConfig, idx: number, value: string) => {
    const next = [...(field.options || [])];
    next[idx] = value;
    setOptions(field.key, next);
  };

  const removeOption = (field: FormFieldConfig, idx: number) => {
    const next = (field.options || []).filter((_, i) => i !== idx);
    setOptions(field.key, next);
  };

  const addOption = (field: FormFieldConfig) => {
    setOptions(field.key, [...(field.options || []), '']);
  };

  const restoreDefaultOptions = (field: FormFieldConfig) => {
    const defaults = DEFAULT_FIELD_OPTIONS[field.key];
    if (!defaults) return;
    setOptions(field.key, [...defaults]);
  };

  const resetAddForm = () => {
    setNewLabel('');
    setNewType('text');
    setNewRequired(false);
    setNewOptions('');
    setNewPlaceholder('');
    setNewContent('');
    setAddingToSection(null);
  };

  const handleAddField = (section: FormSectionKey) => {
    const label = newLabel.trim();
    if (!label) {
      showToast('يرجى كتابة اسم الحقل الجديد');
      return;
    }
    const options =
      newType === 'select'
        ? newOptions.split(/[،,\n]/).map(o => o.trim()).filter(Boolean)
        : [];
    if (newType === 'select' && options.length === 0) {
      showToast('يرجى كتابة اختيارات القائمة مفصولة بفاصلة');
      return;
    }
    if (newType === 'declaration' && !newContent.trim()) {
      showToast('يرجى كتابة نص الإقرار الذي سيوافق عليه المتقدم');
      return;
    }

    const maxOrder = Math.max(0, ...config.filter(f => f.is_custom).map(f => f.order || 0));
    const field: FormFieldConfig = {
      key: newType === 'declaration' ? generateDeclarationKey(label) : generateCustomFieldKey(label),
      label,
      section,
      type: newType,
      required: newRequired,
      visible: true,
      is_custom: true,
      order: maxOrder + 1,
      options,
      placeholder: newPlaceholder.trim(),
      show_in_print: true,
      content: newType === 'declaration' ? newContent.trim() : undefined,
    };
    setConfig(prev => [...prev, field]);
    setIsDirty(true);
    resetAddForm();
    showToast(
      newType === 'declaration'
        ? `تمت إضافة الإقرار "${label}" — اضغط حفظ لتفعيله للمتقدمين`
        : `تمت إضافة الحقل "${label}" — اضغط حفظ لتفعيله للمتقدمين`
    );
  };

  const handleDeleteField = (field: FormFieldConfig) => {
    if (!field.is_custom) return;
    const what = field.type === 'declaration' ? 'الإقرار' : 'الحقل';
    if (!confirm(`هل تريد حذف ${what} "${field.label}" نهائيًا من نموذج التقديم؟`)) return;
    setConfig(prev => prev.filter(f => f.key !== field.key));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setIsSaving(true);
      // تنظيف الاختيارات الفارغة قبل الحفظ
      const cleaned = config.map(f => ({
        ...f,
        options: (f.options || []).map(o => o.trim()).filter(Boolean),
      }));
      const saved = await ApiService.updateFormFields(cleaned);
      setConfig(mergeFieldConfig(saved));
      setIsDirty(false);
      showToast('تم حفظ نموذج التقديم — التعديلات ظهرت فورًا للمتقدمين وفي شاشة الطلب والطباعة');
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ إعدادات نموذج التقديم');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('سيتم إرجاع كل الحقول الأساسية لوضعها الافتراضي (كلها ظاهرة بأسمائها الأصلية). الحقول الإضافية التي أضفتها لن تُحذف. متابعة؟')) return;
    const customs = config.filter(f => f.is_custom);
    setConfig([...defaultFieldConfig(), ...customs]);
    setIsDirty(true);
  };

  const visibleCount = config.filter(f => f.visible !== false).length;
  const customCount = config.filter(f => f.is_custom).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-l from-amber-700 via-amber-800 to-stone-900 rounded-2xl p-6 text-white shadow-xl mb-6">
        <div className="inline-flex items-center gap-2 bg-amber-600/30 px-3 py-1 rounded-full text-amber-200 text-xs font-semibold mb-2 border border-amber-500/30">
          <ListChecks className="w-4 h-4" /> إعدادات النظام الإدارية
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إعدادات نموذج التقديم</h1>
        <p className="text-amber-100/80 text-sm mt-1 leading-relaxed">
          من هنا تتحكم في البيانات التي تظهر للمتقدم في البوابة العامة: أخفِ أي حقل، اجعله
          إلزاميًا أو اختياريًا، غيّر اسمه، أو أضف حقولًا جديدة بالكامل عن طريق زر (+).
          <br />
          نفس الحقول بالضبط هي التي تظهر لك في شاشة الطلب، وهي نفسها التي تُطبع في الورقة الرسمية.
        </p>
      </div>

      {/* Summary + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-stone-600">
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-emerald-600" /> حقول ظاهرة: {visibleCount}
          </span>
          <span className="flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-700" /> حقول إضافية: {customCount}
          </span>
          {isDirty && (
            <span className="flex items-center gap-1.5 text-red-600">
              <AlertCircle className="w-4 h-4" /> يوجد تعديلات لم تُحفظ
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 flex items-center gap-1.5 border border-stone-200"
            >
              <RotateCcw className="w-4 h-4" /> استعادة الافتراضي
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> حفظ النموذج
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          يمكنك الاطلاع فقط — تعديل نموذج التقديم متاح لمدير النظام أو الموارد البشرية.
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border-r-4 border-red-600 p-4 rounded-2xl text-red-800 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-10 h-10 border-4 border-amber-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-stone-600">جاري تحميل حقول النموذج...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {FORM_SECTIONS.map(section => {
            const fields = config
              .filter(f => f.section === section.key)
              .sort((a, b) => (a.is_custom === b.is_custom ? (a.order ?? 0) - (b.order ?? 0) : a.is_custom ? 1 : -1));

            return (
              <div key={section.key} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200">
                  <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                    {section.title}
                    <span className="text-[10px] font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">
                      خطوة {section.step}
                    </span>
                  </h3>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        const opening = addingToSection !== section.key;
                        resetAddForm();
                        if (opening) {
                          // في قسم الإقرارات الافتراضي هو إضافة إقرار جديد
                          if (section.key === 'declaration') setNewType('declaration');
                          setAddingToSection(section.key);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      {section.key === 'declaration' ? 'إضافة إقرار جديد' : 'إضافة حقل'}
                    </button>
                  )}
                </div>

                {/* Add-field form */}
                {addingToSection === section.key && canEdit && (
                  <div className="p-4 bg-amber-50/60 border-b border-amber-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700">
                          {newType === 'declaration' ? 'عنوان الإقرار كما سيظهر للمتقدم' : 'اسم الحقل كما سيظهر للمتقدم'}
                        </label>
                        <input
                          type="text"
                          value={newLabel}
                          onChange={e => setNewLabel(e.target.value)}
                          placeholder={newType === 'declaration' ? 'مثال: إقرار فترة تدريب وتقييم' : 'مثال: رقم تأمين صحي / اسم المعرّف بك'}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700">نوع الحقل</label>
                        <select
                          value={newType}
                          onChange={e => setNewType(e.target.value as FormFieldType)}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map(t => (
                            <option key={t} value={t}>
                              {FIELD_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {newType === 'select' && (
                        <div className="space-y-1 sm:col-span-2">
                          <label className="block text-[11px] font-bold text-stone-700">
                            اختيارات القائمة (افصل بينها بفاصلة)
                          </label>
                          <input
                            type="text"
                            value={newOptions}
                            onChange={e => setNewOptions(e.target.value)}
                            placeholder="مثال: نعم، لا، ربما"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      )}

                      {newType === 'declaration' && (
                        <div className="space-y-1 sm:col-span-2">
                          <label className="block text-[11px] font-bold text-stone-700">
                            نص الإقرار الكامل (هو النص الذي يقرأه المتقدم ويوافق عليه ويُطبع في الاستمارة)
                          </label>
                          <textarea
                            rows={7}
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                            placeholder={'اكتب نص الإقرار هنا...\nيمكنك كتابة كل فقرة في سطر مستقل.'}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <p className="text-[10px] text-stone-500">
                            كل سطر جديد يظهر كفقرة مستقلة للمتقدم وفي الورقة المطبوعة.
                          </p>
                        </div>
                      )}

                      {newType !== 'select' && newType !== 'checkbox' && newType !== 'declaration' && (
                        <div className="space-y-1 sm:col-span-2">
                          <label className="block text-[11px] font-bold text-stone-700">نص إرشادي داخل الحقل (اختياري)</label>
                          <input
                            type="text"
                            value={newPlaceholder}
                            onChange={e => setNewPlaceholder(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRequired}
                          onChange={e => setNewRequired(e.target.checked)}
                          className="w-4 h-4 accent-amber-700"
                        />
                        {newType === 'declaration'
                          ? 'موافقة إلزامية (لا يستطيع المتقدم إرسال الطلب بدون الموافقة عليه)'
                          : 'حقل إلزامي (لا يستطيع المتقدم إكمال الطلب بدونه)'}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={resetAddForm}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddField(section.key)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          {newType === 'declaration' ? 'إضافة الإقرار' : 'إضافة الحقل'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fields list */}
                <div className="divide-y divide-stone-100">
                  {fields.map(field => {
                    const def = builtInDef(field.key);
                    const locked = !!def?.locked;
                    const requiredLocked = !!def?.requiredLocked;
                    const hidden = field.visible === false;

                    return (
                      <div
                        key={field.key}
                        className={`p-4 flex flex-col md:flex-row md:items-center gap-3 ${hidden ? 'bg-stone-50/80' : ''}`}
                      >
                        {/* Label */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={field.label}
                              disabled={!canEdit}
                              onChange={e => updateField(field.key, { label: e.target.value })}
                              className={`flex-1 min-w-[180px] px-3 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                                hidden ? 'border-stone-200 text-stone-400 bg-stone-50' : 'border-stone-300 text-stone-900'
                              }`}
                            />
                            {field.type === 'declaration' ? (
                              <span className="text-[10px] font-bold text-[#9E1A24] bg-red-50 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {field.is_custom ? 'إقرار إضافي' : 'إقرار أساسي'}
                              </span>
                            ) : field.is_custom ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                حقل إضافي · {FIELD_TYPE_LABELS[field.type]}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                                حقل أساسي
                              </span>
                            )}
                            {locked && (
                              <span className="text-[10px] font-bold text-stone-500 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> لا يمكن إخفاؤه
                              </span>
                            )}
                          </div>
                          {def?.hint && <p className="text-[11px] text-stone-500">{def.hint}</p>}
                        </div>

                        {/* Toggles */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            disabled={!canEdit || locked}
                            onClick={() => updateField(field.key, { visible: hidden })}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all disabled:opacity-40 ${
                              hidden
                                ? 'bg-stone-100 text-stone-500 border-stone-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {hidden ? 'مخفي' : 'ظاهر'}
                          </button>

                          <button
                            type="button"
                            disabled={!canEdit || requiredLocked || hidden}
                            onClick={() => updateField(field.key, { required: !field.required })}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 ${
                              field.required
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-white text-stone-500 border-stone-200'
                            }`}
                          >
                            {field.type === 'declaration'
                              ? (field.required ? 'موافقة إلزامية *' : 'موافقة اختيارية')
                              : (field.required ? 'إلزامي *' : 'اختياري')}
                          </button>

                          <button
                            type="button"
                            disabled={!canEdit || hidden}
                            onClick={() => updateField(field.key, { show_in_print: field.show_in_print === false })}
                            title="إظهار الحقل في الورقة المطبوعة"
                            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all disabled:opacity-40 ${
                              field.show_in_print === false
                                ? 'bg-white text-stone-400 border-stone-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            <Printer className="w-4 h-4" />
                            {field.show_in_print === false ? 'لا يُطبع' : 'يُطبع'}
                          </button>

                          {field.type === 'declaration' && (
                            <button
                              type="button"
                              onClick={() => setOpenContentFor(openContentFor === field.key ? null : field.key)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                                openContentFor === field.key
                                  ? 'bg-[#9E1A24] text-white border-[#9E1A24]'
                                  : 'bg-white text-[#9E1A24] border-red-200 hover:bg-red-50'
                              }`}
                            >
                              <FileText className="w-4 h-4" /> نص الإقرار
                            </button>
                          )}

                          {supportsOptions(field) && (
                            <button
                              type="button"
                              onClick={() => setOpenOptionsFor(openOptionsFor === field.key ? null : field.key)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                                openOptionsFor === field.key
                                  ? 'bg-amber-700 text-white border-amber-700'
                                  : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                              }`}
                            >
                              <List className="w-4 h-4" /> الاختيارات ({(field.options || []).length})
                            </button>
                          )}

                          {field.is_custom && canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDeleteField(field)}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center gap-1.5"
                            >
                              <Trash2 className="w-4 h-4" /> حذف
                            </button>
                          )}
                        </div>

                        {/* محرر نص الإقرار */}
                        {field.type === 'declaration' && openContentFor === field.key && (
                          <div className="w-full bg-red-50/60 border border-red-200 rounded-2xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-stone-700">
                                نص الإقرار كما سيقرأه المتقدم ويُطبع في الاستمارة
                              </span>
                              {!field.is_custom && canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const def = builtInDef(field.key);
                                    if (def?.defaultContent) updateField(field.key, { content: def.defaultContent });
                                  }}
                                  className="text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> النص الافتراضي
                                </button>
                              )}
                            </div>
                            <textarea
                              rows={9}
                              disabled={!canEdit}
                              value={declarationText(field)}
                              onChange={e => updateField(field.key, { content: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-[#9E1A24]"
                            />
                            <p className="text-[10px] text-stone-500">
                              كل سطر جديد يظهر كفقرة مستقلة. لا تنسَ الضغط على "حفظ النموذج" بعد التعديل.
                            </p>
                          </div>
                        )}

                        {/* محرر قائمة الاختيارات */}
                        {supportsOptions(field) && openOptionsFor === field.key && (
                          <div className="w-full md:w-auto md:min-w-[320px] bg-amber-50/70 border border-amber-200 rounded-2xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-stone-700">
                                الاختيارات التي ستظهر للمتقدم
                                {builtInDef(field.key)?.multi ? ' (اختيار متعدد)' : ''}
                              </span>
                              {DEFAULT_FIELD_OPTIONS[field.key] && canEdit && (
                                <button
                                  type="button"
                                  onClick={() => restoreDefaultOptions(field)}
                                  className="text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> الافتراضية
                                </button>
                              )}
                            </div>

                            <div className="space-y-2">
                              {(field.options || []).map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-stone-400 w-4">{idx + 1}</span>
                                  <input
                                    type="text"
                                    value={opt}
                                    disabled={!canEdit}
                                    onChange={e => updateOption(field, idx, e.target.value)}
                                    placeholder="اكتب نص الاختيار"
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(field, idx)}
                                      title="حذف الاختيار"
                                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {(field.options || []).length === 0 && (
                                <p className="text-[11px] text-stone-500">لا توجد اختيارات — أضف اختيارًا واحدًا على الأقل.</p>
                              )}
                            </div>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => addOption(field)}
                                className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-100"
                              >
                                <Plus className="w-4 h-4" /> إضافة اختيار
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canEdit && !isLoading && (
        <div className="sticky bottom-4 mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="px-6 py-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-xl"
          >
            <Save className="w-4 h-4" /> حفظ النموذج
          </button>
        </div>
      )}
    </div>
  );
}
