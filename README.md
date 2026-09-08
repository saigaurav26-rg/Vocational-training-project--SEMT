# SEMT – Substation Equipment Maintenance Tracker

A professional full-stack maintenance management application for electrical substations. Equipment inventory, inspection, maintenance scheduling, maintenance history, condition tracking, analytics and reporting — all persisted in a real database with real authentication and role-based authorization.

> Demonstration maintenance management application. Seeded values are sample data based on documented equipment specifications (CSPTCL report context). Maintenance records included in the demo are illustrative.

## Features

- **Equipment inventory** — Configurable equipment types with dynamic technical specifications (Wave Trap, CT, PT, CVT, Lightning Arrester, Circuit Breaker, Isolator, Power Transformer, Protection Relay, Battery Bank, Busbar, Capacitor Bank, etc.).
- **Substation management** — Multiple substations with voltage levels, locations, status and aggregated health.
- **Maintenance tracking** — Preventive, corrective, predictive, breakdown, emergency and routine maintenance with full history and timeline.
- **Inspection workflows** — Routine, periodic, pre-monsoon, post-monsoon and special inspections that update equipment condition.
- **Scheduling** — Automatic next-due calculation based on frequency; overdue, due-today, due-soon, upcoming detection.
- **Work queue** — Prioritised maintenance workload grouped by urgency.
- **Dashboard** — Live KPIs, substation health overview, equipment by type/condition/substation, monthly maintenance trends.
- **Analytics** — Maintenance trends, condition distribution, preventive vs corrective mix.
- **Reports** — Equipment inventory, maintenance history, inspection history, overdue maintenance with CSV export.
- **Global search** — Cross-resource search across substations, equipment, maintenance and inspections.
- **Audit log** — All administrative actions and field changes recorded.
- **Role-based access control** — Admin, Engineer, Maintenance Staff and Viewer permissions enforced server-side.
- **Authentication** — Session-based auth with bcrypt password hashing.

## Technology stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 | Native full-stack, route handlers, server components |
| Language | TypeScript | Type safety across UI and API |
| Styling | Tailwind v4 + shadcn/ui | Engineering-themed design system |
| Charts | Recharts | Live analytics |
| Database | SQLite via better-sqlite3 | Reliable persistent storage, zero setup |
| Auth | Custom session cookies + bcrypt | Real authentication without external services |
| Validation | Zod | Server-side input validation |

## Architecture

```
src/
├── app/
│   ├── (app)/                    # Authenticated pages with sidebar
│   │   ├── dashboard/
│   │   ├── substations/
│   │   ├── equipment/
│   │   ├── maintenance/
│   │   ├── inspections/
│   │   ├── schedule/
│   │   ├── work-queue/
│   │   ├── reports/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── admin/
│   ├── api/                      # Route handlers (server-side API)
│   │   ├── auth/                 # login, register, logout, me
│   │   ├── substations/
│   │   ├── equipment/
│   │   ├── equipment-types/
│   │   ├── maintenance/
│   │   ├── inspections/
│   │   ├── schedules/
│   │   ├── analytics/
│   │   ├── alerts/
│   │   ├── audit/
│   │   ├── search/
│   │   └── users/
│   ├── login/  register/  about/  landing/
│   ├── layout.tsx
│   └── page.tsx                  # Landing → /dashboard if logged in
├── components/
│   ├── app-shell.tsx             # Sidebar + global search
│   └── providers.tsx
└── lib/
    ├── db.ts                     # SQLite + schema
    ├── seed.ts                   # Sample data (substations, equipment, history)
    ├── auth.ts                   # Sessions, password hashing, RBAC
    ├── business.ts               # Maintenance status engine, health calc, audit
    ├── api.ts                    # API helpers
    ├── session-context.tsx       # Client session provider
    ├── equipment-specs.ts        # Dynamic spec fields per equipment type
    ├── labels.ts                 # Tone classes, formatters
    ├── types.ts                  # Domain types
    └── use-api.ts                # Client-side fetch helper
```

## Database

Tables: `users`, `sessions`, `substations`, `equipment_types`, `equipment`, `equipment_ratings`, `maintenance_logs`, `inspection_logs`, `maintenance_schedules`, `notifications`, `audit_logs`. Indexes on `equipment_tag`, `substation_id`, `equipment_type_id`, `next_maintenance_date`, `inspection_date`, `maintenance_date`.

The schema is created automatically on first request. Sample data is seeded when the database is empty.

## Local development

```bash
bun install
bun run dev --port 4000
```

Then open http://localhost:4000.

The database file is created at `data/semt.db` on first run.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@semt.local | admin123 |
| Engineer | engineer@semt.local | engineer123 |
| Maintenance Staff | staff@semt.local | staff123 |
| Viewer | viewer@semt.local | viewer123 |

You can also create a new account from the register page — new accounts default to the Viewer role.

## Environment variables

See `.env.example`. The default configuration works out of the box.

## API surface

| Endpoint | Methods | Notes |
| --- | --- | --- |
| `/api/auth/login` | POST | Returns session |
| `/api/auth/register` | POST | Creates a Viewer account |
| `/api/auth/logout` | POST | Destroys session |
| `/api/auth/me` | GET | Current session |
| `/api/substations` | GET, POST | List / create |
| `/api/substations/[id]` | GET, PUT, DELETE | Detail / edit / delete |
| `/api/equipment-types` | GET, POST | Admin only for POST |
| `/api/equipment-types/[id]` | PUT, DELETE | Admin only |
| `/api/equipment` | GET, POST | Filters + pagination |
| `/api/equipment/[id]` | GET, PUT, DELETE | Full detail with ratings, maintenance and inspections |
| `/api/maintenance` | GET, POST | Filters + pagination |
| `/api/maintenance/[id]` | PUT, DELETE | |
| `/api/inspections` | GET, POST | |
| `/api/schedules` | GET, POST | |
| `/api/alerts` | GET | Generated alerts (overdue/due/critical) |
| `/api/analytics` | GET | KPIs, distributions, trends, substation health |
| `/api/audit` | GET | Admin only |
| `/api/users` | GET | Admin only |
| `/api/users/[id]` | PUT | Admin only (role changes) |
| `/api/search` | GET | Global search |

## Features requiring external configuration

- **Email notifications** — SMTP not configured; alerts are in-app only.
- **SMS notifications** — Not configured.
- **IoT sensor integration** — Not implemented.
- **Predictive maintenance** — Marked as future enhancement.
- **File/photo uploads** — Documents/photos schema is not enabled; data layer persists text metadata only.
- **QR/barcode equipment labels** — Marked as future enhancement.
- **AI assistant** — Not configured; core application works without AI.

## Limitations

- Single-node SQLite — suitable for development and single-tenant deployment.
- No background job processing — alert generation runs on demand.
- No real-time updates — UI refreshes on navigation.

## Testing

The application was exercised end-to-end:

- Login / logout with session cookies
- CRUD across substations, equipment, maintenance, inspections
- Permission enforcement (Viewer cannot POST equipment, etc.)
- Search across resources
- Analytics computed from real records
- Report generation and CSV export

## Deployment

The application runs as a Next.js app. `bun run build` produces the production bundle; `bun run start --port 4000` serves it.

For production:

- Use a process manager (systemd / pm2).
- Mount a persistent volume for `data/`.
- Configure `SEMT_APP_URL` and (optionally) SMTP / SMS providers.
- Place behind a reverse proxy (nginx, Caddy) with TLS.