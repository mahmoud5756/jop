import { describe, expect, it } from 'vitest';
import { sanitizePublicApplicantInput } from './publicApplicantInput';

const projectUrl = 'https://demo-project.supabase.co';

describe('public applicant input sanitization', () => {
  it('keeps candidate fields while dropping IDs, status, HR decisions, and employee links', () => {
    const clean = sanitizePublicApplicantInput({
      full_name: 'Test Candidate', national_id: '29901011234567', status: 'مقبول', id: 'attacker-id',
      employee_id: 'employee-1', hr_decision: { hiring_decision: 'قبول' }, is_converted_to_employee: true,
      custom_data: { size: 'large' },
    }, projectUrl);
    expect(clean.full_name).toBe('Test Candidate');
    expect(clean.status).toBeUndefined();
    expect(clean.id).toBeUndefined();
    expect(clean.employee_id).toBeUndefined();
    expect(clean.hr_decision).toBeUndefined();
    expect(clean.is_converted_to_employee).toBeUndefined();
    expect(clean.custom_data).toEqual({ size: 'large' });
  });

  it('rejects remote photo/document URLs but keeps URLs from the configured HR bucket', () => {
    const safeUrl = `${projectUrl}/storage/v1/object/public/hr-documents/public-uploads/2026/test.jpg`;
    const clean = sanitizePublicApplicantInput({
      photo_url: 'https://attacker.example/tracker.png',
      documents: [
        { file_name: 'external.pdf', file_url: 'https://attacker.example/file.pdf', applicant_id: 'other' },
        { file_name: 'id.jpg', file_url: safeUrl, applicant_id: 'forged-id', uploaded_by: 'forged' },
      ],
    }, projectUrl);
    expect(clean.photo_url).toBe('');
    expect(clean.documents).toEqual([{ document_type: '', file_name: 'id.jpg', file_url: safeUrl, file_size: '' }]);
  });
});
