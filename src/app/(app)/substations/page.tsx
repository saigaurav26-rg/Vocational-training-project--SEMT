'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Cpu, ShieldAlert } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { useApi } from '@/lib/use-api';
import { statusTone, label, formatDate } from '@/lib/labels';

interface SubstationRow {
  id: number;
  substation_name: string;
  substation_code: string;
  location: string;
  district: string;
  state: string;
  voltage_level: string;
  capacity_mva?: string | number | null;
  commissioning_date: string | null;
  status: string;
  equipment_count: number;
  active_count: number;
  critical_count: number;
}

export default function SubstationsPage() {
  const { permissions } = useSession();
  const { request } = useApi();
  const [rows, setRows] = useState<SubstationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const load = () => {
    request<{ rows: SubstationRow[]; total: number }>(
      `/api/substations?search=${encodeURIComponent(search)}&limit=${pageSize}`
    ).then((d) => {
      if (d) {
        setRows(d.rows);
        setTotal(d.total);
      }
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pageSize]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Substations</h1>
          <p className="text-sm text-muted-foreground">Browse and manage substations under maintenance.</p>
        </div>
        {permissions.canManageSubstations ? (
          <Button asChild>
            <Link href="/substations/new">
              <Plus className="mr-1 h-4 w-4" />
              Add Substation
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-sm">All substations</CardTitle>
              <CardDescription>{total} record(s)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, code, location…"
                  className="h-8 w-60 pl-7 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Voltage / Capacity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Equipment</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Critical</TableHead>
                  <TableHead>Commissioned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                      No substations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.substation_code}</TableCell>
                      <TableCell>
                        <Link href={`/substations/${s.id}`} className="text-sm font-medium text-primary hover:underline">
                          {s.substation_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.voltage_level || '—'}
                        {s.capacity_mva ? ` (${s.capacity_mva} MVA)` : ''}
                      </TableCell>
                      <TableCell className="text-xs">
                        {[s.location, s.district, s.state].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono">
                          <Cpu className="mr-1 h-3 w-3" />
                          {s.equipment_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{s.active_count}</TableCell>
                      <TableCell className="text-right text-xs">
                        {s.critical_count > 0 ? (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                            <ShieldAlert className="mr-1 h-3 w-3" />
                            {s.critical_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(s.commissioning_date)}</TableCell>
                      <TableCell>
                        <Badge className={statusTone(s.status)}>{label(s.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/substations/${s.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}