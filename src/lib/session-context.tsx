'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import type { Role } from './types';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  is_demo?: number;
}

export interface SessionPermissions {
  canManageUsers: boolean;
  canManageSubstations: boolean;
  canManageEquipmentTypes: boolean;
  canCreateEquipment: boolean;
  canEditEquipment: boolean;
  canDeleteEquipment: boolean;
  canCreateMaintenance: boolean;
  canEditMaintenance: boolean;
  canDeleteMaintenance: boolean;
  canCreateInspection: boolean;
  canViewAnalytics: boolean;
  canViewReports: boolean;
  canExportData: boolean;
}

export const EMPTY_PERMISSIONS: SessionPermissions = {
  canManageUsers: false,
  canManageSubstations: false,
  canManageEquipmentTypes: false,
  canCreateEquipment: false,
  canEditEquipment: false,
  canDeleteEquipment: false,
  canCreateMaintenance: false,
  canEditMaintenance: false,
  canDeleteMaintenance: false,
  canCreateInspection: false,
  canViewAnalytics: false,
  canViewReports: false,
  canExportData: false,
};

interface SessionContextValue {
  user: SessionUser | null;
  permissions: SessionPermissions;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  permissions: EMPTY_PERMISSIONS,
  loading: true,
  refresh: async () => {},
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: async () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<SessionPermissions>(EMPTY_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await r.json();
      if (data.user) {
        setUser(data.user);
        setPermissions(data.permissions ?? EMPTY_PERMISSIONS);
      } else {
        setUser(null);
        setPermissions(EMPTY_PERMISSIONS);
      }
    } catch {
      setUser(null);
      setPermissions(EMPTY_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const data = await r.json();
        return { ok: false, error: data.error ?? 'Login failed' };
      }
      await refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  }, [refresh]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (!r.ok) {
        const data = await r.json();
        return { ok: false, error: data.error ?? 'Registration failed' };
      }
      await refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setPermissions(EMPTY_PERMISSIONS);
  }, []);

  return (
    <SessionContext.Provider value={{ user, permissions, loading, refresh, login, register, logout }}>
      {children}
    </SessionContext.Provider>
  );
}