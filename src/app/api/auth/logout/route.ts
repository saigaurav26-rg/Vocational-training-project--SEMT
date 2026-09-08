import { handleError, ok } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import {
  getSessionUser,
  deleteSession,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export async function POST() {
  try {
    await ensureInit();
    const user = await getSessionUser();
    if (user) {
      const { cookies } = await import('next/headers');
      const store = await cookies();
      const sid = store.get(SESSION_COOKIE_NAME)?.value;
      if (sid) deleteSession(sid);
    }
    await clearSessionCookie();
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}