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
  CurrentUser,
  FormFieldConfig,
  StaffingRequirement,
  BranchStaffingOverview,
  BranchStaffingRow,
  BranchEmployeeMissingDocs,
  ManagerRequest,
  ManagerRequestType,
  ManagerRequestStatus,
} from '../src/types';
import { MANAGER_REQUEST_LABELS } from '../src/utils/managerRequests.js';
import { hashPassword, verifyPassword } from './auth.js';
import { getSupabase, uploadToSupabaseStorage } from './supabase.js';
import { isDepartedStatus } from '../src/utils/employeeStatus.js';
import { getMissingDocuments } from '../src/utils/applicantDocuments.js';

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
 * Same OR-injection protection as sanitizePostgrestValue (strips comma and
 * parentheses), but for use with `eq.` filters instead of `ilike.` ones.
 * `%` and `_` are only wildcards under LIKE/ILIKE — under `eq` they are
 * ordinary characters, so stripping them would corrupt legitimate values
 * that contain them (e.g. generated IDs like "app_1699999999999_ab12cd").
 */
function sanitizePostgrestEqValue(value: string): string {
  return value.replace(/[,()]/g, '');
}


/**
 * Supabase Data Access Layer for BOB WICH HR System
 * All persistent data operations communicate exclusively with Supabase PostgreSQL and Supabase Storage.
 */
/**
 * توحيد قيم حالة المتقدم: زرار "قرار التوظيف" في الاستمارة كان بيبعت "رفض" / "قبول"
 * بدل الحالات الرسمية "مرفوض" / "مقبول"، فالطلب المرفوض ما كانش بيظهر في فلتر
 * المرفوضين ولا في الإحصائيات. هنا بنوحّدها قبل الحفظ.
 */
function normalizeApplicantStatus(status: any): any {
  if (typeof status !== 'string') return status;
  const s = status.trim();
  if (s === 'رفض') return 'مرفوض';
  if (s === 'قبول') return 'مقبول';
  return s;
}

// حالات الخروج من الشغل (الموظف اللي حالته منها بيظهر في أرشيف المستقيلين)
const DEPARTED_EMPLOYEE_STATUSES = ['مستقيل', 'منهي التعاقد', 'منتهي الخدمة'];

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
  // Branch Staffing (العدد المطلوب من كل وظيفة في كل فرع)
  // بيستخدمها الأدمن/الموارد البشرية لضبط الاحتياج، ولوحة "متابعة الفرع"
  // الخاصة بمدير الفرع لمعرفة مين معاه فعليًا واي الوظائف الناقصة.
  // =========================================================================

  public async getStaffingRequirements(branchName?: string): Promise<StaffingRequirement[]> {
    const supabase = getSupabase();
    let query = supabase
      .from('branch_staffing_requirements')
      .select('*')
      .order('branch_name')
      .order('position_name');
    if (branchName) {
      query = query.eq('branch_name', branchName);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching staffing requirements from Supabase:', error);
      throw new Error(`فشل استرجاع العدد المطلوب: ${error.message}`);
    }
    return data || [];
  }

  public async setStaffingRequirement(
    branch_name: string,
    position_name: string,
    required_count: number,
    updated_by?: string
  ): Promise<StaffingRequirement> {
    const supabase = getSupabase();
    // id ثابت مشتق من الفرع والوظيفة عشان upsert يرجع لنفس الصف دايمًا
    const id = `stf_${encodeURIComponent(branch_name)}__${encodeURIComponent(position_name)}`;
    const payload: StaffingRequirement = {
      id,
      branch_name,
      position_name,
      required_count: Math.max(0, Math.floor(Number(required_count)) || 0),
      updated_at: new Date().toISOString(),
      updated_by: updated_by || '',
    };
    const { error } = await supabase
      .from('branch_staffing_requirements')
      .upsert(payload, { onConflict: 'branch_name,position_name' });
    if (error) {
      throw new Error(`فشل حفظ العدد المطلوب: ${error.message}`);
    }
    return payload;
  }

  /**
   * ملخص فرع كامل لمدير الفرع: الوظائف والعدد المطلوب مقابل الموجود فعليًا
   * (شاغر = مطلوب - موجود)، وقائمة الموظفين النشطين اللي ناقصهم مستندات
   * أساسية (وش/ظهر البطاقة أو الشهادة الصحية).
   */
  public async getBranchStaffingOverview(branchName: string): Promise<BranchStaffingOverview> {
    const supabase = getSupabase();

    const [{ data: employees, error: empErr }, { data: requirements, error: reqErr }] = await Promise.all([
      supabase.from('employees').select('*').eq('branch_name', branchName),
      supabase.from('branch_staffing_requirements').select('*').eq('branch_name', branchName),
    ]);

    if (empErr) throw new Error(`فشل استرجاع موظفي الفرع: ${empErr.message}`);
    if (reqErr) throw new Error(`فشل استرجاع العدد المطلوب: ${reqErr.message}`);

    const activeEmployees: Employee[] = (employees || []).filter((e: Employee) => !isDepartedStatus(e.status));

    const currentByPosition = new Map<string, number>();
    for (const e of activeEmployees) {
      currentByPosition.set(e.position_name, (currentByPosition.get(e.position_name) || 0) + 1);
    }

    const requiredByPosition = new Map<string, number>();
    for (const r of requirements || []) {
      requiredByPosition.set(r.position_name, r.required_count);
    }

    const positionNames = new Set<string>([...currentByPosition.keys(), ...requiredByPosition.keys()]);
    const positions: BranchStaffingRow[] = Array.from(positionNames)
      .map(position_name => {
        const current_count = currentByPosition.get(position_name) || 0;
        const required_count = requiredByPosition.get(position_name) || 0;
        return {
          position_name,
          required_count,
          current_count,
          shortage: Math.max(0, required_count - current_count),
        };
      })
      .sort((a, b) => a.position_name.localeCompare(b.position_name, 'ar'));

    // مستندات ناقصة: بنجيب مستندات المتقدمين المرتبطين بالموظفين النشطين دفعة واحدة
    const applicantIds = activeEmployees.map(e => e.applicant_id).filter((id): id is string => Boolean(id));
    const docsByApplicant = new Map<string, ApplicantDocument[]>();
    if (applicantIds.length > 0) {
      const { data: docs, error: docsErr } = await supabase
        .from('applicant_documents')
        .select('*')
        .in('applicant_id', applicantIds);
      if (docsErr) throw new Error(`فشل استرجاع مستندات الموظفين: ${docsErr.message}`);
      for (const d of docs || []) {
        const list = docsByApplicant.get(d.applicant_id) || [];
        list.push(d);
        docsByApplicant.set(d.applicant_id, list);
      }
    }

    const employees_missing_docs: BranchEmployeeMissingDocs[] = [];
    for (const e of activeEmployees) {
      const docs = e.applicant_id ? docsByApplicant.get(e.applicant_id) || [] : [];
      const missing = getMissingDocuments({ documents: docs });
      if (missing.length > 0) {
        employees_missing_docs.push({
          employee_id: e.id,
          employee_code: e.employee_code,
          full_name: e.full_name,
          position_name: e.position_name,
          phone: e.phone,
          applicant_id: e.applicant_id || '',
          missing,
        });
      }
    }

    return {
      branch_name: branchName,
      positions,
      total_required: positions.reduce((s, p) => s + p.required_count, 0),
      total_current: activeEmployees.length,
      total_shortage: positions.reduce((s, p) => s + p.shortage, 0),
      employees_missing_docs,
    };
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

  // =========================================================================
  // Application Form Field Settings (إعدادات نموذج التقديم)
  // سجل واحد ثابت يحدد أي الحقول تظهر للمتقدم، أيها إلزامي، أسماء الحقول،
  // بالإضافة إلى أي حقول جديدة أضافها مدير النظام. البوابة العامة وشاشة
  // الأدمن وصفحة الطباعة كلها تقرأ من هذا المصدر الواحد.
  // =========================================================================

  public async getFormFieldConfig(): Promise<FormFieldConfig[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('form_field_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('Error fetching form field settings from Supabase:', error);
      // إعداد فارغ = استخدام الإعداد الافتراضي في الواجهة (كل الحقول ظاهرة)
      return [];
    }

    const cfg = (data as any)?.config;
    return Array.isArray(cfg) ? (cfg as FormFieldConfig[]) : [];
  }

  public async updateFormFieldConfig(
    config: FormFieldConfig[],
    updatedBy?: string
  ): Promise<FormFieldConfig[]> {
    const supabase = getSupabase();
    if (!Array.isArray(config)) {
      throw new Error('صيغة إعدادات الحقول غير صحيحة');
    }

    // تنظيف وتطبيع البيانات القادمة من الواجهة قبل الحفظ
    const clean = config
      .filter(f => f && typeof f.key === 'string' && f.key.trim())
      .map((f, idx) => ({
        key: String(f.key).trim(),
        label: String(f.label || '').trim().slice(0, 120),
        section: f.section,
        type: f.type,
        required: !!f.required,
        visible: f.visible !== false,
        is_custom: !!f.is_custom,
        order: typeof f.order === 'number' ? f.order : idx,
        options: Array.isArray(f.options)
          ? f.options.map(o => String(o).trim()).filter(Boolean).slice(0, 40)
          : [],
        placeholder: String(f.placeholder || '').slice(0, 160),
        show_in_print: f.show_in_print !== false,
        // نص الإقرار الكامل (للحقول من نوع declaration فقط)
        content:
          f.type === 'declaration'
            ? String((f as any).content || '').slice(0, 4000)
            : undefined,
      }));

    const { error } = await supabase
      .from('form_field_settings')
      .upsert(
        {
          id: 'default',
          config: clean,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy || null,
        },
        { onConflict: 'id' }
      );

    if (error) {
      throw new Error(`فشل حفظ إعدادات نموذج التقديم: ${error.message}`);
    }

    return clean as FormFieldConfig[];
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

  private async generateApplicationCode(category: string = 'external'): Promise<string> {
    const supabase = getSupabase();
    const year = new Date().getFullYear();
    // أرشيف منفصل بترقيم منفصل: طلبات المتقدمين الجدد BW-APP، وتسجيلات
    // الموظفين الحاليين BW-STAFF — يسهّل التمييز بينهم بمجرد النظر للكود.
    const codePrefix = category === 'internal_staff' ? 'BW-STAFF' : 'BW-APP';
    const prefix = `${codePrefix}-${year}-`;

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
        const match = lastCode.match(new RegExp(`${codePrefix}-\\d{4}-(\\d+)`));
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
      return `${prefix}${String(Date.now()).slice(-4)}`;
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
      .or(`id.eq.${sanitizePostgrestEqValue(id)},application_code.eq.${sanitizePostgrestEqValue(id)}`)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching applicant ${id} from Supabase:`, error);
      throw new Error(`فشل استرجاع بيانات المتقدم من Supabase: ${error.message}`);
    }

    if (!data) return null;
    return this.formatApplicantRow(data);
  }

  public async getApplicantByNationalId(
    nationalId: string,
    excludeId?: string,
    category?: string
  ): Promise<Applicant | null> {
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

    // الرقم القومي فريد داخل نفس تصنيف الطلب فقط (متقدم جديد / موظف حالي)،
    // عشان لو حد بيسجل من لينك الموظفين الحاليين ومعاه سجل قديم كمتقدم
    // عادي، الاتنين ميتلخبطوش مع بعض.
    if (category) {
      query = query.eq('applicant_category', category);
    }

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

    // تصنيف مصدر الطلب — لازم يتحدد قبل فحص التكرار عشان الفحص يبقى داخل
    // نفس التصنيف بس (متقدم جديد ≠ موظف حالي)
    const applicant_category: string =
      payload.applicant_category === 'internal_staff' ? 'internal_staff' : 'external';

    // Check duplicate in Supabase (within the same category only)
    const existing = await this.getApplicantByNationalId(nationalId, undefined, applicant_category);
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
    const application_code = await this.generateApplicationCode(applicant_category);
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
      military_status: payload.military_status || 'غير مطلوب (إناث)',
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
      custom_data: payload.custom_data && typeof payload.custom_data === 'object' ? payload.custom_data : {},

      shift_morning: payload.shift_morning ?? true,
      shift_night: payload.shift_night ?? true,
      can_work_shifts: payload.can_work_shifts ?? true,
      can_work_overtime: payload.can_work_overtime ?? true,
      can_work_holidays: payload.can_work_holidays ?? true,

      declaration_accepted: payload.declaration_accepted ?? true,
      // اسم المقر في الإقرار = اسم المتقدم دايمًا
      applicant_signature_name: (payload.full_name || '').trim(),
      declaration_date: payload.declaration_date || now.split('T')[0],

      status: normalizeApplicantStatus(payload.status) || 'طلب جديد',
      applicant_category,
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
      const existing = await this.getApplicantByNationalId(nationalId, id, current.applicant_category);
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
      custom_data: payload.custom_data !== undefined ? payload.custom_data : (current.custom_data || {}),

      shift_morning: payload.shift_morning !== undefined ? payload.shift_morning : current.shift_morning,
      shift_night: payload.shift_night !== undefined ? payload.shift_night : current.shift_night,
      can_work_shifts: payload.can_work_shifts !== undefined ? payload.can_work_shifts : current.can_work_shifts,
      can_work_overtime: payload.can_work_overtime !== undefined ? payload.can_work_overtime : current.can_work_overtime,
      can_work_holidays: payload.can_work_holidays !== undefined ? payload.can_work_holidays : current.can_work_holidays,

      // الإقرار: كانت الحقول دي بتتحفظ عند الإنشاء بس، وتعديلها بعد كده ماكانش بيتحفظ
      declaration_accepted: payload.declaration_accepted !== undefined ? Boolean(payload.declaration_accepted) : current.declaration_accepted,
      // اسم المقر في الإقرار = اسم المتقدم دايمًا (بيتحدّث تلقائيًا لما الاسم يتغيّر)
      applicant_signature_name: payload.full_name !== undefined ? payload.full_name.trim() : current.full_name,
      declaration_date: payload.declaration_date !== undefined ? payload.declaration_date : current.declaration_date,

      status: payload.status !== undefined ? normalizeApplicantStatus(payload.status) : current.status,
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

    // الفرع اللي الموظف هينزل فيه ممكن يختلف عن الفرع اللي قدّم عليه، بس لازم يكون فرع فعلي
    // (عشان اسمه يطابق حساب مدير الفرع ويظهر له الموظف).
    const assignedBranch = String(payload.branch_name || applicant.branch_name || '').trim();
    if (payload.branch_name && assignedBranch !== applicant.branch_name) {
      const { data: branchRow } = await supabase.from('branches').select('id').eq('name', assignedBranch).maybeSingle();
      if (!branchRow) return { success: false, error: 'الفرع المختار غير موجود في قائمة الفروع' };
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
      `تم تعيين المتقدم ${applicant.full_name} (${applicant.application_code}) كموظف جديد بكود (${employee.employee_code}) براتب ${employee.salary} وفرع ${employee.branch_name}${employee.branch_name !== applicant.branch_name ? ` (المتقدم قدّم على فرع ${applicant.branch_name})` : ''}`,
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
      .or(`id.eq.${sanitizePostgrestEqValue(id)},employee_code.eq.${sanitizePostgrestEqValue(id)}`)
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

  /**
   * تعديل بيانات موظف حالي (الفرع / الوظيفة / الراتب / تاريخ المباشرة / الهاتف).
   * يُستخدم لتصحيح البيانات المُدخلة بالخطأ، وكل تغيير يُسجَّل في سجل العمليات.
   */
  public async updateEmployee(
    id: string,
    updates: {
      branch_name?: string;
      position_name?: string;
      salary?: number | string;
      hire_date?: string;
      phone?: string;
      status?: string;
    },
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

    const patch: Record<string, any> = {};
    const changes: string[] = [];

    const track = (field: string, label: string, rawValue: any, formatted?: string) => {
      if (rawValue === undefined) return;
      const oldVal = (emp as any)[field];
      if (String(oldVal ?? '') === String(rawValue ?? '')) return;
      patch[field] = rawValue;
      changes.push(`${label}: "${oldVal || '—'}" ← "${formatted ?? rawValue ?? '—'}"`);
    };

    if (updates.branch_name !== undefined) {
      const v = String(updates.branch_name).trim();
      if (!v) return { success: false, error: 'اسم الفرع لا يمكن أن يكون فارغاً' };
      track('branch_name', 'الفرع', v);
    }
    if (updates.position_name !== undefined) {
      const v = String(updates.position_name).trim();
      if (!v) return { success: false, error: 'المسمى الوظيفي لا يمكن أن يكون فارغاً' };
      track('position_name', 'الوظيفة', v);
    }
    if (updates.salary !== undefined) {
      const num = Number(updates.salary);
      if (updates.salary !== '' && (isNaN(num) || num < 0)) {
        return { success: false, error: 'الراتب يجب أن يكون رقماً صحيحاً' };
      }
      track('salary', 'الراتب الشهري', updates.salary === '' ? null : num);
    }
    if (updates.hire_date !== undefined) {
      track('hire_date', 'تاريخ بداية العمل', String(updates.hire_date).trim() || null);
    }
    if (updates.phone !== undefined) {
      track('phone', 'رقم الهاتف', String(updates.phone).replace(/\D/g, ''));
    }
    if (updates.status !== undefined) {
      track('status', 'الحالة', String(updates.status).trim());
    }

    if (Object.keys(patch).length === 0) {
      return { success: true, employee: emp as Employee };
    }

    patch.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase.from('employees').update(patch).eq('id', id);
    if (updateErr) {
      return { success: false, error: `فشل تحديث بيانات الموظف: ${updateErr.message}` };
    }

    await this.addAuditLog(
      'employee',
      id,
      'تعديل بيانات موظف',
      performedBy,
      userRole,
      `تم تعديل بيانات الموظف ${emp.full_name} (${emp.employee_code}) — ${changes.join(' | ')}`,
      { entity_code: emp.employee_code, entity_name: emp.full_name }
    );

    const { data: updatedEmp } = await supabase.from('employees').select('*').eq('id', id).single();
    return { success: true, employee: (updatedEmp as Employee) || undefined };
  }

  public async updateEmployeeStatus(
    id: string,
    status: string,
    performedBy: string,
    userRole: UserRole,
    extra?: { separation_date?: string; separation_reason?: string }
  ): Promise<{ success: boolean; employee?: Employee; error?: string; warning?: string }> {
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
    const departed = DEPARTED_EMPLOYEE_STATUSES.includes(String(status).trim());

    const patch: Record<string, any> = { status, updated_at: now };
    let warning: string | undefined;

    // أعمدة تاريخ/سبب الخروج بتتكتب بس لو موجودة في الجدول (الـ migration اتشغّل).
    // لو لسه ما اتشغلش، تغيير الحالة نفسه بيشتغل عادي ونرجّع تحذير.
    const hasSeparationColumns = 'separation_date' in emp && 'separation_reason' in emp;
    if (hasSeparationColumns) {
      if (departed) {
        patch.separation_date = extra?.separation_date || now.split('T')[0];
        patch.separation_reason = extra?.separation_reason?.trim() || null;
      } else {
        // رجوع الموظف للشغل: نمسح بيانات الخروج القديمة
        patch.separation_date = null;
        patch.separation_reason = null;
      }
    } else if (departed && (extra?.separation_date || extra?.separation_reason)) {
      warning =
        'تم تغيير الحالة، لكن تاريخ وسبب الخروج لم يُحفظا لأن ملف migration_departed_archive.sql لم يُشغَّل بعد على قاعدة البيانات.';
    }

    const { error: updateErr } = await supabase.from('employees').update(patch).eq('id', id);

    if (updateErr) {
      return { success: false, error: `فشل تحديث حالة الموظف: ${updateErr.message}` };
    }

    const reasonNote =
      departed && patch.separation_reason ? ` — السبب: ${patch.separation_reason}` : '';
    const dateNote = departed && patch.separation_date ? ` (بتاريخ ${patch.separation_date})` : '';

    await this.addAuditLog(
      'employee',
      id,
      `تحديث حالة الموظف (${status})`,
      performedBy,
      userRole,
      `تم تغير حالة الموظف ${emp.full_name} (${emp.employee_code}) من "${oldStatus}" إلى "${status}"${dateNote}${reasonNote}`,
      { entity_code: emp.employee_code, entity_name: emp.full_name, old_value: oldStatus, new_value: status }
    );

    const { data: updatedEmp } = await supabase.from('employees').select('*').eq('id', id).single();
    return { success: true, employee: updatedEmp || undefined, warning };
  }


  // =========================================================================
  // Manager Requests (طلبات مدير الفرع للموارد البشرية)
  // =========================================================================

  /**
   * إنشاء طلب من مدير الفرع. الفرع بيتحدد من حساب المدير (مش من الفرونت)،
   * وأي طلب يخص موظف لازم يكون الموظف فعلًا في فرع المدير ولسه على رأس الشغل.
   */
  public async createManagerRequest(
    input: {
      request_type: ManagerRequestType;
      employee_id?: string;
      target_branch?: string;
      requested_position?: string;
      requested_count?: number;
      effective_date?: string;
      review_result?: 'تمام' | 'مش تمام';
      urgent?: boolean;
      reason?: string;
    },
    manager: { name: string; branch: string; role: UserRole }
  ): Promise<{ success: boolean; request?: ManagerRequest; error?: string }> {
    const supabase = getSupabase();
    const type = input.request_type;
    const validTypes: ManagerRequestType[] = [
      'staff_request', 'transfer', 'new_hire_review', 'investigation', 'termination', 'resignation',
    ];
    if (!validTypes.includes(type)) return { success: false, error: 'نوع الطلب غير صحيح' };

    const reason = input.reason ? String(input.reason).trim().slice(0, 1000) : '';
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    const effective = input.effective_date ? String(input.effective_date).trim() : '';
    if (effective && !isoDate.test(effective)) return { success: false, error: 'صيغة التاريخ غير صحيحة' };

    const row: Record<string, any> = {
      id: 'mrq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      request_type: type,
      status: 'جديد' as ManagerRequestStatus,
      branch_name: manager.branch,
      requested_by: manager.name,
      reason: reason || null,
      urgent: Boolean(input.urgent),
      effective_date: effective || null,
    };

    if (type === 'staff_request') {
      const position = String(input.requested_position || '').trim();
      const count = Math.floor(Number(input.requested_count));
      if (!position) return { success: false, error: 'اختر الوظيفة المطلوبة' };
      if (!count || count < 1 || count > 50) return { success: false, error: 'العدد المطلوب لازم يكون من 1 إلى 50' };
      row.requested_position = position;
      row.requested_count = count;
    } else {
      // كل الأنواع التانية بتخص موظف بعينه في فرع المدير
      if (!input.employee_id) return { success: false, error: 'اختر الموظف' };
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('id', input.employee_id)
        .maybeSingle();
      if (empErr || !emp) return { success: false, error: 'الموظف غير موجود' };
      if (emp.branch_name !== manager.branch) {
        return { success: false, error: 'الموظف ده مش تابع لفرعك' };
      }
      if (isDepartedStatus(emp.status)) {
        return { success: false, error: 'الموظف ده مسجّل خروجه بالفعل' };
      }
      row.employee_id = emp.id;
      row.employee_code = emp.employee_code;
      row.employee_name = emp.full_name;
      row.employee_position = emp.position_name;

      if (type === 'transfer') {
        const target = String(input.target_branch || '').trim();
        if (!target) return { success: false, error: 'اختر الفرع اللي هيتنقل له الموظف' };
        if (target === manager.branch) return { success: false, error: 'الفرع المطلوب هو نفس فرع الموظف الحالي' };
        const { data: b } = await supabase.from('branches').select('id').eq('name', target).maybeSingle();
        if (!b) return { success: false, error: 'الفرع المطلوب غير موجود' };
        row.target_branch = target;
        if (!reason) return { success: false, error: 'اكتب سبب النقل' };
      }
      if (type === 'resignation' || type === 'termination') {
        if (!effective) {
          return {
            success: false,
            error: type === 'resignation' ? 'حدد آخر يوم عمل للموظف' : 'حدد تاريخ إنهاء التعاقد',
          };
        }
        if (type === 'termination' && !reason) return { success: false, error: 'اكتب سبب طلب إنهاء التعاقد' };
      }
      if (type === 'investigation' && !reason) {
        return { success: false, error: 'اكتب سبب التحويل للتحقيق' };
      }
      if (type === 'new_hire_review') {
        const result = input.review_result;
        if (result !== 'تمام' && result !== 'مش تمام') return { success: false, error: 'اختر: تمام أو مش تمام' };
        if (result === 'مش تمام' && !reason) return { success: false, error: 'اكتب سبب إن الموظف مش تمام' };
        // منع تكرار التقييم لنفس الموظف
        const { data: existing } = await supabase
          .from('manager_requests')
          .select('id')
          .eq('request_type', 'new_hire_review')
          .eq('employee_id', emp.id)
          .limit(1);
        if (existing && existing.length > 0) {
          return { success: false, error: 'تم تقييم الموظف ده قبل كده' };
        }
        row.review_result = result;
        // "تمام" معلومة للموارد البشرية بس مفيهاش إجراء مطلوب
        if (result === 'تمام') {
          row.status = 'تم التنفيذ';
          row.resolved_by = manager.name;
          row.resolved_at = new Date().toISOString();
        }
      }
      // منع طلب مكرر مفتوح من نفس النوع لنفس الموظف
      if (type !== 'new_hire_review') {
        const { data: open } = await supabase
          .from('manager_requests')
          .select('id')
          .eq('request_type', type)
          .eq('employee_id', emp.id)
          .in('status', ['جديد', 'تمت الموافقة'])
          .limit(1);
        if (open && open.length > 0) {
          return { success: false, error: 'فيه طلب من نفس النوع لنفس الموظف لسه ما اتنفذش' };
        }
      }
    }

    const { error } = await supabase.from('manager_requests').insert([row]);
    if (error) {
      return {
        success: false,
        error: `فشل حفظ الطلب: ${error.message} (تأكد إن migration_manager_requests.sql اتشغّل)`,
      };
    }

    await this.addAuditLog(
      'manager_request',
      row.id,
      `طلب من مدير الفرع: ${MANAGER_REQUEST_LABELS[type]}`,
      manager.name,
      manager.role,
      this.describeManagerRequest(row as ManagerRequest),
      { entity_code: row.employee_code || '', entity_name: row.employee_name || row.requested_position || '' }
    );

    return { success: true, request: row as ManagerRequest };
  }

  private describeManagerRequest(r: Partial<ManagerRequest>): string {
    const who = r.employee_name ? `${r.employee_name}${r.employee_code ? ` (${r.employee_code})` : ''}` : '';
    const parts: string[] = [`فرع ${r.branch_name}`];
    switch (r.request_type) {
      case 'staff_request':
        parts.push(`طلب ${r.requested_count} × ${r.requested_position}`);
        break;
      case 'transfer':
        parts.push(`نقل ${who} إلى فرع ${r.target_branch}`);
        break;
      case 'new_hire_review':
        parts.push(`تقييم الموظف الجديد ${who}: ${r.review_result}`);
        break;
      case 'investigation':
        parts.push(`تحويل ${who} للتحقيق`);
        break;
      case 'termination':
        parts.push(`طلب إنهاء تعاقد ${who}`);
        break;
      case 'resignation':
        parts.push(`استقالة ${who}`);
        break;
    }
    if (r.effective_date) parts.push(`التاريخ: ${r.effective_date}`);
    if (r.reason) parts.push(`السبب: ${r.reason}`);
    return parts.join(' — ');
  }

  public async getManagerRequests(filters?: { branch?: string; status?: string }): Promise<ManagerRequest[]> {
    const supabase = getSupabase();
    let query = supabase
      .from('manager_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (filters?.branch) query = query.eq('branch_name', filters.branch);
    if (filters?.status && filters.status !== 'الكل') query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) {
      throw new Error(`فشل استرجاع الطلبات: ${error.message} (تأكد إن migration_manager_requests.sql اتشغّل)`);
    }
    return (data || []) as ManagerRequest[];
  }

  /** تنفيذ الأثر الفعلي للطلب على سجل الموظف (نقل / استقالة / إنهاء). */
  private async applyManagerRequest(
    req: ManagerRequest,
    performedBy: string,
    userRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    if (req.request_type === 'transfer' && req.employee_id && req.target_branch) {
      const r = await this.updateEmployee(req.employee_id, { branch_name: req.target_branch }, performedBy, userRole);
      return { success: r.success, error: r.error };
    }
    if ((req.request_type === 'resignation' || req.request_type === 'termination') && req.employee_id) {
      const status = req.request_type === 'resignation' ? 'مستقيل' : 'منهي التعاقد';
      const r = await this.updateEmployeeStatus(req.employee_id, status, performedBy, userRole, {
        separation_date: req.effective_date || undefined,
        separation_reason: req.reason || undefined,
      });
      return { success: r.success, error: r.error };
    }
    return { success: true };
  }

  /**
   * قرار الموارد البشرية على طلب:
   *  - approve: موافقة. النقل بيتنفذ فورًا. الاستقالة/الإنهاء بتتنفذ في تاريخها
   *    (فورًا لو التاريخ النهارده أو فات، وإلا أوتوماتيك لما التاريخ يجي).
   *  - reject:  رفض (لازم ملاحظة).
   *  - execute: تنفيذ الآن / تم التنفيذ (لطلبات الموظفين والتحقيق... إلخ).
   */
  public async resolveManagerRequest(
    id: string,
    action: 'approve' | 'reject' | 'execute',
    note: string,
    performedBy: string,
    userRole: UserRole
  ): Promise<{ success: boolean; request?: ManagerRequest; error?: string }> {
    const supabase = getSupabase();
    const { data: req, error: fetchErr } = await supabase
      .from('manager_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr || !req) return { success: false, error: 'الطلب غير موجود' };
    const request = req as ManagerRequest;

    if (request.status === 'مرفوض' || request.status === 'تم التنفيذ') {
      return { success: false, error: 'الطلب ده اتقفل بالفعل' };
    }
    const hrNote = note ? String(note).trim().slice(0, 1000) : '';
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const patch: Record<string, any> = { hr_note: hrNote || null, updated_at: now };

    if (action === 'reject') {
      if (!hrNote) return { success: false, error: 'اكتب سبب الرفض عشان مدير الفرع يعرفه' };
      patch.status = 'مرفوض';
      patch.resolved_by = performedBy;
      patch.resolved_at = now;
    } else {
      const isDeparture = request.request_type === 'resignation' || request.request_type === 'termination';
      const executeNow =
        action === 'execute' ||
        request.request_type === 'transfer' ||
        (isDeparture && (!request.effective_date || request.effective_date <= today)) ||
        request.request_type === 'new_hire_review';

      if (executeNow) {
        const applied = await this.applyManagerRequest(request, performedBy, userRole);
        if (!applied.success) return { success: false, error: applied.error || 'فشل تنفيذ الطلب' };
        patch.status = 'تم التنفيذ';
        patch.resolved_by = performedBy;
        patch.resolved_at = now;
      } else {
        // استقالة/إنهاء بتاريخ مستقبلي: موافقة دلوقتي وتنفيذ أوتوماتيك يوم التاريخ
        patch.status = 'تمت الموافقة';
        patch.resolved_by = performedBy;
        patch.resolved_at = now;
      }
    }

    const { error: updErr } = await supabase.from('manager_requests').update(patch).eq('id', id);
    if (updErr) return { success: false, error: `فشل تحديث الطلب: ${updErr.message}` };

    const actionLabel =
      action === 'reject' ? 'رفض طلب مدير فرع' : patch.status === 'تم التنفيذ' ? 'تنفيذ طلب مدير فرع' : 'موافقة على طلب مدير فرع';
    await this.addAuditLog(
      'manager_request',
      id,
      actionLabel,
      performedBy,
      userRole,
      `${this.describeManagerRequest(request)}${hrNote ? ` — ملاحظة الموارد البشرية: ${hrNote}` : ''}`,
      {
        entity_code: request.employee_code || '',
        entity_name: request.employee_name || request.requested_position || '',
        old_value: request.status,
        new_value: patch.status,
      }
    );

    const { data: updated } = await supabase.from('manager_requests').select('*').eq('id', id).single();
    return { success: true, request: (updated as ManagerRequest) || undefined };
  }

  /**
   * الاستقالات/الإنهاءات اللي اتوافق عليها وتاريخها جه: بتتنفذ تلقائيًا
   * (الموظف بيتنقل لأرشيف المستقيلين). بتتنادى عند فتح قوائم الموظفين والطلبات.
   */
  public async applyDueDepartures(): Promise<void> {
    const supabase = getSupabase();
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('manager_requests')
      .select('*')
      .in('request_type', ['resignation', 'termination'])
      .eq('status', 'تمت الموافقة')
      .lte('effective_date', today);
    if (error || !data || data.length === 0) return;
    for (const r of data as ManagerRequest[]) {
      const applied = await this.applyManagerRequest(r, r.resolved_by || 'النظام', 'hr');
      if (applied.success) {
        await supabase
          .from('manager_requests')
          .update({ status: 'تم التنفيذ', updated_at: new Date().toISOString() })
          .eq('id', r.id);
      }
    }
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
      is_active: u.is_active,
      created_at: u.created_at,
    }));
  }

  /** إنشاء حساب مستخدم جديد (مدير نظام / موارد بشرية / مدير فرع / موظف) — Admin فقط. */
  public async createUser(input: {
    username: string;
    name: string;
    email?: string;
    role: UserRole;
    branch?: string;
    password: string;
  }): Promise<CurrentUser> {
    const supabase = getSupabase();
    const username = sanitizePostgrestValue((input.username || '').trim().toLowerCase());
    const name = (input.name || '').trim();

    if (!username || !name || !input.password) {
      throw new Error('اسم المستخدم والاسم الكامل وكلمة المرور مطلوبين');
    }
    if (input.password.length < 6) {
      throw new Error('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
    }
    if (!['admin', 'hr', 'manager', 'employee'].includes(input.role)) {
      throw new Error('صلاحية غير معروفة');
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    if (existing) {
      throw new Error('اسم المستخدم مستخدم بالفعل، برجاء اختيار اسم آخر');
    }

    const { hash, salt } = hashPassword(input.password);
    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      username,
      name,
      email: input.email?.trim() || null,
      role: input.role,
      branch: input.branch?.trim() || null,
      password_hash: hash,
      salt,
      is_active: true,
    };

    const { error } = await supabase.from('users').insert([newUser]);
    if (error) {
      throw new Error(`فشل إنشاء المستخدم: ${error.message}`);
    }

    return {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email || undefined,
      role: newUser.role,
      branch: newUser.branch || undefined,
      is_active: true,
    };
  }

  /** تعديل بيانات مستخدم (وكلمة المرور اختياريًا) — Admin فقط. */
  public async updateUser(
    id: string,
    updates: {
      name?: string;
      email?: string;
      role?: UserRole;
      branch?: string;
      is_active?: boolean;
      password?: string;
    }
  ): Promise<CurrentUser> {
    const supabase = getSupabase();
    const payload: Record<string, any> = {};

    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.email !== undefined) payload.email = updates.email.trim() || null;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.branch !== undefined) payload.branch = updates.branch.trim() || null;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;

    if (updates.password) {
      if (updates.password.length < 6) {
        throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف أو أرقام');
      }
      const { hash, salt } = hashPassword(updates.password);
      payload.password_hash = hash;
      payload.salt = salt;
    }

    const { error } = await supabase.from('users').update(payload).eq('id', id);
    if (error) {
      throw new Error(`فشل تحديث المستخدم: ${error.message}`);
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError || !user) {
      throw new Error('المستخدم غير موجود');
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      is_active: user.is_active,
      created_at: user.created_at,
    };
  }

  /** حذف مستخدم نهائيًا — Admin فقط. */
  public async deleteUser(id: string): Promise<boolean> {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      throw new Error(`فشل حذف المستخدم: ${error.message}`);
    }
    return true;
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