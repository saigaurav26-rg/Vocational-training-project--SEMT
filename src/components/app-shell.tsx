'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Building2,
  Cpu,
  Wrench,
  ClipboardCheck,
  Calendar,
  Bell,
  FileText,
  BarChart3,
  Settings,
  ShieldCheck,
  Search,
  LogOut,
  Zap,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: (perm: ReturnType<typeof rolePermissions>) => boolean;
}

function rolePermissions(role: string | undefined) {
  return {
    isAdmin: role === 'ADMIN',
    canManageSubstations: role === 'ADMIN' || role === 'ENGINEER',
    canManageEquipmentTypes: role === 'ADMIN',
    canCreateEquipment: role === 'ADMIN' || role === 'ENGINEER',
    canCreateMaintenance: role === 'ADMIN' || role === 'ENGINEER' || role === 'MAINTENANCE_STAFF',
    canCreateInspection: role === 'ADMIN' || role === 'ENGINEER' || role === 'MAINTENANCE_STAFF',
    canViewAnalytics: role === 'ADMIN' || role === 'ENGINEER' || role === 'VIEWER',
    canViewReports: true,
    canManageUsers: role === 'ADMIN',
  };
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: () => true },
  { href: '/substations', label: 'Substations', icon: Building2, visible: () => true },
  { href: '/equipment', label: 'Equipment', icon: Cpu, visible: () => true },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, visible: () => true },
  { href: '/inspections', label: 'Inspections', icon: ClipboardCheck, visible: () => true },
  { href: '/schedule', label: 'Schedule', icon: Calendar, visible: () => true },
  { href: '/work-queue', label: 'Work Queue', icon: Bell, visible: () => true },
  { href: '/reports', label: 'Reports', icon: FileText, visible: (p) => p.canViewReports },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, visible: (p) => p.canViewAnalytics },
  { href: '/admin/users', label: 'Admin', icon: ShieldCheck, visible: (p) => p.canManageUsers },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, permissions, loading, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/login') && !pathname.startsWith('/register') && !pathname.startsWith('/about') && !pathname.startsWith('/landing')) {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/landing') || pathname.startsWith('/about')) {
    return <>{children}</>;
  }

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Redirecting to login…</div>
      </div>
    );
  }

  const perms = rolePermissions(user.role);
  const items = NAV_ITEMS.filter((it) => it.visible(perms));

  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon" className="border-r">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Zap className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">SEMT</span>
                <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Maintenance Tracker</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link href={item.href}>
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-xs font-medium">{user.name}</span>
                <span className="truncate text-[10px] text-sidebar-foreground/60">{user.role.replace('_', ' ')}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await logout();
                  router.replace('/login');
                }}
                className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                aria-label="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="w-full max-w-md justify-start text-xs text-muted-foreground"
              >
                <Search className="mr-2 h-3.5 w-3.5" />
                Search equipment, substations, maintenance…
                <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground">
                About
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>

        {searchOpen ? <GlobalSearch onClose={() => setSearchOpen(false)} /> : null}
      </div>
    </SidebarProvider>
  );
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ substations: unknown[]; equipment: unknown[]; maintenance: unknown[]; inspections: unknown[] }>({ substations: [], equipment: [], maintenance: [], inspections: [] });
  const router = useRouter();

  useEffect(() => {
    if (q.trim().length < 2) {
      setData({ substations: [], equipment: [], maintenance: [], inspections: [] });
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (r.ok) {
        const d = await r.json();
        setData(d);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b p-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search equipment, substations, maintenance, inspections…"
            autoFocus
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-3 text-sm">
          {q.trim().length < 2 ? (
            <div className="py-6 text-center text-muted-foreground">Type at least 2 characters…</div>
          ) : (
            <>
              <SearchSection title="Substations" items={data.substations as Array<{ id: number; substation_name: string; substation_code: string }>} emptyText="No substations" onPick={(id) => { onClose(); router.push(`/substations/${id}`); }} renderItem={(s) => `${s.substation_code} • ${s.substation_name}`} />
              <SearchSection title="Equipment" items={data.equipment as Array<{ id: number; equipment_tag: string; equipment_name: string; type: string }>} emptyText="No equipment" onPick={(id) => { onClose(); router.push(`/equipment/${id}`); }} renderItem={(e) => `${e.equipment_tag} • ${e.equipment_name} (${e.type})`} />
              <SearchSection title="Maintenance" items={data.maintenance as Array<{ id: number; equipment_tag: string; equipment_name: string; maintenance_type: string; maintenance_date: string }>} emptyText="No maintenance" onPick={(id) => { onClose(); router.push(`/maintenance/${id}`); }} renderItem={(m) => `${m.equipment_tag} • ${m.maintenance_type} • ${m.maintenance_date}`} />
              <SearchSection title="Inspections" items={data.inspections as Array<{ id: number; equipment_tag: string; inspection_type: string; inspection_date: string }>} emptyText="No inspections" onPick={(id) => { onClose(); router.push(`/inspections/${id}`); }} renderItem={(i) => `${i.equipment_tag} • ${i.inspection_type} • ${i.inspection_date}`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchSection<T extends { id: number }>({
  title,
  items,
  emptyText,
  onPick,
  renderItem,
}: {
  title: string;
  items: T[];
  emptyText: string;
  onPick: (id: number) => void;
  renderItem: (item: T) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-0.5">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onPick(it.id)}
            className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
          >
            {renderItem(it)}
          </button>
        ))}
      </div>
    </div>
  );
}