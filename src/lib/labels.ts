import type {
  EquipmentStatus,
  EquipmentCondition,
  Criticality,
  SubstationStatus,
  MaintenanceStatus,
  MaintenanceType,
  InspectionType,
} from './types';

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  UNDER_MAINTENANCE: 'Under Maintenance',
  DECOMMISSIONED: 'Decommissioned',
  OUT_OF_SERVICE: 'Out of Service',
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  CRITICAL: 'Critical',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  PREVENTIVE: 'Preventive',
  CORRECTIVE: 'Corrective',
  PREDICTIVE: 'Predictive',
  BREAKDOWN: 'Breakdown',
  INSPECTION: 'Inspection',
  EMERGENCY: 'Emergency',
  ROUTINE: 'Routine',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  PERIODIC: 'Periodic',
  PRE_MONSOON: 'Pre-Monsoon',
  POST_MONSOON: 'Post-Monsoon',
  SPECIAL: 'Special',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-Yearly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
  ADMIN: 'Admin',
  ENGINEER: 'Engineer',
  MAINTENANCE_STAFF: 'Maintenance Staff',
  VIEWER: 'Viewer',
  INFO: 'Info',
  WARNING: 'Warning',
  OVERDUE: 'Overdue',
  DUE_TODAY: 'Due Today',
  DUE_SOON: 'Due Soon',
  UPCOMING: 'Upcoming',
  NOT_SCHEDULED: 'Not Scheduled',
};

export function label(v: string): string {
  return STATUS_LABEL[v] ?? v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function conditionTone(c: EquipmentCondition | string) {
  switch (c) {
    case 'EXCELLENT':
    case 'GOOD':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 ring-emerald-600/30';
    case 'FAIR':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 ring-amber-600/30';
    case 'POOR':
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 ring-red-600/30';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-slate-500/30';
  }
}

export function statusTone(s: EquipmentStatus | SubstationStatus | string) {
  switch (s) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'UNDER_MAINTENANCE':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'OUT_OF_SERVICE':
    case 'INACTIVE':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'DECOMMISSIONED':
      return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function criticalityTone(c: Criticality | string) {
  switch (c) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
    case 'MEDIUM':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'LOW':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function maintenanceTone(s: MaintenanceStatus | string) {
  switch (s) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'PLANNED':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'CANCELLED':
      return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function maintenanceStateTone(state: string) {
  switch (state) {
    case 'OVERDUE':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'DUE_TODAY':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'DUE_SOON':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
    case 'UPCOMING':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function severityTone(s: 'INFO' | 'WARNING' | 'CRITICAL' | string) {
  switch (s) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'WARNING':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
  }
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

export function daysFromToday(d: string | null | undefined): number | null {
  if (!d) return null;
  const target = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function ageDays(d: string | null | undefined): number | null {
  return daysFromToday(d) !== null ? -daysFromToday(d)! : null;
}