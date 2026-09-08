'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wrench, Search, ArrowUpDown, Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useSession } from '@/lib/session-context';
import { useApi } from '@/lib/use-api';
import { conditionTone, maintenanceTone, label, formatDate } from '@/lib/labels';

interface MaintRow {
  id: number;
  equipment_name: string;
  equipment_tag: string;
  equipment_type_name: string;
  substation_name: string;
  substation_code: string;
  maintenance_type: string;
  maintenance_date: string;
  performed_by: string;
  work_performed: string;
  condition_after: string;
  status: string;
  downtime_hours: number;
}

export default function MaintenancePage() {
  const { permissions } = useSession();
  const { request } = useApi();
  const [rows, setRows] = useState<MaintRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    request<{ rows: MaintRow[]; total: number }>(`/api/maintenance?${params.toString()}`).then((d) => {
      if (d) { setRows(d.rows); setTotal(d.total); }
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, status, limit, offset]);

  function exportCsv() {
    const header = ['Date', 'Tag', 'Equipment', 'Type', 'Performed By', 'Condition After', 'Status', 'Downtime (h)'];
    const csv = [header.join(',')];
    rows.forEach((r) => {
      csv.push([
        r.maintenance_date,
        r.equipment_tag,
        `"${r.equipment_name.replace(/"/g, '""')}"`,
        r.maintenance_type,
        `"${r.performed_by.replace(/"/g, '""')}"`,
        r.condition_after,
        r.status,
        String(r.downtime_hours ?? 0),
      ].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Complete maintenance history and activity log.</p>
        </div>
        <div className="flex gap-2">
          {permissions.canExportData ? (
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-3.5 w-3.5" />Export CSV</Button>
          ) : null}
          {permissions.canCreateMaintenance ? (
            <Button asChild size="sm"><Link href="/maintenance/new"><Plus className="mr-1 h-3.5 w-3.5" />Record Maintenance</Link></Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-44 flex-1">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-8 pl-7 text-xs" placeholder="Equipment, work performed…" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={type || 'all'} onValueChange={(v) => { setType(v === 'all' ? '' : v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                  <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                  <SelectItem value="PREDICTIVE">Predictive</SelectItem>
                  <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                  <SelectItem value="INSPECTION">Inspection</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setOffset(0); }}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription className="mt-2">{total} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><button onClick={() => setSortBy('date')} className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Substation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Performed by</TableHead>
                  <TableHead>Condition after</TableHead>
                  <TableHead>Downtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No maintenance records.</TableCell></TableRow>
                ) : rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{formatDate(m.maintenance_date)}</TableCell>
                    <TableCell>
                      <Link href={`/equipment/${m.id}`} className="font-mono text-xs text-primary hover:underline">{m.equipment_tag}</Link>
                      <div className="text-[10px] text-muted-foreground">{m.equipment_name}</div>
                    </TableCell>
                    <TableCell className="text-xs">{m.substation_code}</TableCell>
                    <TableCell className="text-xs">{label(m.maintenance_type)}</TableCell>
                    <TableCell className="text-xs">{m.performed_by}</TableCell>
                    <TableCell><Badge className={conditionTone(m.condition_after)}>{label(m.condition_after)}</Badge></TableCell>
                    <TableCell className="text-xs">{m.downtime_hours} h</TableCell>
                    <TableCell><Badge className={maintenanceTone(m.status)}>{label(m.status)}</Badge></TableCell>
                    <TableCell><Button asChild size="sm" variant="ghost"><Link href={`/maintenance/${m.id}`}>View</Link></Button></TableCell>
                  </TableRow>
                ))}
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