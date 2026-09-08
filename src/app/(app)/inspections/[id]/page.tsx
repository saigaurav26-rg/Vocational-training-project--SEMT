'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { conditionTone, formatDate, label } from '@/lib/labels';

interface Insp {
  id: number;
  equipment_id: number;
  equipment_name: string;
  equipment_tag: string;
  substation_name: string;
  inspection_date: string;
  inspector: string;
  inspection_type: string;
  condition: string;
  observations: string;
  abnormalities: string;
  measurements: string;
  recommendations: string;
  next_action: string;
  follow_up_date: string | null;
}

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Insp | null>(null);

  useEffect(() => {
    fetch(`/api/inspections`).then((r) => r.json()).then((d) => {
      const found = (d.rows ?? []).find((r: Insp) => r.id === Number(id));
      setData(found ?? null);
    });
  }, [id]);

  if (!data) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm"><Link href="/inspections"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link></Button>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">{label(data.inspection_type)} inspection</h1>
          <Badge className={conditionTone(data.condition)}>{label(data.condition)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{formatDate(data.inspection_date)}</span>
          <span>•</span>
          <span>{data.inspector}</span>
          <span>•</span>
          <Link href={`/equipment/${data.equipment_id}`} className="font-mono text-primary hover:underline">
            {data.equipment_tag} – {data.equipment_name}
          </Link>
          <span>•</span>
          <span>{data.substation_name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Observations & abnormalities</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-xs">
            <Pair label="Observations" value={data.observations} />
            <Pair label="Abnormalities" value={data.abnormalities} />
            <Pair label="Measurements" value={data.measurements} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Follow-up</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-xs">
            <Pair label="Recommendations" value={data.recommendations} />
            <Pair label="Next action" value={data.next_action} />
            <Pair label="Follow-up date" value={data.follow_up_date ? formatDate(data.follow_up_date) : ''} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{value || '—'}</div>
    </div>
  );
}