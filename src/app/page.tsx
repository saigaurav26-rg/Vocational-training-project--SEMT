import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { ensureInit } from '@/lib/bootstrap';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Cpu,
  ClipboardCheck,
  BarChart3,
  FileText,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Building2,
  Wrench,
  Calendar,
  Bell,
  Activity,
} from 'lucide-react';

export default async function Home() {
  await ensureInit();
  const user = await getSessionUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b bg-background/80 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">SEMT</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Maintenance Tracker</span>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/about">About</Link>
            </Button>
            <Button asChild variant="outline" size="sm"><Link href="/login">Sign in</Link></Button>
            <Button asChild size="sm"><Link href="/register">Get started</Link></Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="kpi-gradient-navy absolute inset-0 opacity-95" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
          <div className="text-primary-foreground">
            <Badge variant="outline" className="mb-4 border-white/30 bg-white/10 text-primary-foreground">
              <ShieldCheck className="mr-1 h-3 w-3" /> Demonstration maintenance management application
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl">
              Substation Equipment<br />Maintenance Tracker
            </h1>
            <p className="mt-3 text-sm uppercase tracking-[0.2em] text-primary-foreground/80">
              Equipment • Inspection • Maintenance • History
            </p>
            <p className="mt-4 max-w-xl text-pretty text-sm text-primary-foreground/80 md:text-base">
              A structured platform for managing substation equipment information, inspection records,
              maintenance schedules and equipment history — engineered for field staff, maintenance crews and engineering teams.
            </p>
            <p className="mt-6 text-sm italic text-primary-foreground/80">
              “Track equipment. Plan maintenance. Preserve reliability.”
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href="/login">
                  Sign in <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                <Link href="/register">Create account</Link>
              </Button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-primary-foreground/80">
              <div><div className="text-xl font-semibold text-white">25+</div><div>Equipment records</div></div>
              <div><div className="text-xl font-semibold text-white">4</div><div>Sample substations</div></div>
              <div><div className="text-xl font-semibold text-white">Real</div><div>Persistent DB</div></div>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero.png" alt="Substation equipment" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-lg border bg-card p-3 text-xs shadow-xl md:block">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <div className="font-medium">Health score</div>
                  <div className="text-muted-foreground">Application Maintenance Health Indicator</div>
                </div>
                <div className="ml-2 rounded bg-emerald-100 px-2 py-0.5 font-mono text-emerald-700">87 / 100</div>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 hidden rounded-lg border bg-card p-3 text-xs shadow-xl md:block">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-red-600" />
                <div>
                  <div className="font-medium">3 overdue</div>
                  <div className="text-muted-foreground">Maintenance alerts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Built for substation operations</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every module uses real persistence, role-based authorization and live database analytics.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Building2, title: 'Substations', desc: 'Manage multiple substations with voltage levels, locations and aggregated health.' },
            { icon: Cpu, title: 'Equipment tracking', desc: 'Configurable equipment types with dynamic specifications and ratings.' },
            { icon: ClipboardCheck, title: 'Inspection records', desc: 'Routine, periodic and condition-based inspections with traceability.' },
            { icon: Wrench, title: 'Maintenance scheduling', desc: 'Automatic next-due calculation, overdue detection and priority scoring.' },
            { icon: Calendar, title: 'Work queue', desc: 'Prioritised workload grouped by overdue, due-today, due-this-week.' },
            { icon: FileText, title: 'Reports & exports', desc: 'Inventory, maintenance, condition and reliability reports with CSV export.' },
            { icon: ShieldCheck, title: 'Role-based access', desc: 'Admin, Engineer, Maintenance Staff and Viewer permissions enforced server-side.' },
            { icon: Activity, title: 'Substation health', desc: 'Aggregated Application Maintenance Health Indicator with per-substation breakdown.' },
            { icon: BarChart3, title: 'Live analytics', desc: 'Real-time KPIs, trends, condition distribution, preventive vs corrective mix.' },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-5 shadow-sm">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Complete equipment lifecycle</h2>
            <p className="mt-2 text-sm text-muted-foreground">From registration to maintenance history — in one workflow.</p>
          </div>
          <ol className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {[
              'Add substation',
              'Add equipment',
              'Record ratings',
              'Schedule maintenance',
              'Record inspection',
              'Record maintenance',
              'Track history',
            ].map((step, idx) => (
              <li key={step} className="rounded-lg border bg-card p-4 text-center shadow-sm">
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{idx + 1}</div>
                <div className="text-xs font-medium">{step}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Demo accounts */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold">Try the demo</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The application is seeded with sample substations, equipment, ratings, inspections and maintenance history.
            Sign in with one of the demo accounts to explore.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              { role: 'Admin', email: 'admin@semt.local', pass: 'admin123', desc: 'Full access including user management, equipment types and audit log.' },
              { role: 'Engineer', email: 'engineer@semt.local', pass: 'engineer123', desc: 'Manage substations, equipment and maintenance records.' },
              { role: 'Maintenance Staff', email: 'staff@semt.local', pass: 'staff123', desc: 'Record inspections and maintenance updates.' },
              { role: 'Viewer', email: 'viewer@semt.local', pass: 'viewer123', desc: 'Read-only access to dashboard and reports.' },
            ].map((a) => (
              <div key={a.role} className="rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="text-sm font-semibold">{a.role}</div>
                <div className="mt-1 font-mono">{a.email}</div>
                <div className="font-mono text-muted-foreground">password: {a.pass}</div>
                <div className="mt-1 text-muted-foreground">{a.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild size="lg"><Link href="/login">Sign in to dashboard</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/register">Create new account</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/30 px-6 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl">
          <p>
            Demonstration maintenance management application. Seeded values are sample data based on documented equipment specifications.
          </p>
          <p className="mt-1">
            <Link href="/about" className="underline-offset-2 hover:underline">About</Link>
            {' · '}
            This system is not a replacement for official utility procedures, manufacturer instructions or safety regulations.
          </p>
        </div>
      </footer>
    </div>
  );
}