import { NextRequest } from 'next/server';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await ensureInit();
    await requireUser();
    const rows = db
      .prepare(
        `SELECT s.*,
          (SELECT COUNT(*) FROM maintenance_schedules WHERE equipment_id IN (SELECT id FROM equipment WHERE substation_id = s.id)) as schedule_count
         FROM substations s
         ORDER BY s.substation_name ASC`
      )
      .all();
    return ok({ rows });
  } catch (err) {
    return handleError(err);
  }
}