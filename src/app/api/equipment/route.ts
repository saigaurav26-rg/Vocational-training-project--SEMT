import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { listEquipmentWithRelations, maintenanceStatus, recordAudit } from '@/lib/business';
import type { EquipmentWithRelations, Equipment } from '@/lib/types';
import type { MaintenanceStatusLabel } from '@/lib/business';

const ratingSchema = z.object({
  spec_key: z.string(),
  spec_label: z.string(),
  spec_value: z.string(),
  unit: z.string().optional(),
});

const schema = z.object({
  equipment_tag: z.string().min(1).max(80),
  equipment_name: z.string().min(1).max(150),
  equipment_type_id: z.number().int().positive(),
  substation_id: z.number().int().positive(),
  manufacturer: z.string().max(120).optional(),
  model_number: z.string().max(120).optional(),
  serial_number: z.string().max(120).optional(),
  installation_date: z.string().nullable().optional(),
  commissioning_date: z.string().nullable().optional(),
  location: z.string().max(150).optional(),
  bay: z.string().max(50).optional(),
  feeder: z.string().max(50).optional(),
  voltage_level: z.string().max(50).optional(),
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED']).default('ACTIVE'),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).default('GOOD'),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  description: z.string().max(2000).optional(),
  last_maintenance_date: z.string().nullable().optional(),
  next_maintenance_date: z.string().nullable().optional(),
  maintenance_frequency_days: z.number().int().min(1).max(3650).default(180),
  responsible_person: z.string().max(120).optional(),
  ratings: z.array(ratingSchema).default([]),
});

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const substationId = searchParams.get('substation_id');
    const equipmentTypeId = searchParams.get('equipment_type_id');
    const status = searchParams.get('status');
    const condition = searchParams.get('condition');
    const criticality = searchParams.get('criticality');
    const sortBy = searchParams.get('sort_by') ?? 'next_maintenance';
    const sortDir = (searchParams.get('sort_dir') ?? 'asc') as 'asc' | 'desc';
    const limit = Math.min(100, Number(searchParams.get('limit') ?? '25'));
    const offset = Math.max(0, Number(searchParams.get('offset') ?? '0'));

    const filter: Parameters<typeof listEquipmentWithRelations>[0] = {
      search,
      limit,
      offset,
      sortBy,
      sortDir,
    };
    if (substationId) filter.substationId = Number(substationId);
    if (equipmentTypeId) filter.equipmentTypeId = Number(equipmentTypeId);
    if (status) filter.status = status as Equipment['status'];
    if (condition) filter.condition = condition as Equipment['condition'];
    if (criticality) filter.criticality = criticality as Equipment['criticality'];

    const { rows, total } = listEquipmentWithRelations(filter);

    const enriched: (EquipmentWithRelations & { maintenance_status: MaintenanceStatusLabel })[] = rows.map((e) => ({
      ...e,
      maintenance_status: maintenanceStatus(e.next_maintenance_date, e.last_maintenance_date),
    }));

    return ok({ rows: enriched, total, limit, offset });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureInit();
    const user = await requirePermission('canCreateEquipment');
    const body = await req.json();
    const parsed = schema.parse(body);

    const typeExists = db.prepare('SELECT id FROM equipment_types WHERE id = ?').get(parsed.equipment_type_id);
    if (!typeExists) return fail('Selected equipment type does not exist', 400);
    const subExists = db.prepare('SELECT id FROM substations WHERE id = ?').get(parsed.substation_id);
    if (!subExists) return fail('Selected substation does not exist', 400);

    const tagExists = db.prepare('SELECT id FROM equipment WHERE equipment_tag = ?').get(parsed.equipment_tag.toUpperCase());
    if (tagExists) return fail('An equipment with this tag already exists', 409);

    const insert = db.transaction(() => {
      const r = db
        .prepare(
          `INSERT INTO equipment
            (equipment_tag, equipment_name, equipment_type_id, substation_id, manufacturer, model_number, serial_number,
             installation_date, commissioning_date, location, bay, feeder, voltage_level, status, condition, criticality,
             description, last_maintenance_date, next_maintenance_date, maintenance_frequency_days, responsible_person, is_demo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
        )
        .run(
          parsed.equipment_tag.toUpperCase(),
          parsed.equipment_name,
          parsed.equipment_type_id,
          parsed.substation_id,
          parsed.manufacturer ?? '',
          parsed.model_number ?? '',
          parsed.serial_number ?? '',
          parsed.installation_date ?? null,
          parsed.commissioning_date ?? null,
          parsed.location ?? '',
          parsed.bay ?? '',
          parsed.feeder ?? '',
          parsed.voltage_level ?? '',
          parsed.status,
          parsed.condition,
          parsed.criticality,
          parsed.description ?? '',
          parsed.last_maintenance_date ?? null,
          parsed.next_maintenance_date ?? null,
          parsed.maintenance_frequency_days,
          parsed.responsible_person ?? ''
        );
      const id = Number(r.lastInsertRowid);
      const ratingStmt = db.prepare(
        'INSERT INTO equipment_ratings (equipment_id, spec_key, spec_label, spec_value, unit) VALUES (?, ?, ?, ?, ?)'
      );
      for (const r2 of parsed.ratings) {
        ratingStmt.run(id, r2.spec_key, r2.spec_label, r2.spec_value, r2.unit ?? '');
      }
      db.prepare(
        'INSERT INTO maintenance_schedules (equipment_id, maintenance_type, frequency, frequency_days, last_completed, next_due, responsible_person, priority, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        id,
        'PREVENTIVE',
        parsed.maintenance_frequency_days <= 100
          ? 'QUARTERLY'
          : parsed.maintenance_frequency_days <= 200
            ? 'HALF_YEARLY'
            : 'YEARLY',
        parsed.maintenance_frequency_days,
        parsed.last_maintenance_date ?? null,
        parsed.next_maintenance_date ?? null,
        parsed.responsible_person ?? '',
        parsed.criticality,
        'PLANNED',
        'Initial preventive schedule created with equipment.'
      );
      recordAudit(user.id, 'CREATE', 'equipment', id, null, null, parsed.equipment_tag);
      return id;
    });

    const id = insert();
    const created = db
      .prepare(
        `SELECT e.*, et.name as equipment_type_name, et.category as equipment_type_category,
                s.substation_name, s.substation_code
         FROM equipment e
         INNER JOIN equipment_types et ON et.id = e.equipment_type_id
         INNER JOIN substations s ON s.id = e.substation_id
         WHERE e.id = ?`
      )
      .get(id) as EquipmentWithRelations;
    return ok(created, 201);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) return fail('An equipment with this tag already exists', 409);
    return handleError(err);
  }
}