import { describe, expect, it } from 'vitest';
import { applicantStatusFromInterview } from './interviewStatus';

describe('interview scheduling status mapping', () => {
  it('keeps a first scheduled interview in review rather than accepted', () => {
    expect(applicantStatusFromInterview('مجدولة', 1)).toBe('تحت المراجعة');
  });

  it('keeps a scheduled follow-up in the re-interview workflow', () => {
    expect(applicantStatusFromInterview('مجدولة', 2)).toBe('إعادة مقابلة');
  });

  it('maps completed outcomes to applicant statuses', () => {
    expect(applicantStatusFromInterview('مقبول', 1)).toBe('مقبول');
    expect(applicantStatusFromInterview('مرفوض', 1)).toBe('مرفوض');
    expect(applicantStatusFromInterview('حضر', 1)).toBe('حضر المقابلة');
    expect(applicantStatusFromInterview('إعادة مقابلة', 1)).toBe('إعادة مقابلة');
  });

  it('does not change the applicant state when the candidate did not attend', () => {
    expect(applicantStatusFromInterview('لم يحضر', 1)).toBeNull();
  });
});
