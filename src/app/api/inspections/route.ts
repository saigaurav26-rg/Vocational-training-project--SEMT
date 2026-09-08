import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/business';
import type { InspectionLog } from '@/lib/types';

const schema = z.object({
  equipment_id: z.number().int().positive(),
  inspection_date: z.string(),
  inspector: z.string().min(1).max(120),
  inspection_type: z.enum(['ROUTINE', 'PERIODIC', 'PRE_MONSOON', 'POST_MONSOON', 'PREVENTIVE', 'SPECIAL', 'BREAKDOWN']),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']),
  observations: z.string().max(2000).optional(),
  abnormalities: z.string().max(2000).optional(),
  measurements: z.string().max(2000).optional(),
  recommendations: z.string().max(2000).optional(),
  next_action: z.string().max(200).optional(),
  follow_up_date: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipment_id');
    const substationId = searchParams.get('substation_id');
    const search = searchParams.get('search') ?? '';
    const limit = Math.min(200, Number(searchParams.get('limit') ?? '50'));
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'));

    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    if (equipmentId) { where.push('i.equipment_id = ?'); params.push(Number(equipmentId)); }
    if (substationId) { where.push('e.substation_id = ?'); params.push(Number(substationId)); }
    if (search) { where.push('(i.observations LIKE ? OR i.abnormalities LIKE ? OR e.equipment_name LIKE ? OR e.equipment_tag LIKE ?)'); const t = `%${search}%`; params.push(t, t, t, t); }

    const whereSql = where.join(' AND ');
    const total = (db.prepare(`SELECT COUNT(*) as c FROM inspection_logs i INNER JOIN equipment e ON e.id = i.equipment_id WHERE ${whereSql}`).get(...params) as { c: number }).c;
    const rows = db
      .prepare(
        `SELECT i.*, e.equipment_name, e.equipment_tag, s.substation_name, s.substation_code, et.name as equipment_type_name
         FROM inspection_logs i
         INNER JOIN equipment e ON e.id = i.equipment_id
         INNER JOIN substations s ON s.id = e.substation_id
         INNER JOIN equipment_types et ON et.id = e.equipment_type_id
         WHERE ${whereSql}
         ORDER BY i.inspection_date DESC, i.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as (InspectionLog & { equipment_name: string; equipment_tag: string; substation_name: string; substation_code: string; equipment_type_name: string })[];
    return ok({ rows, total });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    const user = await requirePermission('canCreateInspection');
    const parsed = schema.parse(await req.json());
    const eq = db.prepare('SELECT id FROM equipment WHERE id = ?').get(parsed.equipment_id) as { id: number } | undefined;
    if (!eq) return fail('Equipment not found', 404);

    const tx = db.transaction(() => {
      const r = db
        .prepare(
          `INSERT INTO inspection_logs
            (equipment_id, inspection_date, inspector, inspection_type, condition, observations, abnormalities,
             measurements, recommendations, next_action, follow_up_date, is_demo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
        )
        .run(
          parsed.equipment_id,
          parsed.inspection_date,
          parsed.inspector,
          parsed.inspection_type,
          parsed.condition,
          parsed.observations ?? '',
          parsed.abnormalities ?? '',
          parsed.measurements ?? '',
          parsed.recommendations ?? '',
          parsed.next_action ?? '',
          parsed.follow_up_date ?? null
        );
      const id = Number(r.lastInsertRowid);
      db.prepare('UPDATE equipment SET condition = ?, updated_at = datetime(\'now\') WHERE id = ?').run(parsed.condition, parsed.equipment_id);
      recordAudit(user.id, 'CREATE', 'inspection_logs', id, null, null, `${parsed.inspection_type} inspection`);
      return id;
    });
    const id = tx();
    const created = db.prepare('SELECT * FROM inspection_logs WHERE id = ?').get(id) as InspectionLog;
    return ok(created, 201);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}