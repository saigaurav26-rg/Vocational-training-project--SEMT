'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, ShieldAlert, Clock, Calendar, Wrench } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { conditionTone, criticalityTone, formatDate, label, daysFromToday } from '@/lib/labels';

interface Eq {
  id: number;
  equipment_tag: string;
  equipment_name: string;
  substation_name: string;
  substation_id: number;
  next_maintenance_date: string | null;
  last_maintenance_date: string | null;
  condition: string;
  criticality: string;
  status: string;
}

export default function WorkQueuePage() {
  const { permissions } = useSession();
  const [rows, setRows] = useState<Eq[]>([]);

  useEffect(() => {
    fetch('/api/equipment?limit=200').then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }, []);

  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(week.getDate() + 7);
    const overdue: Eq[] = [];
    const dueToday: Eq[] = [];
    const dueWeek: Eq[] = [];
    const upcoming: Eq[] = [];
    const unscheduled: Eq[] = [];
    rows.forEach((e) => {
      if (!e.next_maintenance_date) { unscheduled.push(e); return; }
      const days = daysFromToday(e.next_maintenance_date);
      if (days === null) { unscheduled.push(e); return; }
      if (days < 0) overdue.push(e);
      else if (days === 0) dueToday.push(e);
      else if (days <= 7) dueWeek.push(e);
      else upcoming.push(e);
    });
    return { overdue, dueToday, dueWeek, upcoming, unscheduled };
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Queue</h1>
          <p className="text-sm text-muted-foreground">Prioritised maintenance workload grouped by urgency.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="Overdue" count={groups.overdue.length} icon={ShieldAlert} tone="red" />
        <Tile label="Due Today" count={groups.dueToday.length} icon={Bell} tone="amber" />
        <Tile label="This Week" count={groups.dueWeek.length} icon={Clock} tone="orange" />
        <Tile label="Upcoming" count={groups.upcoming.length} icon={Calendar} tone="blue" />
        <Tile label="Unscheduled" count={groups.unscheduled.length} icon={Wrench} tone="slate" />
      </div>

      <Section title="Overdue maintenance" rows={groups.overdue} emptyText="No overdue maintenance – well done." accent="red" permissions={permissions} />
      <Section title="Due today" rows={groups.dueToday} emptyText="Nothing due today." accent="amber" permissions={permissions} />
      <Section title="Due this week" rows={groups.dueWeek} emptyText="Nothing due in the next 7 days." accent="orange" permissions={permissions} />
      <Section title="Upcoming" rows={groups.upcoming} emptyText="No upcoming maintenance scheduled." accent="blue" permissions={permissions} />
      <Section title="Unscheduled" rows={groups.unscheduled} emptyText="All equipment has a scheduled maintenance date." accent="slate" permissions={permissions} />
    </div>
  );
}

function Tile({ label, count, icon: Icon, tone }: { label: string; count: number; icon: React.ComponentType<{ className?: string }>; tone: 'red' | 'amber' | 'orange' | 'blue' | 'slate' }) {
  const colors = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-300/50',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border-amber-300/50',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 border-orange-300/50',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-300/50',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300/50',
  };
  return (
    <Card className={colors[tone]}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
          <div className="text-2xl font-semibold">{count}</div>
        </div>
        <Icon className="h-5 w-5 opacity-70" />
      </CardContent>
    </Card>
  );
}

function Section({ title, rows, emptyText, accent, permissions }: { title: string; rows: Eq[]; emptyText: string; accent: 'red' | 'amber' | 'orange' | 'blue' | 'slate'; permissions: ReturnType<typeof useSession>['permissions'] }) {
  const accents = {
    red: 'text-red-700 dark:text-red-300',
    amber: 'text-amber-700 dark:text-amber-300',
    orange: 'text-orange-700 dark:text-orange-300',
    blue: 'text-blue-700 dark:text-blue-300',
    slate: 'text-slate-700 dark:text-slate-300',
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm ${accents[accent]}`}>{title}</CardTitle>
        <CardDescription>{rows.length} item(s)</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded border border-dashed py-6 text-center text-xs text-muted-foreground">{emptyText}</div>
        ) : (
          <ul className="divide-y">
            {rows.map((e) => {
              const days = daysFromToday(e.next_maintenance_date);
              return (
                <li key={e.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex-1">
                    <Link href={`/equipment/${e.id}`} className="font-mono text-primary hover:underline">{e.equipment_tag}</Link>
                    <span className="ml-2 text-sm">{e.equipment_name}</span>
                    <span className="ml-2 text-muted-foreground">• {e.substation_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={criticalityTone(e.criticality)}>{label(e.criticality)}</Badge>
                    <Badge className={conditionTone(e.condition)}>{label(e.condition)}</Badge>
                    <span className="text-muted-foreground">
                      {days === null ? 'Not scheduled' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`}
                    </span>
                    {permissions.canCreateMaintenance ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/maintenance/new?equipment_id=${e.id}`}>Record</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}