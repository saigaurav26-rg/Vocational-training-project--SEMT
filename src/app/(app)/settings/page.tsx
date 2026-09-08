'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/session-context';

export default function SettingsPage() {
  const { user } = useSession();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">User profile and application information.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Pair label="Name" value={user.name} />
          <Pair label="Email" value={user.email} />
          <Pair label="Role" value={<Badge>{user.role.replace('_', ' ')}</Badge>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Application information</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Pair label="Application" value="SEMT – Substation Equipment Maintenance Tracker" />
          <Pair label="Demo data disclaimer" value="Sample data is based on documented equipment specifications (CSPTCL report context). Maintenance records in seed data are illustrative." />
          <Pair label="Predictive maintenance" value={<Badge variant="outline">Future enhancement</Badge>} />
          <Pair label="Email / SMS notifications" value={<Badge variant="outline">Configuration required</Badge>} />
          <Pair label="IoT sensor integration" value={<Badge variant="outline">Future enhancement</Badge>} />
          <Pair label="Mobile inspection forms" value={<Badge variant="outline">Future enhancement</Badge>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Important note</CardTitle>
          <CardDescription>This system is not a replacement for official utility procedures, manufacturer instructions, permit-to-work and LOTO procedures.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}