export type ApplicantStatus =
  | 'طلب جديد'
  | 'تحت المراجعة'
  | 'حضر المقابلة'
  | 'إعادة مقابلة'
  | 'مقبول'
  | 'مرفوض'
  | 'قائمة انتظار';

export type MaritalStatus = 'أعزب' | 'متزوج' | 'أخرى';

export type MilitaryStatus = 'أدى الخدمة' | 'إعفاء' | 'تأجيل' | 'غير مطلوب';

export type UserRole = 'admin' | 'hr' | 'manager' | 'employee';

export interface ApplicantExperience {
  id: string;
  applicant_id: string;
  workplace: string;
  position: string;
  date_from: string;
  date_to: string;
  leaving_reason: string;
}

export interface ApplicantSkill {
  id: string;
  applicant_id: string;
  skill_id: string;
  custom_skill?: string;
}

export interface ApplicantDocument {
  id: string;
  applicant_id: string;
  document_type: 'صورة بطاقة الرقم القومي' | 'صور شخصية' | 'شهادة صحية' | 'أخرى';
  file_name: string;
  file_url: string; // base64 or storage url
  file_size?: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Interview {
  id: string;
  applicant_id: string;
  interview_number: 1 | 2 | 3;
  interview_date: string;
  interviewer_name: string;
  interviewer_role?: string;
  status: 'مقبول' | 'مرفوض' | 'إعادة مقابلة' | 'حضر' | 'لم يحضر';
  evaluation: number; // 1 to 5
  notes: string;
  created_at: string;
  updated_at?: string;
}

export interface ApplicantAsset {
  id: string;
  applicant_id: string;
  item_number: number;
  asset_name: string;
  quantity: number;
  condition: string;
  notes: string;
}

export interface HRDecision {
  id?: string;
  applicant_id: string;
  proposed_position: string;
  proposed_salary: number | string;
  branch_name: string;
  application_date: string;
  first_interview_status: 'مقبول' | 'مرفوض' | 'إعادة مقابلة' | '';
  second_interview_status: 'حضر' | 'لم يحضر' | '';
  joining_date: string;
  hr_notes: string;
  recruiter_name: string;
  recruiter_signature?: string;
  hiring_decision: 'قبول' | 'رفض' | 'قائمة انتظار' | '';
  created_at?: string;
  updated_at?: string;
}

export interface Applicant {
  id: string;
  application_code: string; // e.g. BW-APP-2026-0001
  full_name: string;
  national_id: string; // 14 digits
  phone: string;
  birth_date: string;
  emergency_phone: string;
  emergency_contact_name: string;
  address: string;
  marital_status: MaritalStatus;
  military_status: MilitaryStatus;
  photo_url?: string;

  // Job Details
  branch_id?: string;
  branch_name: string;
  position_id?: string;
  position_name: string;
  experience_years: number | string;
  restaurant_experience: boolean;
  last_job: string;
  leaving_reason: string;

  // Education
  qualification: string;
  specialization: string;
  graduation_year: string;
  still_studying: boolean;

  // Working shifts
  shift_morning: boolean;
  shift_night: boolean;
  can_work_shifts: boolean;
  can_work_overtime: boolean;
  can_work_holidays: boolean;

  // Declaration & signature
  declaration_accepted: boolean;
  applicant_signature_name?: string;
  declaration_date?: string;

  // Status
  status: ApplicantStatus;
  is_converted_to_employee: boolean;
  employee_id?: string;
  employee_code?: string;

  // Sub-records
  experiences?: ApplicantExperience[];
  skills?: string[]; // Array of skill identifiers/names
  custom_skill?: string;
  documents?: ApplicantDocument[];
  interviews?: Interview[];
  assets?: ApplicantAsset[];
  hr_decision?: HRDecision;

  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Employee {
  id: string;
  applicant_id: string;
  employee_code: string; // e.g. BW-EMP-2026-0001
  application_code: string;
  full_name: string;
  national_id: string;
  phone: string;
  emergency_phone: string;
  address: string;
  branch_name: string;
  position_name: string;
  hire_date: string;
  salary: number | string;
  status: 'نشط' | 'تحت الاختبار' | 'إجازة' | 'منتهي الخدمة';
  photo_url?: string;
  qualification: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: 'applicant' | 'employee' | 'interview' | 'asset' | 'hr_decision' | 'document' | 'branch' | 'position';
  entity_id: string;
  entity_code?: string;
  entity_name?: string;
  action: string;
  performed_by: string;
  user_role: UserRole;
  details: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
}

export interface Branch {
  id: string;
  name: string;
  city?: string;
  location?: string;
  is_active: boolean;
}

export interface JobPosition {
  id: string;
  title: string;
  department: string;
  is_active: boolean;
}

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  branch?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  branch?: string;
  password_hash: string;
  salt: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  token: string;
  user: CurrentUser;
}
