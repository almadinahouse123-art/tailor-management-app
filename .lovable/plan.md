## What's already done

- Cloud database with per-user `user_id` and strict RLS — each account only sees its own customers, orders, measurements, workers, inventory, invoices, ledgers. Every change is already saved to the cloud automatically.

## Phase A — ship now (≈30 min)

1. **Google Sign-In** — enable managed Google OAuth, add a "Sign in with Google" button on `/login`. Email/password stays as a fallback.
2. **Backup & Restore page** (`/app/backup`)
   - **Download Backup** → exports all your data (customers, measurements, orders, workers, inventory, invoices, ledgers, production) as a single timestamped JSON file.
   - **Upload Backup** → restores from a JSON file into your account (records get new IDs; existing data is kept — no destructive overwrite).
   - Useful for device change: log in with Google on new phone → upload backup → done. (Plus, all data is already auto-synced via the cloud DB, so a fresh login on a new device shows everything immediately.)
3. **Dashboard status strip** — Online/Offline indicator (live), last-successful-sync timestamp, last-backup timestamp.
4. **Logout** button in the app header.

## Phase B — offline-first write queue (separate, larger task)

True offline writes (add customer / order / payment while disconnected, sync later) require:
- IndexedDB queue for pending mutations
- Refactor every save in the app to go through the queue
- Conflict handling (client-generated UUIDs instead of DB bigint IDs — schema change)
- Service worker for app shell

This is a multi-hour rebuild of the data layer. I recommend doing Phase A first (covers 95% of the "don't lose data" need because the DB is already the source of truth), then deciding if Phase B is worth the complexity for your shop's actual offline time.

For now, the app will show an **Offline** banner when there's no internet and disable save buttons, so users know to wait. Reads continue from cached React Query data.

## Technical notes

- Google OAuth via `lovable.auth.signInWithOAuth("google", ...)` (managed credentials, no setup needed).
- Backup export: parallel `select *` per table filtered by RLS → `JSON.stringify` → Blob download.
- Backup restore: parse JSON → for each table, strip `id`/`created_at`/`updated_at`/`deleted_at` → bulk insert (user_id auto-filled by DB default `auth.uid()`).
- Online status: `navigator.onLine` + `online`/`offline` window events.
- Last-sync timestamp: stored in `localStorage`, updated on every successful query/mutation.

Proceed with Phase A?