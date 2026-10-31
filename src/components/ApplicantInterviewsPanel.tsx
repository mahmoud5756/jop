import React from 'react';
import { Applicant } from '../types';
import { SvgIcons } from './BobWichLogo';
import { CalendarClock, Pencil } from 'lucide-react';

type InterviewForm = {
  id?: string;
  interview_date: string;
  interview_time?: string;
  interviewer_name: string;
  status: 'مجدولة' | 'مقبول' | 'مرفوض' | 'إعادة مقابلة' | 'حضر' | 'لم يحضر';
  evaluation: number;
  notes: string;
};

interface ApplicantInterviewsPanelProps {
  applicant: Applicant;
  canAddInterview: boolean;
  showInterviewForm: boolean;
  setShowInterviewForm: React.Dispatch<React.SetStateAction<boolean>>;
  interviewForm: InterviewForm;
  setInterviewForm: React.Dispatch<React.SetStateAction<InterviewForm>>;
  isSavingInterview: boolean;
  interviewError: string | null;
  setInterviewError: React.Dispatch<React.SetStateAction<string | null>>;
  onSaveInterview: () => void;
}

export const ApplicantInterviewsPanel: React.FC<ApplicantInterviewsPanelProps> = ({
  applicant,
  canAddInterview,
  showInterviewForm,
  setShowInterviewForm,
  interviewForm,
  setInterviewForm,
  isSavingInterview,
  interviewError,
  setInterviewError,
  onSaveInterview,
}) => {
  return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-stone-900 text-sm">سجل المقابلات الشخصية</h4>
            {canAddInterview && !showInterviewForm && (
              <button
                type="button"
                onClick={() => { setInterviewError(null); setShowInterviewForm(true); }}
                className="text-xs font-bold bg-[#9E1A24] text-white px-3 py-1.5 rounded-xl hover:opacity-90 transition-all"
              >
                <span className="inline-flex items-center gap-1.5"><SvgIcons.Plus className="h-3.5 w-3.5" /> إضافة مقابلة</span>
              </button>
            )}
          </div>

          {showInterviewForm && (
            <div className="bg-white p-4 rounded-2xl border-2 border-[#9E1A24]/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900">
                  {interviewForm.id ? 'تعديل موعد / نتيجة المقابلة' : `موعد مقابلة جديد (رقم ${Math.max(0, ...(applicant.interviews || []).map(i => Number(i.interview_number) || 0)) + 1})`}
                </span>
                <div className="flex items-center gap-1">
                  {interviewForm.status === 'مجدولة' ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700"><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> يُسجّل التقييم بعد المقابلة</span> : [1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" disabled={interviewForm.status === 'مجدولة'} aria-label={`التقييم ${star} من 5`} onClick={() => setInterviewForm(f => ({ ...f, evaluation: star }))}>
                        <SvgIcons.Star className="w-4 h-4 cursor-pointer" filled={star <= interviewForm.evaluation} />
                      </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">تاريخ الموعد</label>
                  <input
                    type="date"
                    value={interviewForm.interview_date}
                    onChange={e => setInterviewForm(f => ({ ...f, interview_date: e.target.value }))}
                    className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">وقت المقابلة</label>
                  <input
                    type="time"
                    value={interviewForm.interview_time || ''}
                    onChange={e => setInterviewForm(f => ({ ...f, interview_time: e.target.value }))}
                    className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">المسؤول عن المقابلة</label>
                  <input
                    type="text"
                    value={interviewForm.interviewer_name}
                    onChange={e => setInterviewForm(f => ({ ...f, interviewer_name: e.target.value }))}
                    className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">حالة الموعد / نتيجة المقابلة</label>
                <div className="flex flex-wrap gap-2">
                  {(['مجدولة', 'حضر', 'لم يحضر', 'مقبول', 'مرفوض', 'إعادة مقابلة'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setInterviewForm(f => ({ ...f, status: st, evaluation: st === 'مجدولة' ? 0 : f.evaluation }))}
                      className={`flex-1 min-w-[72px] py-1.5 px-2 rounded-lg font-bold transition-all ${
                        interviewForm.status === st
                          ? 'bg-[#9E1A24] text-white'
                          : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5">
                  للحجز قبل المقابلة اختار «مجدولة» وحدد التاريخ والوقت. بعد إتمامها، عدّل نفس السجل وسجّل النتيجة؛ الموعد المجدول وحده لا يعني أن المتقدم مقبول.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={interviewForm.notes}
                  onChange={e => setInterviewForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                />
              </div>

              {interviewError && (
                <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold">
                  {interviewError}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  disabled={isSavingInterview}
                  onClick={() => { setShowInterviewForm(false); setInterviewError(null); }}
                  className="px-4 py-1.5 rounded-lg font-bold border border-stone-300 text-stone-700 hover:bg-stone-100"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isSavingInterview}
                  onClick={onSaveInterview}
                  className="px-4 py-1.5 rounded-lg font-bold bg-[#9E1A24] text-white disabled:opacity-60"
                >
                  {isSavingInterview ? 'جاري الحفظ...' : interviewForm.id ? 'حفظ التعديلات' : 'حفظ الموعد'}
                </button>
              </div>
            </div>
          )}

          {!applicant.interviews || applicant.interviews.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl text-stone-500 text-xs">
              لم يتم تسجيل مقابلات بعد للمتقدم
            </div>
          ) : (
            <div className="space-y-3">
              {applicant.interviews.map((int, i) => (
                <div key={int.id || i} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs bg-[#9E1A24] text-white px-2.5 py-0.5 rounded-lg">
                      المقابلة رقم {int.interview_number || i + 1}
                    </span>
                    {int.status === 'مجدولة' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700"><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> موعد مجدول</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <SvgIcons.Star key={star} className="w-4 h-4" filled={star <= int.evaluation} />
                        ))}
                      </div>
                    )}
                  </div>
                  {canAddInterview && (
                    <button
                      type="button"
                      onClick={() => {
                        setInterviewError(null);
                        setInterviewForm({
                          id: int.id,
                          interview_date: int.interview_date || '',
                          interview_time: int.interview_time || '',
                          interviewer_name: int.interviewer_name || '',
                          status: int.status,
                          evaluation: int.evaluation || 0,
                          notes: int.notes || '',
                        });
                        setShowInterviewForm(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-100"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" /> تعديل الموعد / النتيجة
                    </button>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-stone-500 block">التاريخ:</span>
                      <span className="font-mono font-semibold">{int.interview_date}{int.interview_time ? ` · ${int.interview_time}` : ''}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">المسؤول:</span>
                      <span className="font-semibold">{int.interviewer_name}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">الحالة:</span>
                      <span className="font-bold text-[#9E1A24]">{int.status}</span>
                    </div>
                  </div>
                  {int.notes && (
                    <div className="bg-white p-2.5 rounded-xl text-xs text-stone-700 border border-stone-200">
                      {int.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>  );
};
