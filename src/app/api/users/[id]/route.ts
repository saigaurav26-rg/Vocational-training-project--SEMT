import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit, asRecord } from '@/lib/business';

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['ADMIN', 'ENGINEER', 'MAINTENANCE_STAFF', 'VIEWER']).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canManageUsers');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id) as
      | { id: number; name: string; role: string }
      | undefined;
    if (!existing) return fail('User not found', 404);

    const parsed = updateSchema.parse(await req.json());
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [field, value] of Object.entries(parsed)) {
      if (value !== undefined && (asRecord(existing) as Record<string, unknown>)[field] !== value) {
        updates.push(`${field} = ?`);
        values.push(value);
        recordAudit(user.id, 'UPDATE', 'users', id, field, (asRecord(existing) as Record<string, unknown>)[field], value);
      }
    }
    if (updates.length === 0) return ok(existing);
    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT id, email, name, role, is_demo FROM users WHERE id = ?').get(id);
    return ok(updated);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}