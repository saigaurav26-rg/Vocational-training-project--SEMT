import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, ShieldAlert } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back
          </Link>
        </Button>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">About SEMT</h1>
            <p className="text-sm text-muted-foreground">Substation Equipment Maintenance Tracker</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Purpose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              SEMT is a structured platform for managing substation equipment information, inspection records, maintenance schedules and equipment history.
              It centralises equipment specifications, ratings, maintenance history, condition tracking and analytics so that engineering, maintenance and supervisory staff can
              work from the same reliable dataset.
            </p>
            <p>
              The application is built as a real, persistent full-stack system with authentication, role-based authorization, an API layer and live database analytics.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Architecture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Frontend:</strong> Next.js (App Router) + React 19 + TypeScript</li>
              <li><strong>Backend:</strong> Next.js Route Handlers with server-side validation and permission enforcement</li>
              <li><strong>Database:</strong> Embedded relational engine (SQLite via better-sqlite3) for persistent storage</li>
              <li><strong>Auth:</strong> Session cookie + bcrypt-hashed passwords + role-based authorization</li>
              <li><strong>Analytics:</strong> Computed live from stored records (no hard-coded KPIs)</li>
              <li><strong>UI:</strong> shadcn/ui + Tailwind v4 + Recharts</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Data source methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              Initial sample records are based on equipment specifications documented in the project&apos;s CSPTCL report context (wave trap ratings, CT ratios, PT/CVT ratings,
              lightning arrester ratings, etc.). Maintenance records included in the demo are illustrative and should not be interpreted as actual operational maintenance history.
            </p>
            <p>
              Where reliable engineering values were not available, fields are recorded as <em>“Not specified”</em>. No fabricated manufacturer specifications are introduced.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Important safety note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              SEMT is an information-management tool. It is NOT a replacement for engineering judgement, official utility procedures, manufacturer instructions, permit-to-work and LOTO procedures,
              or regulatory requirements.
            </p>
            <p>
              This system is not an official CSPTCL or utility-grade maintenance management system. Sample data must not be interpreted as live operational data.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Future scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <ul className="list-disc space-y-1 pl-5">
              <li>IoT sensor integration for live condition monitoring</li>
              <li>Predictive maintenance using historical patterns</li>
              <li>Mobile inspection forms with offline support</li>
              <li>Email / SMS alert integration (configuration required)</li>
              <li>QR / barcode equipment labels for field use</li>
              <li>GIS map integration for substation locations</li>
              <li>External integration with SCADA / ERP systems</li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild>
            <Link href="/login">Open dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}