import { Employee } from '../types';

/** حالات الخروج من الشغل — الموظف اللي حالته منها بيتنقل لأرشيف المستقيلين. */
export const RESIGNED_STATUS = 'مستقيل';
export const TERMINATED_STATUS = 'منهي التعاقد';
// "منتهي الخدمة" قيمة قديمة موجودة في النوع بس؛ بنعتبرها خروج برضه.
export const DEPARTED_STATUSES: string[] = [RESIGNED_STATUS, TERMINATED_STATUS, 'منتهي الخدمة'];

export const isDepartedStatus = (status?: string | null): boolean =>
  DEPARTED_STATUSES.includes(String(status ?? '').trim());

export const isDepartedEmployee = (e: Pick<Employee, 'status'>): boolean => isDepartedStatus(e.status);

/** تاريخ الخروج: المسجّل فعليًا، وإلا آخر تحديث للسجل (للحالات القديمة قبل ما التاريخ يتسجل). */
export const separationDateOf = (e: Employee): string =>
  (e.separation_date && String(e.separation_date).slice(0, 10)) ||
  (e.updated_at ? String(e.updated_at).slice(0, 10) : '');

/** مدة الخدمة من تاريخ المباشرة لحد تاريخ الخروج، بصيغة "س سنة و ش شهر". */
export const serviceDuration = (hireDate?: string, endDate?: string): string => {
  const start = hireDate ? new Date(hireDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '—';
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0 && rest === 0) {
    const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
    return `${days} يوم`;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} سنة`);
  if (rest > 0) parts.push(`${rest} شهر`);
  return parts.join(' و ');
};
