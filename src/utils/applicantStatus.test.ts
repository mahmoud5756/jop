import { describe, expect, it } from 'vitest';
import { Applicant } from '../types';
import { buildStatusChangePayload, isRejectedApplicant, REJECTED_STATUS } from './applicantStatus';

describe('applicant status helpers', () => {
  it('recognizes current and legacy rejected status labels', () => {
    expect(isRejectedApplicant({ status: REJECTED_STATUS } as Applicant)).toBe(true);
    expect(isRejectedApplicant({ status: 'رفض' } as unknown as Applicant)).toBe(true);
    expect(isRejectedApplicant({ status: 'طلب جديد' } as Applicant)).toBe(false);
  });

  it('synchronizes HR decision when the applicant already has one', () => {
    const applicant = {
      status: 'طلب جديد',
      hr_decision: { proposed_position: 'كاشير', hiring_decision: 'قبول', recruiter_name: 'HR' },
    } as Applicant;
    const payload = buildStatusChangePayload(applicant, REJECTED_STATUS);
    expect(payload.status).toBe(REJECTED_STATUS);
    expect(payload.hr_decision?.hiring_decision).toBe('رفض');
    expect(payload.hr_decision?.proposed_position).toBe('كاشير');
  });

  it('does not add an HR decision when none exists', () => {
    const payload = buildStatusChangePayload({ status: 'طلب جديد' } as Applicant, 'مقبول');
    expect(payload).toEqual({ status: 'مقبول' });
  });
});
