import { NextRequest } from 'next/server';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const onlyUnread = searchParams.get('unread') === '1';
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    if (onlyUnread) where.push('read = 0');
    const rows = db
      .prepare(
        `SELECT n.*, e.equipment_name, e.equipment_tag
         FROM notifications n
         LEFT JOIN equipment e ON e.id = n.equipment_id
         WHERE ${where.join(' AND ')}
         ORDER BY n.created_at DESC
         LIMIT 100`
      )
      .all(...params);
    const unread = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE read = 0').get() as { c: number }).c;
    void user;
    return ok({ rows, unread });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const body = await req.json();
    const id = Number(body.id);
    if (!id) return fail('Notification id required', 400);
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}