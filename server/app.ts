import express, { Request, Response } from 'express';
import { db } from './db.js';
import { getSupabase, isSupabaseConfigured, SUPABASE_SQL_SCHEMA } from './supabase.js';
import {
  requireAuth,
  requireRole,
  generateToken,
  createRateLimiter,
  AuthenticatedRequest
} from './auth.js';

// Builds and returns a fully configured Express app with all API routes.
// Shared between the local dev server (server.ts) and the Vercel serverless
// entry point (api/index.ts). Contains NO app.listen() and NO static/vite
// serving — those are the caller's responsibility.
export function createApp() {
  const app = express();

  // JSON payload parser
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Rate limiters for security
  const loginLimiter = createRateLimiter(15, 60 * 1000, 'تم تجاوز عدد محاولات الدخول، يرجى المحاولة بعد دقيقة');
  const publicApplyLimiter = createRateLimiter(10, 60 * 1000, 'تم تجاوز الحد المسموح به لإرسال الطلبات، يرجى المحاولة بعد قليل');
  const nationalIdCheckLimiter = createRateLimiter(30, 60 * 1000, 'تم تجاوز معدل الفحص السريع');

  // =========================================================================
  // 1. PUBLIC API ROUTES (مفتوحة لعامة المتقدمين بدون توكن)
  // =========================================================================

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString(), database: 'Supabase PostgreSQL' });
  });

  // Public Master Data for Application Form
  app.get('/api/branches', async (req: Request, res: Response) => {
    try {
      const branches = await db.getBranches();
      res.json({ data: branches.filter(b => b.is_active) });
    } catch (err: any) {
      console.error('API /api/branches error:', err);
      res.status(500).json({ error: err.message || 'فشل استرجاع الفروع' });
    }
  });

  app.get('/api/positions', async (req: Request, res: Response) => {
    try {
      const positions = await db.getPositions();
      res.json({ data: positions.filter(p => p.is_active) });
    } catch (err: any) {
      console.error('API /api/positions error:', err);
      res.status(500).json({ error: err.message || 'فشل استرجاع الوظائف' });
    }
  });

  // Public duplicate check (Returns boolean only - NEVER leaks candidate personal info)
  app.post('/api/check-national-id-public', nationalIdCheckLimiter, async (req: Request, res: Response) => {
    const { nationalId } = req.body;
    if (!nationalId || typeof nationalId !== 'string' || nationalId.length < 10) {
      return res.json({ exists: false });
    }
    try {
      const existing = await db.getApplicantByNationalId(nationalId);
      res.json({ exists: !!existing });
    } catch (err: any) {
      console.error('API /api/check-national-id-public error:', err);
      res.json({ exists: false });
    }
  });

  // Public Application Submission (Candidate Portal)
  app.post('/api/applicants/public-apply', publicApplyLimiter, async (req: Request, res: Response) => {
    const body = req.body;

    // Strict validation of required fields
    if (!body.full_name || !body.full_name.trim()) {
      return res.status(400).json({ error: 'الاسم الرباعي مطلوب' });
    }
    if (!body.national_id || body.national_id.trim().length !== 14) {
      return res.status(400).json({ error: 'الرقم القومي يجب أن يتكون من 14 رقماً' });
    }
    if (!body.phone || !body.phone.trim()) {
      return res.status(400).json({ error: 'رقم الهاتف مطلوب' });
    }
    if (!body.position_name) {
      return res.status(400).json({ error: 'يرجى اختيار الوظيفة المطلوبة' });
    }
    if (!body.branch_name) {
      return res.status(400).json({ error: 'يرجى اختيار الفرع المفضل' });
    }

    try {
      // Force public application defaults
      const candidateData = {
        ...body,
        status: 'طلب جديد',
        is_converted_to_employee: false,
      };

      const performedBy = body.full_name ? `المتقدم: ${body.full_name}` : 'البوابة العامة للتوظيف';
      const result = await db.createApplicant(candidateData, performedBy, 'employee');

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json({
        success: true,
        data: result.applicant,
        message: 'تم استلام طلب التوظيف الخاص بك بنجاح',
      });
    } catch (err: any) {
      console.error('API /api/applicants/public-apply error:', err);
      res.status(500).json({ error: err.message || 'فشل حفظ طلب التوظيف في قاعدة البيانات' });
    }
  });

  // User Login Authentication
  app.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
      const authResult = await db.authenticateUser(username, password);

      if (!authResult.success || !authResult.user) {
        return res.status(401).json({ error: authResult.error || 'بيانات الدخول غير صحيحة' });
      }

      const token = generateToken(authResult.user);
      res.json({
        success: true,
        token,
        user: authResult.user,
        message: `مرحباً بك ${authResult.user.name}`,
      });
    } catch (err: any) {
      console.error('API /api/auth/login error:', err);
      res.status(500).json({ error: err.message || 'حدث خطأ في خادم المصادقة' });
    }
  });

  // =========================================================================
  // 2. PROTECTED STAFF & ADMIN API ROUTES (تتطلب تسجيل دخول وتوكن موثق)
  // =========================================================================

  // Current Logged-in User Profile
  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
    try {
      const fullUser = await db.getUserById(req.user.id);
      res.json({ user: fullUser || req.user });
    } catch (err: any) {
      res.json({ user: req.user });
    }
  });

  // Change Current User Password
  app.post('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
    const { oldPassword, newPassword } = req.body;
    try {
      const result = await db.changeUserPassword(req.user.id, oldPassword, newPassword);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (err: any) {
      console.error('API /api/auth/change-password error:', err);
      res.status(500).json({ error: err.message || 'فشل تحديث كلمة المرور' });
    }
  });

  // Dashboard Stats
  app.get('/api/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await db.getStats();
      res.json({ data: stats });
    } catch (err: any) {
      console.error('API /api/stats error:', err);
      res.status(500).json({ error: err.message || 'فشل تحميل الإحصائيات من قاعدة البيانات' });
    }
  });

  // Global Search
  app.get('/api/search', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const q = (req.query.q as string) || '';
    try {
      const results = await db.globalSearch(q);
      res.json({ data: results });
    } catch (err: any) {
      console.error('API /api/search error:', err);
      res.status(500).json({ error: err.message || 'فشل البحث في قاعدة البيانات' });
    }
  });

  // Staff check National ID duplication (with candidate metadata for duplicate warnings)
  app.get('/api/check-national-id/:nationalId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const nationalId = req.params.nationalId;
    const excludeId = req.query.excludeId as string | undefined;
    try {
      const existing = await db.getApplicantByNationalId(nationalId, excludeId);
      if (existing) {
        res.json({
          exists: true,
          applicant: {
            id: existing.id,
            full_name: existing.full_name,
            application_code: existing.application_code,
            phone: existing.phone,
            status: existing.status,
          },
        });
      } else {
        res.json({ exists: false });
      }
    } catch (err: any) {
      console.error('API /api/check-national-id error:', err);
      res.status(500).json({ error: err.message || 'فشل التحقق من الرقم القومي' });
    }
  });

  // Applicants List & Filter
  app.get('/api/applicants', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      search: req.query.search as string,
      status: req.query.status as string,
      branch: req.query.branch as string,
      position: req.query.position as string,
    };
    try {
      const applicants = await db.getApplicants(filters);
      res.json({ data: applicants, total: applicants.length });
    } catch (err: any) {
      console.error('API /api/applicants error:', err);
      res.status(500).json({ error: err.message || 'فشل استرجاع المتقدمين من Supabase' });
    }
  });

  // Single Applicant Details
  app.get('/api/applicants/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const applicant = await db.getApplicantById(req.params.id);
      if (!applicant) {
        return res.status(404).json({ error: 'المتقدم غير موجود' });
      }
      res.json({ data: applicant });
    } catch (err: any) {
      console.error('API /api/applicants/:id error:', err);
      res.status(500).json({ error: err.message || 'فشل استرجاع بيانات المتقدم' });
    }
  });

  // Staff Manual Create Applicant
  app.post('/api/applicants', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const performedBy = req.user?.name || 'مسؤول التوظيف';
    const userRole = req.user?.role || 'hr';
    try {
      const result = await db.createApplicant(req.body, performedBy, userRole);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json({ data: result.applicant, message: 'تم حفظ طلب التوظيف في Supabase بنجاح' });
    } catch (err: any) {
      console.error('API POST /api/applicants error:', err);
      res.status(500).json({ error: err.message || 'فشل إنشاء طلب التوظيف' });
    }
  });

  // Update Applicant
  app.put('/api/applicants/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const performedBy = req.user?.name || 'مسؤول التوظيف';
    const userRole = req.user?.role || 'hr';
    try {
      const result = await db.updateApplicant(req.params.id, req.body, performedBy, userRole);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ data: result.applicant, message: 'تم تحديث طلب التوظيف بنجاح' });
    } catch (err: any) {
      console.error('API PUT /api/applicants/:id error:', err);
      res.status(500).json({ error: err.message || 'فشل تعديل طلب التوظيف' });
    }
  });

  // Delete Applicant (Strictly ADMIN only)
  app.delete('/api/applicants/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    const performedBy = req.user?.name || 'مدير النظام';
    const userRole = req.user?.role || 'admin';
    try {
      const result = await db.deleteApplicant(req.params.id, performedBy, userRole);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, message: 'تم حذف طلب التوظيف بنجاح' });
    } catch (err: any) {
      console.error('API DELETE /api/applicants/:id error:', err);
      res.status(500).json({ error: err.message || 'فشل حذف طلب التوظيف' });
    }
  });

  // Documents Management
  app.post('/api/applicants/:id/documents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const applicantId = req.params.id;
    const { document_type, file_name, file_url, file_size } = req.body;
    const uploaded_by = req.user?.name || 'مسؤول التوظيف';

    if (!file_url || !file_name) {
      return res.status(400).json({ error: 'ملف المرفق وبياناته مطلوبة' });
    }

    try {
      const doc = await db.addDocument({
        applicant_id: applicantId,
        document_type: document_type || 'أخرى',
        file_name,
        file_url,
        file_size: file_size || '',
        uploaded_by,
      });

      res.status(201).json({ data: doc, message: 'تم رفع المستند بنجاح' });
    } catch (err: any) {
      console.error('API POST /api/applicants/:id/documents error:', err);
      res.status(500).json({ error: err.message || 'فشل رفع المستند إلى قاعدة البيانات' });
    }
  });

  app.delete('/api/documents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const performedBy = req.user?.name || 'مسؤول التوظيف';
    const userRole = req.user?.role || 'hr';
    try {
      const success = await db.deleteDocument(req.params.id, performedBy, userRole);

      if (!success) {
        return res.status(404).json({ error: 'المستند غير موجود' });
      }
      res.json({ success: true, message: 'تم حذف المستند بنجاح' });
    } catch (err: any) {
      console.error('API DELETE /api/documents/:id error:', err);
      res.status(500).json({ error: err.message || 'فشل حذف المستند' });
    }
  });

  // Interviews Recording
  app.post('/api/applicants/:id/interviews', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const applicantId = req.params.id;
    const performedBy = req.user?.name || 'مسؤول المقابلات';
    const userRole = req.user?.role || 'hr';

    try {
      const interview = await db.addInterview(applicantId, req.body, performedBy, userRole);
      res.status(201).json({ data: interview, message: 'تم تسجيل المقابلة بنجاح' });
    } catch (err: any) {
      console.error('API POST /api/applicants/:id/interviews error:', err);
      res.status(500).json({ error: err.message || 'فشل تسجيل المقابلة' });
    }
  });

  // Convert to Employee (Admin and HR only)
  app.post('/api/applicants/:id/convert-to-employee', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const applicantId = req.params.id;
    const performedBy = req.user?.name || 'مدير الموارد البشرية';
    const userRole = req.user?.role || 'hr';

    try {
      const result = await db.convertToEmployee(applicantId, req.body, performedBy, userRole);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json({ data: result.employee, message: 'تم تحويل المتقدم إلى موظف رسمي بنجاح' });
    } catch (err: any) {
      console.error('API POST /api/applicants/:id/convert-to-employee error:', err);
      res.status(500).json({ error: err.message || 'فشل تحويل المتقدم إلى موظف' });
    }
  });

  // Employees List
  app.get('/api/employees', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      search: req.query.search as string,
      branch: req.query.branch as string,
      position: req.query.position as string,
      status: req.query.status as string,
    };
    try {
      const employees = await db.getEmployees(filters);
      res.json({ data: employees, total: employees.length });
    } catch (err: any) {
      console.error('API /api/employees error:', err);
      res.status(500).json({ error: err.message || 'فشل استرجاع بيانات الموظفين' });
    }
  });

  app.get('/api/employees/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await db.getEmployeeById(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'ملف الموظف غير موجود' });
      }
      res.json({ data: result });
    } catch (err: any) {
      console.error('API /api/employees/:id error:', err);
      res.status(500).json({ error: err.message || 'فشل استرجاع ملف الموظف' });
    }
  });

  // Update Employee Status (e.g. Resignation / Termination / Active)
  app.patch('/api/employees/:id/status', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;
    const performedBy = req.user?.name || 'مدير الموارد البشرية';
    const userRole = req.user?.role || 'hr';
    if (!status) {
      return res.status(400).json({ error: 'الحالة الجديدة مطلوبة' });
    }
    try {
      const result = await db.updateEmployeeStatus(req.params.id, status, performedBy, userRole);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, data: result.employee, message: 'تم تحديث حالة الموظف بنجاح' });
    } catch (err: any) {
      console.error('API PATCH /api/employees/:id/status error:', err);
      res.status(500).json({ error: err.message || 'فشل تحديث حالة الموظف' });
    }
  });

  // Delete Employee (Admin and HR only)
  app.delete('/api/employees/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const performedBy = req.user?.name || 'مدير الموارد البشرية';
    const userRole = req.user?.role || 'hr';
    try {
      const result = await db.deleteEmployee(req.params.id, performedBy, userRole);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, message: 'تم حذف الموظف بنجاح' });
    } catch (err: any) {
      console.error('API DELETE /api/employees/:id error:', err);
      res.status(500).json({ error: err.message || 'فشل حذف الموظف' });
    }
  });

  // Audit Logs (Admin and HR only)
  app.get('/api/audit-logs', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const entityType = req.query.entity_type as string | undefined;
    const entityId = req.query.entity_id as string | undefined;
    try {
      const logs = await db.getAuditLogs(entityType, entityId);
      res.json({ data: logs });
    } catch (err: any) {
      console.error('API /api/audit-logs error:', err);
      res.status(500).json({ error: err.message || 'فشل استرجاع سجل العمليات' });
    }
  });

  // System Users List (Admin only)
  app.get('/api/users', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await db.getAllUsers();
      res.json({ data: users });
    } catch (err: any) {
      console.error('API /api/users error:', err);
      res.status(500).json({ error: err.message || 'فشل استرجاع المستخدمين' });
    }
  });

  // Supabase Integration info & Schema (Admin only - Protected from Public/Candidates)
  app.get('/api/supabase/status', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
    const configured = isSupabaseConfigured();
    res.json({
      configured,
      url: process.env.SUPABASE_URL || null,
      message: configured
        ? 'تم الاتصال بقاعدة بيانات Supabase PostgreSQL السحابية وتعيينها كمصدر وحيد ودائم للبيانات'
        : 'يرجى إدخال SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في ملف البيئة لتفعيل الاتصال بقاعدة البيانات.',
    });
  });

  app.get('/api/supabase/schema', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
    res.json({ schema: SUPABASE_SQL_SCHEMA });
  });

  // Admin Management of Branches
  app.get('/api/admin/branches', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branches = await db.getBranches();
      res.json({ data: branches });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل استرجاع الفروع' });
    }
  });

  app.post('/api/admin/branches', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const { name, location, is_active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم الفرع مطلوب' });
    }
    try {
      const branch = await db.createBranch(name, location, is_active ?? true);
      await db.addAuditLog('branch', branch.id, 'إنشاء فرع جديد', req.user?.name || 'مسؤول النظام', req.user?.role || 'admin', `تم إنشاء الفرع "${branch.name}"`);
      res.status(201).json({ success: true, data: branch });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل إنشاء الفرع' });
    }
  });

  app.put('/api/admin/branches/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id;
    const updates = req.body;
    try {
      const branch = await db.updateBranch(id, updates);
      await db.addAuditLog('branch', id, 'تحديث فرع', req.user?.name || 'مسؤول النظام', req.user?.role || 'admin', `تم تحديث بيانات الفرع "${branch.name}"`);
      res.json({ success: true, data: branch });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل تحديث الفرع' });
    }
  });

  app.delete('/api/admin/branches/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id;
    try {
      await db.deleteBranch(id);
      await db.addAuditLog('branch', id, 'حذف فرع', req.user?.name || 'مسؤول النظام', req.user?.role || 'admin', `تم حذف الفرع بنجاح`);
      res.json({ success: true, message: 'تم حذف الفرع بنجاح' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل حذف الفرع' });
    }
  });

  // Admin Management of Positions
  app.get('/api/admin/positions', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const positions = await db.getPositions();
      res.json({ data: positions });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل استرجاع الوظائف' });
    }
  });

  app.post('/api/admin/positions', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const { title, department, is_active } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'مسمى الوظيفة مطلوب' });
    }
    try {
      const pos = await db.createPosition(title, department, is_active ?? true);
      await db.addAuditLog('position', pos.id, 'إنشاء وظيفة جديدة', req.user?.name || 'مسؤول النظام', req.user?.role || 'admin', `تم إنشاء المسمى الوظيفي "${pos.title}"`);
      res.status(201).json({ success: true, data: pos });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل إنشاء الوظيفة' });
    }
  });

  app.put('/api/admin/positions/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id;
    const updates = req.body;
    try {
      const pos = await db.updatePosition(id, updates);
      await db.addAuditLog('position', id, 'تحديث وظيفة', req.user?.name || 'مسؤول النظام', req.user?.role || 'admin', `تم تحديث المسمى الوظيفي "${pos.title}"`);
      res.json({ success: true, data: pos });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل تحديث الوظيفة' });
    }
  });

  app.delete('/api/admin/positions/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id;
    try {
      await db.deletePosition(id);
      await db.addAuditLog('position', id, 'حذف وظيفة', req.user?.name || 'مسؤول النظام', req.user?.role || 'admin', `تم حذف المسمى الوظيفي بنجاح`);
      res.json({ success: true, message: 'تم حذف الوظيفة بنجاح' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل حذف الوظيفة' });
    }
  });

  // =========================================================================
  // Company Settings (السجل التجاري / البطاقة الضريبية)
  // Fixed, single record filled in once by admin/hr and reused automatically
  // on every printed document (payslip, contracts, ...). Readable by any
  // authenticated staff member (needed to print), editable by admin/hr only.
  // =========================================================================
  app.get('/api/company-settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await db.getCompanySettings();
      res.json({ data: settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل استرجاع بيانات الشركة' });
    }
  });

  app.put('/api/admin/company-settings', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    const { commercial_registry, tax_card } = req.body;
    try {
      const settings = await db.updateCompanySettings({ commercial_registry, tax_card }, req.user?.name);
      await db.addAuditLog(
        'company_settings',
        'company_settings',
        'تحديث بيانات الشركة',
        req.user?.name || 'مسؤول النظام',
        req.user?.role || 'admin',
        `تم تحديث السجل التجاري و/أو البطاقة الضريبية للشركة`
      );
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل تحديث بيانات الشركة' });
    }
  });


  return app;
}
