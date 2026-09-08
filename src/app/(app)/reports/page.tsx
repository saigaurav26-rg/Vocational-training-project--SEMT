'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download } from 'lucide-react';
import { conditionTone, criticalityTone, label, formatDate, daysFromToday } from '@/lib/labels';

export default function ReportsPage() {
  const [substation, setSubstation] = useState<number | ''>('');
  const [subs, setSubs] = useState<Array<{ id: number; substation_name: string; substation_code: string }>>([]);
  const [equipment, setEquipment] = useState<Array<Record<string, unknown>>>([]);
  const [maintenance, setMaintenance] = useState<Array<Record<string, unknown>>>([]);
  const [inspections, setInspections] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    fetch('/api/substations?limit=100').then((r) => r.json()).then((d) => setSubs(d.rows ?? []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (substation) params.set('substation_id', String(substation));
    params.set('limit', '200');
    Promise.all([
      fetch(`/api/equipment?${params.toString()}`).then((r) => r.json()),
      fetch(`/api/maintenance?${params.toString()}`).then((r) => r.json()),
      fetch(`/api/inspections?${params.toString()}`).then((r) => r.json()),
    ]).then(([e, m, i]) => {
      setEquipment(e.rows ?? []);
      setMaintenance(m.rows ?? []);
      setInspections(i.rows ?? []);
    });
  }, [substation]);

  function csv(name: string, header: string[], rows: Array<Array<string | number>>) {
    const csv = [header.join(',')];
    rows.forEach((r) => csv.push(r.map((v) => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v).join(',')));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate on-demand reports from live data.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter substation</Label>
              <select className="h-8 rounded-md border bg-background px-2 text-xs" value={substation} onChange={(e) => setSubstation(e.target.value ? Number(e.target.value) : '')}>
                <option value="">All substations</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{s.substation_code} – {s.substation_name}</option>)}
              </select>
            </div>
          </div>
          <CardDescription>Filter applied to all reports below.</CardDescription>
        </CardHeader>
      </Card>

      <Report
        title="Equipment inventory report"
        description="Complete list of equipment matching the filter."
        count={equipment.length}
        onExport={() => csv('equipment-inventory',
          ['Tag', 'Name', 'Type', 'Substation', 'Manufacturer', 'Voltage', 'Condition', 'Criticality', 'Status', 'Next maintenance'],
          equipment.map((e) => [
            e.equipment_tag as string,
            (e.equipment_name as string) ?? '',
            (e.equipment_type_name as string) ?? '',
            (e.substation_code as string) ?? '',
            (e.manufacturer as string) ?? '',
            (e.voltage_level as string) ?? '',
            (e.condition as string) ?? '',
            (e.criticality as string) ?? '',
            (e.status as string) ?? '',
            (e.next_maintenance_date as string) ?? '',
          ]))}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tag</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Substation</TableHead>
              <TableHead>Condition</TableHead><TableHead>Criticality</TableHead><TableHead>Next Maint.</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {equipment.slice(0, 50).map((e) => (
                <TableRow key={e.id as number}>
                  <TableCell className="font-mono text-xs">{e.equipment_tag as string}</TableCell>
                  <TableCell className="text-sm">{e.equipment_name as string}</TableCell>
                  <TableCell className="text-xs">{e.equipment_type_name as string}</TableCell>
                  <TableCell className="text-xs">{e.substation_code as string}</TableCell>
                  <TableCell className="text-xs">{label(e.condition as string)}</TableCell>
                  <TableCell className="text-xs">{label(e.criticality as string)}</TableCell>
                  <TableCell className="text-xs">{formatDate(e.next_maintenance_date as string)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Report>

      <Report
        title="Maintenance history report"
        description={`${maintenance.length} maintenance record(s).`}
        count={maintenance.length}
        onExport={() => csv('maintenance-history',
          ['Date', 'Equipment Tag', 'Type', 'Performed by', 'Condition after', 'Status', 'Downtime (h)'],
          maintenance.map((m) => [
            m.maintenance_date as string,
            m.equipment_tag as string,
            m.maintenance_type as string,
            m.performed_by as string,
            m.condition_after as string,
            m.status as string,
            m.downtime_hours as number,
          ]))}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Equipment</TableHead><TableHead>Type</TableHead>
              <TableHead>Performed by</TableHead><TableHead>Condition after</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {maintenance.slice(0, 50).map((m) => (
                <TableRow key={m.id as number}>
                  <TableCell className="text-xs">{formatDate(m.maintenance_date as string)}</TableCell>
                  <TableCell className="font-mono text-xs">{m.equipment_tag as string}</TableCell>
                  <TableCell className="text-xs">{label(m.maintenance_type as string)}</TableCell>
                  <TableCell className="text-xs">{m.performed_by as string}</TableCell>
                  <TableCell className="text-xs">{label(m.condition_after as string)}</TableCell>
                  <TableCell className="text-xs">{label(m.status as string)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Report>

      <Report
        title="Inspection history report"
        description={`${inspections.length} inspection record(s).`}
        count={inspections.length}
        onExport={() => csv('inspection-history',
          ['Date', 'Equipment Tag', 'Type', 'Inspector', 'Condition', 'Observations', 'Abnormalities', 'Recommendations'],
          inspections.map((i) => [
            i.inspection_date as string,
            i.equipment_tag as string,
            i.inspection_type as string,
            i.inspector as string,
            i.condition as string,
            i.observations as string,
            i.abnormalities as string,
            i.recommendations as string,
          ]))}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Equipment</TableHead><TableHead>Type</TableHead>
              <TableHead>Inspector</TableHead><TableHead>Condition</TableHead><TableHead>Observations</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {inspections.slice(0, 50).map((i) => (
                <TableRow key={i.id as number}>
                  <TableCell className="text-xs">{formatDate(i.inspection_date as string)}</TableCell>
                  <TableCell className="font-mono text-xs">{i.equipment_tag as string}</TableCell>
                  <TableCell className="text-xs">{label(i.inspection_type as string)}</TableCell>
                  <TableCell className="text-xs">{i.inspector as string}</TableCell>
                  <TableCell className="text-xs">{label(i.condition as string)}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={i.observations as string}>{i.observations as string}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Report>

      <Report
        title="Overdue maintenance report"
        description="Equipment whose next maintenance date has passed."
        count={equipment.filter((e) => daysFromToday(e.next_maintenance_date as string) !== null && daysFromToday(e.next_maintenance_date as string)! < 0).length}
        onExport={() => {
          const overdue = equipment.filter((e) => daysFromToday(e.next_maintenance_date as string) !== null && daysFromToday(e.next_maintenance_date as string)! < 0);
          csv('overdue-maintenance',
            ['Tag', 'Name', 'Substation', 'Condition', 'Criticality', 'Days overdue'],
            overdue.map((e) => [
              e.equipment_tag as string,
              e.equipment_name as string,
              e.substation_code as string,
              e.condition as string,
              e.criticality as string,
              Math.abs(daysFromToday(e.next_maintenance_date as string) ?? 0),
            ]));
        }}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tag</TableHead><TableHead>Name</TableHead><TableHead>Substation</TableHead>
              <TableHead>Condition</TableHead><TableHead>Criticality</TableHead><TableHead>Days overdue</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {equipment.filter((e) => daysFromToday(e.next_maintenance_date as string) !== null && daysFromToday(e.next_maintenance_date as string)! < 0).map((e) => (
                <TableRow key={e.id as number}>
                  <TableCell className="font-mono text-xs">{e.equipment_tag as string}</TableCell>
                  <TableCell className="text-sm">{e.equipment_name as string}</TableCell>
                  <TableCell className="text-xs">{e.substation_code as string}</TableCell>
                  <TableCell className="text-xs">{label(e.condition as string)}</TableCell>
                  <TableCell className="text-xs">{label(e.criticality as string)}</TableCell>
                  <TableCell className="text-xs text-red-600">{Math.abs(daysFromToday(e.next_maintenance_date as string) ?? 0)}d</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Report>
    </div>
  );
}

function Report({ title, description, count, onExport, children }: { title: string; description: string; count: number; onExport: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={onExport} disabled={count === 0}>
            <Download className="mr-1 h-3.5 w-3.5" />Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}