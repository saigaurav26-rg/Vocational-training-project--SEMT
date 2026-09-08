'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, ShieldCheck, ListTree, FileText } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { formatDate, label } from '@/lib/labels';

interface Stats {
  totals: Record<string, number>;
}

export default function AdminHomePage() {
  const { user } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then((r) => r.json()),
    ]).then(([d]) => {
      setStats({ totals: d.totals });
    });
  }, []);

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-sm text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">System administration and configuration.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={stats?.totals.totalSubstations ?? '—'} icon={Users} />
        <Stat label="Substations" value={stats?.totals.totalSubstations ?? '—'} icon={ShieldCheck} />
        <Stat label="Equipment" value={stats?.totals.totalEquipment ?? '—'} icon={ListTree} />
        <Stat label="Maintenance records" value={stats?.totals.totalMaintenance ?? '—'} icon={FileText} />
      </section>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Quick admin links</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <AdminLink href="/admin/users" title="User management" desc="Manage user accounts and assign roles." />
          <AdminLink href="/admin/equipment-types" title="Equipment types" desc="Add or deactivate equipment type definitions." />
          <AdminLink href="/admin/audit" title="Audit log" desc="View history of administrative actions." />
          <AdminLink href="/admin/settings" title="Settings" desc="Application configuration and warnings." />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function AdminLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <span className="text-xs text-primary">Open →</span>
    </Link>
  );
}