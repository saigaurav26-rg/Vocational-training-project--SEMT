'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Cpu,
  AlertTriangle,
  Activity,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Wrench,
  ClipboardCheck,
  BarChart3,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Cell, Tooltip, Legend } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSession } from '@/lib/session-context';
import {
  conditionTone,
  criticalityTone,
  maintenanceStateTone,
  formatDate,
  label,
  daysFromToday,
} from '@/lib/labels';

interface AnalyticsData {
  totals: {
    totalEquipment: number;
    activeEquipment: number;
    underMaintenance: number;
    outOfService: number;
    criticalEquipment: number;
    totalSubstations: number;
    overdueCount: number;
    dueThisWeekCount: number;
    dueTodayCount: number;
    totalMaintenance: number;
    completedMaintenance: number;
    preventiveMaint: number;
    correctiveMaint: number;
    breakdownMaint: number;
    totalInspections: number;
  };
  conditionDist: Array<{ condition: string; c: number }>;
  typeDist: Array<{ type: string; c: number }>;
  substationDist: Array<{ substation_name: string; substation_code: string; c: number }>;
  monthlyMaint: Array<{ month: string; c: number; maintenance_type: string }>;
  maintByType: Array<{ maintenance_type: string; c: number }>;
  health: { score: number; total: number; healthy: number; warning: number; critical: number; overdue: number };
  substationHealth: Array<{ id: number; substation_name: string; substation_code: string; health: { score: number; total: number; healthy: number; warning: number; critical: number; overdue: number } }>;
}

interface OverdueRow {
  id: number;
  equipment_tag: string;
  equipment_name: string;
  substation_name: string;
  next_maintenance_date: string;
  criticality: string;
  condition: string;
}

const CONDITION_COLOR: Record<string, string> = {
  EXCELLENT: 'var(--chart-2)',
  GOOD: 'var(--chart-1)',
  FAIR: 'var(--chart-3)',
  POOR: 'var(--chart-4)',
  CRITICAL: 'var(--chart-4)',
};

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 12,
  padding: '6px 10px',
  color: 'var(--card-foreground)',
};

function BareTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      {label ? <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div> : null}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name ?? 'value'}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { permissions } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [overdue, setOverdue] = useState<OverdueRow[]>([]);
  const [upcoming, setUpcoming] = useState<OverdueRow[]>([]);
  const [activity, setActivity] = useState<Array<{ id: number; action: string; entity: string; entity_id: number | null; field: string | null; created_at: string; user_name: string | null }>>([]);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/analytics');
      if (r.ok) {
        const d = await r.json();
        setData(d);
      }
      const eq = await fetch('/api/equipment?status=ACTIVE&sort_by=next_maintenance&limit=10');
      if (eq.ok) {
        const eData = await eq.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const todayIso = today.toISOString().split('T')[0];
        const weekIso = weekFromNow.toISOString().split('T')[0];
        const over = (eData.rows as Array<OverdueRow & { next_maintenance_date: string }>).filter(
          (e) => e.next_maintenance_date && e.next_maintenance_date < todayIso
        );
        const up = (eData.rows as Array<OverdueRow & { next_maintenance_date: string }>).filter(
          (e) => e.next_maintenance_date && e.next_maintenance_date >= todayIso && e.next_maintenance_date <= weekIso
        );
        setOverdue(over);
        setUpcoming(up);
      }
      const audit = await fetch('/api/audit?limit=8');
      if (audit.ok) {
        const a = await audit.json();
        setActivity(a.rows);
      }
    })();
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  const t = data.totals;
  const completionRate = t.totalMaintenance > 0 ? Math.round((t.completedMaintenance / t.totalMaintenance) * 100) : 0;
  const preventivePct = t.totalMaintenance > 0 ? Math.round((t.preventiveMaint / t.totalMaintenance) * 100) : 0;
  const correctivePct = t.totalMaintenance > 0 ? Math.round((t.correctiveMaint / t.totalMaintenance) * 100) : 0;

  const monthlyByMonth = new Map<string, number>();
  data.monthlyMaint.forEach((m) => {
    monthlyByMonth.set(m.month, (monthlyByMonth.get(m.month) ?? 0) + m.c);
  });
  const monthlyChart = Array.from(monthlyByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  const maintTypeChart = data.maintByType.map((m) => ({ type: label(m.maintenance_type), value: m.c, raw: m.maintenance_type }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of substation equipment, maintenance status and operational health.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canManageSubstations ? (
            <Button asChild size="sm"><Link href="/substations/new"><Building2 className="mr-1 h-3.5 w-3.5" />Add Substation</Link></Button>
          ) : null}
          {permissions.canCreateEquipment ? (
            <Button asChild size="sm" variant="outline"><Link href="/equipment/new"><Cpu className="mr-1 h-3.5 w-3.5" />Add Equipment</Link></Button>
          ) : null}
          {permissions.canCreateMaintenance ? (
            <Button asChild size="sm" variant="outline"><Link href="/maintenance/new"><Wrench className="mr-1 h-3.5 w-3.5" />Record Maintenance</Link></Button>
          ) : null}
          {permissions.canCreateInspection ? (
            <Button asChild size="sm" variant="outline"><Link href="/inspections/new"><ClipboardCheck className="mr-1 h-3.5 w-3.5" />Record Inspection</Link></Button>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Building2} label="Substations" value={t.totalSubstations} accent="navy" />
        <KpiCard icon={Cpu} label="Equipment" value={t.totalEquipment} sub={`${t.activeEquipment} active`} accent="steel" />
        <KpiCard icon={ShieldAlert} label="Critical Equipment" value={t.criticalEquipment} accent={t.criticalEquipment > 0 ? 'red' : 'navy'} />
        <KpiCard icon={Activity} label="Under Maintenance" value={t.underMaintenance} accent="amber" />
        <KpiCard icon={AlertTriangle} label="Overdue Maintenance" value={t.overdueCount} accent={t.overdueCount > 0 ? 'red' : 'navy'} />
        <KpiCard icon={Clock} label="Due This Week" value={t.dueThisWeekCount} accent={t.dueThisWeekCount > 0 ? 'amber' : 'navy'} />
        <KpiCard icon={CheckCircle2} label="Completion Rate" value={`${completionRate}%`} sub={`${t.completedMaintenance}/${t.totalMaintenance} records`} accent="green" />
        <KpiCard icon={BarChart3} label="Inspections Logged" value={t.totalInspections} accent="steel" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Application Maintenance Health Indicator</CardTitle>
            <CardDescription className="text-[10px]">
              Application-level metric derived from equipment condition distribution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HealthGauge score={data.health.score} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between rounded bg-emerald-50 px-2 py-1 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <span>Healthy</span><span className="font-semibold">{data.health.healthy}</span>
              </div>
              <div className="flex items-center justify-between rounded bg-amber-50 px-2 py-1 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <span>Warning</span><span className="font-semibold">{data.health.warning}</span>
              </div>
              <div className="flex items-center justify-between rounded bg-red-50 px-2 py-1 text-red-800 dark:bg-red-950/30 dark:text-red-200">
                <span>Critical</span><span className="font-semibold">{data.health.critical}</span>
              </div>
              <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                <span>Overdue</span><span className="font-semibold">{data.health.overdue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Equipment by Condition</CardTitle>
          </CardHeader>
          <CardContent className="h-60">
            {data.conditionDist.every((d) => d.c === 0) ? (
              <EmptyChart label="No equipment data yet." />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.conditionDist} dataKey="c" nameKey="condition" innerRadius={50} outerRadius={80}>
                    {data.conditionDist.map((d) => (
                      <Cell key={d.condition} fill={CONDITION_COLOR[d.condition] ?? 'var(--chart-1)'} />
                    ))}
                  </Pie>
                  <Tooltip content={<BareTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Maintenance by Type</CardTitle>
          </CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer>
              <BarChart data={maintTypeChart} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<BareTooltip />} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Maintenance Activity</CardTitle>
            <CardDescription className="text-[10px]">Live count from maintenance log records</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {monthlyChart.length === 0 ? (
              <EmptyChart label="Not enough data to calculate this trend yet." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<BareTooltip />} />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Equipment by Type</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data.typeDist.every((t) => t.c === 0) ? (
              <EmptyChart label="No equipment registered yet." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data.typeDist.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip content={<BareTooltip />} />
                  <Bar dataKey="c" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Overdue Maintenance</CardTitle>
              <Button asChild size="sm" variant="ghost"><Link href="/work-queue">View all</Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <EmptyState label="No overdue maintenance." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Substation</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.slice(0, 6).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link href={`/equipment/${e.id}`} className="font-mono text-xs text-primary hover:underline">
                          {e.equipment_tag}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{e.substation_name}</TableCell>
                      <TableCell>
                        <Badge className={criticalityTone(e.criticality)}>{label(e.criticality)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge className={maintenanceStateTone('OVERDUE')}>
                          {Math.abs(daysFromToday(e.next_maintenance_date) ?? 0)}d overdue
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Upcoming Maintenance (7 days)</CardTitle>
              <Button asChild size="sm" variant="ghost"><Link href="/schedule">View schedule</Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState label="Nothing due in the next 7 days." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Substation</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.slice(0, 6).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link href={`/equipment/${e.id}`} className="font-mono text-xs text-primary hover:underline">
                          {e.equipment_tag}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{e.substation_name}</TableCell>
                      <TableCell>
                        <Badge className={conditionTone(e.condition)}>{label(e.condition)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {daysFromToday(e.next_maintenance_date) === 0 ? (
                          <Badge className={maintenanceStateTone('DUE_TODAY')}>Today</Badge>
                        ) : (
                          <span>{formatDate(e.next_maintenance_date)} ({daysFromToday(e.next_maintenance_date)}d)</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Substation Health Overview</CardTitle>
              <Button asChild size="sm" variant="ghost"><Link href="/substations">All substations</Link></Button>
            </div>
            <CardDescription className="text-[10px]">Computed from condition distribution and overdue maintenance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Substation</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Healthy</TableHead>
                  <TableHead>Warning</TableHead>
                  <TableHead>Critical</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.substationHealth ?? []).slice(0, 8).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/substations/${s.id}`} className="text-sm font-medium text-primary hover:underline">
                        {s.substation_name}
                      </Link>
                      <div className="font-mono text-[10px] text-muted-foreground">{s.substation_code}</div>
                    </TableCell>
                    <TableCell className="text-xs">{s.health.total}</TableCell>
                    <TableCell className="text-xs text-emerald-600">{s.health.healthy}</TableCell>
                    <TableCell className="text-xs text-amber-600">{s.health.warning}</TableCell>
                    <TableCell className="text-xs text-red-600">{s.health.critical}</TableCell>
                    <TableCell className="text-xs">{s.health.overdue}</TableCell>
                    <TableCell>
                      <HealthBadge score={s.health.score} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Maintenance Mix</CardTitle>
            <CardDescription className="text-[10px]">Preventive vs corrective</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MixBar label="Preventive" pct={preventivePct} color="var(--chart-2)" />
            <MixBar label="Corrective" pct={correctivePct} color="var(--chart-4)" />
            <MixBar label="Other" pct={Math.max(0, 100 - preventivePct - correctivePct)} color="var(--chart-1)" />
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <Stat label="Total records" value={t.totalMaintenance} />
              <Stat label="Open tasks" value={t.totalMaintenance - t.completedMaintenance} />
              <Stat label="Breakdowns" value={t.breakdownMaint} />
              <Stat label="Inspections" value={t.totalInspections} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              {permissions.canManageUsers ? (
                <Button asChild size="sm" variant="ghost"><Link href="/admin/audit"><FileText className="mr-1 h-3.5 w-3.5" />Audit log</Link></Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState label="No activity recorded yet." />
            ) : (
              <ul className="space-y-2">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-xs">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <div>
                        <span className="font-medium">{a.user_name ?? 'System'}</span>
                        <span className="text-muted-foreground"> · {a.action.toLowerCase()} </span>
                        <span className="font-mono">{a.entity}</span>
                        {a.entity_id ? <span className="text-muted-foreground"> #{a.entity_id}</span> : null}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(a.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Equipment by Substation</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data.substationDist.every((s) => s.c === 0) ? (
              <EmptyChart label="No equipment registered yet." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data.substationDist}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="substation_code" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<BareTooltip />} />
                  <Bar dataKey="c" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; sub?: string; accent: 'navy' | 'steel' | 'red' | 'amber' | 'green' }) {
  const accents: Record<string, string> = {
    navy: 'kpi-gradient-navy text-primary-foreground',
    steel: 'kpi-gradient-steel text-white',
    red: 'bg-red-600 text-white',
    amber: 'bg-amber-500 text-amber-950',
    green: 'bg-emerald-600 text-white',
  };
  return (
    <Card className={`${accents[accent]} border-0`}>
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
          <div className="mt-1 text-2xl font-semibold leading-tight">{value}</div>
          {sub ? <div className="text-[10px] opacity-80">{sub}</div> : null}
        </div>
        <Icon className="h-5 w-5 opacity-70" />
      </CardContent>
    </Card>
  );
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div className="text-3xl font-semibold tabular-nums">{score}</div>
        <div className="text-[10px] text-muted-foreground">/ 100</div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function HealthBadge({ score }: { score: number }) {
  const tone =
    score >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
      : score >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
        : score >= 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
  return <Badge className={tone}>{score}</Badge>;
}

function MixBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center text-sm text-muted-foreground">{label}</div>
    </div>
  );
}