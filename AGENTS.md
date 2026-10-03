# Architecture rules

- All on-device data goes through `getDb()` (LocalStore in src/lib/offline/store.ts); never use Dexie or SQLite directly — keeps one swappable data layer.
- Android (Capacitor native) uses the SQLite adapter, web/PWA uses the IndexedDB adapter — native storage must not depend on the WebView.
- Local schema changes are additive only (CREATE IF NOT EXISTS / new columns) — existing on-device business data must never be dropped.
- UI talks to data via the offline proxy client (`@/lib/offline/client`), which reads/writes locally and queues an outbox for sync — Supabase is never required for local CRUD.
