'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ClipboardCheck, Search, Download } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { useApi } from '@/lib/use-api';
import { conditionTone, formatDate } from '@/lib/labels';
import { Label } from '@/components/ui/label';

interface InspRow {
  id: number;
  equipment_name: string;
  equipment_tag: string;
  substation_name: string;
  inspection_type: string;
  inspection_date: string;
  inspector: string;
  condition: string;
  observations: string;
  abnormalities: string;
  recommendations: string;
}

export default function InspectionsPage() {
  const { permissions } = useSession();
  const { request } = useApi();
  const [rows, setRows] = useState<InspRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    request<{ rows: InspRow[]; total: number }>(`/api/inspections?${params.toString()}`).then((d) => {
      if (d) { setRows(d.rows); setTotal(d.total); }
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, limit, offset]);

  function exportCsv() {
    const header = ['Date', 'Tag', 'Equipment', 'Substation', 'Type', 'Inspector', 'Condition'];
    const csv = [header.join(',')];
    rows.forEach((r) => {
      csv.push([
        r.inspection_date,
        r.equipment_tag,
        `"${r.equipment_name.replace(/"/g, '""')}"`,
        `"${(r.substation_name ?? '').replace(/"/g, '""')}"`,
        r.inspection_type,
        `"${r.inspector.replace(/"/g, '""')}"`,
        r.condition,
      ].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspections-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inspections</h1>
          <p className="text-sm text-muted-foreground">Routine, periodic and special inspection records.</p>
        </div>
        <div className="flex gap-2">
          {permissions.canExportData ? (
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-3.5 w-3.5" />Export CSV</Button>
          ) : null}
          {permissions.canCreateInspection ? (
            <Button asChild size="sm"><Link href="/inspections/new"><Plus className="mr-1 h-3.5 w-3.5" />Record Inspection</Link></Button>
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
                <Input className="h-8 pl-7 text-xs" placeholder="Equipment, observations, abnormalities…" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} />
              </div>
            </div>
          </div>
          <CardDescription className="mt-2">{total} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Substation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Observations</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No inspection records.</TableCell></TableRow>
                ) : rows.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs">{formatDate(i.inspection_date)}</TableCell>
                    <TableCell>
                      <Link href={`/equipment/${i.id}`} className="font-mono text-xs text-primary hover:underline">{i.equipment_tag}</Link>
                      <div className="text-[10px] text-muted-foreground">{i.equipment_name}</div>
                    </TableCell>
                    <TableCell className="text-xs">{i.substation_name}</TableCell>
                    <TableCell className="text-xs">{i.inspection_type.replace('_', ' ')}</TableCell>
                    <TableCell className="text-xs">{i.inspector}</TableCell>
                    <TableCell><Badge className={conditionTone(i.condition)}>{i.condition}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={i.observations}>{i.observations || i.abnormalities || '—'}</TableCell>
                    <TableCell><Button asChild size="sm" variant="ghost"><Link href={`/inspections/${i.id}`}>View</Link></Button></TableCell>
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