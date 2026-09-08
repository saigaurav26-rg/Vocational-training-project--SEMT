import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit, asRecord } from '@/lib/business';
import type { EquipmentType } from '@/lib/types';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  default_maintenance_days: z.number().int().min(1).max(3650).optional(),
  active: z.number().int().min(0).max(1).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canManageEquipmentTypes');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = db.prepare('SELECT * FROM equipment_types WHERE id = ?').get(id) as EquipmentType | undefined;
    if (!existing) return fail('Equipment type not found', 404);

    const parsed = updateSchema.parse(await req.json());
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [field, value] of Object.entries(parsed)) {
      if (value !== undefined && (asRecord(existing) as Record<string, unknown>)[field] !== value) {
        updates.push(`${field} = ?`);
        values.push(value);
        recordAudit(user.id, 'UPDATE', 'equipment_types', id, field, (asRecord(existing) as Record<string, unknown>)[field], value);
      }
    }
    if (updates.length === 0) return ok(existing);
    values.push(id);
    db.prepare(`UPDATE equipment_types SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return ok(db.prepare('SELECT * FROM equipment_types WHERE id = ?').get(id) as EquipmentType);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canManageEquipmentTypes');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = db.prepare('SELECT * FROM equipment_types WHERE id = ?').get(id) as EquipmentType | undefined;
    if (!existing) return fail('Equipment type not found', 404);
    const usage = (db.prepare('SELECT COUNT(*) as c FROM equipment WHERE equipment_type_id = ?').get(id) as { c: number }).c;
    if (usage > 0) {
      db.prepare('UPDATE equipment_types SET active = 0 WHERE id = ?').run(id);
      recordAudit(user.id, 'DEACTIVATE', 'equipment_types', id, null, existing.name, 'deactivated');
      return ok({ deactivated: true, message: 'Type is referenced by equipment; deactivated instead of deleted.' });
    }
    db.prepare('DELETE FROM equipment_types WHERE id = ?').run(id);
    recordAudit(user.id, 'DELETE', 'equipment_types', id, null, existing.name, null);
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}