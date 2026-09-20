import React from 'react';
import { ManagerRequest } from '../types';

export const requestStatusClass = (status: ManagerRequest['status']) => {
  switch (status) {
    case 'جديد':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'تمت الموافقة':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'تم التنفيذ':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'مرفوض':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-200';
  }
};

export const RequestStatusBadge: React.FC<{ status: ManagerRequest['status'] }> = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border inline-block ${requestStatusClass(status)}`}>
    {status}
  </span>
);

/** سطر ملخص للطلب (بيتستخدم عند مدير الفرع وعند الموارد البشرية). */
export const requestSummaryLine = (r: ManagerRequest): string => {
  switch (r.request_type) {
    case 'staff_request':
      return `${r.requested_count} × ${r.requested_position}${r.urgent ? ' (مستعجل)' : ''}${
        r.effective_date ? ` — مطلوب قبل ${r.effective_date}` : ''
      }`;
    case 'transfer':
      return `${r.employee_name} (${r.employee_position}) ← فرع ${r.target_branch}${
        r.effective_date ? ` — من ${r.effective_date}` : ''
      }`;
    case 'new_hire_review':
      return `${r.employee_name} (${r.employee_position}) — ${r.review_result}`;
    case 'investigation':
      return `${r.employee_name} (${r.employee_position})`;
    case 'termination':
      return `${r.employee_name} (${r.employee_position}) — إنهاء بتاريخ ${r.effective_date}`;
    case 'resignation':
      return `${r.employee_name} (${r.employee_position}) — آخر يوم ${r.effective_date}`;
    default:
      return '';
  }
};
