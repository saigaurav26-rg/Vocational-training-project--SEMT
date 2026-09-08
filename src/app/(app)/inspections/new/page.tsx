'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Eq { id: number; equipment_tag: string; equipment_name: string; }

export default function NewInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEqId = searchParams.get('equipment_id') ?? '';
  const [equipment, setEquipment] = useState<Eq[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    equipment_id: initialEqId,
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_type: 'ROUTINE',
    condition: 'GOOD',
    observations: '',
    abnormalities: '',
    measurements: '',
    recommendations: '',
    next_action: '',
    follow_up_date: '',
    inspector: '',
  });

  useEffect(() => {
    fetch('/api/equipment?limit=200&sort_by=name&sort_dir=asc').then((r) => r.json()).then((d) => setEquipment(d.rows ?? []));
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.equipment_id || !form.inspector) {
      toast.error('Equipment and inspector are required');
      return;
    }
    setBusy(true);
    const r = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        equipment_id: Number(form.equipment_id),
        follow_up_date: form.follow_up_date || null,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Failed to record inspection');
      return;
    }
    toast.success('Inspection recorded');
    router.push('/inspections');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm"><Link href="/inspections"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link></Button>
      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-primary" />Record inspection</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Equipment" required>
              <Select value={form.equipment_id || 'none'} onValueChange={(v) => setField('equipment_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent>
                  {equipment.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.equipment_tag} – {e.equipment_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Inspector" required><Input value={form.inspector} onChange={(e) => setField('inspector', e.target.value)} placeholder="Inspector name" required /></Field>
            <Field label="Inspection date" required><Input type="date" value={form.inspection_date} onChange={(e) => setField('inspection_date', e.target.value)} required /></Field>
            <Field label="Inspection type">
              <Select value={form.inspection_type} onValueChange={(v) => setField('inspection_type', v)}>
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
            </Field>
            <Field label="Condition">
              <Select value={form.condition} onValueChange={(v) => setField('condition', v)}>
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
            <Field label="Follow-up date"><Input type="date" value={form.follow_up_date} onChange={(e) => setField('follow_up_date', e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Observations</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <Field label="Observations" full><Input value={form.observations} onChange={(e) => setField('observations', e.target.value)} placeholder="What did you observe?" /></Field>
            <Field label="Abnormalities" full><Input value={form.abnormalities} onChange={(e) => setField('abnormalities', e.target.value)} placeholder="Anything out of the ordinary?" /></Field>
            <Field label="Measurements" full><Input value={form.measurements} onChange={(e) => setField('measurements', e.target.value)} placeholder="e.g. Insulation 4500 MΩ" /></Field>
            <Field label="Recommendations" full><Input value={form.recommendations} onChange={(e) => setField('recommendations', e.target.value)} /></Field>
            <Field label="Next action" full><Input value={form.next_action} onChange={(e) => setField('next_action', e.target.value)} /></Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" type="button"><Link href="/inspections">Cancel</Link></Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save inspection'}</Button>
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