'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { criticalityTone, formatDate, label, daysFromToday } from '@/lib/labels';

interface ScheduleRow {
  id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_tag: string;
  substation_name: string;
  substation_code: string;
  maintenance_type: string;
  frequency: string;
  frequency_days: number;
  last_completed: string | null;
  next_due: string;
  responsible_person: string;
  priority: string;
  status: string;
  schedule_count?: number;
}

export default function SchedulePage() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const load = () => {
    fetch('/api/schedules').then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  };

  useEffect(() => { load(); }, []);

  const monthRows = rows.filter((r) => {
    const d = new Date(r.next_due);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
  });

  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Calendar grid
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const grid: Array<{ date: Date | null; events: ScheduleRow[] }> = [];
  for (let i = 0; i < startWeekday; i++) grid.push({ date: null, events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(month.getFullYear(), month.getMonth(), d);
    const events = rows.filter((r) => {
      const rd = new Date(r.next_due);
      return rd.getFullYear() === dt.getFullYear() && rd.getMonth() === dt.getMonth() && rd.getDate() === dt.getDate();
    });
    grid.push({ date: dt, events });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Planned maintenance across substations and equipment.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Maintenance calendar</CardTitle>
              <CardDescription>Click on a scheduled item to view equipment.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="rounded-md border px-3 py-1 text-sm font-medium">{monthLabel}</div>
              <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((g, idx) => {
              const isToday = g.date && g.date.getTime() === today.getTime();
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] rounded border p-1 text-left ${g.date ? 'bg-card' : 'bg-muted/30'} ${isToday ? 'border-primary ring-1 ring-primary/30' : ''}`}
                >
                  {g.date ? (
                    <>
                      <div className="text-[10px] font-semibold">{g.date.getDate()}</div>
                      <div className="mt-1 space-y-0.5">
                        {g.events.slice(0, 3).map((e) => {
                          const days = daysFromToday(e.next_due);
                          const state = days === null ? 'NOT_SCHEDULED' : days < 0 ? 'OVERDUE' : days === 0 ? 'DUE_TODAY' : days <= 30 ? 'DUE_SOON' : 'UPCOMING';
                          return (
                            <Link key={e.id} href={`/equipment/${e.equipment_id}`} className="block truncate rounded bg-primary/10 px-1 py-0.5 text-[9px] text-primary hover:bg-primary/20" title={`${e.equipment_tag} – ${label(e.maintenance_type)}`}>
                              {e.equipment_tag.split('-').slice(-1)[0]} {label(e.maintenance_type)}
                            </Link>
                          );
                        })}
                        {g.events.length > 3 ? <div className="text-[9px] text-muted-foreground">+{g.events.length - 3} more</div> : null}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Scheduled items – {monthLabel}</CardTitle>
          <CardDescription>{monthRows.length} item(s) due this month</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Next due</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Substation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthRows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No scheduled items this month.</TableCell></TableRow>
              ) : monthRows.sort((a, b) => a.next_due.localeCompare(b.next_due)).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{formatDate(r.next_due)}</TableCell>
                  <TableCell>
                    <Link href={`/equipment/${r.equipment_id}`} className="font-mono text-xs text-primary hover:underline">{r.equipment_tag}</Link>
                    <div className="text-[10px] text-muted-foreground">{r.equipment_name}</div>
                  </TableCell>
                  <TableCell className="text-xs">{r.substation_code}</TableCell>
                  <TableCell className="text-xs">{label(r.maintenance_type)}</TableCell>
                  <TableCell className="text-xs">{label(r.frequency)} ({r.frequency_days}d)</TableCell>
                  <TableCell><Badge className={criticalityTone(r.priority)}>{label(r.priority)}</Badge></TableCell>
                  <TableCell className="text-xs">{r.responsible_person || '—'}</TableCell>
                  <TableCell><Button asChild size="sm" variant="ghost"><Link href={`/equipment/${r.equipment_id}`}>Open</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}