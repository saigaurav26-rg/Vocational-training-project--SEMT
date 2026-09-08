import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { loginUser, createSession, setSessionCookie } from '@/lib/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    const body = await req.json();
    const parsed = schema.parse(body);
    const user = await loginUser(parsed.email, parsed.password);
    if (!user) return fail('Invalid email or password', 401);
    const session = createSession(user.id);
    await setSessionCookie(session.id, session.expiresAt);
    return ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    return handleError(err);
  }
}