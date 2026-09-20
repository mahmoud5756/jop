import { ManagerRequestType } from '../types';

export const MANAGER_REQUEST_LABELS: Record<ManagerRequestType, string> = {
  staff_request: 'طلب موظف',
  transfer: 'نقل موظف لفرع تاني',
  new_hire_review: 'تقييم موظف جديد',
  investigation: 'تحويل للتحقيق',
  termination: 'طلب إنهاء تعاقد',
  resignation: 'استقالة',
};

/** الموظف يعتبر "جديد" لو باشر من 30 يوم أو أقل، أو حالته لسه "تحت الاختبار". */
export const NEW_HIRE_WINDOW_DAYS = 30;

export const isNewHire = (e: { hire_date?: string; status?: string }): boolean => {
  if (e.status === 'تحت الاختبار') return true;
  if (!e.hire_date) return false;
  const d = new Date(e.hire_date);
  if (Number.isNaN(d.getTime())) return false;
  const days = (Date.now() - d.getTime()) / 86400000;
  return days >= -7 && days <= NEW_HIRE_WINDOW_DAYS;
};
