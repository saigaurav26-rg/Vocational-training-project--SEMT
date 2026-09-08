'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Cpu, Search, ArrowUpDown, ShieldAlert, Calendar, Wrench } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useSession } from '@/lib/session-context';
import { useApi } from '@/lib/use-api';
import {
  statusTone,
  conditionTone,
  criticalityTone,
  maintenanceStateTone,
  formatDate,
  label,
  daysFromToday,
} from '@/lib/labels';

interface EqRow {
  id: number;
  equipment_tag: string;
  equipment_name: string;
  equipment_type_name: string;
  substation_name: string;
  substation_code: string;
  manufacturer: string;
  voltage_level: string;
  installation_date: string | null;
  status: string;
  condition: string;
  criticality: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_status: string;
}

interface TypeRow { id: number; name: string; }
interface SubRow { id: number; substation_name: string; substation_code: string; }

export default function EquipmentPage() {
  const { permissions } = useSession();
  const { request } = useApi();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<EqRow[]>([]);
  const [total, setTotal] = useState(0);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);

  const [search, setSearch] = useState('');
  const [subId, setSubId] = useState<string>(searchParams.get('substation_id') ?? '');
  const [typeId, setTypeId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [condition, setCondition] = useState<string>('');
  const [criticality, setCriticality] = useState<string>('');
  const [maint, setMaint] = useState<string>('');
  const [sortBy, setSortBy] = useState('next_maintenance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    request<{ rows: TypeRow[] }>('/api/equipment-types').then((d) => d && setTypes(d.rows));
    request<{ rows: SubRow[] }>('/api/substations?limit=100').then((d) => d && setSubs(d.rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (subId) params.set('substation_id', subId);
    if (typeId) params.set('equipment_type_id', typeId);
    if (status) params.set('status', status);
    if (condition) params.set('condition', condition);
    if (criticality) params.set('criticality', criticality);
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    request<{ rows: EqRow[]; total: number }>(`/api/equipment?${params.toString()}`).then((d) => {
      if (d) {
        let filtered = d.rows;
        if (maint) filtered = filtered.filter((r) => r.maintenance_status === maint);
        setRows(filtered);
        setTotal(d.total);
      }
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, subId, typeId, status, condition, criticality, sortBy, sortDir, limit, offset]);

  function clear() {
    setSearch('');
    setSubId('');
    setTypeId('');
    setStatus('');
    setCondition('');
    setCriticality('');
    setMaint('');
    setSortBy('next_maintenance');
    setSortDir('asc');
    setOffset(0);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment</h1>
          <p className="text-sm text-muted-foreground">Inventory of all registered substation equipment.</p>
        </div>
        {permissions.canCreateEquipment ? (
          <Button asChild><Link href="/equipment/new"><Plus className="mr-1 h-4 w-4" />Add Equipment</Link></Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-44 flex-1">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-7 text-xs"
                  placeholder="Tag, name, manufacturer…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                />
              </div>
            </div>
            <Filter label="Substation">
              <Select value={subId || 'all'} onValueChange={(v) => { setSubId(v === 'all' ? '' : v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All substations</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.substation_code} – {s.substation_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Type">
              <Select value={typeId || 'all'} onValueChange={(v) => { setTypeId(v === 'all' ? '' : v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Status">
              <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                  <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                  <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Condition">
              <Select value={condition || 'all'} onValueChange={(v) => { setCondition(v === 'all' ? '' : v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="EXCELLENT">Excellent</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="FAIR">Fair</SelectItem>
                  <SelectItem value="POOR">Poor</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Criticality">
              <Select value={criticality || 'all'} onValueChange={(v) => { setCriticality(v === 'all' ? '' : v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
            <Filter label="Maint. Status">
              <Select value={maint || 'all'} onValueChange={(v) => { setMaint(v === 'all' ? '' : v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="DUE_TODAY">Due Today</SelectItem>
                  <SelectItem value="DUE_SOON">Due Soon</SelectItem>
                  <SelectItem value="UPCOMING">Upcoming</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="NOT_SCHEDULED">Not Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
            <Button size="sm" variant="outline" onClick={clear}>Clear</Button>
          </div>
          <CardDescription className="mt-2">{total} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><button onClick={() => { setSortBy('tag'); setSortDir(sortBy === 'tag' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1">Tag <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                  <TableHead><button onClick={() => { setSortBy('name'); setSortDir(sortBy === 'name' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Substation</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead><button onClick={() => { setSortBy('installation_date'); setSortDir(sortBy === 'installation_date' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1">Installed <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                  <TableHead><button onClick={() => { setSortBy('condition'); setSortDir(sortBy === 'condition' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1">Condition <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                  <TableHead><button onClick={() => { setSortBy('criticality'); setSortDir(sortBy === 'criticality' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="flex items-center gap-1">Criticality <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                  <TableHead>Next Maint.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                      No equipment found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((e) => {
                    const days = daysFromToday(e.next_maintenance_date);
                    const state = e.maintenance_status as string;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">
                          <Link href={`/equipment/${e.id}`} className="text-primary hover:underline">{e.equipment_tag}</Link>
                        </TableCell>
                        <TableCell className="text-sm">{e.equipment_name}</TableCell>
                        <TableCell className="text-xs">{e.equipment_type_name}</TableCell>
                        <TableCell className="text-xs">{e.substation_code}</TableCell>
                        <TableCell className="text-xs">{e.manufacturer || '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(e.installation_date)}</TableCell>
                        <TableCell><Badge className={conditionTone(e.condition)}>{label(e.condition)}</Badge></TableCell>
                        <TableCell><Badge className={criticalityTone(e.criticality)}>{label(e.criticality)}</Badge></TableCell>
                        <TableCell>
                          <Badge className={maintenanceStateTone(state)}>
                            {days === null ? 'Not scheduled' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge className={statusTone(e.status)}>{label(e.status)}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button asChild size="sm" variant="ghost"><Link href={`/equipment/${e.id}`}>View</Link></Button>
                            {permissions.canCreateMaintenance ? (
                              <Button asChild size="sm" variant="ghost"><Link href={`/maintenance/new?equipment_id=${e.id}`} title="Record maintenance"><Wrench className="h-3.5 w-3.5" /></Link></Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <div>Page {Math.floor(offset / limit) + 1} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <select className="h-7 rounded border bg-background px-2 text-xs" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }}>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Previous</Button>
              <Button size="sm" variant="outline" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}