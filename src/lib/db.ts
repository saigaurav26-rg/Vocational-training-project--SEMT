import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'semt.db');

declare global {
  // eslint-disable-next-line no-var
  var __semt_db: Database.Database | undefined;
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export const db: Database.Database = globalThis.__semt_db ?? createDb();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__semt_db = db;
}

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'VIEWER',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS substations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      substation_name TEXT NOT NULL,
      substation_code TEXT UNIQUE NOT NULL,
      location TEXT,
      district TEXT,
      state TEXT,
      voltage_level TEXT,
      commissioning_date TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS equipment_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      default_maintenance_days INTEGER NOT NULL DEFAULT 180,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_tag TEXT UNIQUE NOT NULL,
      equipment_name TEXT NOT NULL,
      equipment_type_id INTEGER NOT NULL,
      substation_id INTEGER NOT NULL,
      manufacturer TEXT,
      model_number TEXT,
      serial_number TEXT,
      installation_date TEXT,
      commissioning_date TEXT,
      location TEXT,
      bay TEXT,
      feeder TEXT,
      voltage_level TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      condition TEXT NOT NULL DEFAULT 'GOOD',
      criticality TEXT NOT NULL DEFAULT 'MEDIUM',
      description TEXT,
      last_maintenance_date TEXT,
      next_maintenance_date TEXT,
      maintenance_frequency_days INTEGER NOT NULL DEFAULT 180,
      responsible_person TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_demo INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id),
      FOREIGN KEY (substation_id) REFERENCES substations(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_equipment_sub ON equipment(substation_id);
    CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipment_type_id);
    CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
    CREATE INDEX IF NOT EXISTS idx_equipment_condition ON equipment(condition);
    CREATE INDEX IF NOT EXISTS idx_equipment_next_maint ON equipment(next_maintenance_date);

    CREATE TABLE IF NOT EXISTS equipment_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      spec_key TEXT NOT NULL,
      spec_label TEXT NOT NULL,
      spec_value TEXT NOT NULL,
      unit TEXT,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ratings_eq ON equipment_ratings(equipment_id);

    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      maintenance_type TEXT NOT NULL,
      maintenance_date TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      maintenance_reason TEXT,
      observations TEXT,
      work_performed TEXT,
      parts_replaced TEXT,
      test_results TEXT,
      condition_before TEXT NOT NULL,
      condition_after TEXT NOT NULL,
      downtime_hours REAL DEFAULT 0,
      recommendations TEXT,
      next_maintenance_date TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_maint_eq ON maintenance_logs(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_maint_date ON maintenance_logs(maintenance_date);
    CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_logs(status);

    CREATE TABLE IF NOT EXISTS inspection_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      inspection_date TEXT NOT NULL,
      inspector TEXT NOT NULL,
      inspection_type TEXT NOT NULL,
      condition TEXT NOT NULL,
      observations TEXT,
      abnormalities TEXT,
      measurements TEXT,
      recommendations TEXT,
      next_action TEXT,
      follow_up_date TEXT,
      triggered_maintenance_id INTEGER,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_insp_eq ON inspection_logs(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_insp_date ON inspection_logs(inspection_date);

    CREATE TABLE IF NOT EXISTS maintenance_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      maintenance_type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      frequency_days INTEGER NOT NULL,
      last_completed TEXT,
      next_due TEXT NOT NULL,
      responsible_person TEXT,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'PLANNED',
      notes TEXT,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sched_eq ON maintenance_schedules(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_sched_next ON maintenance_schedules(next_due);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      equipment_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'INFO',
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      field TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);
  `);
}