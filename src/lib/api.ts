import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';

export function ok<T>(data: T, init?: number | ResponseInit) {
  if (typeof init === 'number') {
    return NextResponse.json(data, { status: init });
  }
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return fail(err.message, err.status);
  }
  if (err instanceof ZodError) {
    return fail('Validation failed', 422, { issues: err.issues });
  }
  console.error('API error:', err);
  return fail('Internal server error', 500);
}