import { Applicant } from '../types';

export const FRONT_LABEL = 'وش البطاقة';
export const BACK_LABEL = 'ظهر البطاقة';
export const HEALTH_LABEL = 'الشهادة الصحية';

/**
 * المستندات الأساسية الناقصة للمتقدم: وش البطاقة، ظهر البطاقة، الشهادة الصحية.
 * - الطلبات القديمة اللي مرفوع فيها صورة بطاقة واحدة (النوع القديم "صورة بطاقة الرقم القومي")
 *   بنعتبرها مكتملة عشان ما يطلعش تنبيه غلط.
 */
export const getMissingDocuments = (applicant: Pick<Applicant, 'documents'>): string[] => {
  const docs = (applicant.documents || []).filter(d => d && d.file_url);
  const has = (test: (type: string) => boolean) => docs.some(d => test(String(d.document_type || '')));

  const legacyId = has(t => t === 'صورة بطاقة الرقم القومي');
  const hasFront = legacyId || has(t => t.includes('قومي') && t.includes('الوجه'));
  const hasBack = legacyId || has(t => t.includes('قومي') && t.includes('الظهر'));
  const hasHealth = has(t => t === 'شهادة صحية');

  const missing: string[] = [];
  if (!hasFront) missing.push(FRONT_LABEL);
  if (!hasBack) missing.push(BACK_LABEL);
  if (!hasHealth) missing.push(HEALTH_LABEL);
  return missing;
};
