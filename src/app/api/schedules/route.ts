import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/business';

const schema = z.object({
  equipment_id: z.number().int().positive(),
  maintenance_type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'BREAKDOWN', 'INSPECTION', 'EMERGENCY', 'ROUTINE']),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM']),
  frequency_days: z.number().int().min(1).max(3650),
  last_completed: z.string().nullable().optional(),
  next_due: z.string(),
  responsible_person: z.string().max(120).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipment_id');
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    if (equipmentId) { where.push('s.equipment_id = ?'); params.push(Number(equipmentId)); }
    const rows = db
      .prepare(
        `SELECT s.*, e.equipment_name, e.equipment_tag, e.substation_id, sub.substation_name, sub.substation_code
         FROM maintenance_schedules s
         INNER JOIN equipment e ON e.id = s.equipment_id
         INNER JOIN substations sub ON sub.id = e.substation_id
         WHERE ${where.join(' AND ')}
         ORDER BY s.next_due ASC`
      )
      .all(...params);
    return ok({ rows });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    const user = await requirePermission('canCreateMaintenance');
    const parsed = schema.parse(await req.json());
    const eq = db.prepare('SELECT id FROM equipment WHERE id = ?').get(parsed.equipment_id) as { id: number } | undefined;
    if (!eq) return fail('Equipment not found', 404);

    const r = db
      .prepare(
        `INSERT INTO maintenance_schedules
          (equipment_id, maintenance_type, frequency, frequency_days, last_completed, next_due, responsible_person, priority, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        parsed.equipment_id,
        parsed.maintenance_type,
        parsed.frequency,
        parsed.frequency_days,
        parsed.last_completed ?? null,
        parsed.next_due,
        parsed.responsible_person ?? '',
        parsed.priority,
        parsed.status,
        parsed.notes ?? ''
      );
    const id = Number(r.lastInsertRowid);
    recordAudit(user.id, 'CREATE', 'maintenance_schedules', id, null, null, `${parsed.frequency} schedule`);
    const created = db.prepare('SELECT * FROM maintenance_schedules WHERE id = ?').get(id);
    return ok(created, 201);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}