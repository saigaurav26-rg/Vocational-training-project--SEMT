import { NextRequest } from 'next/server';
import { handleError, ok } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requireUser, requirePermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit, maintenanceStatus } from '@/lib/business';
import type { Equipment } from '@/lib/types';

function generateNotifications() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().split('T')[0];

  const overdue = db
    .prepare(
      `SELECT e.id, e.equipment_tag, e.equipment_name, s.substation_name
       FROM equipment e
       INNER JOIN substations s ON s.id = e.substation_id
       WHERE e.next_maintenance_date IS NOT NULL AND e.next_maintenance_date < ?
       LIMIT 10`
    )
    .all(todayIso) as Array<{ id: number; equipment_tag: string; equipment_name: string; substation_name: string }>;

  const dueWeek = db
    .prepare(
      `SELECT e.id, e.equipment_tag, e.equipment_name, s.substation_name,
       CAST(julianday(e.next_maintenance_date) - julianday(?) AS INTEGER) as days_remaining
       FROM equipment e
       INNER JOIN substations s ON s.id = e.substation_id
       WHERE e.next_maintenance_date IS NOT NULL AND e.next_maintenance_date >= ?
         AND e.next_maintenance_date <= date(?, '+7 days')
       LIMIT 10`
    )
    .all(todayIso, todayIso, todayIso) as Array<{ id: number; equipment_tag: string; equipment_name: string; substation_name: string; days_remaining: number }>;

  const critical = db
    .prepare(
      `SELECT id, equipment_tag, equipment_name FROM equipment WHERE criticality = 'CRITICAL' AND condition IN ('POOR', 'CRITICAL') LIMIT 10`
    )
    .all() as Array<{ id: number; equipment_tag: string; equipment_name: string }>;

  const notifications: Array<{ equipment_id: number | null; type: string; title: string; message: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' }> = [];

  for (const o of overdue) {
    notifications.push({
      equipment_id: o.id,
      type: 'OVERDUE',
      title: 'Maintenance overdue',
      message: `${o.equipment_tag} (${o.substation_name}) is overdue for maintenance.`,
      severity: 'CRITICAL',
    });
  }
  for (const d of dueWeek) {
    notifications.push({
      equipment_id: d.id,
      type: 'DUE_SOON',
      title: 'Maintenance due soon',
      message: `${d.equipment_tag} (${d.substation_name}) due in ${d.days_remaining} day(s).`,
      severity: 'WARNING',
    });
  }
  for (const c of critical) {
    notifications.push({
      equipment_id: c.id,
      type: 'CRITICAL',
      title: 'Critical equipment needs attention',
      message: `${c.equipment_tag} is critical and in poor/critical condition.`,
      severity: 'CRITICAL',
    });
  }

  const tx = db.transaction(() => {
    for (const n of notifications) {
      db.prepare(
        `INSERT OR IGNORE INTO notifications (equipment_id, type, title, message, severity, created_at)
         SELECT ?, ?, ?, ?, ?, datetime('now')
         WHERE NOT EXISTS (
           SELECT 1 FROM notifications
           WHERE equipment_id = ? AND type = ? AND created_at > datetime('now', '-1 day')
         )`
      ).run(n.equipment_id, n.type, n.title, n.message, n.severity, n.equipment_id, n.type);
    }
  });
  tx();
}

export async function GET(_req: NextRequest) {
  try {
    await ensureInit();
    await requireUser();
    generateNotifications();
    const rows = db
      .prepare(
        `SELECT n.*, e.equipment_name, e.equipment_tag
         FROM notifications n
         LEFT JOIN equipment e ON e.id = n.equipment_id
         ORDER BY n.created_at DESC
         LIMIT 100`
      )
      .all();
    const unread = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE read = 0').get() as { c: number }).c;
    return ok({ rows, unread });
  } catch (err) {
    return handleError(err);
  }
}