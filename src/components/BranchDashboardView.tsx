import React, { useEffect, useRef, useState } from 'react';
import { CurrentUser, BranchStaffingOverview } from '../types';
import { ApiService } from '../services/api';
import { toWhatsAppNumber, buildWhatsAppUrl } from '../utils/whatsapp';
import { MISSING_LABEL_TO_DOCUMENT_TYPE } from '../utils/applicantDocuments';
import { uploadFileDirectToStorage } from '../utils/imageCompression';
import { Users, Building2, AlertTriangle, CheckCircle2, FileWarning, MessageCircle, RefreshCw, Upload, Loader2 } from 'lucide-react';

interface Props {
  currentUser: CurrentUser;
}

/**
 * شاشة "متابعة الفرع" — لمدير الفرع بس. بتوريله مين معاه فعليًا في كل
 * وظيفة مقابل العدد المطلوب (يضبطه الأدمن/الموارد البشرية)، وقائمة
 * الموظفين اللي ناقصهم مستندات أساسية (بطاقة / شهادة صحية).
 */
export const BranchDashboardView: React.FC<Props> = ({ currentUser }) => {
  const [overview, setOverview] = useState<BranchStaffingOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // رفع مستند ناقص: بنخزن مين بنرفعله دلوقتي عشان نعرف نبعته بعد اختيار الملف
  const [uploadTarget, setUploadTarget] = useState<{ applicantId: string; label: string; key: string } | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ApiService.getBranchOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات الفرع');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missingDocsReminderUrl = (name: string, phone: string, missing: string[]) => {
    const num = toWhatsAppNumber(phone);
    if (!num) return null;
    const text = [
      `السلام عليكم ${name}،`,
      `برجاء استكمال المستندات الناقصة دي:`,
      ...missing.map(m => `• ${m}`),
      `شكرًا لتعاونك.`,
    ].join('\n');
    return buildWhatsAppUrl(num, text);
  };

  // مدير الفرع مايقدرش يعدّل حاجة هنا — بس يشوف، وممكن يرفع المستند الناقص
  // نيابة عن الموظف (وش/ظهر البطاقة أو الشهادة الصحية) عشان يكمّل ملفه بسرعة.
  const openUploadFor = (applicantId: string, label: string, employeeId: string) => {
    if (!applicantId) {
      setUploadMsg('مفيش ملف متقدم مرتبط بالموظف ده — كلّم الموارد البشرية.');
      return;
    }
    setUploadTarget({ applicantId, label, key: `${employeeId}__${label}` });
    // بنفضي القيمة عشان لو المستخدم يختار نفس الملف تاني onChange يتفعل برضه
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTarget;
    if (!file || !target) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadMsg('حجم الملف يجب ألا يتعدى 5 ميجابايت');
      return;
    }

    const documentType = MISSING_LABEL_TO_DOCUMENT_TYPE[target.label] || 'أخرى';
    setUploadingKey(target.key);
    setUploadMsg(null);
    try {
      const isImage = file.type !== 'application/pdf';
      const publicUrl = await uploadFileDirectToStorage(file, { isImage, maxDimension: 1400, quality: 0.75 });
      await ApiService.uploadDocument(target.applicantId, {
        document_type: documentType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: (file.size / 1024).toFixed(1) + ' KB',
      });
      setUploadMsg(`تم رفع "${target.label}" بنجاح`);
      await load();
    } catch (err: any) {
      setUploadMsg(err.message || 'فشل رفع المستند، حاول تاني');
    } finally {
      setUploadingKey(null);
      setUploadTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-500 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin ml-2" />
        جاري تحميل بيانات الفرع...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-sm font-bold text-center">
        {error}
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#9E1A24]" />
            متابعة فرع {overview.branch_name}
          </h2>
          <p className="text-xs text-stone-500 mt-1">مين معاك فعليًا في كل وظيفة، واي الناقص من الوظائف والمستندات.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-2 rounded-xl transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-bold mb-1">
            <Users className="w-4 h-4" />
            عدد الموظفين الحاليين
          </div>
          <div className="text-2xl font-black text-stone-900">{overview.total_current}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-bold mb-1">
            <AlertTriangle className="w-4 h-4" />
            إجمالي الشواغر
          </div>
          <div className={`text-2xl font-black ${overview.total_shortage > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
            {overview.total_shortage}
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-bold mb-1">
            <FileWarning className="w-4 h-4" />
            ناقصهم مستندات
          </div>
          <div className={`text-2xl font-black ${overview.employees_missing_docs.length > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
            {overview.employees_missing_docs.length}
          </div>
        </div>
      </div>

      {/* Positions table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-stone-100 font-black text-stone-800 text-sm">الوظائف: المطلوب مقابل الموجود</div>
        {overview.positions.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400">
            لسه محدّدش العدد المطلوب لأي وظيفة في فرعك. اطلب من الأدمن/الموارد البشرية ضبطه من شاشة "إدارة الفروع والوظائف".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-[11px] font-bold">
                  <th className="text-right px-4 py-2">الوظيفة</th>
                  <th className="text-center px-4 py-2">المطلوب</th>
                  <th className="text-center px-4 py-2">الموجود</th>
                  <th className="text-center px-4 py-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {overview.positions.map(p => (
                  <tr key={p.position_name} className="border-t border-stone-100">
                    <td className="px-4 py-2.5 font-bold text-stone-800">{p.position_name}</td>
                    <td className="px-4 py-2.5 text-center text-stone-600">{p.required_count}</td>
                    <td className="px-4 py-2.5 text-center text-stone-600">{p.current_count}</td>
                    <td className="px-4 py-2.5 text-center">
                      {p.shortage > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-black px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          ناقص {p.shortage}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          مكتمل
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Missing documents list */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-stone-100 font-black text-stone-800 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>موظفين ناقصهم مستندات</span>
          {uploadMsg && <span className="text-[11px] font-bold text-stone-500">{uploadMsg}</span>}
        </div>
        {overview.employees_missing_docs.length === 0 ? (
          <div className="p-6 text-center text-xs text-emerald-700 font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            كل الموظفين مستنداتهم مكتملة 🎉
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {overview.employees_missing_docs.map(emp => {
              const url = missingDocsReminderUrl(emp.full_name, emp.phone, emp.missing);
              return (
                <div key={emp.employee_id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-bold text-stone-900 text-sm">{emp.full_name}</div>
                    <div className="text-[11px] text-stone-500">{emp.position_name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {emp.missing.map(m => {
                        const key = `${emp.employee_id}__${m}`;
                        const isUploadingThis = uploadingKey === key;
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={isUploadingThis}
                            onClick={() => openUploadFor(emp.applicant_id, m, emp.employee_id)}
                            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all disabled:opacity-60"
                            title={`رفع ${m}`}
                          >
                            {isUploadingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      تذكير واتساب
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="px-4 pb-3 text-[10px] text-stone-400">دوس على اسم المستند الناقص (باللون الأحمر) عشان ترفعه مباشرة.</p>
      </div>

      {/* Hidden file input shared by all "upload missing document" buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
};
