import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit, computeHealthScore, asRecord } from '@/lib/business';
import type { Substation } from '@/lib/types';

const updateSchema = z.object({
  substation_name: z.string().min(1).max(150).optional(),
  substation_code: z.string().min(1).max(50).optional(),
  location: z.string().max(200).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  voltage_level: z.string().max(50).optional(),
  commissioning_date: z.string().nullable().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED']).optional(),
});

function getSubstation(id: number) {
  return db.prepare('SELECT * FROM substations WHERE id = ?').get(id) as Substation | undefined;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    const sub = getSubstation(id);
    if (!sub) return fail('Substation not found', 404);
    const equipment = db
      .prepare(
        `SELECT e.*, et.name as equipment_type_name
         FROM equipment e
         INNER JOIN equipment_types et ON et.id = e.equipment_type_id
         WHERE e.substation_id = ?
         ORDER BY e.equipment_name ASC`
      )
      .all(id) as Array<{ id: number; equipment_name: string; equipment_tag: string; condition: string; criticality: string; status: string; next_maintenance_date: string | null }>;
    const health = computeHealthScore(id);
    const maintenanceHistory = db
      .prepare(
        `SELECT m.*, e.equipment_name, e.equipment_tag
         FROM maintenance_logs m
         INNER JOIN equipment e ON e.id = m.equipment_id
         WHERE e.substation_id = ?
         ORDER BY m.maintenance_date DESC
         LIMIT 20`
      )
      .all(id) as Array<{ id: number; maintenance_date: string; equipment_name: string; equipment_tag: string; maintenance_type: string; status: string }>;
    return ok({ substation: sub, equipment, health, maintenanceHistory });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canManageSubstations');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = getSubstation(id);
    if (!existing) return fail('Substation not found', 404);
    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const updates: string[] = [];
    const values: unknown[] = [];
    const fields = Object.entries(parsed) as [string, unknown][];
    for (const [field, value] of fields) {
      if (value !== undefined && (asRecord(existing) as Record<string, unknown>)[field] !== value) {
        updates.push(`${field} = ?`);
        values.push(value);
        recordAudit(user.id, 'UPDATE', 'substations', id, field, (asRecord(existing) as Record<string, unknown>)[field], value);
      }
    }
    if (updates.length > 0) {
      updates.push(`updated_at = datetime('now')`);
      values.push(id);
      db.prepare(`UPDATE substations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    const updated = getSubstation(id)!;
    return ok(updated);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canManageSubstations');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = getSubstation(id);
    if (!existing) return fail('Substation not found', 404);

    const equipmentCount = (db.prepare('SELECT COUNT(*) as c FROM equipment WHERE substation_id = ?').get(id) as { c: number }).c;
    if (equipmentCount > 0) {
      return fail(
        `Cannot delete substation: ${equipmentCount} equipment record(s) are still attached. Archive or remove the equipment first.`,
        409
      );
    }
    db.prepare('DELETE FROM substations WHERE id = ?').run(id);
    recordAudit(user.id, 'DELETE', 'substations', id, null, existing.substation_name, null);
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}