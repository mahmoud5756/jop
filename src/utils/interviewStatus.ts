import { ApplicantStatus, Interview } from '../types';

/**
 * Map an interview record to an applicant workflow state. Scheduling alone must
 * never mark a candidate accepted or rejected.
 */
export function applicantStatusFromInterview(
  status?: Interview['status'] | string,
  interviewNumber?: number,
): ApplicantStatus | null {
  switch (status) {
    case 'مجدولة':
      return Number(interviewNumber) > 1 ? 'إعادة مقابلة' : 'تحت المراجعة';
    case 'مقبول':
      return 'مقبول';
    case 'حضر':
      return 'حضر المقابلة';
    case 'إعادة مقابلة':
      return 'إعادة مقابلة';
    case 'مرفوض':
      return 'مرفوض';
    default:
      return null;
  }
}
