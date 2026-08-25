-- =========================================================================
-- BOB WICH HR System - Full Reset Schema (Supabase PostgreSQL)
-- تحذير: السكريبت ده بيمسح كل الجداول والبيانات القديمة قبل ما يعمل جداول
-- نضيفة من جديد. متشغلوش إلا لو متأكد إنك عايز تبدأ من الصفر.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. حذف الجداول القديمة (بالترتيب العكسي بسبب الـ Foreign Keys)
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS hr_decisions CASCADE;
DROP TABLE IF EXISTS applicant_assets CASCADE;
DROP TABLE IF EXISTS applicant_documents CASCADE;
DROP TABLE IF EXISTS applicant_experiences CASCADE;
DROP TABLE IF EXISTS applicants CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -------------------------------------------------------------------------
-- 1. جدول المستخدمين وحسابات الموظفين للنظام (Users & Staff Auth)
-- -------------------------------------------------------------------------
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'hr',
    branch TEXT,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- -------------------------------------------------------------------------
-- 2. جدول فروع مطاعم BOB WICH (Branches)
-- -------------------------------------------------------------------------
CREATE TABLE branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- -------------------------------------------------------------------------
-- 3. جدول المسميات والأقسام الوظيفية (Job Positions)
-- -------------------------------------------------------------------------
CREATE TABLE positions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- -------------------------------------------------------------------------
-- 4. جدول المتقدمين للوظائف (Applicants)
-- -------------------------------------------------------------------------
CREATE TABLE applicants (
    id TEXT PRIMARY KEY,
    application_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    national_id TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    birth_date TEXT,
    emergency_phone TEXT,
    emergency_contact_name TEXT,
    address TEXT NOT NULL,
    marital_status TEXT,
    military_status TEXT,
    photo_url TEXT,
    branch_id TEXT,
    branch_name TEXT NOT NULL,
    position_id TEXT,
    position_name TEXT NOT NULL,
    experience_years INTEGER DEFAULT 0,
    restaurant_experience BOOLEAN DEFAULT TRUE,
    last_job TEXT,
    leaving_reason TEXT,
    qualification TEXT NOT NULL,
    specialization TEXT,
    graduation_year TEXT,
    still_studying BOOLEAN DEFAULT FALSE,
    shift_morning BOOLEAN DEFAULT TRUE,
    shift_night BOOLEAN DEFAULT TRUE,
    can_work_shifts BOOLEAN DEFAULT TRUE,
    can_work_overtime BOOLEAN DEFAULT TRUE,
    can_work_holidays BOOLEAN DEFAULT TRUE,
    skills TEXT[],
    custom_skill TEXT,
    declaration_accepted BOOLEAN DEFAULT TRUE,
    applicant_signature_name TEXT NOT NULL,
    declaration_date TEXT,
    status TEXT DEFAULT 'طلب جديد',
    is_converted_to_employee BOOLEAN DEFAULT FALSE,
    employee_id TEXT,
    employee_code TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 5. جدول خبرات العمل السابقة (Applicant Experiences)
-- -------------------------------------------------------------------------
CREATE TABLE applicant_experiences (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    workplace TEXT NOT NULL,
    position TEXT NOT NULL,
    date_from TEXT,
    date_to TEXT,
    leaving_reason TEXT
);

-- -------------------------------------------------------------------------
-- 6. جدول مستندات ومرفقات المتقدمين (Applicant Documents)
-- -------------------------------------------------------------------------
CREATE TABLE applicant_documents (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by TEXT
);

-- -------------------------------------------------------------------------
-- 7. جدول المقابلات الشخصية والتقييمات (Interviews)
-- -------------------------------------------------------------------------
CREATE TABLE interviews (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    interview_number INTEGER DEFAULT 1,
    interview_date TEXT NOT NULL,
    interviewer_name TEXT NOT NULL,
    interviewer_role TEXT,
    status TEXT DEFAULT 'مقبول',
    evaluation INTEGER DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 8. جدول العهدة المسلمة للموظف (Applicant Assets)
-- -------------------------------------------------------------------------
CREATE TABLE applicant_assets (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    item_number INTEGER,
    asset_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    condition TEXT DEFAULT 'جديد',
    notes TEXT
);

-- -------------------------------------------------------------------------
-- 9. جدول قرارات الموارد البشرية والرواتب (HR Decisions)
-- -------------------------------------------------------------------------
CREATE TABLE hr_decisions (
    id TEXT PRIMARY KEY,
    applicant_id TEXT UNIQUE NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    proposed_position TEXT,
    proposed_salary TEXT,
    branch_name TEXT,
    application_date TEXT,
    first_interview_status TEXT,
    second_interview_status TEXT,
    joining_date TEXT,
    hr_notes TEXT,
    recruiter_name TEXT,
    recruiter_signature TEXT,
    hiring_decision TEXT DEFAULT 'قبول',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 10. جدول الموظفين المعينين رسميًا (Employees)
-- -------------------------------------------------------------------------
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    employee_code TEXT UNIQUE NOT NULL,
    applicant_id TEXT REFERENCES applicants(id),
    application_code TEXT,
    full_name TEXT NOT NULL,
    national_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    emergency_phone TEXT,
    address TEXT,
    position_id TEXT,
    position_name TEXT NOT NULL,
    branch_id TEXT,
    branch_name TEXT NOT NULL,
    salary TEXT,
    hire_date TEXT NOT NULL,
    status TEXT DEFAULT 'تحت الاختبار',
    photo_url TEXT,
    qualification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 11. جدول سجل العمليات والأمان والرقابة (Audit Logs)
-- -------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_code TEXT,
    entity_name TEXT,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    user_role TEXT DEFAULT 'hr',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT
);

-- -------------------------------------------------------------------------
-- Indexes for maximum query performance and data integrity
-- -------------------------------------------------------------------------
CREATE INDEX idx_applicants_national_id ON applicants(national_id);
CREATE INDEX idx_applicants_status ON applicants(status);
CREATE INDEX idx_applicants_branch ON applicants(branch_name);
CREATE INDEX idx_applicants_position ON applicants(position_name);
CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_employees_national_id ON employees(national_id);
CREATE INDEX idx_experiences_applicant ON applicant_experiences(applicant_id);
CREATE INDEX idx_documents_applicant ON applicant_documents(applicant_id);
CREATE INDEX idx_interviews_applicant ON interviews(applicant_id);
CREATE INDEX idx_assets_applicant ON applicant_assets(applicant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- -------------------------------------------------------------------------
-- 12. أول حساب Admin افتراضي (اليوزرنيم: admin / الباسورد: BobWich@2026)
-- غيّر الباسورد فورًا بعد أول تسجيل دخول من داخل النظام.
-- -------------------------------------------------------------------------
INSERT INTO users (id, username, name, email, role, password_hash, salt, is_active)
VALUES (
  'usr_2ccef44bad50',
  'admin',
  'المدير العام',
  'admin@bobwich.com',
  'admin',
  'e28319ebf517aa55397f5312c898bf1a1bb1c64fb015fe80b9155565167b941eae4063a57426d4fe8c69bb272c9cd0f759a8aeebd8d5c400929ced88b91775eb',
  '4f5a564f863a44d481d3c8bbf17b1956',
  TRUE
);
