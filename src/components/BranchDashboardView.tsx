import React, { useEffect, useRef, useState } from 'react';
import { CurrentUser, BranchStaffingOverview, Employee, JobPosition, ManagerRequest } from '../types';
import { ApiService } from '../services/api';
import { toWhatsAppNumber, buildWhatsAppUrl } from '../utils/whatsapp';
import { MISSING_LABEL_TO_DOCUMENT_TYPE } from '../utils/applicantDocuments';
import { uploadFileDirectToStorage } from '../utils/imageCompression';
import { isDepartedStatus } from '../utils/employeeStatus';
import { isNewHire, MANAGER_REQUEST_LABELS } from '../utils/managerRequests';
import { StaffRequestModal } from './StaffRequestModal';
import { RequestStatusBadge, requestSummaryLine } from './ManagerRequestBadge';
import { Users, Building2, AlertTriangle, CheckCircle2, FileWarning, MessageCircle, RefreshCw, Upload, Loader2, UserPlus, ThumbsUp, ThumbsDown, ClipboardList } from 'lucide-react';

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

  // طلبات مدير الفرع للموارد البشرية
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [staffModal, setStaffModal] = useState<{ position?: string; count?: number } | null>(null);
  const [notOkEmployee, setNotOkEmployee] = useState<Employee | null>(null);
  const [notOkReason, setNotOkReason] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

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
    // الطلبات والموظفين منفصلين: لو migration الطلبات لسه ما اتشغلش، الداشبورد يفضل شغال
    try {
      const [emps, pos, reqs] = await Promise.all([
        ApiService.getEmployees(),
        ApiService.getPositions(),
        ApiService.getManagerRequests(),
      ]);
      setEmployees(Array.isArray(emps) ? emps : []);
      setPositions(pos);
      setRequests(reqs);
      setRequestsError(null);
    } catch (err: any) {
      setRequestsError(err.message || 'فشل تحميل الطلبات');
    }
  };

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 5000);
  };

  // موظفين جدد لسه ما اتقيّموش من مدير الفرع
  const reviewedIds = new Set(requests.filter(r => r.request_type === 'new_hire_review').map(r => r.employee_id));
  const newHires = employees.filter(e => !isDepartedStatus(e.status) && isNewHire(e) && !reviewedIds.has(e.id));

  const markNewHireOk = async (emp: Employee) => {
    setReviewingId(emp.id);
    try {
      await ApiService.createManagerRequest({ request_type: 'new_hire_review', employee_id: emp.id, review_result: 'تمام' });
      showFlash(`تم تأكيد ${emp.full_name} — تمام ✅`);
      await load();
    } catch (err: any) {
      showFlash(err.message || 'فشل حفظ التقييم');
    } finally {
      setReviewingId(null);
    }
  };

  const submitNotOk = async () => {
    if (!notOkEmployee) return;
    if (!notOkReason.trim()) {
      showFlash('اكتب سبب إن الموظف مش تمام');
      return;
    }
    setReviewingId(notOkEmployee.id);
    try {
      await ApiService.createManagerRequest({
        request_type: 'new_hire_review',
        employee_id: notOkEmployee.id,
        review_result: 'مش تمام',
        reason: notOkReason.trim(),
      });
      showFlash(`تم إبلاغ الموارد البشرية بملاحظتك على ${notOkEmployee.full_name}`);
      setNotOkEmployee(null);
      setNotOkReason('');
      await load();
    } catch (err: any) {
      showFlash(err.message || 'فشل حفظ التقييم');
    } finally {
      setReviewingId(null);
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStaffModal({})}
            className="flex items-center gap-1.5 text-xs font-black bg-[#9E1A24] hover:bg-[#85151e] text-white px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            طلب موظف / كاشير
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-2 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>
      </div>

      {flash && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5 text-xs font-bold">{flash}</div>
      )}
      {requestsError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs font-bold">
          الطلبات مش شغالة حاليًا: {requestsError}
        </div>
      )}

      {/* موظفين جدد بانتظار تأكيد مدير الفرع */}
      {newHires.length > 0 && (
        <div className="bg-white border border-amber-300 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 font-black text-amber-900 text-sm flex items-center gap-2">
            <span>👋</span>
            موظفين جدد نزلوا فرعك — قوللنا هل هم تمام؟ ({newHires.length})
          </div>
          <div className="divide-y divide-stone-100">
            {newHires.map(emp => (
              <div key={emp.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-stone-900 text-sm">{emp.full_name}</div>
                  <div className="text-[11px] text-stone-500">
                    {emp.position_name} · باشر {emp.hire_date ? String(emp.hire_date).slice(0, 10) : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={reviewingId === emp.id}
                    onClick={() => markNewHireOk(emp)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black px-3 py-2 rounded-xl transition-all"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    تمام
                  </button>
                  <button
                    disabled={reviewingId === emp.id}
                    onClick={() => {
                      setNotOkEmployee(emp);
                      setNotOkReason('');
                    }}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 text-xs font-black px-3 py-2 rounded-xl transition-all"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    مش تمام
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <th className="text-center px-4 py-2"></th>
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
                    <td className="px-4 py-2.5 text-center">
                      {p.shortage > 0 && (
                        <button
                          onClick={() => setStaffModal({ position: p.position_name, count: p.shortage })}
                          className="text-[11px] font-black bg-[#9E1A24]/10 hover:bg-[#9E1A24] hover:text-white text-[#9E1A24] px-2.5 py-1 rounded-lg transition-all"
                        >
                          اطلب
                        </button>
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

      {/* طلباتي للموارد البشرية */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-stone-100 font-black text-stone-800 text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#9E1A24]" />
          طلباتي للموارد البشرية
        </div>
        {requests.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400">
            لسه ما بعتش أي طلب. تقدر تطلب موظف من فوق، أو تعمل إجراء على موظف من تاب "سجل الموظفين".
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {requests.slice(0, 30).map(r => (
              <div key={r.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-black text-stone-900 text-sm">{MANAGER_REQUEST_LABELS[r.request_type]}</span>
                  <RequestStatusBadge status={r.status} />
                </div>
                <div className="text-xs text-stone-600 font-semibold">{requestSummaryLine(r)}</div>
                {r.reason && <div className="text-[11px] text-stone-500">السبب: {r.reason}</div>}
                {r.hr_note && (
                  <div className="text-[11px] text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                    رد الموارد البشرية: {r.hr_note}
                  </div>
                )}
                {(r.request_type === 'resignation' || r.request_type === 'termination') && r.status === 'تمت الموافقة' && (
                  <div className="text-[11px] text-sky-700 font-bold">اتوافق عليها — هتتنفذ تلقائيًا يوم {r.effective_date}</div>
                )}
                <div className="text-[10px] text-stone-400 font-mono">{String(r.created_at).slice(0, 10)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {staffModal && (
        <StaffRequestModal
          positions={positions}
          initialPosition={staffModal.position}
          initialCount={staffModal.count}
          onClose={() => setStaffModal(null)}
          onSent={msg => {
            showFlash(msg);
            load();
          }}
        />
      )}

      {notOkEmployee && (
        <div className="fixed inset-0 z-70 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-[#9E1A24] text-white px-5 py-4">
              <h3 className="font-black text-lg">ليه {notOkEmployee.full_name} مش تمام؟</h3>
              <p className="text-[11px] text-amber-100 font-semibold mt-0.5">مثلاً: ما جاش / متأخر / مش مناسب للوظيفة</p>
            </div>
            <div className="p-5">
              <textarea
                value={notOkReason}
                onChange={e => setNotOkReason(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#9E1A24] resize-none"
                placeholder="اكتب السبب..."
              />
            </div>
            <div className="px-5 py-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-2">
              <button onClick={() => setNotOkEmployee(null)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-200">
                إلغاء
              </button>
              <button
                onClick={submitNotOk}
                disabled={reviewingId === notOkEmployee.id}
                className="px-5 py-2.5 rounded-xl bg-[#9E1A24] hover:bg-[#85151e] disabled:opacity-50 text-white text-sm font-bold"
              >
                إرسال للموارد البشرية
              </button>
            </div>
          </div>
        </div>
      )}

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
