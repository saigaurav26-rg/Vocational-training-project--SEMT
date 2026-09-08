import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit } from '@/lib/business';
import type { Substation, SubstationStatus } from '@/lib/types';

const schema = z.object({
  substation_name: z.string().min(1).max(150),
  substation_code: z.string().min(1).max(50),
  location: z.string().max(200).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  voltage_level: z.string().max(50).optional(),
  commissioning_date: z.string().nullable().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED']).default('ACTIVE'),
});

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const limit = Number(searchParams.get('limit') ?? '100');
    const offset = Number(searchParams.get('offset') ?? '0');

    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    if (search) {
      where.push('(substation_name LIKE ? OR substation_code LIKE ? OR location LIKE ? OR district LIKE ? OR state LIKE ?)');
      const t = `%${search}%`;
      params.push(t, t, t, t, t);
    }
    const rows = db
      .prepare(
        `SELECT s.*,
          (SELECT COUNT(*) FROM equipment WHERE substation_id = s.id) as equipment_count,
          (SELECT COUNT(*) FROM equipment WHERE substation_id = s.id AND status = 'ACTIVE') as active_count,
          (SELECT COUNT(*) FROM equipment WHERE substation_id = s.id AND condition IN ('POOR','CRITICAL')) as critical_count
         FROM substations s
         WHERE ${where.join(' AND ')}
         ORDER BY substation_name ASC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as (Substation & { equipment_count: number; active_count: number; critical_count: number })[];
    const total = (db.prepare(`SELECT COUNT(*) as c FROM substations WHERE ${where.join(' AND ')}`).get(...params) as { c: number }).c;
    return ok({ rows, total });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    const user = await requirePermission('canManageSubstations');
    const body = await req.json();
    const parsed = schema.parse(body);
    try {
      const result = db
        .prepare(
          `INSERT INTO substations
            (substation_name, substation_code, location, district, state, voltage_level, commissioning_date, description, status, is_demo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
        )
        .run(
          parsed.substation_name,
          parsed.substation_code.toUpperCase(),
          parsed.location ?? '',
          parsed.district ?? '',
          parsed.state ?? '',
          parsed.voltage_level ?? '',
          parsed.commissioning_date ?? null,
          parsed.description ?? '',
          parsed.status as SubstationStatus
        );
      const id = Number(result.lastInsertRowid);
      recordAudit(user.id, 'CREATE', 'substations', id, null, null, parsed.substation_name);
      const created = db.prepare('SELECT * FROM substations WHERE id = ?').get(id) as Substation;
      return ok(created, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE')) {
        return fail('A substation with that code already exists', 409);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}