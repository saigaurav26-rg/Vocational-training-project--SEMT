'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Wrench } from 'lucide-react';
import { toast } from 'sonner';

interface Eq { id: number; equipment_tag: string; equipment_name: string; }

export default function NewMaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEqId = searchParams.get('equipment_id') ?? '';
  const [equipment, setEquipment] = useState<Eq[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    equipment_id: initialEqId,
    maintenance_type: 'PREVENTIVE',
    maintenance_date: new Date().toISOString().split('T')[0],
    performed_by: '',
    maintenance_reason: '',
    observations: '',
    work_performed: '',
    parts_replaced: '',
    test_results: '',
    condition_before: 'GOOD',
    condition_after: 'GOOD',
    downtime_hours: 0,
    recommendations: '',
    next_maintenance_date: '',
    status: 'COMPLETED',
  });

  useEffect(() => {
    fetch('/api/equipment?limit=200&sort_by=name&sort_dir=asc').then((r) => r.json()).then((d) => setEquipment(d.rows ?? []));
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.equipment_id || !form.performed_by) {
      toast.error('Equipment and performer are required');
      return;
    }
    setBusy(true);
    const r = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        equipment_id: Number(form.equipment_id),
        next_maintenance_date: form.next_maintenance_date || null,
        downtime_hours: Number(form.downtime_hours),
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Failed to record maintenance');
      return;
    }
    const data = await r.json();
    toast.success('Maintenance recorded');
    router.push(`/maintenance/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm"><Link href="/maintenance"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link></Button>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4 text-primary" />Record maintenance</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Equipment" required>
              <Select value={form.equipment_id || 'none'} onValueChange={(v) => setField('equipment_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent>
                  {equipment.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.equipment_tag} – {e.equipment_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Maintenance type" required>
              <Select value={form.maintenance_type} onValueChange={(v) => setField('maintenance_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                  <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                  <SelectItem value="PREDICTIVE">Predictive</SelectItem>
                  <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                  <SelectItem value="INSPECTION">Inspection</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Maintenance date" required><Input type="date" value={form.maintenance_date} onChange={(e) => setField('maintenance_date', e.target.value)} required /></Field>
            <Field label="Performed by" required><Input value={form.performed_by} onChange={(e) => setField('performed_by', e.target.value)} placeholder="Engineer / staff name" required /></Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reason"><Input value={form.maintenance_reason} onChange={(e) => setField('maintenance_reason', e.target.value)} placeholder="Why was this maintenance performed?" /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Observations & work performed</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <Field label="Observations" full><Textarea rows={3} value={form.observations} onChange={(e) => setField('observations', e.target.value)} /></Field>
            <Field label="Work performed" full><Textarea rows={3} value={form.work_performed} onChange={(e) => setField('work_performed', e.target.value)} /></Field>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Parts replaced"><Input value={form.parts_replaced} onChange={(e) => setField('parts_replaced', e.target.value)} placeholder="None" /></Field>
              <Field label="Test results"><Input value={form.test_results} onChange={(e) => setField('test_results', e.target.value)} /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Condition & downtime</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Condition before">
              <Select value={form.condition_before} onValueChange={(v) => setField('condition_before', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXCELLENT">Excellent</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="FAIR">Fair</SelectItem>
                  <SelectItem value="POOR">Poor</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Condition after">
              <Select value={form.condition_after} onValueChange={(v) => setField('condition_after', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXCELLENT">Excellent</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="FAIR">Fair</SelectItem>
                  <SelectItem value="POOR">Poor</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Downtime (hours)"><Input type="number" min={0} step={0.5} value={form.downtime_hours} onChange={(e) => setField('downtime_hours', Number(e.target.value))} /></Field>
            <Field label="Recommendations" full><Textarea rows={3} value={form.recommendations} onChange={(e) => setField('recommendations', e.target.value)} /></Field>
            <Field label="Next maintenance date"><Input type="date" value={form.next_maintenance_date} onChange={(e) => setField('next_maintenance_date', e.target.value)} /></Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" type="button"><Link href="/maintenance">Cancel</Link></Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save maintenance record'}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, required, full }: { label: string; children: React.ReactNode; required?: boolean; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? 'md:col-span-2' : ''}`}>
      <Label className="text-xs">{label}{required ? <span className="text-red-500"> *</span> : null}</Label>
      {children}
    </div>
  );
}