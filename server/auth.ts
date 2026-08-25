import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser, UserRole } from '../src/types';

// Server-side JWT Secret (persistent or fallback generated)
const JWT_SECRET = process.env.JWT_SECRET || 'BOB_WICH_SECURE_AUTH_SECRET_2026_PROD_KEY_998127361';

export interface TokenPayload {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  branch?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: CurrentUser;
}

// 1. Password Hashing & Verification
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch (err) {
    return false;
  }
}

// 2. JWT Generation & Verification (Custom zero-dependency signed JWT)
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

export function generateToken(user: CurrentUser, expiresInHours = 24 * 7): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
    branch: user.branch,
    iat: now,
    exp: now + expiresInHours * 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      // Token expired
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

// 3. Express Authentication Middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'غير مصرح: يرجى تسجيل الدخول للوصول إلى لوحة التحكم',
      code: 'UNAUTHORIZED',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'جلسة تسجيل الدخول منتهية أو غير صالحة. يرجى تسجيل الدخول مجددًا',
      code: 'INVALID_TOKEN',
    });
  }

  req.user = {
    id: payload.userId,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    email: payload.email,
    branch: payload.branch,
  };

  next();
}

// 4. Role Authorization Middleware
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً', code: 'UNAUTHORIZED' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `غير مصرح: هذه العملية تتطلب صلاحيات (${allowedRoles.join(' أو ')})`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

// 5. In-Memory Rate Limiter for Public Endpoints
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(maxRequests = 10, windowMs = 60 * 1000, message = 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد قليل') {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const clientKey = `${req.path}_${Array.isArray(ip) ? ip[0] : ip}`;
    const now = Date.now();

    const record = rateLimitMap.get(clientKey);
    if (!record || record.resetTime < now) {
      rateLimitMap.set(clientKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    record.count += 1;
    next();
  };
}
