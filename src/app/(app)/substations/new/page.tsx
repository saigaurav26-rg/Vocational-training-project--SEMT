'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewSubstationPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    substation_name: '',
    substation_code: '',
    location: '',
    district: '',
    state: 'Chhattisgarh',
    voltage_level: '',
    capacity_mva: '',
    commissioning_date: '',
    description: '',
    status: 'ACTIVE',
  });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch('/api/substations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Failed to create substation');
      return;
    }
    const data = await r.json();
    toast.success('Substation added');
    router.push(`/substations/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/substations">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back to substations
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Add substation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Substation name" required>
              <Input
                value={form.substation_name}
                onChange={(e) => setField('substation_name', e.target.value)}
                placeholder="e.g. Bhilai Main Substation"
                required
              />
            </Field>
            <Field label="Substation code" required>
              <Input
                value={form.substation_code}
                onChange={(e) => setField('substation_code', e.target.value.toUpperCase())}
                placeholder="e.g. SUB-220-01"
                required
              />
            </Field>
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="e.g. Sector 6"
              />
            </Field>
            <Field label="District">
              <Input
                value={form.district}
                onChange={(e) => setField('district', e.target.value)}
                placeholder="e.g. Durg"
              />
            </Field>
            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => setField('state', e.target.value)}
              />
            </Field>
            <Field label="Voltage level">
              <Input
                value={form.voltage_level}
                onChange={(e) => setField('voltage_level', e.target.value)}
                placeholder="e.g. 220 kV"
              />
            </Field>
            <Field label="Capacity (MVA)">
              <Input
                type="number"
                value={form.capacity_mva}
                onChange={(e) => setField('capacity_mva', e.target.value)}
                placeholder="e.g. 500"
              />
            </Field>
            <Field label="Commissioning date">
              <Input
                type="date"
                value={form.commissioning_date}
                onChange={(e) => setField('commissioning_date', e.target.value)}
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                  <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description" full>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Additional notes or specifications..."
              />
            </Field>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button asChild variant="outline" type="button">
                <Link href="/substations">Cancel</Link>
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Create substation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1 ${full ? 'md:col-span-2' : ''}`}>
      <Label className="text-xs">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}