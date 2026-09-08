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
import { ArrowLeft, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { getSpecFields } from '@/lib/equipment-specs';

interface Type { id: number; name: string; }
interface Sub { id: number; substation_name: string; substation_code: string; }
interface Rating { spec_key: string; spec_label: string; spec_value: string; unit: string; }

export default function EditEquipmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [types, setTypes] = useState<Type[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    equipment_tag: '',
    equipment_name: '',
    equipment_type_id: '',
    substation_id: '',
    manufacturer: '',
    model_number: '',
    serial_number: '',
    installation_date: '',
    commissioning_date: '',
    location: '',
    bay: '',
    feeder: '',
    voltage_level: '',
    status: 'ACTIVE',
    condition: 'GOOD',
    criticality: 'MEDIUM',
    description: '',
    last_maintenance_date: '',
    next_maintenance_date: '',
    maintenance_frequency_days: 180,
    responsible_person: '',
  });
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [customKey, setCustomKey] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState('');

  useEffect(() => {
    fetch('/api/equipment-types').then((r) => r.json()).then((d) => setTypes(d.rows ?? []));
    fetch('/api/substations?limit=100').then((r) => r.json()).then((d) => setSubs(d.rows ?? []));
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/equipment/${id}`);
      if (!r.ok) { toast.error('Failed to load equipment'); return; }
      const d = await r.json();
      const e = d.equipment;
      setForm({
        equipment_tag: e.equipment_tag ?? '',
        equipment_name: e.equipment_name ?? '',
        equipment_type_id: String(e.equipment_type_id),
        substation_id: String(e.substation_id),
        manufacturer: e.manufacturer ?? '',
        model_number: e.model_number ?? '',
        serial_number: e.serial_number ?? '',
        installation_date: e.installation_date ?? '',
        commissioning_date: e.commissioning_date ?? '',
        location: e.location ?? '',
        bay: e.bay ?? '',
        feeder: e.feeder ?? '',
        voltage_level: e.voltage_level ?? '',
        status: e.status ?? 'ACTIVE',
        condition: e.condition ?? 'GOOD',
        criticality: e.criticality ?? 'MEDIUM',
        description: e.description ?? '',
        last_maintenance_date: e.last_maintenance_date ?? '',
        next_maintenance_date: e.next_maintenance_date ?? '',
        maintenance_frequency_days: e.maintenance_frequency_days ?? 180,
        responsible_person: e.responsible_person ?? '',
      });
      setRatings(d.ratings ?? []);
      setLoading(false);
    })();
  }, [id]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateRating(idx: number, value: string) {
    setRatings((r) => r.map((x, i) => i === idx ? { ...x, spec_value: value } : x));
  }

  function syncSpecsFromType() {
    const t = types.find((x) => String(x.id) === form.equipment_type_id);
    if (!t) return;
    const fields = getSpecFields(t.name);
    const existing = new Map(ratings.map((r) => [r.spec_key, r]));
    setRatings(fields.map((f) => existing.get(f.key) ?? { spec_key: f.key, spec_label: f.label, spec_value: '', unit: f.unit }));
  }

  function addCustom() {
    if (!customKey || !customLabel) {
      toast.error('Provide a key and label');
      return;
    }
    setRatings((r) => [...r, { spec_key: customKey, spec_label: customLabel, spec_value: customValue, unit: customUnit }]);
    setCustomKey(''); setCustomLabel(''); setCustomValue(''); setCustomUnit('');
  }

  function removeRating(idx: number) {
    setRatings((r) => r.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch(`/api/equipment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        equipment_type_id: Number(form.equipment_type_id),
        substation_id: Number(form.substation_id),
        installation_date: form.installation_date || null,
        commissioning_date: form.commissioning_date || null,
        last_maintenance_date: form.last_maintenance_date || null,
        next_maintenance_date: form.next_maintenance_date || null,
        ratings,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Update failed');
      return;
    }
    toast.success('Equipment updated');
    router.push(`/equipment/${id}`);
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm"><Link href={`/equipment/${id}`}><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link></Button>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Equipment tag" required full>
              <Input value={form.equipment_tag} onChange={(e) => setField('equipment_tag', e.target.value.toUpperCase())} required />
            </Field>
            <Field label="Equipment name" required full>
              <Input value={form.equipment_name} onChange={(e) => setField('equipment_name', e.target.value)} required />
            </Field>
            <Field label="Equipment type" required>
              <Select value={form.equipment_type_id} onValueChange={(v) => { setField('equipment_type_id', v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Substation" required>
              <Select value={form.substation_id} onValueChange={(v) => setField('substation_id', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subs.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.substation_code} – {s.substation_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Bay"><Input value={form.bay} onChange={(e) => setField('bay', e.target.value)} /></Field>
            <Field label="Feeder"><Input value={form.feeder} onChange={(e) => setField('feeder', e.target.value)} /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setField('location', e.target.value)} /></Field>
            <Field label="Voltage level"><Input value={form.voltage_level} onChange={(e) => setField('voltage_level', e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Technical specifications</CardTitle>
              <Button size="sm" type="button" variant="outline" onClick={syncSpecsFromType}>Sync fields from type</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {ratings.map((r, idx) => (
                <Field key={`${r.spec_key}-${idx}`} label={`${r.spec_label}${r.unit ? ` (${r.unit})` : ''}`}>
                  <div className="flex gap-1">
                    <Input value={r.spec_value} onChange={(e) => updateRating(idx, e.target.value)} placeholder="Not specified" />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeRating(idx)} className="h-9 w-9"><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </Field>
              ))}
            </div>
            <div className="mt-4 border-t pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Add custom field</div>
              <div className="mt-1 grid grid-cols-1 gap-2 md:grid-cols-5">
                <Input placeholder="Key (snake_case)" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
                <Input placeholder="Label" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
                <Input placeholder="Value" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
                <Input placeholder="Unit" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} />
                <Button type="button" size="sm" variant="outline" onClick={addCustom}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status, condition & criticality</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                  <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                  <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
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
            <Field label="Criticality">
              <Select value={form.criticality} onValueChange={(v) => setField('criticality', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Frequency (days)">
              <Input type="number" min={1} max={3650} value={form.maintenance_frequency_days} onChange={(e) => setField('maintenance_frequency_days', Number(e.target.value))} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Manufacturer & maintenance</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Manufacturer"><Input value={form.manufacturer} onChange={(e) => setField('manufacturer', e.target.value)} /></Field>
            <Field label="Model"><Input value={form.model_number} onChange={(e) => setField('model_number', e.target.value)} /></Field>
            <Field label="Serial"><Input value={form.serial_number} onChange={(e) => setField('serial_number', e.target.value)} /></Field>
            <Field label="Installation date"><Input type="date" value={form.installation_date} onChange={(e) => setField('installation_date', e.target.value)} /></Field>
            <Field label="Commissioning date"><Input type="date" value={form.commissioning_date} onChange={(e) => setField('commissioning_date', e.target.value)} /></Field>
            <Field label="Responsible"><Input value={form.responsible_person} onChange={(e) => setField('responsible_person', e.target.value)} /></Field>
            <Field label="Last maintenance"><Input type="date" value={form.last_maintenance_date} onChange={(e) => setField('last_maintenance_date', e.target.value)} /></Field>
            <Field label="Next maintenance"><Input type="date" value={form.next_maintenance_date} onChange={(e) => setField('next_maintenance_date', e.target.value)} /></Field>
            <Field label="Description" full><Textarea rows={3} value={form.description} onChange={(e) => setField('description', e.target.value)} /></Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" type="button"><Link href={`/equipment/${id}`}>Cancel</Link></Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, required, full }: { label: string; children: React.ReactNode; required?: boolean; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? 'md:col-span-3' : ''}`}>
      <Label className="text-xs">{label}{required ? <span className="text-red-500"> *</span> : null}</Label>
      {children}
    </div>
  );
}