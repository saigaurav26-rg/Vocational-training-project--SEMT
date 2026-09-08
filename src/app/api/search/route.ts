import { NextRequest } from 'next/server';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return ok({ substations: [], equipment: [], maintenance: [], inspections: [] });

    const like = `%${q}%`;

    const substations = db
      .prepare(
        `SELECT id, substation_name, substation_code, location
         FROM substations
         WHERE substation_name LIKE ? OR substation_code LIKE ? OR location LIKE ? OR district LIKE ?
         LIMIT 10`
      )
      .all(like, like, like, like);

    const equipment = db
      .prepare(
        `SELECT e.id, e.equipment_tag, e.equipment_name, et.name as type, s.substation_name
         FROM equipment e
         INNER JOIN equipment_types et ON et.id = e.equipment_type_id
         INNER JOIN substations s ON s.id = e.substation_id
         WHERE e.equipment_tag LIKE ? OR e.equipment_name LIKE ? OR e.serial_number LIKE ? OR e.manufacturer LIKE ? OR e.model_number LIKE ?
         LIMIT 20`
      )
      .all(like, like, like, like, like);

    const maintenance = db
      .prepare(
        `SELECT m.id, m.maintenance_type, m.maintenance_date, e.equipment_tag, e.equipment_name
         FROM maintenance_logs m
         INNER JOIN equipment e ON e.id = m.equipment_id
         WHERE m.work_performed LIKE ? OR m.observations LIKE ? OR m.parts_replaced LIKE ? OR e.equipment_tag LIKE ?
         LIMIT 20`
      )
      .all(like, like, like, like);

    const inspections = db
      .prepare(
        `SELECT i.id, i.inspection_type, i.inspection_date, e.equipment_tag, e.equipment_name
         FROM inspection_logs i
         INNER JOIN equipment e ON e.id = i.equipment_id
         WHERE i.observations LIKE ? OR i.abnormalities LIKE ? OR e.equipment_tag LIKE ?
         LIMIT 20`
      )
      .all(like, like, like);

    return ok({ substations, equipment, maintenance, inspections });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}