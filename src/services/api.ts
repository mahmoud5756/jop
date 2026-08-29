import {
  Applicant,
  ApplicantDocument,
  Interview,
  Employee,
  AuditLog,
  Branch,
  JobPosition,
  CurrentUser,
  AuthResponse
} from '../types';

const TOKEN_STORAGE_KEY = 'bobwich_auth_token';
const USER_STORAGE_KEY = 'bobwich_auth_user';

export class ApiService {
  // Token and Session Management
  static getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  static setSession(token: string, user: CurrentUser): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }
  }

  static clearSession(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  }

  static getSavedUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private static getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Safely parses a fetch Response as JSON.
   *
   * Some failures never reach our Express handlers at all — e.g. Vercel
   * rejects any serverless function request body over ~4.5MB *before* our
   * code runs, and returns a plain-text response like "Request Entity Too
   * Large" instead of JSON. Calling `res.json()` directly on that crashes
   * with a cryptic "Unexpected token 'R' ... is not valid JSON" error. This
   * reads the body as text first and only parses it if it looks like JSON,
   * so callers always get a clear, localized error message instead.
   */
  private static async parseResponse(res: Response): Promise<any> {
    const text = await res.text();
    let json: any = {};

    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        if (res.status === 413) {
          throw new Error(
            'حجم الملفات أو الصور المرفقة كبير جداً، يرجى استخدام صور أصغر حجماً ثم إعادة المحاولة'
          );
        }
        throw new Error('حدث خطأ غير متوقع في الاتصال بالخادم، يرجى المحاولة مرة أخرى لاحقاً');
      }
    }

    if (!res.ok) {
      throw new Error(json.error || 'حدث خطأ أثناء تنفيذ الطلب');
    }
    return json;
  }

  // =========================================================================
  // Authentication & Profile Endpoints
  // =========================================================================

  static async login(username: string, passwordPlain: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordPlain }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'فشل تسجيل الدخول، يرجى التأكد من البيانات');
    }
    this.setSession(json.token, json.user);
    return json;
  }

  static async getMe(): Promise<CurrentUser> {
    const res = await fetch('/api/auth/me', {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      this.clearSession();
      throw new Error('جلسة تسجيل الدخول منتهية');
    }
    const json = await res.json();
    return json.user;
  }

  static async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'فشل في تغيير كلمة المرور');
    }
    return json;
  }

  // =========================================================================
  // Public Portal Endpoints (For Candidates & Application Form)
  // =========================================================================

  static async getBranches(): Promise<Branch[]> {
    const res = await fetch('/api/branches');
    const json = await res.json();
    return json.data || [];
  }

  static async getPositions(): Promise<JobPosition[]> {
    const res = await fetch('/api/positions');
    const json = await res.json();
    return json.data || [];
  }

  static async getAdminBranches(): Promise<Branch[]> {
    const res = await fetch('/api/admin/branches', { headers: this.getAuthHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل استرجاع الفروع');
    return json.data || [];
  }

  static async createBranch(data: { name: string; location?: string; is_active?: boolean }): Promise<Branch> {
    const res = await fetch('/api/admin/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل إنشاء الفرع');
    return json.data;
  }

  static async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch> {
    const res = await fetch(`/api/admin/branches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل تحديث الفرع');
    return json.data;
  }

  static async deleteBranch(id: string): Promise<void> {
    const res = await fetch(`/api/admin/branches/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل حذف الفرع');
  }

  static async getAdminPositions(): Promise<JobPosition[]> {
    const res = await fetch('/api/admin/positions', { headers: this.getAuthHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل استرجاع الوظائف');
    return json.data || [];
  }

  static async createPosition(data: { title: string; department?: string; is_active?: boolean }): Promise<JobPosition> {
    const res = await fetch('/api/admin/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل إنشاء الوظيفة');
    return json.data;
  }

  static async updatePosition(id: string, updates: Partial<JobPosition>): Promise<JobPosition> {
    const res = await fetch(`/api/admin/positions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل تحديث الوظيفة');
    return json.data;
  }

  static async deletePosition(id: string): Promise<void> {
    const res = await fetch(`/api/admin/positions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل حذف الوظيفة');
  }

  // =========================================================================
  // Company Settings (السجل التجاري / البطاقة الضريبية) — بيانات ثابتة
  // تُعبّأ مرة واحدة من الإعدادات وتظهر تلقائيًا في كل المستندات المطبوعة.
  // =========================================================================
  static async getCompanySettings(): Promise<{ commercial_registry: string; tax_card: string }> {
    const res = await fetch('/api/company-settings', { headers: this.getAuthHeaders() });
    if (!res.ok) return { commercial_registry: '', tax_card: '' };
    const json = await res.json();
    return json.data || { commercial_registry: '', tax_card: '' };
  }

  static async updateCompanySettings(updates: { commercial_registry?: string; tax_card?: string }): Promise<{ commercial_registry: string; tax_card: string }> {
    const res = await fetch('/api/admin/company-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'فشل تحديث بيانات الشركة');
    return json.data;
  }

  // Request a signed URL to upload a file directly to Supabase Storage
  // (no auth token required — used by both the public candidate form and
  // the internal HR form). Only the filename/content-type travel through
  // this JSON request; the actual file bytes go straight to Supabase
  // Storage afterwards, never through our own serverless function.
  static async getUploadSignedUrl(
    fileName: string,
    contentType: string
  ): Promise<{ bucket: string; path: string; token: string; publicUrl: string | null }> {
    const res = await fetch('/api/uploads/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, contentType }),
    });
    return await this.parseResponse(res);
  }

  // Public candidate submission (no auth token required)
  static async publicApply(applicant: Partial<Applicant>): Promise<Applicant> {
    const res = await fetch('/api/applicants/public-apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicant),
    });
    const json = await this.parseResponse(res);
    return json.data;
  }

  // Public duplicate check (Returns exists boolean only, zero info leakage)
  static async checkNationalIdPublic(nationalId: string): Promise<{ exists: boolean }> {
    if (!nationalId || nationalId.length < 10) return { exists: false };
    const res = await fetch('/api/check-national-id-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId }),
    });
    try {
      return await this.parseResponse(res);
    } catch {
      // Non-critical: fail open rather than blocking the user on a check.
      return { exists: false };
    }
  }

  // =========================================================================
  // Protected Staff Endpoints (Require Valid Bearer Token)
  // =========================================================================

  static async getStats(): Promise<{
    totalApplicants: number;
    newApplicants: number;
    inReview: number;
    interviewed: number;
    accepted: number;
    rejected: number;
    waitlist: number;
    totalEmployees: number;
  }> {
    const res = await fetch('/api/stats', {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error('غير مصرح أو فشل تحميل الإحصائيات');
    }
    const json = await res.json();
    return json.data;
  }

  // Global Search
  static async globalSearch(query: string): Promise<{ applicants: Applicant[]; employees: Employee[] }> {
    if (!query.trim()) return { applicants: [], employees: [] };
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) return { applicants: [], employees: [] };
    const json = await res.json();
    return json.data || { applicants: [], employees: [] };
  }

  // Staff Check Duplicate National ID (with full details for warning)
  static async checkNationalIdStaff(nationalId: string, excludeId?: string): Promise<{ exists: boolean; applicant?: any }> {
    if (!nationalId || nationalId.length < 10) return { exists: false };
    const url = `/api/check-national-id/${encodeURIComponent(nationalId)}${excludeId ? `?excludeId=${excludeId}` : ''}`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) return { exists: false };
    return await res.json();
  }

  // Alias for backward compatibility
  static async checkNationalId(nationalId: string, excludeId?: string): Promise<{ exists: boolean; applicant?: any }> {
    return this.checkNationalIdStaff(nationalId, excludeId);
  }

  // Applicants CRUD
  static async getApplicants(filters?: {
    search?: string;
    status?: string;
    branch?: string;
    position?: string;
  }): Promise<Applicant[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.branch) params.append('branch', filters.branch);
    if (filters?.position) params.append('position', filters.position);

    const res = await fetch(`/api/applicants?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) {
        this.clearSession();
      }
      throw new Error('فشل استرجاع بيانات المتقدمين أو غير مصرح');
    }
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  }

  static async getApplicantById(id: string): Promise<Applicant> {
    const res = await fetch(`/api/applicants/${id}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'فشل في استرجاع بيانات المتقدم');
    }
    const json = await res.json();
    return json.data;
  }

  static async createApplicant(applicant: Partial<Applicant>, _user?: CurrentUser): Promise<Applicant> {
    const res = await fetch('/api/applicants', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(applicant),
    });
    const json = await this.parseResponse(res);
    return json.data;
  }

  static async updateApplicant(id: string, applicant: Partial<Applicant>, _user?: CurrentUser): Promise<Applicant> {
    const res = await fetch(`/api/applicants/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(applicant),
    });
    const json = await this.parseResponse(res);
    return json.data;
  }

  static async deleteApplicant(id: string, _user?: CurrentUser): Promise<void> {
    const res = await fetch(`/api/applicants/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'حدث خطأ أثناء حذف طلب التوظيف (يتطلب صلاحية المدير العام)');
    }
  }

  // Documents
  static async uploadDocument(
    applicantId: string,
    doc: { document_type: string; file_name: string; file_url: string; file_size?: string },
    _user?: CurrentUser
  ): Promise<ApplicantDocument> {
    const res = await fetch(`/api/applicants/${applicantId}/documents`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(doc),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'فشل في رفع المستند');
    }
    return json.data;
  }

  static async deleteDocument(documentId: string, _user?: CurrentUser): Promise<void> {
    const res = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'فشل في حذف المستند');
    }
  }

  // Interviews
  static async addInterview(
    applicantId: string,
    interview: Partial<Interview>,
    _user?: CurrentUser
  ): Promise<Interview> {
    const res = await fetch(`/api/applicants/${applicantId}/interviews`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(interview),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'فشل في تسجيل المقابلة');
    }
    return json.data;
  }

  // Convert to Employee
  static async convertToEmployee(
    applicantId: string,
    data: { hire_date?: string; salary?: number | string; branch_name?: string; position_name?: string; status?: any },
    _user?: CurrentUser
  ): Promise<Employee> {
    const res = await fetch(`/api/applicants/${applicantId}/convert-to-employee`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'فشل في تحويل المتقدم إلى موظف');
    }
    return json.data;
  }

  // Employees
  static async getEmployees(filters?: {
    search?: string;
    branch?: string;
    position?: string;
    status?: string;
  }): Promise<Employee[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.branch) params.append('branch', filters.branch);
    if (filters?.position) params.append('position', filters.position);
    if (filters?.status) params.append('status', filters.status);

    const res = await fetch(`/api/employees?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error('فشل استرجاع بيانات الموظفين');
    }
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  }

  static async getEmployeeById(id: string): Promise<{ employee: Employee; applicant: Applicant | null }> {
    const res = await fetch(`/api/employees/${id}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'فشل في استرجاع ملف الموظف');
    }
    const json = await res.json();
    return json.data;
  }

  static async updateEmployeeStatus(id: string, status: string): Promise<Employee> {
    const res = await fetch(`/api/employees/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'فشل تحديث حالة الموظف');
    }
    return json.data;
  }

  static async deleteEmployee(id: string): Promise<void> {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'فشل حذف الموظف');
    }
  }

  // Audit Logs
  static async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (entityType) params.append('entity_type', entityType);
    if (entityId) params.append('entity_id', entityId);

    const res = await fetch(`/api/audit-logs?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    return json.data || [];
  }

  // Supabase Cloud Sync Info
  static async getSupabaseStatus(): Promise<{ configured: boolean; url: string | null; message: string }> {
    const res = await fetch('/api/supabase/status', {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) return { configured: false, url: null, message: 'غير مصرح للوصول' };
    return await res.json();
  }

  static async getSupabaseSchema(): Promise<{ schema: string }> {
    const res = await fetch('/api/supabase/schema', {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('يتطلب صلاحيات مدير النظام');
    return await res.json();
  }
}
