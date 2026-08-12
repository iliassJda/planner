# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

There is no test suite.

> **Branch policy**: All changes must go through a pull request — do not commit directly to `main`.

## Environment Variables

Required in `.env.local`:

| Variable                                | Purpose                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --- |
| `AUTH_SECRET`                           | NextAuth secret                                                                                      |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials                                                                             |
| `NEXT_PUBLIC_SUPABASE_URL`              | Supabase project URL                                                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`             | Admin key (server-only, never exposed to client)                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`         | Public anon key                                                                                      |
| `APP_REGION`                            | Region name used to filter stores (e.g. `"Bruxelles"`)                                               |
| `GEMINI_API_KEY`                        | Google Gemini API key for AI schedule generation                                                     |
| <!--                                    | `PLANNER_BETA_EMAILS`                                                                                | Comma-separated email allowlist for beta access | --> |
| `DEVELOPER_EMAILS`                      | Comma-separated email allowlist for `/admin/support` ticket triage, and the recipients of new-ticket emails. Fails closed: unset means nobody |
| `RESEND_API_KEY`                        | Resend API key for new-ticket email notifications (server-only). Unset disables sending |
| `SUPPORT_FROM_EMAIL`                    | From-address for those emails, on a Resend-verified domain |
| `APP_URL`                               | Optional. Absolute base URL used for links inside emails. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000` |

## Architecture

This is a Next.js 16 App Router application for staff scheduling at Neuhaus chocolate shops. It collects weekly availability from student employees and allows admins to build shift schedules.

### Route Groups & Auth Flow

Two protected route groups each with their own layout:

- **`(admin)/`** — `app/(admin)/layout.tsx` checks session, calls `getAllowData()`, and redirects non-admins to an access-restricted page. Only users with `role === "admin"` and `allowed === true` in Supabase enter.
- **`(user)/`** — `app/(user)/layout.tsx` checks session and `allowed` flag; students and fix employees land here.

The resolved `User` object is passed down to all client components via `UserProvider` → `UserContext`. Consume it with `useUser()` from `context/user-context.tsx`.

### User Roles

Three roles defined in `types.ts`:

- **`student`** — submits weekly availability; reads own planning
- **`fix`** — permanent employees; automatically scheduled every day at their assigned store
- **`admin`** — manages weeks, users, and the shift planner

New sign-ins via Google are inserted into Supabase with `allowed: false` and `role_name: "student"`. An admin must manually approve them in `/admin/all-users`.

### Key Pages

| Route                      | Purpose                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| `/login`                   | Google OAuth sign-in                                                  |
| `/(user)/dashboard`        | Students submit/edit their weekly availability                        |
| `/(user)/planning`         | Students view their published schedule                                |
| `/(admin)/admin`           | Admin creates/activates/deactivates weeks for availability collection |
| `/(admin)/admin/maker`     | Drag-and-drop weekly shift planner + AI generation                    |
| `/(admin)/admin/all-users` | Approve users, change roles, assign stores                            |
| `/(admin)/admin/data`      | Export availability data as CSV                                       |
| `/planning/[weekLabel]`    | Public per-week planning view (navigable by week label)               |
| `/api/export`              | Excel export endpoint                                                 |

### Data Layer

All database access goes through `action/supabase.ts` using `supabaseAdmin` (`utils/supabase/admin.ts`), which is a Supabase client created with the **service role key** — it bypasses Row Level Security entirely. Never use this client on the client side.

Key Supabase tables: `User`, `Week`, `Availability`, `shifts`, `store`, `notifications`.

**Week ID format**: `"{year}-{weekNumber}"` (e.g., `"2025-42"`). This string is used as the primary key in the `Week` table and as a foreign key in `Availability`.

### AI Schedule Generation

`action/generate-planning.ts` calls **Google Gemini 2.5 Flash** with a structured prompt containing stores, fix employees, student availabilities, and an optional manager note. It returns a JSON array of shifts which are validated against known store IDs before being saved.

### UI Components

shadcn/ui (`components/ui/`) built on Radix UI primitives with Tailwind CSS v4. Toast notifications use `sonner`. The weekly planner uses `react-dnd` for drag-and-drop shift assignment. Date utilities use `date-fns`.

`help_functions.ts` contains shared pure functions: `getWeekStartDate` (ISO week calculation), `getAvailabilityForDate`, `AVAILABILITY_STYLES`, and others used across both admin and user views.
