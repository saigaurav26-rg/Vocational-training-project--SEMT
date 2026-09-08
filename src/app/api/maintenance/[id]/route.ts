import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, fail } from '@/lib/api';
import { ensureInit } from '@/lib/bootstrap';
import { requirePermission, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { recordAudit, asRecord } from '@/lib/business';
import type { MaintenanceLog } from '@/lib/types';

const updateSchema = z.object({
  maintenance_type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'BREAKDOWN', 'INSPECTION', 'EMERGENCY', 'ROUTINE']).optional(),
  maintenance_date: z.string().optional(),
  performed_by: z.string().min(1).max(120).optional(),
  maintenance_reason: z.string().max(500).optional(),
  observations: z.string().max(2000).optional(),
  work_performed: z.string().max(2000).optional(),
  parts_replaced: z.string().max(500).optional(),
  test_results: z.string().max(2000).optional(),
  condition_before: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).optional(),
  condition_after: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).optional(),
  downtime_hours: z.number().min(0).max(10000).optional(),
  recommendations: z.string().max(2000).optional(),
  next_maintenance_date: z.string().nullable().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canEditMaintenance');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(id) as MaintenanceLog | undefined;
    if (!existing) return fail('Maintenance log not found', 404);

    const parsed = updateSchema.parse(await req.json());
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [field, value] of Object.entries(parsed)) {
      if (value !== undefined && (asRecord(existing) as Record<string, unknown>)[field] !== value) {
        updates.push(`${field} = ?`);
        values.push(value);
        recordAudit(user.id, 'UPDATE', 'maintenance_logs', id, field, (asRecord(existing) as Record<string, unknown>)[field], value);
      }
    }
    if (updates.length === 0) return ok(existing);
    updates.push(`updated_at = datetime('now')`);
    values.push(id);
    db.prepare(`UPDATE maintenance_logs SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    if (parsed.condition_after && parsed.condition_after !== existing.condition_after) {
      db.prepare('UPDATE equipment SET condition = ?, updated_at = datetime(\'now\') WHERE id = ?').run(parsed.condition_after, existing.equipment_id);
    }
    return ok(db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(id) as MaintenanceLog);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureInit();
    const user = await requirePermission('canDeleteMaintenance');
    const { id: idStr } = await params;
    const id = Number(idStr);
    const existing = db.prepare('SELECT equipment_id FROM maintenance_logs WHERE id = ?').get(id) as { equipment_id: number } | undefined;
    if (!existing) return fail('Maintenance log not found', 404);
    db.prepare('DELETE FROM maintenance_logs WHERE id = ?').run(id);
    recordAudit(user.id, 'DELETE', 'maintenance_logs', id, null, null, null);
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    return handleError(err);
  }
}