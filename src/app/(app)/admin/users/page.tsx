'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSession } from '@/lib/session-context';
import { formatDate } from '@/lib/labels';

interface UserRow { id: number; email: string; name: string; role: string; created_at: string; is_demo: number; }

export default function UsersPage() {
  const { user } = useSession();
  const [rows, setRows] = useState<UserRow[]>([]);

  async function load() {
    const r = await fetch('/api/users');
    if (r.ok) {
      const d = await r.json();
      setRows(d.rows ?? []);
    }
  }

  useEffect(() => { load(); }, []);

  async function changeRole(id: number, role: string) {
    const r = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Update failed');
      return;
    }
    toast.success('Role updated');
    load();
  }

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-sm text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Manage user accounts and roles.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">All users</CardTitle><CardDescription>{rows.length} account(s)</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm font-medium">{u.name}</TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)} disabled={u.id === user?.id}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="ENGINEER">Engineer</SelectItem>
                        <SelectItem value="MAINTENANCE_STAFF">Maintenance Staff</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(u.created_at)}</TableCell>
                  <TableCell className="text-xs">{u.is_demo ? 'Demo' : 'Live'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}