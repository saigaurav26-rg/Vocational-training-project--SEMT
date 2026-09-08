import { NextRequest } from 'next/server';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/business';

export async function GET() {
  try {
    await ensureInit();
    await requireUser();
    const rows = db
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.created_at, u.is_demo
         FROM users u
         ORDER BY u.is_demo ASC, u.created_at ASC`
      )
      .all();
    return ok({ rows });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    return fail('Use /api/auth/register to create users', 400);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}