import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit, refreshNextMaintenance } from '@/lib/business';
import type { MaintenanceLog } from '@/lib/types';

const schema = z.object({
  equipment_id: z.number().int().positive(),
  maintenance_type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'BREAKDOWN', 'INSPECTION', 'EMERGENCY', 'ROUTINE']),
  maintenance_date: z.string(),
  performed_by: z.string().min(1).max(120),
  maintenance_reason: z.string().max(500).optional(),
  observations: z.string().max(2000).optional(),
  work_performed: z.string().max(2000).optional(),
  parts_replaced: z.string().max(500).optional(),
  test_results: z.string().max(2000).optional(),
  condition_before: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']),
  condition_after: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']),
  downtime_hours: z.number().min(0).max(10000).default(0),
  recommendations: z.string().max(2000).optional(),
  next_maintenance_date: z.string().nullable().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
});

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipment_id');
    const substationId = searchParams.get('substation_id');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search') ?? '';
    const limit = Math.min(200, Number(searchParams.get('limit') ?? '50'));
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'));

    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    if (equipmentId) { where.push('m.equipment_id = ?'); params.push(Number(equipmentId)); }
    if (substationId) { where.push('e.substation_id = ?'); params.push(Number(substationId)); }
    if (type) { where.push('m.maintenance_type = ?'); params.push(type); }
    if (status) { where.push('m.status = ?'); params.push(status); }
    if (search) { where.push('(m.work_performed LIKE ? OR m.observations LIKE ? OR e.equipment_name LIKE ? OR e.equipment_tag LIKE ?)'); const t = `%${search}%`; params.push(t, t, t, t); }

    const whereSql = where.join(' AND ');
    const total = (db.prepare(`SELECT COUNT(*) as c FROM maintenance_logs m INNER JOIN equipment e ON e.id = m.equipment_id WHERE ${whereSql}`).get(...params) as { c: number }).c;
    const rows = db
      .prepare(
        `SELECT m.*, e.equipment_name, e.equipment_tag, s.substation_name, s.substation_code, et.name as equipment_type_name
         FROM maintenance_logs m
         INNER JOIN equipment e ON e.id = m.equipment_id
         INNER JOIN substations s ON s.id = e.substation_id
         INNER JOIN equipment_types et ON et.id = e.equipment_type_id
         WHERE ${whereSql}
         ORDER BY m.maintenance_date DESC, m.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as (MaintenanceLog & { equipment_name: string; equipment_tag: string; substation_name: string; substation_code: string; equipment_type_name: string })[];
    return ok({ rows, total });
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

    let nextDate = parsed.next_maintenance_date ?? null;
    if (!nextDate && parsed.status === 'COMPLETED') {
      const freqRow = db.prepare('SELECT maintenance_frequency_days FROM equipment WHERE id = ?').get(parsed.equipment_id) as { maintenance_frequency_days: number };
      const d = new Date(parsed.maintenance_date);
      d.setDate(d.getDate() + freqRow.maintenance_frequency_days);
      nextDate = d.toISOString().split('T')[0];
    }

    const tx = db.transaction(() => {
      const r = db
        .prepare(
          `INSERT INTO maintenance_logs
            (equipment_id, maintenance_type, maintenance_date, performed_by, maintenance_reason, observations, work_performed,
             parts_replaced, test_results, condition_before, condition_after, downtime_hours, recommendations, next_maintenance_date, status, is_demo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
        )
        .run(
          parsed.equipment_id,
          parsed.maintenance_type,
          parsed.maintenance_date,
          parsed.performed_by,
          parsed.maintenance_reason ?? '',
          parsed.observations ?? '',
          parsed.work_performed ?? '',
          parsed.parts_replaced ?? '',
          parsed.test_results ?? '',
          parsed.condition_before,
          parsed.condition_after,
          parsed.downtime_hours,
          parsed.recommendations ?? '',
          nextDate,
          parsed.status
        );
      const id = Number(r.lastInsertRowid);

      db.prepare(
        'UPDATE equipment SET condition = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).run(parsed.condition_after, parsed.equipment_id);

      if (parsed.status === 'COMPLETED') {
        refreshNextMaintenance(parsed.equipment_id, parsed.maintenance_date);
      }
      recordAudit(user.id, 'CREATE', 'maintenance_logs', id, null, null, `${parsed.maintenance_type} for equipment ${parsed.equipment_id}`);
      return id;
    });

    const id = tx();
    const created = db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(id) as MaintenanceLog;
    return ok(created, 201);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}