'use client';

import { SessionProvider } from '@/lib/session-context';
import { AppShell } from '@/components/app-shell';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <AppShell>{children}</AppShell>
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </SessionProvider>
  );
}