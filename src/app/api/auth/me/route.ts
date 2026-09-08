import { handleError, ok } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { getSessionUser, PERMISSIONS } from '@/lib/auth';

export async function GET() {
  try {
    await ensureInit();
    const user = await getSessionUser();
    if (!user) return ok({ user: null });
    return ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, is_demo: user.is_demo },
      permissions: PERMISSIONS[user.role],
    });
  } catch (err) {
    return handleError(err);
  }
}