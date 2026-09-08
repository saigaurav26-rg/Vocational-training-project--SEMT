import { NextRequest } from 'next/server';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { computeHealthScore } from '@/lib/business';

function asNumber(v: unknown): number { return Number(v) || 0; }

export async function GET(req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    const { searchParams } = new URL(req.url);
    const substationId = searchParams.get('substation_id');
    const days = Math.max(1, Math.min(365, Number(searchParams.get('days') ?? '180')));

    const totalEquipment = (db.prepare('SELECT COUNT(*) as c FROM equipment').get() as { c: number }).c;
    const activeEquipment = (db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'ACTIVE'").get() as { c: number }).c;
    const underMaintenance = (db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'UNDER_MAINTENANCE'").get() as { c: number }).c;
    const outOfService = (db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'OUT_OF_SERVICE'").get() as { c: number }).c;
    const criticalEquipment = (db.prepare("SELECT COUNT(*) as c FROM equipment WHERE criticality = 'CRITICAL'").get() as { c: number }).c;
    const totalSubstations = (db.prepare('SELECT COUNT(*) as c FROM substations').get() as { c: number }).c;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const todayIso = today.toISOString().split('T')[0];
    const weekIso = weekFromNow.toISOString().split('T')[0];

    const overdueCount = (db.prepare("SELECT COUNT(*) as c FROM equipment WHERE next_maintenance_date IS NOT NULL AND next_maintenance_date < ?").get(todayIso) as { c: number }).c;
    const dueThisWeekCount = (db.prepare("SELECT COUNT(*) as c FROM equipment WHERE next_maintenance_date IS NOT NULL AND next_maintenance_date >= ? AND next_maintenance_date <= ?").get(todayIso, weekIso) as { c: number }).c;
    const dueTodayCount = (db.prepare("SELECT COUNT(*) as c FROM equipment WHERE next_maintenance_date = ?").get(todayIso) as { c: number }).c;

    const totalMaintenance = (db.prepare('SELECT COUNT(*) as c FROM maintenance_logs').get() as { c: number }).c;
    const completedMaintenance = (db.prepare("SELECT COUNT(*) as c FROM maintenance_logs WHERE status = 'COMPLETED'").get() as { c: number }).c;
    const preventiveMaint = (db.prepare("SELECT COUNT(*) as c FROM maintenance_logs WHERE maintenance_type = 'PREVENTIVE'").get() as { c: number }).c;
    const correctiveMaint = (db.prepare("SELECT COUNT(*) as c FROM maintenance_logs WHERE maintenance_type = 'CORRECTIVE'").get() as { c: number }).c;
    const breakdownMaint = (db.prepare("SELECT COUNT(*) as c FROM maintenance_logs WHERE maintenance_type = 'BREAKDOWN'").get() as { c: number }).c;
    const totalInspections = (db.prepare('SELECT COUNT(*) as c FROM inspection_logs').get() as { c: number }).c;

    const conditionDist = db
      .prepare("SELECT condition, COUNT(*) as c FROM equipment GROUP BY condition")
      .all() as Array<{ condition: string; c: number }>;
    const typeDist = db
      .prepare(`SELECT et.name as type, COUNT(e.id) as c
                 FROM equipment_types et
                 LEFT JOIN equipment e ON e.equipment_type_id = et.id
                 GROUP BY et.id
                 ORDER BY c DESC
                 LIMIT 12`)
      .all() as Array<{ type: string; c: number }>;
    const substationDist = db
      .prepare(`SELECT s.substation_name, s.substation_code, COUNT(e.id) as c
                 FROM substations s
                 LEFT JOIN equipment e ON e.substation_id = s.id
                 GROUP BY s.id
                 ORDER BY s.substation_name ASC`)
      .all() as Array<{ substation_name: string; substation_code: string; c: number }>;

    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString().split('T')[0];
    const monthlyMaint = db
      .prepare(
        `SELECT strftime('%Y-%m', maintenance_date) as month, COUNT(*) as c, maintenance_type
         FROM maintenance_logs
         WHERE maintenance_date >= ?
         GROUP BY month, maintenance_type
         ORDER BY month ASC`
      )
      .all(cutoffIso) as Array<{ month: string; c: number; maintenance_type: string }>;

    const maintByType = db
      .prepare(`SELECT maintenance_type, COUNT(*) as c FROM maintenance_logs GROUP BY maintenance_type`)
      .all() as Array<{ maintenance_type: string; c: number }>;

    const health = substationId ? computeHealthScore(Number(substationId)) : computeHealthScore();
    const substationHealth = substationId ? null : (db
      .prepare('SELECT id, substation_name, substation_code FROM substations ORDER BY substation_name ASC')
      .all() as Array<{ id: number; substation_name: string; substation_code: string }>)
      .map((s) => ({ ...s, health: computeHealthScore(s.id) }));

    return ok({
      totals: {
        totalEquipment, activeEquipment, underMaintenance, outOfService, criticalEquipment, totalSubstations,
        overdueCount, dueThisWeekCount, dueTodayCount,
        totalMaintenance, completedMaintenance, preventiveMaint, correctiveMaint, breakdownMaint, totalInspections,
      },
      conditionDist, typeDist, substationDist, monthlyMaint, maintByType,
      health, substationHealth,
    });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}