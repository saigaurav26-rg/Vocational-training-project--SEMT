import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit, getEquipmentDetail, maintenanceStatus, asRecord } from '@/lib/business';
import type { EquipmentWithRelations } from '@/lib/types';
import type { MaintenanceStatusLabel } from '@/lib/business';

const updateSchema = z.object({
  equipment_tag: z.string().min(1).max(80).optional(),
  equipment_name: z.string().min(1).max(150).optional(),
  equipment_type_id: z.number().int().positive().optional(),
  substation_id: z.number().int().positive().optional(),
  manufacturer: z.string().max(120).optional(),
  model_number: z.string().max(120).optional(),
  serial_number: z.string().max(120).optional(),
  installation_date: z.string().nullable().optional(),
  commissioning_date: z.string().nullable().optional(),
  location: z.string().max(150).optional(),
  bay: z.string().max(50).optional(),
  feeder: z.string().max(50).optional(),
  voltage_level: z.string().max(50).optional(),
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED']).optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).optional(),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  description: z.string().max(2000).optional(),
  last_maintenance_date: z.string().nullable().optional(),
  next_maintenance_date: z.string().nullable().optional(),
  maintenance_frequency_days: z.number().int().min(1).max(3650).optional(),
  responsible_person: z.string().max(120).optional(),
  ratings: z.array(z.object({
    spec_key: z.string(),
    spec_label: z.string(),
    spec_value: z.string(),
    unit: z.string().optional(),
  })).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    const detail = getEquipmentDetail(id);
    const status: MaintenanceStatusLabel = maintenanceStatus(
      detail.equipment.next_maintenance_date,
      detail.equipment.last_maintenance_date
    );
    return ok({ ...detail, maintenance_status: status });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canEditEquipment');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = db.prepare('SELECT * FROM equipment WHERE id = ?').get(id) as EquipmentWithRelations | undefined;
    if (!existing) return fail('Equipment not found', 404);

    const parsed = updateSchema.parse(await req.json());

    const updates: string[] = [];
    const values: unknown[] = [];
    const fields = Object.entries(parsed) as [string, unknown][];
    for (const [field, value] of fields) {
      if (field === 'ratings') continue;
      if (value !== undefined && (asRecord(existing) as Record<string, unknown>)[field] !== value) {
        updates.push(`${field} = ?`);
        values.push(value);
        recordAudit(user.id, 'UPDATE', 'equipment', id, field, (asRecord(existing) as Record<string, unknown>)[field], value);
      }
    }
    if (updates.length > 0) {
      updates.push(`updated_at = datetime('now')`);
      values.push(id);
      db.prepare(`UPDATE equipment SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    if (parsed.ratings) {
      db.prepare('DELETE FROM equipment_ratings WHERE equipment_id = ?').run(id);
      const stmt = db.prepare(
        'INSERT INTO equipment_ratings (equipment_id, spec_key, spec_label, spec_value, unit) VALUES (?, ?, ?, ?, ?)'
      );
      for (const r of parsed.ratings) {
        stmt.run(id, r.spec_key, r.spec_label, r.spec_value, r.unit ?? '');
      }
    }
    const detail = getEquipmentDetail(id);
    return ok(detail);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) return fail('Tag conflicts with an existing equipment', 409);
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canDeleteEquipment');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = db.prepare('SELECT equipment_tag, is_demo FROM equipment WHERE id = ?').get(id) as
      | { equipment_tag: string; is_demo: number }
      | undefined;
    if (!existing) return fail('Equipment not found', 404);
    db.prepare('DELETE FROM equipment WHERE id = ?').run(id);
    recordAudit(user.id, 'DELETE', 'equipment', id, null, existing.equipment_tag, null);
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}