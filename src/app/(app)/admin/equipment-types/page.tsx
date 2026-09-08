'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useSession } from '@/lib/session-context';

interface TypeRow { id: number; name: string; category: string; description: string; default_maintenance_days: number; active: number; equipment_count: number; }

export default function EquipmentTypesAdminPage() {
  const { user } = useSession();
  const [rows, setRows] = useState<TypeRow[]>([]);
  const [form, setForm] = useState({ name: '', category: '', description: '', default_maintenance_days: 180 });

  async function load() {
    const r = await fetch('/api/equipment-types');
    if (r.ok) {
      const d = await r.json();
      setRows(d.rows ?? []);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category) {
      toast.error('Name and category are required');
      return;
    }
    const r = await fetch('/api/equipment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Create failed');
      return;
    }
    toast.success('Equipment type added');
    setForm({ name: '', category: '', description: '', default_maintenance_days: 180 });
    load();
  }

  async function toggle(id: number, active: number) {
    const r = await fetch(`/api/equipment-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: active ? 0 : 1 }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Update failed');
      return;
    }
    toast.success('Updated');
    load();
  }

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-sm text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipment types</h1>
        <p className="text-sm text-muted-foreground">Define new equipment types and manage defaults.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Add new equipment type</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Series Reactor" required /></div>
            <div className="space-y-1"><Label className="text-xs">Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Compensation" required /></div>
            <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Default frequency (days)</Label><Input type="number" min={1} max={3650} value={form.default_maintenance_days} onChange={(e) => setForm({ ...form, default_maintenance_days: Number(e.target.value) })} /></div>
            <div className="md:col-span-4 flex justify-end"><Button type="submit">Create</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">All equipment types</CardTitle><CardDescription>{rows.length} defined</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Default days</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={r.description}>{r.description}</TableCell>
                  <TableCell className="text-xs">{r.default_maintenance_days}</TableCell>
                  <TableCell className="text-xs">{r.equipment_count}</TableCell>
                  <TableCell>
                    {r.active ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => toggle(r.id, r.active)}>
                      {r.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}