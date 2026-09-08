import { useState, useCallback } from 'react';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T,>(url: string, options?: RequestInit): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers ?? {}),
        },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        const msg = data.error ?? `Request failed (${r.status})`;
        setError(msg);
        return null;
      }
      const data = await r.json();
      return data as T;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error, setError };
}