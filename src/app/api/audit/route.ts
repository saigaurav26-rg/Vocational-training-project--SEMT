import { NextRequest } from 'next/server';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get('entity');
    const entityId = searchParams.get('entity_id');
    const limit = Math.min(500, Number(searchParams.get('limit') ?? '100'));
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'));

    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    if (entity) { where.push('a.entity = ?'); params.push(entity); }
    if (entityId) { where.push('a.entity_id = ?'); params.push(Number(entityId)); }
    const whereSql = where.join(' AND ');
    const rows = db
      .prepare(
        `SELECT a.*, u.name as user_name, u.email as user_email
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         WHERE ${whereSql}
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);
    const total = (db.prepare(`SELECT COUNT(*) as c FROM audit_logs a WHERE ${whereSql}`).get(...params) as { c: number }).c;
    return ok({ rows, total });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}