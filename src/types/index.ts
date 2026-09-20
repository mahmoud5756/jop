export type ApplicantStatus =
  | 'طلب جديد'
  | 'تحت المراجعة'
  | 'حضر المقابلة'
  | 'إعادة مقابلة'
  | 'مقبول'
  | 'مرفوض'
  | 'قائمة انتظار';

export type MaritalStatus = 'أعزب' | 'متزوج' | 'مطلق' | 'أرمل';

export type MilitaryStatus = 'أدى الخدمة' | 'إعفاء نهائي' | 'إعفاء مؤقت' | 'تأجيل' | 'غير مطلوب (إناث)';

export type UserRole = 'admin' | 'hr' | 'manager' | 'employee';

// تصنيف مصدر طلب التوظيف: متقدم جديد من الجمهور، أو موظف حالي بيسجل بياناته
// في النظام الجديد عن طريق لينك منفصل — عشان أرشيفه يفضل منفصل عن المتقدمين الجدد
export type ApplicantCategory = 'external' | 'internal_staff';

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
  document_type: 'صورة بطاقة الرقم القومي - الوجه' | 'صورة بطاقة الرقم القومي - الظهر' | 'صورة بطاقة الرقم القومي' | 'صور شخصية' | 'شهادة صحية' | 'أخرى';
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
  // مصدر الطلب: 'external' (متقدم جديد من الجمهور) أو 'internal_staff' (موظف
  // حالي بيسجل بياناته من لينك التسجيل المخصص). الافتراضي 'external'.
  applicant_category: ApplicantCategory;
  is_converted_to_employee: boolean;
  employee_id?: string;
  employee_code?: string;

  // Custom (admin-defined) fields — القيم التي أدخلها المتقدم في الحقول
  // الإضافية التي أنشأها مدير النظام من شاشة "إعدادات نموذج التقديم"
  custom_data?: Record<string, any>;

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
  status: 'نشط' | 'تحت الاختبار' | 'إجازة' | 'مجاز' | 'مستقيل' | 'منهي التعاقد' | 'منتهي الخدمة';
  photo_url?: string;
  qualification: string;
  /** تاريخ الاستقالة / إنهاء التعاقد (YYYY-MM-DD) — بيتسجل لما الحالة تتحول لمستقيل أو منهي التعاقد */
  separation_date?: string | null;
  /** سبب الاستقالة / إنهاء التعاقد (اختياري) */
  separation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: 'applicant' | 'employee' | 'interview' | 'asset' | 'hr_decision' | 'document' | 'branch' | 'position' | 'company_settings' | 'manager_request';
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
  is_active?: boolean;
  created_at?: string;
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

// ============================================================================
// Branch Staffing (العدد المطلوب من كل وظيفة في كل فرع — لوحة مدير الفرع)
// ============================================================================

/** العدد المطلوب من وظيفة معيّنة في فرع معيّن — بيضبطه الأدمن/الموارد البشرية */
export interface StaffingRequirement {
  id: string;
  branch_name: string;
  position_name: string;
  required_count: number;
  updated_at?: string;
  updated_by?: string;
}

/** صف مقارنة العدد المطلوب بالعدد الحالي لوظيفة واحدة داخل فرع */
export interface BranchStaffingRow {
  position_name: string;
  required_count: number;
  current_count: number;
  /** الشاغر = المطلوب - الموجود (بحد أدنى صفر) */
  shortage: number;
}

/** موظف ناقصه مستند أساسي (بطاقة/شهادة صحية) */
export interface BranchEmployeeMissingDocs {
  employee_id: string;
  employee_code: string;
  full_name: string;
  position_name: string;
  phone: string;
  /** ملف المتقدم المرتبط بالموظف — مطلوب عشان نرفع المستند الناقص من شاشة متابعة الفرع */
  applicant_id: string;
  missing: string[];
}

/** ملخص فرع كامل لمدير الفرع: مين معاه، اي الوظائف الناقصة، ومين ناقصه مستندات */
export interface BranchStaffingOverview {
  branch_name: string;
  positions: BranchStaffingRow[];
  total_required: number;
  total_current: number;
  total_shortage: number;
  employees_missing_docs: BranchEmployeeMissingDocs[];
}

export interface CompanySettings {
  id: string;
  commercial_registry: string;
  tax_card: string;
  updated_at?: string;
  updated_by?: string;
}

export interface AuthResponse {
  token: string;
  user: CurrentUser;
}

// ============================================================================
// Dynamic Application Form Fields (نموذج التقديم القابل للتعديل)
// ============================================================================

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'phone'
  | 'declaration';   // إقرار / تعهد له نص كامل + خانة موافقة

export type FormSectionKey =
  | 'personal'
  | 'job'
  | 'education'
  | 'experience'
  | 'shifts'
  | 'attachments'
  | 'declaration';

export interface FormFieldConfig {
  key: string;              // مفتاح الحقل (مطابق لاسم العمود للحقول المدمجة)
  label: string;            // الاسم الظاهر للمتقدم وللأدمن وفي الطباعة
  section: FormSectionKey;  // القسم الذي يظهر فيه
  type: FormFieldType;
  required: boolean;
  visible: boolean;
  is_custom: boolean;       // true = حقل أضافه مدير النظام
  order: number;
  options?: string[];       // لقوائم الاختيار
  placeholder?: string;
  show_in_print?: boolean;
  /** نص الإقرار الكامل (يُستخدم فقط مع النوع 'declaration') */
  content?: string;
}

export interface FormFieldSettings {
  config: FormFieldConfig[];
  updated_at?: string;
  updated_by?: string;
}

// ============================================================================
// Manager Requests (طلبات مدير الفرع للموارد البشرية)
// ============================================================================

/**
 * أنواع الطلبات اللي مدير الفرع يقدر يرفعها للموارد البشرية:
 *  - staff_request:    طلب موظف/كاشير (أو أي وظيفة) للفرع
 *  - transfer:         نقل موظف من فرعه لفرع تاني
 *  - new_hire_review:  تأكيد موظف جديد نزل الفرع (تمام / مش تمام)
 *  - investigation:    تحويل موظف للتحقيق
 *  - termination:      طلب إنهاء تعاقد موظف
 *  - resignation:      إبلاغ باستقالة موظف وتاريخ آخر يوم
 */
export type ManagerRequestType =
  | 'staff_request'
  | 'transfer'
  | 'new_hire_review'
  | 'investigation'
  | 'termination'
  | 'resignation';

export type ManagerRequestStatus = 'جديد' | 'تمت الموافقة' | 'مرفوض' | 'تم التنفيذ';

export interface ManagerRequest {
  id: string;
  request_type: ManagerRequestType;
  status: ManagerRequestStatus;
  /** فرع مدير الفرع اللي رفع الطلب */
  branch_name: string;
  requested_by: string;
  employee_id?: string | null;
  employee_code?: string | null;
  employee_name?: string | null;
  employee_position?: string | null;
  /** للنقل: الفرع المطلوب النقل له */
  target_branch?: string | null;
  /** لطلب موظف: الوظيفة والعدد المطلوب */
  requested_position?: string | null;
  requested_count?: number | null;
  /** تاريخ سريان الطلب: آخر يوم عمل (استقالة/إنهاء) أو تاريخ النقل أو تاريخ الاحتياج */
  effective_date?: string | null;
  /** لتأكيد الموظف الجديد: 'تمام' أو 'مش تمام' */
  review_result?: 'تمام' | 'مش تمام' | null;
  urgent?: boolean;
  reason?: string | null;
  hr_note?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at?: string;
}
