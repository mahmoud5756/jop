import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'بيانات الاتصال بقاعدة بيانات Supabase غير مكتملة. يرجى ضبط SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY في متغيرات البيئة.'
    );
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('✅ Supabase connected as primary and only database:', url);
    } catch (err) {
      console.error('❌ Failed to initialize Supabase client:', err);
      throw err;
    }
  }

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  );
}

/**
 * Upload a file (base64 data URL or buffer) to Supabase Storage bucket 'hr-documents'
 */
export async function uploadToSupabaseStorage(
  filePath: string,
  dataUrlOrBuffer: string | Buffer,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  const supabase = getSupabase();
  const bucketName = 'hr-documents';

  let fileBody: Buffer;
  let finalContentType = contentType;

  if (typeof dataUrlOrBuffer === 'string') {
    if (dataUrlOrBuffer.startsWith('data:')) {
      const parts = dataUrlOrBuffer.split(';base64,');
      finalContentType = parts[0].replace('data:', '') || contentType;
      fileBody = Buffer.from(parts[1], 'base64');
    } else if (dataUrlOrBuffer.startsWith('http://') || dataUrlOrBuffer.startsWith('https://')) {
      // Already a remote URL
      return dataUrlOrBuffer;
    } else {
      fileBody = Buffer.from(dataUrlOrBuffer);
    }
  } else {
    fileBody = dataUrlOrBuffer;
  }

  try {
    // Attempt upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBody, {
        contentType: finalContentType,
        upsert: true,
      });

    if (error) {
      console.warn(`Supabase storage upload notice (${filePath}):`, error.message);
      // If storage bucket is not public/created, return original dataUrl if it was a data string
      if (typeof dataUrlOrBuffer === 'string') {
        return dataUrlOrBuffer;
      }
      throw error;
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return publicUrlData?.publicUrl || data.path;
  } catch (err) {
    console.error('Error in uploadToSupabaseStorage:', err);
    if (typeof dataUrlOrBuffer === 'string') {
      return dataUrlOrBuffer;
    }
    throw err;
  }
}

// SQL Schema for Supabase PostgreSQL
export const SUPABASE_SQL_SCHEMA = `
-- =========================================================================
-- BOB WICH HR System - Schema PostgreSQL for Supabase
-- =========================================================================

-- 1. جدول المستخدمين وحسابات الموظفين للنظام (Users & Staff Auth)
CREATE TABLE IF NOT EXISTS users (
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

-- 2. جدول فروع مطاعم BOB WICH (Branches)
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2ب. بيانات الشركة الثابتة (السجل التجاري / البطاقة الضريبية) - صف وحيد
CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    commercial_registry TEXT NOT NULL DEFAULT '',
    tax_card TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT
);
INSERT INTO company_settings (id, commercial_registry, tax_card)
VALUES ('default', '', '') ON CONFLICT (id) DO NOTHING;

-- 3. جدول المسميات والأقسام الوظيفية (Job Positions)
CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. جدول المتقدمين للوظائف (Applicants)
CREATE TABLE IF NOT EXISTS applicants (
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

-- 5. جدول خبرات العمل السابقة (Applicant Experiences)
CREATE TABLE IF NOT EXISTS applicant_experiences (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    workplace TEXT NOT NULL,
    position TEXT NOT NULL,
    date_from TEXT,
    date_to TEXT,
    leaving_reason TEXT
);

-- 6. جدول مستندات ومرفقات المتقدمين (Applicant Documents)
CREATE TABLE IF NOT EXISTS applicant_documents (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by TEXT
);

-- 7. جدول المقابلات الشخصية والتقييمات (Interviews)
CREATE TABLE IF NOT EXISTS interviews (
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

-- 8. جدول العهدة المسلمة للموظف (Applicant Assets)
CREATE TABLE IF NOT EXISTS applicant_assets (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    item_number INTEGER,
    asset_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    condition TEXT DEFAULT 'جديد',
    notes TEXT
);

-- 9. جدول قرارات الموارد البشرية والرواتب (HR Decisions)
CREATE TABLE IF NOT EXISTS hr_decisions (
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

-- 10. جدول الموظفين المعينين رسميًا (Employees)
CREATE TABLE IF NOT EXISTS employees (
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

-- 11. جدول سجل العمليات والأمان والرقابة (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- Indexes for maximum query performance and data integrity
CREATE INDEX IF NOT EXISTS idx_applicants_national_id ON applicants(national_id);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
CREATE INDEX IF NOT EXISTS idx_applicants_branch ON applicants(branch_name);
CREATE INDEX IF NOT EXISTS idx_applicants_position ON applicants(position_name);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_national_id ON employees(national_id);
CREATE INDEX IF NOT EXISTS idx_experiences_applicant ON applicant_experiences(applicant_id);
CREATE INDEX IF NOT EXISTS idx_documents_applicant ON applicant_documents(applicant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_applicant ON interviews(applicant_id);
CREATE INDEX IF NOT EXISTS idx_assets_applicant ON applicant_assets(applicant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
`;
