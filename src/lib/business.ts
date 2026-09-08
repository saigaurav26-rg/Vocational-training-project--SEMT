import { db } from './db';
import { HttpError } from './auth';
import type {
  Equipment,
  EquipmentWithRelations,
  MaintenanceLog,
  InspectionLog,
  EquipmentCondition,
  Criticality,
  EquipmentStatus,
  MaintenanceStatus,
} from './types';

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ad = new Date(a).getTime();
  const bd = new Date(b).getTime();
  return Math.floor((bd - ad) / (24 * 60 * 60 * 1000));
}

export type MaintenanceStatusLabel =
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'DUE_SOON'
  | 'UPCOMING'
  | 'COMPLETED'
  | 'NOT_SCHEDULED';

export function maintenanceStatus(
  nextDate: string | null,
  lastDate: string | null,
  warningDays = 30
): MaintenanceStatusLabel {
  if (!nextDate) return lastDate ? 'COMPLETED' : 'NOT_SCHEDULED';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays === 0) return 'DUE_TODAY';
  if (diffDays <= warningDays) return 'DUE_SOON';
  return 'UPCOMING';
}

export function computePriority(
  criticality: Criticality,
  condition: EquipmentCondition,
  maintStatus: MaintenanceStatusLabel
): number {
  let score = 0;
  const critWeight = { LOW: 5, MEDIUM: 10, HIGH: 20, CRITICAL: 30 }[criticality];
  const condWeight = { EXCELLENT: 0, GOOD: 5, FAIR: 10, POOR: 18, CRITICAL: 25 }[condition];
  const maintWeight =
    maintStatus === 'OVERDUE'
      ? 30
      : maintStatus === 'DUE_TODAY'
        ? 20
        : maintStatus === 'DUE_SOON'
          ? 10
          : 0;
  score = critWeight + condWeight + maintWeight;
  return Math.min(100, Math.round(score * 1.3));
}

export function computeHealthScore(substationId?: number): {
  score: number;
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  overdue: number;
} {
  const where = substationId ? 'WHERE e.substation_id = ?' : '';
  const params = substationId ? [substationId] : [];
  const equipment = db
    .prepare(
      `SELECT e.id, e.condition, e.next_maintenance_date, e.last_maintenance_date
       FROM equipment e ${where}`
    )
    .all(...params) as Array<{
      id: number;
      condition: EquipmentCondition;
      next_maintenance_date: string | null;
      last_maintenance_date: string | null;
    }>;

  let healthy = 0;
  let warning = 0;
  let critical = 0;
  let overdue = 0;
  let totalScore = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const e of equipment) {
    const condScore =
      e.condition === 'EXCELLENT'
        ? 100
        : e.condition === 'GOOD'
          ? 85
          : e.condition === 'FAIR'
            ? 65
            : e.condition === 'POOR'
              ? 35
              : 15;
    totalScore += condScore;
    if (e.condition === 'EXCELLENT' || e.condition === 'GOOD') healthy++;
    else if (e.condition === 'FAIR') warning++;
    else critical++;

    if (e.next_maintenance_date) {
      const due = new Date(e.next_maintenance_date);
      due.setHours(0, 0, 0, 0);
      if (due < today) overdue++;
    }
  }

  const total = equipment.length;
  const score = total === 0 ? 0 : Math.round(totalScore / total);
  return { score, total, healthy, warning, critical, overdue };
}

export function listEquipmentWithRelations(filter: {
  search?: string;
  substationId?: number;
  equipmentTypeId?: number;
  status?: EquipmentStatus;
  condition?: EquipmentCondition;
  criticality?: Criticality;
  maintStatus?: MaintenanceStatusLabel;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
} = {}): { rows: EquipmentWithRelations[]; total: number } {
  const where: string[] = ['1=1'];
  const params: unknown[] = [];

  if (filter.search) {
    where.push(
      '(e.equipment_tag LIKE ? OR e.equipment_name LIKE ? OR e.manufacturer LIKE ? OR e.model_number LIKE ? OR e.serial_number LIKE ? OR e.bay LIKE ? OR e.feeder LIKE ? OR e.location LIKE ?)'
    );
    const term = `%${filter.search}%`;
    params.push(term, term, term, term, term, term, term, term);
  }
  if (filter.substationId) {
    where.push('e.substation_id = ?');
    params.push(filter.substationId);
  }
  if (filter.equipmentTypeId) {
    where.push('e.equipment_type_id = ?');
    params.push(filter.equipmentTypeId);
  }
  if (filter.status) {
    where.push('e.status = ?');
    params.push(filter.status);
  }
  if (filter.condition) {
    where.push('e.condition = ?');
    params.push(filter.condition);
  }
  if (filter.criticality) {
    where.push('e.criticality = ?');
    params.push(filter.criticality);
  }

  const whereSql = where.join(' AND ');
  const totalRow = db.prepare(`SELECT COUNT(*) as c FROM equipment e WHERE ${whereSql}`).get(...params) as { c: number };
  const total = totalRow.c;

  const sortBy = filter.sortBy ?? 'next_maintenance_date';
  const sortDir = filter.sortDir ?? 'asc';
  const orderMap: Record<string, string> = {
    name: 'e.equipment_name',
    tag: 'e.equipment_tag',
    installation_date: 'e.installation_date',
    condition: 'e.condition',
    criticality: `CASE e.criticality WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END`,
    next_maintenance: 'e.next_maintenance_date',
    created: 'e.created_at',
  };
  const orderCol = orderMap[sortBy] ?? 'e.next_maintenance_date';
  const limit = filter.limit ?? 25;
  const offset = filter.offset ?? 0;

  const rows = db
    .prepare(
      `SELECT e.*, et.name as equipment_type_name, et.category as equipment_type_category,
              s.substation_name, s.substation_code
       FROM equipment e
       INNER JOIN equipment_types et ON et.id = e.equipment_type_id
       INNER JOIN substations s ON s.id = e.substation_id
       WHERE ${whereSql}
       ORDER BY ${orderCol} ${sortDir === 'desc' ? 'DESC' : 'ASC'} NULLS LAST
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as EquipmentWithRelations[];

  return { rows, total };
}

export function getEquipmentDetail(id: number): {
  equipment: EquipmentWithRelations;
  ratings: Array<{ id: number; spec_key: string; spec_label: string; spec_value: string; unit: string }>;
  maintenance: MaintenanceLog[];
  inspections: InspectionLog[];
} {
  const equipment = db
    .prepare(
      `SELECT e.*, et.name as equipment_type_name, et.category as equipment_type_category,
              s.substation_name, s.substation_code
       FROM equipment e
       INNER JOIN equipment_types et ON et.id = e.equipment_type_id
       INNER JOIN substations s ON s.id = e.substation_id
       WHERE e.id = ?`
    )
    .get(id) as EquipmentWithRelations;
  if (!equipment) throw new HttpError(404, 'Equipment not found');

  const ratings = db
    .prepare('SELECT * FROM equipment_ratings WHERE equipment_id = ? ORDER BY id ASC')
    .all(id) as Array<{ id: number; spec_key: string; spec_label: string; spec_value: string; unit: string }>;
  const maintenance = db
    .prepare(
      'SELECT * FROM maintenance_logs WHERE equipment_id = ? ORDER BY maintenance_date DESC, id DESC LIMIT 100'
    )
    .all(id) as MaintenanceLog[];
  const inspections = db
    .prepare(
      'SELECT * FROM inspection_logs WHERE equipment_id = ? ORDER BY inspection_date DESC, id DESC LIMIT 100'
    )
    .all(id) as InspectionLog[];

  return { equipment, ratings, maintenance, inspections };
}

export function recordAudit(
  userId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  field: string | null = null,
  oldValue: unknown = null,
  newValue: unknown = null
): void {
  db.prepare(
    'INSERT INTO audit_logs (user_id, action, entity, entity_id, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    userId,
    action,
    entity,
    entityId,
    field,
    oldValue == null ? null : String(oldValue),
    newValue == null ? null : String(newValue)
  );
}

export function asRecord<T extends object>(value: T): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

export function refreshNextMaintenance(equipmentId: number, maintDate: string): void {
  const eq = db.prepare('SELECT maintenance_frequency_days FROM equipment WHERE id = ?').get(equipmentId) as
    | { maintenance_frequency_days: number }
    | undefined;
  if (!eq) return;
  const next = addDays(maintDate, eq.maintenance_frequency_days);
  db.prepare(
    'UPDATE equipment SET last_maintenance_date = ?, next_maintenance_date = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(maintDate, toISODate(next), equipmentId);

  const sch = db
    .prepare('SELECT id FROM maintenance_schedules WHERE equipment_id = ? LIMIT 1')
    .get(equipmentId) as { id: number } | undefined;
  if (sch) {
    db.prepare(
      'UPDATE maintenance_schedules SET last_completed = ?, next_due = ? WHERE id = ?'
    ).run(maintDate, toISODate(next), sch.id);
  }
}