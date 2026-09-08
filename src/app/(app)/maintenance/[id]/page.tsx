'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wrench, Building2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/lib/session-context';
import { conditionTone, maintenanceTone, formatDate, label } from '@/lib/labels';

interface Maint {
  id: number;
  equipment_id: number;
  equipment_name?: string;
  equipment_tag?: string;
  substation_name?: string;
  substation_code?: string;
  equipment_type_name?: string;
  maintenance_type: string;
  maintenance_date: string;
  performed_by: string;
  maintenance_reason: string;
  observations: string;
  work_performed: string;
  parts_replaced: string;
  test_results: string;
  condition_before: string;
  condition_after: string;
  downtime_hours: number;
  recommendations: string;
  next_maintenance_date: string | null;
  status: string;
}

export default function MaintenanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { permissions } = useSession();
  const [data, setData] = useState<Maint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/maintenance/${id}`);
      if (!r.ok) { toast.error('Failed to load maintenance record'); setLoading(false); return; }
      const d = await r.json();
      setData(d);
      setLoading(false);
    })();
  }, [id]);

  async function remove() {
    if (!confirm('Delete this maintenance record? This cannot be undone.')) return;
    const r = await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? 'Delete failed');
      return;
    }
    toast.success('Maintenance record deleted');
    router.push('/maintenance');
  }

  if (loading || !data) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm"><Link href="/maintenance"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link></Button>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">{label(data.maintenance_type)} maintenance</h1>
            <Badge className={maintenanceTone(data.status)}>{label(data.status)}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(data.maintenance_date)}</span>
            <span>•</span>
            <span>{data.performed_by}</span>
            {data.equipment_tag ? (
              <>
                <span>•</span>
                <Link href={`/equipment/${data.equipment_id}`} className="font-mono text-primary hover:underline">
                  {data.equipment_tag} – {data.equipment_name}
                </Link>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          {permissions.canDeleteMaintenance ? (
            <Button size="sm" variant="outline" className="text-red-600" onClick={remove}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Condition change</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Before</span>
              <Badge className={conditionTone(data.condition_before)}>{label(data.condition_before)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">After</span>
              <Badge className={conditionTone(data.condition_after)}>{label(data.condition_after)}</Badge>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground">Downtime</span>
              <span className="font-medium">{data.downtime_hours} hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Next maintenance</span>
              <span className="font-medium">{formatDate(data.next_maintenance_date)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Reason & work</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reason</div>
              <div>{data.maintenance_reason || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Work performed</div>
              <div>{data.work_performed || '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Parts & tests</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Parts replaced</div>
              <div>{data.parts_replaced || 'None'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Test results</div>
              <div>{data.test_results || '—'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Observations & recommendations</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Observations</div>
            <div className="mt-1 whitespace-pre-wrap">{data.observations || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recommendations</div>
            <div className="mt-1 whitespace-pre-wrap">{data.recommendations || '—'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}