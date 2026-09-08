'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Legend, Tooltip } from 'recharts';
import { conditionTone, label } from '@/lib/labels';

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 12,
  padding: '6px 10px',
  color: 'var(--card-foreground)',
};

function BareTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      {label ? <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div> : null}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name ?? 'value'}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

interface Analytics {
  totals: { totalEquipment: number; totalMaintenance: number; preventiveMaint: number; correctiveMaint: number; breakdownMaint: number; completedMaintenance: number; totalInspections: number };
  conditionDist: Array<{ condition: string; c: number }>;
  typeDist: Array<{ type: string; c: number }>;
  substationDist: Array<{ substation_name: string; substation_code: string; c: number }>;
  monthlyMaint: Array<{ month: string; c: number; maintenance_type: string }>;
  maintByType: Array<{ maintenance_type: string; c: number }>;
}

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(180);

  useEffect(() => {
    fetch(`/api/analytics?days=${days}`).then((r) => r.json()).then(setData);
  }, [days]);

  if (!data) return <div className="p-8 text-center text-sm text-muted-foreground">Loading analytics…</div>;

  const monthlyTotal: Record<string, number> = {};
  data.monthlyMaint.forEach((m) => { monthlyTotal[m.month] = (monthlyTotal[m.month] ?? 0) + m.c; });
  const trend = Object.entries(monthlyTotal).sort().map(([month, total]) => ({ month, total }));

  const typeBreakdown: Record<string, number> = {};
  data.monthlyMaint.forEach((m) => { typeBreakdown[m.maintenance_type] = (typeBreakdown[m.maintenance_type] ?? 0) + m.c; });
  const stacked = Object.entries(monthlyTotal).sort().map(([month]) => {
    const row: Record<string, number | string> = { month };
    Object.keys(typeBreakdown).forEach((t) => {
      row[t] = data.monthlyMaint.filter((m) => m.month === month && m.maintenance_type === t).reduce((a, b) => a + b.c, 0);
    });
    return row;
  });

  const completion = data.totals.totalMaintenance > 0 ? Math.round((data.totals.completedMaintenance / data.totals.totalMaintenance) * 100) : 0;
  const preventivePct = data.totals.totalMaintenance > 0 ? Math.round((data.totals.preventiveMaint / data.totals.totalMaintenance) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Aggregated maintenance trends and condition distribution.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 rounded-md border bg-background px-2 text-xs">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 3 months</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total equipment" value={data.totals.totalEquipment} />
        <Kpi label="Total maintenance" value={data.totals.totalMaintenance} sub={`${completion}% completed`} />
        <Kpi label="Preventive ratio" value={`${preventivePct}%`} sub={`${data.totals.preventiveMaint} preventive records`} />
        <Kpi label="Total inspections" value={data.totals.totalInspections} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Maintenance trend</CardTitle><CardDescription className="text-[10px]">Live records from maintenance log</CardDescription></CardHeader>
          <CardContent className="h-72">
            {trend.length === 0 ? (
              <EmptyChart label="Not enough data to calculate this trend." />
            ) : (
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<BareTooltip />} />
                  <Line dataKey="total" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Maintenance by type</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.maintByType.length === 0 ? (
              <EmptyChart label="No maintenance data yet." />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.maintByType.map((m) => ({ name: label(m.maintenance_type), value: m.c }))} dataKey="value" nameKey="name" outerRadius={100}>
                    {data.maintByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<BareTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Condition distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.conditionDist.every((d) => d.c === 0) ? (
              <EmptyChart label="No equipment data yet." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data.conditionDist}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="condition" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<BareTooltip />} />
                  <Bar dataKey="c" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Equipment by type</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.typeDist.every((d) => d.c === 0) ? (
              <EmptyChart label="No equipment data yet." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data.typeDist.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip content={<BareTooltip />} />
                  <Bar dataKey="c" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Equipment by substation</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data.substationDist.every((d) => d.c === 0) ? (
              <EmptyChart label="No substation data yet." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data.substationDist}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="substation_code" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<BareTooltip />} />
                  <Bar dataKey="c" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly maintenance by type</CardTitle>
          <CardDescription className="text-[10px]">Stacked breakdown by maintenance type</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {stacked.length === 0 ? (
            <EmptyChart label="Not enough data to calculate this trend." />
          ) : (
            <ResponsiveContainer>
              <BarChart data={stacked}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<BareTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {Object.keys(typeBreakdown).map((t, i) => (
                  <Bar key={t} dataKey={t} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center text-sm text-muted-foreground">{label}</div>
    </div>
  );
}