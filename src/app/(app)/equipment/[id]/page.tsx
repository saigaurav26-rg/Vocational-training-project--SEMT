'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Cpu, Pencil, Wrench, ClipboardCheck, Calendar, ShieldAlert, Trash2, ExternalLink, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useSession } from '@/lib/session-context';
import {
  statusTone, conditionTone, criticalityTone, maintenanceStateTone, maintenanceTone,
  formatDate, label, daysFromToday,
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

interface EquipmentDetail {
  equipment: {
    id: number;
    equipment_tag: string;
    equipment_name: string;
    equipment_type_id: number;
    equipment_type_name: string;
    equipment_type_category: string;
    substation_id: number;
    substation_name: string;
    substation_code: string;
    manufacturer: string;
    model_number: string;
    serial_number: string;
    installation_date: string | null;
    commissioning_date: string | null;
    location: string;
    bay: string;
    feeder: string;
    voltage_level: string;
    status: string;
    condition: string;
    criticality: string;
    description: string;
    last_maintenance_date: string | null;
    next_maintenance_date: string | null;
    maintenance_frequency_days: number;
    responsible_person: string;
  };
  ratings: Array<{ id: number; spec_key: string; spec_label: string; spec_value: string; unit: string }>;
  maintenance: Array<{
    id: number; maintenance_type: string; maintenance_date: string; performed_by: string;
    work_performed: string; observations: string; condition_before: string; condition_after: string;
    downtime_hours: number; recommendations: string; next_maintenance_date: string | null; status: string;
  }>;
  inspections: Array<{
    id: number; inspection_date: string; inspector: string; inspection_type: string; condition: string;
    observations: string; abnormalities: string; measurements: string; recommendations: string;
    next_action: string; follow_up_date: string | null;
  }>;
  maintenance_status: string;
}

const COND_VALUE: Record<string, number> = { EXCELLENT: 5, GOOD: 4, FAIR: 3, POOR: 2, CRITICAL: 1 };

export default function EquipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { permissions } = useSession();
  const [data, setData] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmInspect, setConfirmInspect] = useState(false);
  const [inspForm, setInspForm] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_type: 'ROUTINE',
    condition: 'GOOD',
    observations: '',
    abnormalities: '',
    measurements: '',
    recommendations: '',
    next_action: '',
    follow_up_date: '',
  });

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/equipment/${id}`);
    if (!r.ok) {
      toast.error('Failed to load equipment');
      setLoading(false);
      return;
    }
    const d = await r.json();
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function remove() {
    const r = await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Delete failed');
      return;
    }
    toast.success('Equipment deleted');
    router.push('/equipment');
  }

  async function submitInspection() {
    if (!data) return;
    const r = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...inspForm, equipment_id: data.equipment.id, inspector: data.equipment.responsible_person || 'Engineer', follow_up_date: inspForm.follow_up_date || null }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Failed to record inspection');
      return;
    }
    toast.success('Inspection recorded');
    setConfirmInspect(false);
    setInspForm({
      inspection_date: new Date().toISOString().split('T')[0],
      inspection_type: 'ROUTINE',
      condition: 'GOOD',
      observations: '',
      abnormalities: '',
      measurements: '',
      recommendations: '',
      next_action: '',
      follow_up_date: '',
    });
    load();
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading equipment…</div>;
  }

  const e = data.equipment;
  const days = daysFromToday(e.next_maintenance_date);
  const state = data.maintenance_status;

  const conditionTrend = [
    ...data.maintenance.map((m) => ({ date: m.maintenance_date, score: COND_VALUE[m.condition_after], type: 'maintenance' as const })),
    ...data.inspections.map((i) => ({ date: i.inspection_date, score: COND_VALUE[i.condition], type: 'inspection' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm"><Link href="/equipment"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link></Button>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">{e.equipment_name}</h1>
            <span className="font-mono text-xs text-muted-foreground">{e.equipment_tag}</span>
            <Badge className={statusTone(e.status)}>{label(e.status)}</Badge>
            <Badge className={conditionTone(e.condition)}>{label(e.condition)}</Badge>
            <Badge className={criticalityTone(e.criticality)}>{label(e.criticality)}</Badge>
            <Badge className={maintenanceStateTone(state)}>
              {days === null ? 'Not scheduled' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `Due in ${days}d`}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{e.equipment_type_name}</span>
            <span>•</span>
            <Link href={`/substations/${e.substation_id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Building2 className="h-3 w-3" />{e.substation_code} – {e.substation_name}
            </Link>
            <span>•</span>
            <span>{e.voltage_level || 'Voltage not specified'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canCreateInspection ? (
            <Button size="sm" variant="outline" onClick={() => setConfirmInspect(true)}>
              <ClipboardCheck className="mr-1 h-3.5 w-3.5" />Quick Inspection
            </Button>
          ) : null}
          {permissions.canCreateMaintenance ? (
            <Button asChild size="sm"><Link href={`/maintenance/new?equipment_id=${e.id}`}><Wrench className="mr-1 h-3.5 w-3.5" />Record Maintenance</Link></Button>
          ) : null}
          {permissions.canEditEquipment ? (
            <Button asChild size="sm" variant="outline"><Link href={`/equipment/${e.id}/edit`}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Link></Button>
          ) : null}
          {permissions.canDeleteEquipment ? (
            <Button size="sm" variant="outline" className="text-red-600" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({data.maintenance.length})</TabsTrigger>
          <TabsTrigger value="inspections">Inspections ({data.inspections.length})</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">General information</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-1 text-xs">
                  <Row label="Manufacturer" value={e.manufacturer || '—'} />
                  <Row label="Model" value={e.model_number || '—'} />
                  <Row label="Serial number" value={e.serial_number || '—'} />
                  <Row label="Installation" value={formatDate(e.installation_date)} />
                  <Row label="Commissioning" value={formatDate(e.commissioning_date)} />
                  <Row label="Location" value={e.location || '—'} />
                  <Row label="Bay" value={e.bay || '—'} />
                  <Row label="Feeder" value={e.feeder || '—'} />
                  <Row label="Responsible" value={e.responsible_person || '—'} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Maintenance status</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-1 text-xs">
                  <Row label="Last maintenance" value={formatDate(e.last_maintenance_date)} />
                  <Row label="Next maintenance" value={formatDate(e.next_maintenance_date)} />
                  <Row label="Frequency (days)" value={String(e.maintenance_frequency_days)} />
                  <Row label="Current condition" value={label(e.condition)} />
                  <Row label="Criticality" value={label(e.criticality)} />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {e.description ? e.description : <span className="italic">No description provided.</span>}
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Maintenance timeline</CardTitle></CardHeader>
              <CardContent>
                {data.maintenance.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No maintenance records yet.</div>
                ) : (
                  <Timeline events={data.maintenance.map((m) => ({
                    date: m.maintenance_date,
                    title: label(m.maintenance_type),
                    subtitle: m.work_performed || m.observations || 'No details recorded',
                    tag: m.condition_after,
                  }))} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Inspection history</CardTitle></CardHeader>
              <CardContent>
                {data.inspections.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No inspections recorded yet.</div>
                ) : (
                  <Timeline events={data.inspections.map((i) => ({
                    date: i.inspection_date,
                    title: label(i.inspection_type),
                    subtitle: i.observations || i.abnormalities || 'No observations',
                    tag: i.condition,
                  }))} />
                )}
              </CardContent>
            </Card>
          </section>

          {conditionTrend.length >= 2 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Condition trend</CardTitle>
                <CardDescription className="text-[10px]">Higher value indicates better condition.</CardDescription>
              </CardHeader>
              <CardContent className="h-60">
                <ResponsiveContainer>
                  <LineChart data={conditionTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 6]} ticks={[1, 2, 3, 4, 5]} />
                    <Tooltip content={<BareTooltip />} />
                    <Line dataKey="score" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="specifications">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Technical specifications</CardTitle>
              <CardDescription className="text-[10px]">Different equipment types have different specification fields.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.ratings.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">No specifications recorded.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ratings.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.spec_label}</TableCell>
                        <TableCell className="font-mono text-xs">{r.spec_value || 'Not specified'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.unit || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Performed by</TableHead>
                    <TableHead>Work performed</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.maintenance.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No maintenance history.</TableCell></TableRow>
                  ) : data.maintenance.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{formatDate(m.maintenance_date)}</TableCell>
                      <TableCell className="text-xs">{label(m.maintenance_type)}</TableCell>
                      <TableCell className="text-xs">{m.performed_by}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={m.work_performed}>{m.work_performed || m.observations || '—'}</TableCell>
                      <TableCell>
                        <Badge className={conditionTone(m.condition_after)}>{label(m.condition_after)}</Badge>
                      </TableCell>
                      <TableCell><Badge className={maintenanceTone(m.status)}>{label(m.status)}</Badge></TableCell>
                      <TableCell><Button asChild size="sm" variant="ghost"><Link href={`/maintenance/${m.id}`}>View</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Observations</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.inspections.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No inspection history.</TableCell></TableRow>
                  ) : data.inspections.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs">{formatDate(i.inspection_date)}</TableCell>
                      <TableCell className="text-xs">{label(i.inspection_type)}</TableCell>
                      <TableCell className="text-xs">{i.inspector}</TableCell>
                      <TableCell><Badge className={conditionTone(i.condition)}>{label(i.condition)}</Badge></TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={i.observations}>{i.observations || i.abnormalities || '—'}</TableCell>
                      <TableCell><Button asChild size="sm" variant="ghost"><Link href={`/inspections/${i.id}`}>View</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle">
          <Card>
            <CardContent>
              <Lifecycle eq={e} maintenance={data.maintenance} inspections={data.inspections} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete equipment</DialogTitle>
            <DialogDescription>
              This permanently removes the equipment record along with all maintenance and inspection history.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmInspect} onOpenChange={setConfirmInspect}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick inspection</DialogTitle>
            <DialogDescription>Record an inspection for {e.equipment_tag}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label className="text-xs">Date</Label><Input type="date" value={inspForm.inspection_date} onChange={(e) => setInspForm({ ...inspForm, inspection_date: e.target.value })} /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={inspForm.inspection_type} onValueChange={(v) => setInspForm({ ...inspForm, inspection_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="PERIODIC">Periodic</SelectItem>
                  <SelectItem value="PRE_MONSOON">Pre-Monsoon</SelectItem>
                  <SelectItem value="POST_MONSOON">Post-Monsoon</SelectItem>
                  <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                  <SelectItem value="SPECIAL">Special</SelectItem>
                  <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Condition</Label>
              <Select value={inspForm.condition} onValueChange={(v) => setInspForm({ ...inspForm, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXCELLENT">Excellent</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="FAIR">Fair</SelectItem>
                  <SelectItem value="POOR">Poor</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Follow-up date</Label><Input type="date" value={inspForm.follow_up_date} onChange={(e) => setInspForm({ ...inspForm, follow_up_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Observations</Label><Input value={inspForm.observations} onChange={(e) => setInspForm({ ...inspForm, observations: e.target.value })} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Abnormalities</Label><Input value={inspForm.abnormalities} onChange={(e) => setInspForm({ ...inspForm, abnormalities: e.target.value })} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Measurements</Label><Input value={inspForm.measurements} onChange={(e) => setInspForm({ ...inspForm, measurements: e.target.value })} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Recommendations</Label><Input value={inspForm.recommendations} onChange={(e) => setInspForm({ ...inspForm, recommendations: e.target.value })} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Next action</Label><Input value={inspForm.next_action} onChange={(e) => setInspForm({ ...inspForm, next_action: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmInspect(false)}>Cancel</Button>
            <Button onClick={submitInspection}>Save inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed py-1 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Timeline({ events }: { events: Array<{ date: string; title: string; subtitle: string; tag: string }> }) {
  return (
    <ol className="relative space-y-3 border-l pl-4">
      {events.map((ev, idx) => (
        <li key={idx} className="relative">
          <div className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="text-[10px] text-muted-foreground">{formatDate(ev.date)}</div>
          <div className="text-sm font-medium">{ev.title}</div>
          <div className="text-xs text-muted-foreground">{ev.subtitle}</div>
          <Badge className={conditionTone(ev.tag)}>{label(ev.tag)}</Badge>
        </li>
      ))}
    </ol>
  );
}

function Lifecycle({ eq, maintenance, inspections }: { eq: EquipmentDetail['equipment']; maintenance: EquipmentDetail['maintenance']; inspections: EquipmentDetail['inspections'] }) {
  const events: Array<{ date: string; title: string; detail: string }> = [];
  if (eq.installation_date) events.push({ date: eq.installation_date, title: 'Installed', detail: eq.location || 'Field installation' });
  if (eq.commissioning_date) events.push({ date: eq.commissioning_date, title: 'Commissioned', detail: eq.substation_name });
  maintenance.forEach((m) => events.push({ date: m.maintenance_date, title: `Maintenance: ${label(m.maintenance_type)}`, detail: `Performed by ${m.performed_by}` }));
  inspections.forEach((i) => events.push({ date: i.inspection_date, title: `Inspection: ${label(i.inspection_type)}`, detail: i.inspector }));
  events.sort((a, b) => a.date.localeCompare(b.date));

  if (events.length === 0) {
    return <div className="py-6 text-center text-xs text-muted-foreground">No lifecycle events recorded yet.</div>;
  }

  return (
    <ol className="relative space-y-3 border-l pl-4">
      {events.map((ev, idx) => (
        <li key={idx} className="relative">
          <div className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="text-[10px] text-muted-foreground">{formatDate(ev.date)}</div>
          <div className="text-sm font-medium">{ev.title}</div>
          <div className="text-xs text-muted-foreground">{ev.detail}</div>
        </li>
      ))}
    </ol>
  );
}