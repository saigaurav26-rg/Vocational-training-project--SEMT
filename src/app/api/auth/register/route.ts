import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import {
  registerUser,
  createSession,
  setSessionCookie,
  PERMISSIONS,
} from '@/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  role: z.enum(['ADMIN', 'ENGINEER', 'MAINTENANCE_STAFF', 'VIEWER']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    const body = await req.json();
    const parsed = schema.parse(body);

    const user = await registerUser(
      parsed.email,
      parsed.password,
      parsed.name,
      parsed.role ?? 'VIEWER'
    );

    const session = createSession(user.id);
    await setSessionCookie(session.id, session.expiresAt);

    const perms = PERMISSIONS[user.role];
    return ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      permissions: perms,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    if (message.includes('UNIQUE')) {
      return fail('A user with that email already exists', 409);
    }
    return handleError(err);
  }
}