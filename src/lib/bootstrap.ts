import { initSchema } from './db';
import { seedDatabase } from './seed';

let initialized = false;
let initializing: Promise<void> | null = null;

export async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (initializing) {
    await initializing;
    return;
  }
  initializing = (async () => {
    try {
      initSchema();
      await seedDatabase();
      initialized = true;
    } finally {
      initializing = null;
    }
  })();
  await initializing;
}