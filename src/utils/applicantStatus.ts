import { Applicant, HRDecision } from '../types';

/**
 * الحالة الرسمية للمتقدم المرفوض (بتتحفظ في عمود status).
 */
export const REJECTED_STATUS = 'مرفوض';

/**
 * زرار "رفض الطلب" في استمارة الأدمن كان بيحفظ كلمة "رفض" بدل "مرفوض"
 * (وكذلك "قبول" بدل "مقبول")، فممكن يكون فيه طلبات قديمة متسجلة بالشكل
 * ده. بنعتبر الاتنين "مرفوض" عشان الأرشيف يلقطهم كلهم.
 */
const REJECTED_ALIASES = [REJECTED_STATUS, 'رفض'];

export const isRejectedApplicant = (a: Pick<Applicant, 'status'>): boolean =>
  REJECTED_ALIASES.includes(String(a.status ?? '').trim());

/**
 * بيبني الـ payload اللي بيغيّر حالة المتقدم (رفض / استرجاع) ومعاه قرار الـ HR
 * لو موجود، عشان الحالة وقرار التوظيف يفضلوا متطابقين.
 */
export const buildStatusChangePayload = (
  applicant: Applicant,
  status: string,
): Partial<Applicant> => {
  const payload: Partial<Applicant> = { status: status as Applicant['status'] };
  if (applicant.hr_decision) {
    const decision: HRDecision['hiring_decision'] = status === REJECTED_STATUS ? 'رفض' : '';
    payload.hr_decision = { ...applicant.hr_decision, hiring_decision: decision };
  }
  return payload;
};
