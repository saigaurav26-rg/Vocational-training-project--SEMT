'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/session-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (result.ok) {
      toast.success('Signed in');
      router.replace('/dashboard');
    } else {
      toast.error(result.error ?? 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold">SEMT</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Substation Equipment Maintenance Tracker</div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access your maintenance management dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-6 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo accounts</p>
              <ul className="mt-1 space-y-0.5">
                <li><code className="font-mono">admin@semt.local</code> / <code className="font-mono">admin123</code> — Admin</li>
                <li><code className="font-mono">engineer@semt.local</code> / <code className="font-mono">engineer123</code> — Engineer</li>
                <li><code className="font-mono">staff@semt.local</code> / <code className="font-mono">staff123</code> — Maintenance Staff</li>
                <li><code className="font-mono">viewer@semt.local</code> / <code className="font-mono">viewer123</code> — Viewer</li>
              </ul>
            </div>
            <div className="mt-4 text-center text-xs text-muted-foreground">
              No account?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </div>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Demonstration maintenance management application. Seeded values are sample data based on documented equipment specifications.
        </p>
      </div>
    </div>
  );
}