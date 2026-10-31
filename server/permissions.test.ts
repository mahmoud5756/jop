import { describe, expect, it, vi } from 'vitest';
import { activeUserFromRecord, redactEmployeeForManager, requireRole } from './permissions';

describe('server authorization helpers', () => {
  it('rejects an absent user with 401', () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
    const next = vi.fn();
    requireRole(['admin'])({} as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a role outside the allowlist with 403 and permits an allowed role', () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
    const next = vi.fn();
    requireRole(['admin', 'hr'])({ user: { role: 'employee' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();

    requireRole(['admin', 'hr'])({ user: { role: 'hr' } } as any, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('uses live user status and role, rejecting disabled or malformed records', () => {
    expect(activeUserFromRecord({ id: '1', username: 'u', name: 'User', role: 'hr', is_active: true })?.role).toBe('hr');
    expect(activeUserFromRecord({ id: '1', username: 'u', name: 'User', role: 'admin', is_active: false })).toBeNull();
    expect(activeUserFromRecord({ id: '1', username: 'u', name: 'User', role: 'owner', is_active: true })).toBeNull();
  });

  it('redacts manager-visible salary when configured and always hides high-risk PII', () => {
    const result = redactEmployeeForManager({
      salary: 15000, hide_salary_from_manager: true, national_id: '123', emergency_phone: '010',
      emergency_contact_name: 'Relative', address: 'Private', fingerprint_id: 'F-1', phone: '011',
    });
    expect(result.salary).toBeNull();
    expect(result.national_id).toBe('');
    expect(result.emergency_phone).toBe('');
    expect(result.emergency_contact_name).toBe('');
    expect(result.address).toBe('');
    expect(result.fingerprint_id).toBe('');
    expect(result.phone).toBe('011');
  });
});
