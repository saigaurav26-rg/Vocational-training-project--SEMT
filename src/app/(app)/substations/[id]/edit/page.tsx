'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function EditSubstationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    substation_name: '',
    substation_code: '',
    location: '',
    district: '',
    state: '',
    voltage_level: '',
    commissioning_date: '',
    description: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/substations/${id}`);
      if (!r.ok) { toast.error('Failed to load substation'); return; }
      const d = await r.json();
      const s = d.substation;
      setForm({
        substation_name: s.substation_name ?? '',
        substation_code: s.substation_code ?? '',
        location: s.location ?? '',
        district: s.district ?? '',
        state: s.state ?? '',
        voltage_level: s.voltage_level ?? '',
        commissioning_date: s.commissioning_date ?? '',
        description: s.description ?? '',
        status: s.status ?? 'ACTIVE',
      });
      setLoading(false);
    })();
  }, [id]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch(`/api/substations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Update failed');
      return;
    }
    toast.success('Substation updated');
    router.push(`/substations/${id}`);
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm"><Link href={`/substations/${id}`}><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit substation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Substation name" required><Input value={form.substation_name} onChange={(e) => setField('substation_name', e.target.value)} required /></Field>
            <Field label="Substation code" required><Input value={form.substation_code} onChange={(e) => setField('substation_code', e.target.value.toUpperCase())} required /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setField('location', e.target.value)} /></Field>
            <Field label="District"><Input value={form.district} onChange={(e) => setField('district', e.target.value)} /></Field>
            <Field label="State"><Input value={form.state} onChange={(e) => setField('state', e.target.value)} /></Field>
            <Field label="Voltage level"><Input value={form.voltage_level} onChange={(e) => setField('voltage_level', e.target.value)} /></Field>
            <Field label="Commissioning date"><Input type="date" value={form.commissioning_date} onChange={(e) => setField('commissioning_date', e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                  <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description" full><Textarea rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} /></Field>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button asChild variant="outline" type="button"><Link href={`/substations/${id}`}>Cancel</Link></Button>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
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