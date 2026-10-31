import { NextFunction, Request, Response } from 'express';
import { CurrentUser, UserRole } from '../src/types';

export interface RoleRequest extends Request { user?: CurrentUser }

const KNOWN_ROLES: UserRole[] = ['admin', 'hr', 'manager', 'employee'];

/** Build the authoritative request identity from a live database user row. */
export function activeUserFromRecord(record: unknown): CurrentUser | null {
  if (!record || typeof record !== 'object') return null;
  const user = record as Record<string, unknown>;
  if (user.is_active !== true || typeof user.id !== 'string' || typeof user.username !== 'string' ||
      typeof user.name !== 'string' || !KNOWN_ROLES.includes(user.role as UserRole)) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as UserRole,
    email: typeof user.email === 'string' ? user.email : undefined,
    branch: typeof user.branch === 'string' ? user.branch : undefined,
    is_active: true,
  };
}

/** Server-side role allowlist. Call after requireAuth on protected routes. */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: RoleRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً', code: 'UNAUTHORIZED' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `غير مصرح: هذه العملية تتطلب صلاحيات (${allowedRoles.join(' أو ')})`, code: 'FORBIDDEN' });
    }
    return next();
  };
}

/** Redact salary and private identity/contact identifiers from manager DTOs. */
export function redactEmployeeForManager<T extends Record<string, any>>(employee: T): T {
  if (!employee) return employee;
  return {
    ...employee,
    salary: employee.hide_salary_from_manager ? null : employee.salary,
    national_id: '',
    emergency_phone: '',
    emergency_contact_name: '',
    address: '',
    fingerprint_id: '',
  } as T;
}
