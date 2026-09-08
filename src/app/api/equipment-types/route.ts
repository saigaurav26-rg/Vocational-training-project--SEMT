import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/business';
import type { EquipmentType } from '@/lib/types';

const schema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  default_maintenance_days: z.number().int().min(1).max(3650).default(180),
});

export async function GET() {
  try {
    await ensureInit();
    await requireUser();
    const rows = db
      .prepare(
        `SELECT et.*,
          (SELECT COUNT(*) FROM equipment WHERE equipment_type_id = et.id) as equipment_count
         FROM equipment_types et
         ORDER BY category ASC, name ASC`
      )
      .all() as (EquipmentType & { equipment_count: number })[];
    return ok({ rows });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    const user = await requirePermission('canManageEquipmentTypes');
    const body = await req.json();
    const parsed = schema.parse(body);
    try {
      const r = db
        .prepare(
          'INSERT INTO equipment_types (name, category, description, default_maintenance_days, active) VALUES (?, ?, ?, ?, 1)'
        )
        .run(parsed.name, parsed.category, parsed.description ?? '', parsed.default_maintenance_days);
      const id = Number(r.lastInsertRowid);
      recordAudit(user.id, 'CREATE', 'equipment_types', id, null, null, parsed.name);
      const row = db.prepare('SELECT * FROM equipment_types WHERE id = ?').get(id) as EquipmentType;
      return ok(row, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE')) return fail('Equipment type already exists', 409);
      throw err;
    }
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}