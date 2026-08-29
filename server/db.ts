import {
  Applicant,
  ApplicantExperience,
  ApplicantDocument,
  Interview,
  ApplicantAsset,
  HRDecision,
  Employee,
  AuditLog,
  Branch,
  JobPosition,
  UserRole,
  UserAccount,
  CurrentUser
} from '../src/types';
import { hashPassword, verifyPassword } from './auth.js';
import { getSupabase, uploadToSupabaseStorage } from './supabase.js';

/**
 * Escapes characters that are structurally significant in PostgREST filter
 * strings (used by Supabase's `.or()` and `.ilike()` builders below).
 *
 * These queries are built by interpolating user-supplied values directly
 * into a filter string, e.g.:
 *   .or(`username.ilike.${sanitizePostgrestValue(cleanInput)},email.ilike.${sanitizePostgrestValue(cleanInput)}`)
 * A value containing a comma or parenthesis can inject additional filter
 * clauses (PostgREST filter injection) — e.g. a login username of
 * `x,role.eq.admin` turns the filter into an OR that can match an
 * unrelated admin row. `%`/`_` are LIKE wildcards and are stripped too so
 * user input can't be used to broaden an ilike match into an unintended
 * multi-row result. This does not affect legitimate input (names, phone
 * numbers, national IDs, and generated codes never legitimately contain
 * these characters).
 */
function sanitizePostgrestValue(value: string): string {
  return value.replace(/[,()%_]/g, '');
}


/**
 * Supabase Data Access Layer for BOB WICH HR System
 * All persistent data operations communicate exclusively with Supabase PostgreSQL and Supabase Storage.
 */
class SupabaseDataAccessLayer {
  // =========================================================================
  // Master Data (Branches & Positions)
  // =========================================================================

  public async getBranches(): Promise<Branch[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching branches from Supabase:', error);
      throw new Error(`فشل استرجاع الفروع من قاعدة البيانات: ${error.message}`);
    }

    return data || [];
  }

  public async getPositions(): Promise<JobPosition[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('title');

    if (error) {
      console.error('Error fetching positions from Supabase:', error);
      throw new Error(`فشل استرجاع الوظائف من قاعدة البيانات: ${error.message}`);
    }

    return data || [];
  }

  public async createBranch(name: string, location?: string, is_active: boolean = true): Promise<Branch> {
    const supabase = getSupabase();
    const newBranch: Branch = {
      id: 'br_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      location: location?.trim() || '',
      is_active,
    };
    const { error } = await supabase.from('branches').insert([newBranch]);
    if (error) {
      throw new Error(`فشل إضافة الفرع: ${error.message}`);
    }
    return newBranch;
  }

  public async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch> {
    const supabase = getSupabase();
    const { error } = await supabase.from('branches').update(updates).eq('id', id);
    if (error) {
      throw new Error(`فشل تحديث الفرع: ${error.message}`);
    }
    const { data } = await supabase.from('branches').select('*').eq('id', id).single();
    return data || updates;
  }

  public async deleteBranch(id: string): Promise<boolean> {
    const supabase = getSupabase();
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) {
      throw new Error(`فشل حذف الفرع: ${error.message}`);
    }
    return true;
  }

  // =========================================================================
  // Company Settings (single fixed row: السجل التجاري / البطاقة الضريبية)
  // Filled in once from الإعدادات ("Company Settings") and reused
  // automatically on every printed document (payslip, contracts, etc.)
  // instead of being typed by hand each time.
  // =========================================================================

  public async getCompanySettings(): Promise<{ commercial_registry: string; tax_card: string }> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('Error fetching company settings from Supabase:', error);
      throw new Error(`فشل استرجاع بيانات الشركة: ${error.message}`);
    }

    return {
      commercial_registry: data?.commercial_registry || '',
      tax_card: data?.tax_card || '',
    };
  }

  public async updateCompanySettings(
    updates: { commercial_registry?: string; tax_card?: string },
    updatedBy?: string
  ): Promise<{ commercial_registry: string; tax_card: string }> {
    const supabase = getSupabase();
    const payload = {
      id: 'default',
      ...(updates.commercial_registry !== undefined && { commercial_registry: updates.commercial_registry.trim() }),
      ...(updates.tax_card !== undefined && { tax_card: updates.tax_card.trim() }),
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || null,
    };
    const { error } = await supabase.from('company_settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      throw new Error(`فشل تحديث بيانات الشركة: ${error.message}`);
    }
    return this.getCompanySettings();
  }

  public async createPosition(title: string, department?: string, is_active: boolean = true): Promise<JobPosition> {
    const supabase = getSupabase();
    const newPos: JobPosition = {
      id: 'pos_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      department: department?.trim() || 'المطعم',
      is_active,
    };
    const { error } = await supabase.from('positions').insert([newPos]);
    if (error) {
      throw new Error(`فشل إضافة الوظيفة: ${error.message}`);
    }
    return newPos;
  }

  public async updatePosition(id: string, updates: Partial<JobPosition>): Promise<JobPosition> {
    const supabase = getSupabase();
    const { error } = await supabase.from('positions').update(updates).eq('id', id);
    if (error) {
      throw new Error(`فشل تحديث الوظيفة: ${error.message}`);
    }
    const { data } = await supabase.from('positions').select('*').eq('id', id).single();
    return data || updates;
  }

  public async deletePosition(id: string): Promise<boolean> {
    const supabase = getSupabase();
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) {
      throw new Error(`فشل حذف الوظيفة: ${error.message}`);
    }
    return true;
  }

  // =========================================================================
  // Audit Logs (Supabase)
  // =========================================================================

  public async addAuditLog(
    entity_type: AuditLog['entity_type'],
    entity_id: string,
    action: string,
    performed_by: string,
    user_role: UserRole,
    details: string,
    extra?: { entity_code?: string; entity_name?: string; old_value?: string; new_value?: string }
  ): Promise<AuditLog> {
    const supabase = getSupabase();
    const log: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      entity_type,
      entity_id,
      entity_code: extra?.entity_code || '',
      entity_name: extra?.entity_name || '',
      action,
      performed_by: performed_by || 'مسؤول النظام',
      user_role: user_role || 'hr',
      details,
      old_value: extra?.old_value || '',
      new_value: extra?.new_value || '',
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('audit_logs').insert([log]);
    if (error) {
      console.error('Error logging audit to Supabase:', error);
    }
    return log;
  }

  public async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    const supabase = getSupabase();
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching audit logs from Supabase:', error);
      throw new Error(`فشل استرجاع سجل العمليات: ${error.message}`);
    }
    return data || [];
  }

  // =========================================================================
  // Generate Unique Codes (via Supabase queries)
  // =========================================================================

  private async generateApplicationCode(): Promise<string> {
    const supabase = getSupabase();
    const year = new Date().getFullYear();
    const prefix = `BW-APP-${year}-`;

    try {
      // Find the highest existing application code for the current year
      const { data } = await supabase
        .from('applicants')
        .select('application_code')
        .like('application_code', `${prefix}%`)
        .order('application_code', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0 && data[0].application_code) {
        const lastCode = data[0].application_code;
        const match = lastCode.match(/BW-APP-\d{4}-(\d+)/);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed >= nextNumber) {
            nextNumber = parsed + 1;
          }
        }
      }

      let code = `${prefix}${String(nextNumber).padStart(4, '0')}`;

      // Verify uniqueness to prevent any race condition
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: existing } = await supabase
          .from('applicants')
          .select('id')
          .eq('application_code', code)
          .maybeSingle();

        if (!existing) {
          return code;
        }
        nextNumber++;
        code = `${prefix}${String(nextNumber).padStart(4, '0')}`;
      }

      // Safe fallback if multiple concurrent inserts occur
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}${String(nextNumber).padStart(4, '0')}-${randomSuffix}`;
    } catch (err) {
      console.warn('Error computing next application code sequence, using timestamp fallback:', err);
      return `BW-APP-${year}-${String(Date.now()).slice(-4)}`;
    }
  }

  private async generateEmployeeCode(): Promise<string> {
    const supabase = getSupabase();
    const year = new Date().getFullYear();
    const prefix = `BW-EMP-${year}-`;

    try {
      // Find the highest existing employee code for the current year
      const { data } = await supabase
        .from('employees')
        .select('employee_code')
        .like('employee_code', `${prefix}%`)
        .order('employee_code', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0 && data[0].employee_code) {
        const lastCode = data[0].employee_code;
        const match = lastCode.match(/BW-EMP-\d{4}-(\d+)/);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed >= nextNumber) {
            nextNumber = parsed + 1;
          }
        }
      }

      let code = `${prefix}${String(nextNumber).padStart(4, '0')}`;

      // Verify uniqueness to prevent any race condition
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: existing } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_code', code)
          .maybeSingle();

        if (!existing) {
          return code;
        }
        nextNumber++;
        code = `${prefix}${String(nextNumber).padStart(4, '0')}`;
      }

      // Safe fallback if multiple concurrent inserts occur
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}${String(nextNumber).padStart(4, '0')}-${randomSuffix}`;
    } catch (err) {
      console.warn('Error computing next employee code sequence, using timestamp fallback:', err);
      return `BW-EMP-${year}-${String(Date.now()).slice(-4)}`;
    }
  }

  // =========================================================================
  // Applicants (Supabase PostgreSQL)
  // =========================================================================

  public async getApplicants(filters?: {
    search?: string;
    status?: string;
    branch?: string;
    position?: string;
  }): Promise<Applicant[]> {
    const supabase = getSupabase();

    let query = supabase
      .from('applicants')
      .select(`
        *,
        experiences:applicant_experiences(*),
        documents:applicant_documents(*),
        interviews:interviews(*),
        assets:applicant_assets(*),
        hr_decision:hr_decisions(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'الكل') {
      query = query.eq('status', filters.status);
    }

    if (filters?.branch && filters.branch !== 'الكل') {
      query = query.eq('branch_name', filters.branch);
    }

    if (filters?.position && filters.position !== 'الكل') {
      query = query.eq('position_name', filters.position);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(
        `full_name.ilike.%${q}%,national_id.ilike.%${q}%,phone.ilike.%${q}%,application_code.ilike.%${q}%,branch_name.ilike.%${q}%,position_name.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching applicants from Supabase:', error);
      throw new Error(`فشل استرجاع بيانات المتقدمين من Supabase: ${error.message}`);
    }

    return (data || []).map(row => this.formatApplicantRow(row));
  }

  public async getApplicantById(id: string): Promise<Applicant | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('applicants')
      .select(`
        *,
        experiences:applicant_experiences(*),
        documents:applicant_documents(*),
        interviews:interviews(*),
        assets:applicant_assets(*),
        hr_decision:hr_decisions(*)
      `)
      .or(`id.eq.${sanitizePostgrestValue(id)},application_code.eq.${sanitizePostgrestValue(id)}`)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching applicant ${id} from Supabase:`, error);
      throw new Error(`فشل استرجاع بيانات المتقدم من Supabase: ${error.message}`);
    }

    if (!data) return null;
    return this.formatApplicantRow(data);
  }

  public async getApplicantByNationalId(nationalId: string, excludeId?: string): Promise<Applicant | null> {
    if (!nationalId) return null;
    const cleanId = nationalId.trim();
    const supabase = getSupabase();

    let query = supabase
      .from('applicants')
      .select(`
        *,
        experiences:applicant_experiences(*),
        documents:applicant_documents(*),
        interviews:interviews(*),
        assets:applicant_assets(*),
        hr_decision:hr_decisions(*)
      `)
      .eq('national_id', cleanId);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Error checking national ID in Supabase:', error);
      throw new Error(`فشل التحقق من الرقم القومي في قاعدة البيانات: ${error.message}`);
    }

    if (!data) return null;
    return this.formatApplicantRow(data);
  }

  private formatApplicantRow(row: any): Applicant {
    const experiences = row.experiences || [];
    const documents = row.documents || [];
    const interviews = row.interviews || [];
    const assets = row.assets || [];
    const hr_decision = Array.isArray(row.hr_decision)
      ? (row.hr_decision[0] || undefined)
      : (row.hr_decision || undefined);

    // Sort interviews by date/number
    interviews.sort((a: Interview, b: Interview) => (a.interview_number || 1) - (b.interview_number || 1));

    return {
      ...row,
      experiences,
      documents,
      interviews,
      assets,
      hr_decision,
    };
  }

  // =========================================================================
  // Create Applicant in Supabase
  // =========================================================================

  public async createApplicant(
    payload: Partial<Applicant>,
    performedBy: string = 'مسؤول التوظيف',
    userRole: UserRole = 'hr'
  ): Promise<{ success: boolean; applicant?: Applicant; error?: string }> {
    const supabase = getSupabase();

    // 1. Validate National ID
    const nationalId = (payload.national_id || '').trim();
    if (!nationalId) {
      return { success: false, error: 'الرقم القومي مطلوب' };
    }
    if (nationalId.length !== 14 || !/^\d{14}$/.test(nationalId)) {
      return { success: false, error: 'الرقم القومي يجب أن يتكون من 14 رقمًا صحيحًا' };
    }

    // Check duplicate in Supabase
    const existing = await this.getApplicantByNationalId(nationalId);
    if (existing) {
      return {
        success: false,
        error: `هذا الرقم القومي مسجل بالفعل في النظام للمتقدم "${existing.full_name}" بكود (${existing.application_code})`
      };
    }

    if (!payload.full_name || !payload.full_name.trim()) {
      return { success: false, error: 'الاسم بالكامل مطلوب' };
    }
    if (!payload.phone || !payload.phone.trim()) {
      return { success: false, error: 'رقم الهاتف مطلوب' };
    }

    const id = 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const application_code = await this.generateApplicationCode();
    const now = new Date().toISOString();

    // Handle Photo upload to Supabase Storage if it's base64
    let photo_url = payload.photo_url || '';
    if (photo_url && photo_url.startsWith('data:')) {
      try {
        const photoPath = `candidates/${id}/photo_${Date.now()}.png`;
        photo_url = await uploadToSupabaseStorage(photoPath, photo_url, 'image/png');
      } catch (uploadErr) {
        console.warn('Failed to upload candidate photo to Supabase storage, storing directly:', uploadErr);
      }
    }

    const newApplicantRecord = {
      id,
      application_code,
      full_name: payload.full_name.trim(),
      national_id: nationalId,
      phone: (payload.phone || '').trim(),
      birth_date: payload.birth_date || '',
      emergency_phone: payload.emergency_phone || '',
      emergency_contact_name: payload.emergency_contact_name || '',
      address: payload.address || '',
      marital_status: payload.marital_status || 'أعزب',
      military_status: payload.military_status || 'غير مطلوب',
      photo_url,

      branch_id: payload.branch_id || '',
      branch_name: payload.branch_name || 'فرع التجمع الخامس (الفرع الرئيسي)',
      position_id: payload.position_id || '',
      position_name: payload.position_name || 'عضو فريق خدمة وويتر (Team Member / Host)',
      experience_years: Number(payload.experience_years) || 0,
      restaurant_experience: Boolean(payload.restaurant_experience),
      last_job: payload.last_job || '',
      leaving_reason: payload.leaving_reason || '',

      qualification: payload.qualification || '',
      specialization: payload.specialization || '',
      graduation_year: payload.graduation_year || '',
      still_studying: Boolean(payload.still_studying),

      skills: payload.skills || [],
      custom_skill: payload.custom_skill || '',

      shift_morning: payload.shift_morning ?? true,
      shift_night: payload.shift_night ?? true,
      can_work_shifts: payload.can_work_shifts ?? true,
      can_work_overtime: payload.can_work_overtime ?? true,
      can_work_holidays: payload.can_work_holidays ?? true,

      declaration_accepted: payload.declaration_accepted ?? true,
      applicant_signature_name: payload.applicant_signature_name || payload.full_name || '',
      declaration_date: payload.declaration_date || now.split('T')[0],

      status: payload.status || 'طلب جديد',
      is_converted_to_employee: false,

      created_at: now,
      updated_at: now,
    };

    // Insert into Supabase `applicants` table
    const { error: appInsertError } = await supabase
      .from('applicants')
      .insert([newApplicantRecord]);

    if (appInsertError) {
      console.error('Error inserting applicant into Supabase:', appInsertError);
      return { success: false, error: `فشل حفظ طلب التوظيف في Supabase: ${appInsertError.message}` };
    }

    // Insert experiences if any
    if (payload.experiences && payload.experiences.length > 0) {
      const expRows = payload.experiences
        .filter(exp => exp.workplace || exp.position)
        .map((exp, idx) => ({
          id: 'exp_' + Date.now() + '_' + idx,
          applicant_id: id,
          workplace: exp.workplace || '',
          position: exp.position || '',
          date_from: exp.date_from || '',
          date_to: exp.date_to || '',
          leaving_reason: exp.leaving_reason || '',
        }));

      if (expRows.length > 0) {
        const { error: expError } = await supabase.from('applicant_experiences').insert(expRows);
        if (expError) console.error('Error inserting experiences into Supabase:', expError);
      }
    }

    // Insert documents if any (with storage upload)
    if (payload.documents && payload.documents.length > 0) {
      const docRows = [];
      for (let idx = 0; idx < payload.documents.length; idx++) {
        const doc = payload.documents[idx];
        let fileUrl = doc.file_url || '';
        if (fileUrl.startsWith('data:')) {
          try {
            const ext = doc.file_name?.split('.').pop() || 'pdf';
            const storagePath = `documents/${id}/doc_${Date.now()}_${idx}.${ext}`;
            fileUrl = await uploadToSupabaseStorage(storagePath, fileUrl);
          } catch (e) {
            console.warn('Could not upload doc to Supabase storage, storing directly:', e);
          }
        }
        docRows.push({
          id: 'doc_' + Date.now() + '_' + idx,
          applicant_id: id,
          document_type: doc.document_type || 'صورة بطاقة الرقم القومي',
          file_name: doc.file_name || 'ملف مرفق',
          file_url: fileUrl,
          file_size: doc.file_size || '',
          uploaded_by: performedBy,
          uploaded_at: now,
        });
      }

      if (docRows.length > 0) {
        const { error: docError } = await supabase.from('applicant_documents').insert(docRows);
        if (docError) console.error('Error inserting documents into Supabase:', docError);
      }
    }

    // Insert assets if any
    if (payload.assets && payload.assets.length > 0) {
      const assetRows = payload.assets
        .filter(ast => ast.asset_name)
        .map((ast, idx) => ({
          id: 'ast_' + Date.now() + '_' + idx,
          applicant_id: id,
          item_number: idx + 1,
          asset_name: ast.asset_name,
          quantity: Number(ast.quantity) || 1,
          condition: ast.condition || 'سليم ومستعمل',
          notes: ast.notes || '',
        }));

      if (assetRows.length > 0) {
        const { error: assetError } = await supabase.from('applicant_assets').insert(assetRows);
        if (assetError) console.error('Error inserting assets into Supabase:', assetError);
      }
    }

    // Insert HR decision if any
    if (payload.hr_decision) {
      const hrDecRow = {
        id: 'hrd_' + Date.now(),
        applicant_id: id,
        proposed_position: payload.hr_decision.proposed_position || newApplicantRecord.position_name,
        proposed_salary: String(payload.hr_decision.proposed_salary || ''),
        branch_name: payload.hr_decision.branch_name || newApplicantRecord.branch_name,
        application_date: payload.hr_decision.application_date || now.split('T')[0],
        first_interview_status: payload.hr_decision.first_interview_status || '',
        second_interview_status: payload.hr_decision.second_interview_status || '',
        joining_date: payload.hr_decision.joining_date || '',
        hr_notes: payload.hr_decision.hr_notes || '',
        recruiter_name: payload.hr_decision.recruiter_name || performedBy,
        hiring_decision: payload.hr_decision.hiring_decision || 'قبول',
        created_at: now,
        updated_at: now,
      };

      const { error: decError } = await supabase.from('hr_decisions').insert([hrDecRow]);
      if (decError) console.error('Error inserting HR decision into Supabase:', decError);
    }

    // Add audit log
    await this.addAuditLog(
      'applicant',
      id,
      'إنشاء طلب توظيف جديد',
      performedBy,
      userRole,
      `تم إنشاء طلب توظيف جديد للمتقدم ${newApplicantRecord.full_name} (${newApplicantRecord.application_code})`,
      { entity_code: newApplicantRecord.application_code, entity_name: newApplicantRecord.full_name }
    );

    const savedApplicant = await this.getApplicantById(id);
    return { success: true, applicant: savedApplicant || (newApplicantRecord as any) };
  }

  // =========================================================================
  // Update Applicant in Supabase
  // =========================================================================

  public async updateApplicant(
    id: string,
    payload: Partial<Applicant>,
    performedBy: string = 'مسؤول التوظيف',
    userRole: UserRole = 'hr'
  ): Promise<{ success: boolean; applicant?: Applicant; error?: string }> {
    const supabase = getSupabase();
    const current = await this.getApplicantById(id);
    if (!current) {
      return { success: false, error: 'طلب التوظيف غير موجود' };
    }

    // Check national id uniqueness if updated
    if (payload.national_id && payload.national_id !== current.national_id) {
      const nationalId = payload.national_id.trim();
      if (nationalId.length !== 14 || !/^\d{14}$/.test(nationalId)) {
        return { success: false, error: 'الرقم القومي يجب أن يتكون من 14 رقمًا صحيحًا' };
      }
      const existing = await this.getApplicantByNationalId(nationalId, id);
      if (existing) {
        return {
          success: false,
          error: `الرقم القومي (${nationalId}) مسجل بالفعل لمتقدم آخر (${existing.full_name})`
        };
      }
    }

    // Upload photo to Supabase Storage if base64
    let photo_url = payload.photo_url !== undefined ? payload.photo_url : current.photo_url;
    if (photo_url && photo_url.startsWith('data:')) {
      try {
        const photoPath = `candidates/${id}/photo_${Date.now()}.png`;
        photo_url = await uploadToSupabaseStorage(photoPath, photo_url, 'image/png');
      } catch (e) {
        console.warn('Failed to upload candidate photo to Supabase Storage:', e);
      }
    }

    const now = new Date().toISOString();
    const updateRecord = {
      full_name: payload.full_name !== undefined ? payload.full_name.trim() : current.full_name,
      national_id: payload.national_id !== undefined ? payload.national_id.trim() : current.national_id,
      phone: payload.phone !== undefined ? payload.phone.trim() : current.phone,
      birth_date: payload.birth_date !== undefined ? payload.birth_date : current.birth_date,
      emergency_phone: payload.emergency_phone !== undefined ? payload.emergency_phone : current.emergency_phone,
      emergency_contact_name: payload.emergency_contact_name !== undefined ? payload.emergency_contact_name : current.emergency_contact_name,
      address: payload.address !== undefined ? payload.address : current.address,
      marital_status: payload.marital_status !== undefined ? payload.marital_status : current.marital_status,
      military_status: payload.military_status !== undefined ? payload.military_status : current.military_status,
      photo_url,

      branch_id: payload.branch_id !== undefined ? payload.branch_id : current.branch_id,
      branch_name: payload.branch_name !== undefined ? payload.branch_name : current.branch_name,
      position_id: payload.position_id !== undefined ? payload.position_id : current.position_id,
      position_name: payload.position_name !== undefined ? payload.position_name : current.position_name,
      experience_years: payload.experience_years !== undefined ? Number(payload.experience_years) : current.experience_years,
      restaurant_experience: payload.restaurant_experience !== undefined ? Boolean(payload.restaurant_experience) : current.restaurant_experience,
      last_job: payload.last_job !== undefined ? payload.last_job : current.last_job,
      leaving_reason: payload.leaving_reason !== undefined ? payload.leaving_reason : current.leaving_reason,

      qualification: payload.qualification !== undefined ? payload.qualification : current.qualification,
      specialization: payload.specialization !== undefined ? payload.specialization : current.specialization,
      graduation_year: payload.graduation_year !== undefined ? payload.graduation_year : current.graduation_year,
      still_studying: payload.still_studying !== undefined ? Boolean(payload.still_studying) : current.still_studying,

      skills: payload.skills !== undefined ? payload.skills : current.skills,
      custom_skill: payload.custom_skill !== undefined ? payload.custom_skill : current.custom_skill,

      shift_morning: payload.shift_morning !== undefined ? payload.shift_morning : current.shift_morning,
      shift_night: payload.shift_night !== undefined ? payload.shift_night : current.shift_night,
      can_work_shifts: payload.can_work_shifts !== undefined ? payload.can_work_shifts : current.can_work_shifts,
      can_work_overtime: payload.can_work_overtime !== undefined ? payload.can_work_overtime : current.can_work_overtime,
      can_work_holidays: payload.can_work_holidays !== undefined ? payload.can_work_holidays : current.can_work_holidays,

      status: payload.status !== undefined ? payload.status : current.status,
      updated_at: now,
    };

    const { error: updateError } = await supabase
      .from('applicants')
      .update(updateRecord)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating applicant in Supabase:', updateError);
      return { success: false, error: `فشل تعديل طلب التوظيف في Supabase: ${updateError.message}` };
    }

    // Sync experiences if provided
    if (payload.experiences !== undefined) {
      await supabase.from('applicant_experiences').delete().eq('applicant_id', id);
      if (payload.experiences.length > 0) {
        const expRows = payload.experiences
          .filter(e => e.workplace || e.position)
          .map((e, idx) => ({
            id: e.id || 'exp_' + Date.now() + '_' + idx,
            applicant_id: id,
            workplace: e.workplace || '',
            position: e.position || '',
            date_from: e.date_from || '',
            date_to: e.date_to || '',
            leaving_reason: e.leaving_reason || '',
          }));
        if (expRows.length > 0) {
          await supabase.from('applicant_experiences').insert(expRows);
        }
      }
    }

    // Sync assets if provided
    if (payload.assets !== undefined) {
      await supabase.from('applicant_assets').delete().eq('applicant_id', id);
      if (payload.assets.length > 0) {
        const assetRows = payload.assets
          .filter(a => a.asset_name)
          .map((a, idx) => ({
            id: a.id || 'ast_' + Date.now() + '_' + idx,
            applicant_id: id,
            item_number: idx + 1,
            asset_name: a.asset_name,
            quantity: Number(a.quantity) || 1,
            condition: a.condition || 'سليم ومستعمل',
            notes: a.notes || '',
          }));
        if (assetRows.length > 0) {
          await supabase.from('applicant_assets').insert(assetRows);
        }
      }
    }

    // Upsert HR decision if provided
    if (payload.hr_decision) {
      const hrDecRow = {
        id: payload.hr_decision.id || 'hrd_' + Date.now(),
        applicant_id: id,
        proposed_position: payload.hr_decision.proposed_position || updateRecord.position_name,
        proposed_salary: String(payload.hr_decision.proposed_salary ?? ''),
        branch_name: payload.hr_decision.branch_name || updateRecord.branch_name,
        application_date: payload.hr_decision.application_date || current.created_at.split('T')[0],
        first_interview_status: payload.hr_decision.first_interview_status || '',
        second_interview_status: payload.hr_decision.second_interview_status || '',
        joining_date: payload.hr_decision.joining_date || '',
        hr_notes: payload.hr_decision.hr_notes || '',
        recruiter_name: payload.hr_decision.recruiter_name || performedBy,
        hiring_decision: payload.hr_decision.hiring_decision || '',
        updated_at: now,
      };

      await supabase.from('hr_decisions').upsert(hrDecRow);
    }

    // Add audit log
    await this.addAuditLog(
      'applicant',
      id,
      'تعديل بيانات طلب التوظيف',
      performedBy,
      userRole,
      `تم تعديل بيانات المتقدم ${updateRecord.full_name} (${current.application_code})`,
      { entity_code: current.application_code, entity_name: updateRecord.full_name }
    );

    const updatedApplicant = await this.getApplicantById(id);
    return { success: true, applicant: updatedApplicant || undefined };
  }

  // =========================================================================
  // Delete Applicant from Supabase
  // =========================================================================

  public async deleteApplicant(
    id: string,
    performedBy: string,
    userRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    const applicant = await this.getApplicantById(id);
    if (!applicant) {
      return { success: false, error: 'طلب التوظيف غير موجود' };
    }

    if (applicant.is_converted_to_employee) {
      return { success: false, error: 'لا يمكن حذف متقدم تم تحويله إلى موظف بالفعل. يرجى مراجعة إدارة الموارد البشرية.' };
    }

    const { error } = await supabase.from('applicants').delete().eq('id', id);
    if (error) {
      console.error('Error deleting applicant from Supabase:', error);
      return { success: false, error: `فشل حذف طلب التوظيف من Supabase: ${error.message}` };
    }

    await this.addAuditLog(
      'applicant',
      id,
      'حذف طلب توظيف',
      performedBy,
      userRole,
      `تم حذف طلب التوظيف للمتقدم ${applicant.full_name} (${applicant.application_code})`,
      { entity_code: applicant.application_code, entity_name: applicant.full_name }
    );

    return { success: true };
  }

  // =========================================================================
  // Document Management (Supabase Storage + PostgreSQL)
  // =========================================================================

  public async addDocument(doc: Omit<ApplicantDocument, 'id' | 'uploaded_at'>): Promise<ApplicantDocument> {
    const supabase = getSupabase();
    const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    let file_url = doc.file_url;
    if (file_url.startsWith('data:')) {
      try {
        const ext = doc.file_name.split('.').pop() || 'pdf';
        const storagePath = `documents/${doc.applicant_id}/${id}.${ext}`;
        file_url = await uploadToSupabaseStorage(storagePath, file_url);
      } catch (err) {
        console.warn('Could not upload to Supabase storage, storing URL directly:', err);
      }
    }

    const newDoc: ApplicantDocument = {
      id,
      applicant_id: doc.applicant_id,
      document_type: doc.document_type,
      file_name: doc.file_name,
      file_url,
      file_size: doc.file_size || '',
      uploaded_by: doc.uploaded_by || 'مسؤول التوظيف',
      uploaded_at: now,
    };

    const { error } = await supabase.from('applicant_documents').insert([newDoc]);
    if (error) {
      console.error('Error inserting document into Supabase:', error);
      throw new Error(`فشل رفع المستند إلى قاعدة البيانات: ${error.message}`);
    }

    await this.addAuditLog(
      'document',
      doc.applicant_id,
      'رفع مستند جديد',
      doc.uploaded_by,
      'hr',
      `تم رفع مستند "${doc.file_name}" (${doc.document_type})`
    );

    return newDoc;
  }

  public async deleteDocument(documentId: string, performedBy: string, userRole: UserRole): Promise<boolean> {
    const supabase = getSupabase();
    const { data: doc } = await supabase
      .from('applicant_documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();

    if (!doc) return false;

    const { error } = await supabase.from('applicant_documents').delete().eq('id', documentId);
    if (error) {
      console.error('Error deleting document from Supabase:', error);
      throw new Error(`فشل حذف المستند: ${error.message}`);
    }

    await this.addAuditLog(
      'document',
      doc.applicant_id,
      'حذف مستند',
      performedBy,
      userRole,
      `تم حذف المستند "${doc.file_name}"`
    );

    return true;
  }

  // =========================================================================
  // Interviews (Supabase PostgreSQL)
  // =========================================================================

  public async addInterview(
    applicantId: string,
    interviewData: Omit<Interview, 'id' | 'created_at'>,
    performedBy: string,
    userRole: UserRole
  ): Promise<Interview> {
    const supabase = getSupabase();
    const id = 'int_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const interview: Interview = {
      id,
      applicant_id: applicantId,
      interview_number: interviewData.interview_number,
      interview_date: interviewData.interview_date || now.split('T')[0],
      interviewer_name: interviewData.interviewer_name || performedBy,
      interviewer_role: interviewData.interviewer_role,
      status: interviewData.status,
      evaluation: interviewData.evaluation || 5,
      notes: interviewData.notes || '',
      created_at: now,
      updated_at: now,
    };

    const { error: intError } = await supabase.from('interviews').insert([interview]);
    if (intError) {
      console.error('Error inserting interview into Supabase:', intError);
      throw new Error(`فشل تسجيل المقابلة في Supabase: ${intError.message}`);
    }

    // Update applicant status automatically
    let newApplicantStatus: string | null = null;
    if (interview.status === 'حضر' || interview.status === 'مقبول') {
      newApplicantStatus = interview.status === 'مقبول' ? 'مقبول' : 'حضر المقابلة';
    } else if (interview.status === 'إعادة مقابلة') {
      newApplicantStatus = 'إعادة مقابلة';
    } else if (interview.status === 'مرفوض') {
      newApplicantStatus = 'مرفوض';
    }

    if (newApplicantStatus) {
      await supabase
        .from('applicants')
        .update({ status: newApplicantStatus, updated_at: now })
        .eq('id', applicantId);
    }

    const applicant = await this.getApplicantById(applicantId);
    await this.addAuditLog(
      'interview',
      applicantId,
      `تسجيل مقابلة ${interview.interview_number}`,
      performedBy,
      userRole,
      `تم تسجيل نتيجة المقابلة رقم (${interview.interview_number}) بحالة "${interview.status}" وتقييم (${interview.evaluation}/5)`,
      { entity_code: applicant?.application_code, entity_name: applicant?.full_name }
    );

    return interview;
  }

  // =========================================================================
  // Convert Applicant to Employee (Supabase PostgreSQL Transaction-safe)
  // =========================================================================

  public async convertToEmployee(
    applicantId: string,
    payload: {
      hire_date?: string;
      salary?: number | string;
      branch_name?: string;
      position_name?: string;
      status?: 'نشط' | 'تحت الاختبار' | 'إجازة' | 'منتهي الخدمة';
    },
    performedBy: string = 'مدير الموارد البشرية',
    userRole: UserRole = 'hr'
  ): Promise<{ success: boolean; employee?: Employee; error?: string }> {
    const supabase = getSupabase();
    const applicant = await this.getApplicantById(applicantId);
    if (!applicant) {
      return { success: false, error: 'المتقدم غير موجود' };
    }

    if (applicant.is_converted_to_employee) {
      const { data: existingEmp } = await supabase
        .from('employees')
        .select('*')
        .eq('applicant_id', applicantId)
        .maybeSingle();

      return {
        success: false,
        error: `تم تحويل هذا المتقدم مسبقًا إلى موظف بكود (${existingEmp?.employee_code || applicant.employee_code})`
      };
    }

    const employee_code = await this.generateEmployeeCode();
    const now = new Date().toISOString();
    const id = 'emp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const employee: Employee = {
      id,
      applicant_id: applicant.id,
      employee_code,
      application_code: applicant.application_code,
      full_name: applicant.full_name,
      national_id: applicant.national_id,
      phone: applicant.phone,
      emergency_phone: applicant.emergency_phone,
      address: applicant.address,
      branch_name: payload.branch_name || applicant.branch_name,
      position_name: payload.position_name || applicant.position_name,
      hire_date: payload.hire_date || now.split('T')[0],
      salary: String(payload.salary || (applicant.hr_decision?.proposed_salary || 'غير محدد')),
      status: payload.status || 'تحت الاختبار',
      photo_url: applicant.photo_url,
      qualification: applicant.qualification,
      created_at: now,
      updated_at: now,
    };

    // 1. Insert into Supabase `employees` table
    const { error: empError } = await supabase.from('employees').insert([employee]);
    if (empError) {
      console.error('Error inserting employee into Supabase:', empError);
      return { success: false, error: `فشل إنشاء سجل الموظف في Supabase: ${empError.message}` };
    }

    // 2. Link applicant record in `applicants` table without deletion
    const { error: linkError } = await supabase
      .from('applicants')
      .update({
        is_converted_to_employee: true,
        employee_id: employee.id,
        employee_code,
        status: 'مقبول',
        updated_at: now,
      })
      .eq('id', applicantId);

    if (linkError) {
      console.error('Error linking applicant to employee in Supabase:', linkError);
    }

    // 3. Update HR decision in Supabase
    await supabase
      .from('hr_decisions')
      .update({
        hiring_decision: 'قبول',
        joining_date: employee.hire_date,
        proposed_salary: String(employee.salary),
        updated_at: now,
      })
      .eq('applicant_id', applicantId);

    // 4. Log in Audit logs
    await this.addAuditLog(
      'employee',
      employee.id,
      'تحويل متقدم إلى موظف رسمي',
      performedBy,
      userRole,
      `تم تعيين المتقدم ${applicant.full_name} (${applicant.application_code}) كموظف جديد بكود (${employee.employee_code}) براتب ${employee.salary} وفرع ${employee.branch_name}`,
      { entity_code: employee.employee_code, entity_name: employee.full_name }
    );

    return { success: true, employee };
  }

  // =========================================================================
  // Employees (Supabase PostgreSQL)
  // =========================================================================

  public async getEmployees(filters?: {
    search?: string;
    branch?: string;
    position?: string;
    status?: string;
  }): Promise<Employee[]> {
    const supabase = getSupabase();
    let query = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.branch && filters.branch !== 'الكل') {
      query = query.eq('branch_name', filters.branch);
    }
    if (filters?.position && filters.position !== 'الكل') {
      query = query.eq('position_name', filters.position);
    }
    if (filters?.status && filters.status !== 'الكل') {
      query = query.eq('status', filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(
        `full_name.ilike.%${q}%,national_id.ilike.%${q}%,phone.ilike.%${q}%,employee_code.ilike.%${q}%,application_code.ilike.%${q}%,branch_name.ilike.%${q}%,position_name.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching employees from Supabase:', error);
      throw new Error(`فشل استرجاع الموظفين من Supabase: ${error.message}`);
    }

    return data || [];
  }

  public async getEmployeeById(id: string): Promise<{ employee: Employee; applicant: Applicant | null } | null> {
    const supabase = getSupabase();
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .or(`id.eq.${sanitizePostgrestValue(id)},employee_code.eq.${sanitizePostgrestValue(id)}`)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching employee ${id} from Supabase:`, error);
      throw new Error(`فشل استرجاع ملف الموظف من Supabase: ${error.message}`);
    }

    if (!employee) return null;
    const applicant = employee.applicant_id ? await this.getApplicantById(employee.applicant_id) : null;
    return { employee, applicant };
  }

  public async deleteEmployee(
    id: string,
    performedBy: string,
    userRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    const { data: emp, error: fetchErr } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !emp) {
      return { success: false, error: 'الموظف غير موجود' };
    }

    if (emp.applicant_id) {
      await supabase
        .from('applicants')
        .update({ is_converted_to_employee: false, employee_id: null, employee_code: null })
        .eq('id', emp.applicant_id);
    }

    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      return { success: false, error: `فشل حذف الموظف: ${error.message}` };
    }

    await this.addAuditLog(
      'employee',
      id,
      'حذف موظف',
      performedBy,
      userRole,
      `تم حذف الموظف ${emp.full_name} (${emp.employee_code}) نهائياً`,
      { entity_code: emp.employee_code, entity_name: emp.full_name }
    );

    return { success: true };
  }

  public async updateEmployeeStatus(
    id: string,
    status: string,
    performedBy: string,
    userRole: UserRole
  ): Promise<{ success: boolean; employee?: Employee; error?: string }> {
    const supabase = getSupabase();
    const { data: emp, error: fetchErr } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !emp) {
      return { success: false, error: 'الموظف غير موجود' };
    }

    const oldStatus = emp.status;
    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('employees')
      .update({ status, updated_at: now })
      .eq('id', id);

    if (updateErr) {
      return { success: false, error: `فشل تحديث حالة الموظف: ${updateErr.message}` };
    }

    await this.addAuditLog(
      'employee',
      id,
      `تحديث حالة الموظف (${status})`,
      performedBy,
      userRole,
      `تم تغير حالة الموظف ${emp.full_name} (${emp.employee_code}) من "${oldStatus}" إلى "${status}"`,
      { entity_code: emp.employee_code, entity_name: emp.full_name, old_value: oldStatus, new_value: status }
    );

    const { data: updatedEmp } = await supabase.from('employees').select('*').eq('id', id).single();
    return { success: true, employee: updatedEmp || undefined };
  }

  // =========================================================================
  // Global Search across Applicants and Employees in Supabase
  // =========================================================================

  public async globalSearch(query: string): Promise<{ applicants: Applicant[]; employees: Employee[] }> {
    if (!query || !query.trim()) {
      return { applicants: [], employees: [] };
    }
    const q = query.trim();
    const sq = sanitizePostgrestValue(q);
    const supabase = getSupabase();

    const [applicantsRes, employeesRes] = await Promise.all([
      supabase
        .from('applicants')
        .select(`
          *,
          experiences:applicant_experiences(*),
          documents:applicant_documents(*),
          interviews:interviews(*),
          assets:applicant_assets(*),
          hr_decision:hr_decisions(*)
        `)
        .or(`full_name.ilike.%${sq}%,national_id.ilike.%${sq}%,phone.ilike.%${sq}%,application_code.ilike.%${sq}%,branch_name.ilike.%${sq}%,position_name.ilike.%${sq}%`)
        .limit(10),
      supabase
        .from('employees')
        .select('*')
        .or(`full_name.ilike.%${sq}%,national_id.ilike.%${sq}%,phone.ilike.%${sq}%,employee_code.ilike.%${sq}%,application_code.ilike.%${sq}%,branch_name.ilike.%${sq}%,position_name.ilike.%${sq}%`)
        .limit(10),
    ]);

    const applicants = (applicantsRes.data || []).map(r => this.formatApplicantRow(r));
    const employees = employeesRes.data || [];

    return { applicants, employees };
  }

  // =========================================================================
  // Statistics Dashboard (from Supabase Counts)
  // =========================================================================

  public async getStats(): Promise<{
    totalApplicants: number;
    newApplicants: number;
    inReview: number;
    interviewed: number;
    accepted: number;
    rejected: number;
    waitlist: number;
    totalEmployees: number;
  }> {
    const supabase = getSupabase();

    const [
      totalAppsRes,
      newAppsRes,
      inReviewRes,
      interviewedRes,
      acceptedRes,
      rejectedRes,
      waitlistRes,
      totalEmpsRes,
    ] = await Promise.all([
      supabase.from('applicants').select('*', { count: 'exact', head: true }),
      supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'طلب جديد'),
      supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'تحت المراجعة'),
      supabase.from('applicants').select('*', { count: 'exact', head: true }).in('status', ['حضر المقابلة', 'إعادة مقابلة']),
      supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'مقبول'),
      supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'مرفوض'),
      supabase.from('applicants').select('*', { count: 'exact', head: true }).eq('status', 'قائمة انتظار'),
      supabase.from('employees').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalApplicants: totalAppsRes.count ?? 0,
      newApplicants: newAppsRes.count ?? 0,
      inReview: inReviewRes.count ?? 0,
      interviewed: interviewedRes.count ?? 0,
      accepted: acceptedRes.count ?? 0,
      rejected: rejectedRes.count ?? 0,
      waitlist: waitlistRes.count ?? 0,
      totalEmployees: totalEmpsRes.count ?? 0,
    };
  }

  // =========================================================================
  // Users & Authentication (Supabase PostgreSQL)
  // =========================================================================

  public async authenticateUser(
    usernameOrEmail: string,
    passwordPlain: string
  ): Promise<{ success: boolean; user?: CurrentUser; error?: string }> {
    if (!usernameOrEmail || !passwordPlain) {
      return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' };
    }

    const supabase = getSupabase();
    const cleanInput = sanitizePostgrestValue(usernameOrEmail.trim().toLowerCase());

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.${cleanInput},email.ilike.${cleanInput}`)
      .maybeSingle();

    if (error) {
      console.error('Error authenticating user in Supabase:', error);
      return { success: false, error: `فشل التحقق من الحساب في Supabase: ${error.message}` };
    }

    if (!user) {
      return { success: false, error: 'بيانات الدخول غير صحيحة (المستخدم غير موجود)' };
    }

    if (!user.is_active) {
      return { success: false, error: 'هذا الحساب معطل حالياً، يرجى التواصل مع مدير النظام' };
    }

    const isValid = verifyPassword(passwordPlain, user.password_hash, user.salt);
    if (!isValid) {
      return { success: false, error: 'كلمة المرور غير صحيحة' };
    }

    // Update last login in Supabase
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Log login activity
    await this.addAuditLog(
      'applicant',
      user.id,
      'تسجيل دخول ناجح',
      user.name,
      user.role,
      `تم تسجيل الدخول بنجاح بحساب (${user.name}) بصلاحية [${user.role}]`,
      { entity_code: user.username, entity_name: user.name }
    );

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
      },
    };
  }

  public async getUserById(userId: string): Promise<CurrentUser | null> {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !user) return null;
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
    };
  }

  public async getAllUsers(): Promise<CurrentUser[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error fetching users from Supabase:', error);
      throw new Error(`فشل استرجاع قائمة المستخدمين من Supabase: ${error.message}`);
    }

    return (data || []).map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      branch: u.branch,
    }));
  }

  public async changeUserPassword(
    userId: string,
    oldPasswordPlain: string,
    newPasswordPlain: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return { success: false, error: 'المستخدم غير موجود' };
    }

    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      return { success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف أو أرقام' };
    }

    const isValid = verifyPassword(oldPasswordPlain, user.password_hash, user.salt);
    if (!isValid) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
    }

    const newHashed = hashPassword(newPasswordPlain);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newHashed.hash,
        salt: newHashed.salt,
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: `فشل تحديث كلمة المرور في Supabase: ${updateError.message}` };
    }

    await this.addAuditLog(
      'applicant',
      user.id,
      'تغيير كلمة المرور',
      user.name,
      user.role,
      `قام المستخدم (${user.name}) بتغيير كلمة المرور الخاصة به بنجاح`,
      { entity_code: user.username, entity_name: user.name }
    );

    return { success: true };
  }
}

export const db = new SupabaseDataAccessLayer();
