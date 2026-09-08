'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, ArrowLeft, Cpu, Plus, Pencil, AlertTriangle, Calendar, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useSession } from '@/lib/session-context';
import { useApi } from '@/lib/use-api';
import {
  statusTone,
  conditionTone,
  criticalityTone,
  maintenanceTone,
  maintenanceStateTone,
  formatDate,
  label,
  daysFromToday,
} from '@/lib/labels';

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 12,
  padding: '6px 10px',
  color: 'var(--card-foreground)',
};

function BareTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
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

interface SubDetail {
  substation: {
    id: number;
    substation_name: string;
    substation_code: string;
    location: string;
    district: string;
    state: string;
    voltage_level: string;
    commissioning_date: string | null;
    description: string | null;
    status: string;
  };
  equipment: Array<{
    id: number;
    equipment_name: string;
    equipment_tag: string;
    equipment_type_name: string;
    condition: string;
    criticality: string;
    status: string;
    next_maintenance_date: string | null;
  }>;
  health: { score: number; total: number; healthy: number; warning: number; critical: number; overdue: number };
  maintenanceHistory: Array<{
    id: number;
    maintenance_date: string;
    equipment_name: string;
    equipment_tag: string;
    maintenance_type: string;
    status: string;
  }>;
}

export default function SubstationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { permissions } = useSession();
  const { request, loading } = useApi();
  const [data, setData] = useState<SubDetail | null>(null);

  useEffect(() => {
    request<SubDetail>(`/api/substations/${id}`).then((d) => {
      if (d) setData(d);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function remove() {
    if (!data) return;
    if (!confirm(`Delete substation "${data.substation.substation_name}"? This cannot be undone.`)) return;
    const r = await fetch(`/api/substations/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Failed to delete');
      return;
    }
    toast.success('Substation deleted');
    router.push('/substations');
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading substation…</div>;
  }

  const s = data.substation;
  const overdue = data.equipment.filter((e) => e.next_maintenance_date && daysFromToday(e.next_maintenance_date)! < 0);

  const conditionChart = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'].map((c) => ({
    name: c,
    value: data.equipment.filter((e) => e.condition === c).length,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm"><Link href="/substations"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link></Button>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">{s.substation_name}</h1>
            <Badge className={statusTone(s.status)}>{label(s.status)}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{s.substation_code}</span>
            <span>•</span>
            <span>{s.voltage_level || 'Voltage not specified'}</span>
            <span>•</span>
            <span>{[s.location, s.district, s.state].filter(Boolean).join(', ') || 'Location not specified'}</span>
            <span>•</span>
            <span>Commissioned {formatDate(s.commissioning_date)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canCreateEquipment ? (
            <Button asChild size="sm"><Link href={`/equipment/new?substation_id=${s.id}`}><Plus className="mr-1 h-3.5 w-3.5" />Add Equipment</Link></Button>
          ) : null}
          {permissions.canManageSubstations ? (
            <>
              <Button asChild size="sm" variant="outline"><Link href={`/substations/${s.id}/edit`}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Link></Button>
              <Button size="sm" variant="outline" onClick={remove} className="text-red-600 hover:text-red-700">Delete</Button>
            </>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Equipment" value={data.health.total} />
        <Stat label="Healthy" value={data.health.healthy} tone="emerald" />
        <Stat label="Warning" value={data.health.warning} tone="amber" />
        <Stat label="Critical" value={data.health.critical} tone="red" />
        <Stat label="Overdue" value={data.health.overdue} tone={data.health.overdue > 0 ? 'red' : 'slate'} />
      </section>

      <Tabs defaultValue="equipment">
        <TabsList>
          <TabsTrigger value="equipment">Equipment ({data.equipment.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-3">
          {data.equipment.length === 0 ? (
            <EmptyCard
              title="No equipment registered"
              description="Add the first equipment for this substation."
              action={permissions.canCreateEquipment ? <Button asChild size="sm"><Link href={`/equipment/new?substation_id=${s.id}`}><Plus className="mr-1 h-3.5 w-3.5" />Add Equipment</Link></Button> : null}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Criticality</TableHead>
                      <TableHead>Next Maint.</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.equipment.map((e) => {
                      const days = daysFromToday(e.next_maintenance_date);
                      const state = days === null ? 'NOT_SCHEDULED' : days < 0 ? 'OVERDUE' : days === 0 ? 'DUE_TODAY' : days <= 30 ? 'DUE_SOON' : 'UPCOMING';
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-xs">
                            <Link href={`/equipment/${e.id}`} className="text-primary hover:underline">{e.equipment_tag}</Link>
                          </TableCell>
                          <TableCell className="text-sm">{e.equipment_name}</TableCell>
                          <TableCell className="text-xs">{e.equipment_type_name}</TableCell>
                          <TableCell><Badge className={statusTone(e.status)}>{label(e.status)}</Badge></TableCell>
                          <TableCell><Badge className={conditionTone(e.condition)}>{label(e.condition)}</Badge></TableCell>
                          <TableCell><Badge className={criticalityTone(e.criticality)}>{label(e.criticality)}</Badge></TableCell>
                          <TableCell className="text-xs">
                            <Badge className={maintenanceStateTone(state)}>
                              {days === null ? 'Not scheduled' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`}
                            </Badge>
                          </TableCell>
                          <TableCell><Button asChild size="sm" variant="ghost"><Link href={`/equipment/${e.id}`}>Open</Link></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-3">
          {data.maintenanceHistory.length === 0 ? (
            <EmptyCard title="No maintenance recorded" description="Record the first maintenance entry for this substation." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.maintenanceHistory.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{formatDate(m.maintenance_date)}</TableCell>
                        <TableCell className="font-mono text-xs">{m.equipment_tag}</TableCell>
                        <TableCell className="text-xs">{label(m.maintenance_type)}</TableCell>
                        <TableCell><Badge className={maintenanceTone(m.status)}>{label(m.status)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Condition distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-60">
                <ResponsiveContainer>
                  <BarChart data={conditionChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<BareTooltip />} />
                    <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Health indicator</CardTitle>
                <CardDescription className="text-[10px]">Application-level metric derived from condition distribution.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums">{data.health.score}<span className="text-base text-muted-foreground"> / 100</span></div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${data.health.score >= 80 ? 'bg-emerald-500' : data.health.score >= 60 ? 'bg-blue-500' : data.health.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${data.health.score}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {s.description ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{s.description}</CardContent>
            </Card>
          ) : null}

          {overdue.length > 0 ? (
            <Card className="border-red-300/60 bg-red-50/30 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                  <ShieldAlert className="h-4 w-4" /> Overdue maintenance in this substation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs">
                  {overdue.map((e) => (
                    <li key={e.id}>
                      <Link href={`/equipment/${e.id}`} className="text-primary hover:underline">
                        {e.equipment_tag} – {e.equipment_name}
                      </Link>
                      {' '}({Math.abs(daysFromToday(e.next_maintenance_date) ?? 0)}d overdue)
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'red' | 'slate' }) {
  const colors = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    slate: 'text-slate-600',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${tone ? colors[tone] : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyCard({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Cpu className="h-8 w-8 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}