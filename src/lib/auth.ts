import { cookies } from 'next/headers';
import { db } from './db';
import bcrypt from 'bcryptjs';
import type { Role, User } from './types';

const SESSION_COOKIE = 'semt_session';
const SESSION_DAYS = 14;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(userId: number): { id: string; expiresAt: Date } {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    id,
    userId,
    expiresAt.toISOString()
  );
  return { id, expiresAt };
}

export function deleteSession(id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function cleanupSessions(): void {
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM users u
       INNER JOIN sessions s ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .get(sessionId) as User | undefined;
  return row ?? null;
}

export async function setSessionCookie(sessionId: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function loginUser(email: string, password: string): Promise<User | null> {
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase()) as (User & { password_hash: string }) | undefined;
  if (!row) return null;
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return null;
  const { password_hash, ...user } = row;
  void password_hash;
  return user;
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: Role = 'VIEWER'
): Promise<User> {
  const hash = await hashPassword(password);
  const result = db
    .prepare(
      'INSERT INTO users (email, name, password_hash, role, is_demo) VALUES (?, ?, ?, ?, 0)'
    )
    .run(email.toLowerCase(), name, hash, role);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
}

export const PERMISSIONS: Record<Role, {
  canManageUsers: boolean;
  canManageSubstations: boolean;
  canManageEquipmentTypes: boolean;
  canCreateEquipment: boolean;
  canEditEquipment: boolean;
  canDeleteEquipment: boolean;
  canCreateMaintenance: boolean;
  canEditMaintenance: boolean;
  canDeleteMaintenance: boolean;
  canCreateInspection: boolean;
  canViewAnalytics: boolean;
  canViewReports: boolean;
  canExportData: boolean;
}> = {
  ADMIN: {
    canManageUsers: true,
    canManageSubstations: true,
    canManageEquipmentTypes: true,
    canCreateEquipment: true,
    canEditEquipment: true,
    canDeleteEquipment: true,
    canCreateMaintenance: true,
    canEditMaintenance: true,
    canDeleteMaintenance: true,
    canCreateInspection: true,
    canViewAnalytics: true,
    canViewReports: true,
    canExportData: true,
  },
  ENGINEER: {
    canManageUsers: false,
    canManageSubstations: true,
    canManageEquipmentTypes: false,
    canCreateEquipment: true,
    canEditEquipment: true,
    canDeleteEquipment: false,
    canCreateMaintenance: true,
    canEditMaintenance: true,
    canDeleteMaintenance: false,
    canCreateInspection: true,
    canViewAnalytics: true,
    canViewReports: true,
    canExportData: true,
  },
  MAINTENANCE_STAFF: {
    canManageUsers: false,
    canManageSubstations: false,
    canManageEquipmentTypes: false,
    canCreateEquipment: false,
    canEditEquipment: false,
    canDeleteEquipment: false,
    canCreateMaintenance: true,
    canEditMaintenance: true,
    canDeleteMaintenance: false,
    canCreateInspection: true,
    canViewAnalytics: false,
    canViewReports: true,
    canExportData: false,
  },
  VIEWER: {
    canManageUsers: false,
    canManageSubstations: false,
    canManageEquipmentTypes: false,
    canCreateEquipment: false,
    canEditEquipment: false,
    canDeleteEquipment: false,
    canCreateMaintenance: false,
    canEditMaintenance: false,
    canDeleteMaintenance: false,
    canCreateInspection: false,
    canViewAnalytics: true,
    canViewReports: true,
    canExportData: false,
  },
};

export function canAccess(role: Role, action: keyof ReturnType<typeof permissionsFor>): boolean {
  return permissionsFor(role)[action];
}

export function permissionsFor(role: Role) {
  return PERMISSIONS[role];
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }
  return user;
}

export async function requireRole(roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new HttpError(403, 'Insufficient permissions');
  }
  return user;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type PermissionKey =
  | 'canManageUsers'
  | 'canManageSubstations'
  | 'canManageEquipmentTypes'
  | 'canCreateEquipment'
  | 'canEditEquipment'
  | 'canDeleteEquipment'
  | 'canCreateMaintenance'
  | 'canEditMaintenance'
  | 'canDeleteMaintenance'
  | 'canCreateInspection'
  | 'canViewAnalytics'
  | 'canViewReports'
  | 'canExportData';

export async function requirePermission(perm: PermissionKey): Promise<User> {
  const user = await requireUser();
  if (!PERMISSIONS[user.role][perm]) {
    throw new HttpError(403, `Permission denied: ${perm}`);
  }
  return user;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;