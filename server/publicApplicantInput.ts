import { isHrStoragePublicUrl } from './uploadValidation.js';

const TEXT_FIELDS = [
  'full_name','national_id','phone','birth_date','emergency_phone','emergency_contact_name','address',
  'marital_status','military_status','photo_url','branch_id','branch_name','position_id','position_name',
  'experience_years','current_salary','expected_salary','restaurant_experience','last_job','leaving_reason',
  'qualification','specialization','graduation_year','still_studying','shift_morning','shift_night',
  'can_work_shifts','can_work_overtime','can_work_holidays','declaration_accepted','applicant_signature_name',
  'declaration_date','custom_skill',
] as const;

const boundedText = (value: unknown, max = 500): string => typeof value === 'string' ? value.slice(0, max) : '';

/** Explicitly keep only candidate-editable fields; server-owned status/IDs/HR fields are never trusted. */
export function sanitizePublicApplicantInput(raw: unknown, supabaseUrl?: string): Record<string, unknown> {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const clean: Record<string, unknown> = {};
  for (const key of TEXT_FIELDS) {
    const value = input[key];
    if (['experience_years','current_salary','expected_salary'].includes(key)) {
      if (value === '' || value === null || value === undefined) clean[key] = value ?? '';
      else if (typeof value === 'number' || (typeof value === 'string' && value.length <= 30)) clean[key] = value;
      continue;
    }
    if (['restaurant_experience','still_studying','shift_morning','shift_night','can_work_shifts','can_work_overtime','can_work_holidays','declaration_accepted'].includes(key)) {
      if (typeof value === 'boolean') clean[key] = value;
      continue;
    }
    if (key === 'photo_url') {
      clean.photo_url = isHrStoragePublicUrl(value, supabaseUrl) ? value : '';
      continue;
    }
    if (value !== undefined) clean[key] = boundedText(value, key === 'address' ? 1000 : 500);
  }

  if (input.custom_data && typeof input.custom_data === 'object' && !Array.isArray(input.custom_data)) {
    const entries = Object.entries(input.custom_data as Record<string, unknown>).slice(0, 100)
      .filter(([key, value]) => key.length <= 100 && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))
      .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 2000) : value]);
    clean.custom_data = Object.fromEntries(entries);
  }
  if (Array.isArray(input.experiences)) {
    clean.experiences = input.experiences.slice(0, 20).filter(x => x && typeof x === 'object').map((x: any) => ({
      workplace: boundedText(x.workplace), position: boundedText(x.position), duration_years: boundedText(x.duration_years, 10),
      duration_months: boundedText(x.duration_months, 10), leaving_reason: boundedText(x.leaving_reason),
    }));
  }
  if (Array.isArray(input.skills)) clean.skills = input.skills.slice(0, 100).filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 100));
  if (Array.isArray(input.documents)) {
    clean.documents = input.documents.slice(0, 20).filter((doc: any) => doc && typeof doc === 'object' && isHrStoragePublicUrl(doc.file_url, supabaseUrl))
      .map((doc: any) => ({ document_type: boundedText(doc.document_type, 100), file_name: boundedText(doc.file_name, 255), file_url: doc.file_url, file_size: boundedText(doc.file_size, 40) }));
  }
  return clean;
}
