'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/lib/session-context';
import { formatDateTime } from '@/lib/labels';

interface AuditRow { id: number; user_name: string | null; user_email: string | null; action: string; entity: string; entity_id: number | null; field: string | null; old_value: string | null; new_value: string | null; created_at: string; }

export default function AuditPage() {
  const { user } = useSession();
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    fetch('/api/audit?limit=200').then((r) => r.json()).then((d) => setRows(d.rows ?? []));
  }, []);

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-sm text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">History of administrative actions and data modifications.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">All events</CardTitle><CardDescription>{rows.length} event(s)</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old</TableHead>
                <TableHead>New</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-[10px]">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="text-xs">{r.user_name ?? 'System'}</TableCell>
                  <TableCell className="text-xs font-medium">{r.action}</TableCell>
                  <TableCell className="font-mono text-xs">{r.entity}{r.entity_id ? ` #${r.entity_id}` : ''}</TableCell>
                  <TableCell className="text-xs">{r.field ?? '—'}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={r.old_value ?? ''}>{r.old_value ?? '—'}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs" title={r.new_value ?? ''}>{r.new_value ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}