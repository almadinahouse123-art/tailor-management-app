
-- Per-user data isolation. Add user_id to all tenant tables, backfill to current admin,
-- set default auth.uid(), and replace permissive RLS with auth.uid() = user_id.

DO $$
DECLARE
  admin_id uuid := '0a7c7663-51fc-40e7-aa92-ff22b1c34bd6';
  t text;
  tables text[] := ARRAY[
    'customers','orders','measurements','workers','inventory',
    'invoices','daily_production','customer_ledger','worker_ledger'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id uuid', t);
    EXECUTE format('UPDATE public.%I SET user_id = %L WHERE user_id IS NULL', t, admin_id);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(user_id)', t || '_user_id_idx', t);

    -- Drop old permissive policy
    EXECUTE format('DROP POLICY IF EXISTS "auth all" ON public.%I', t);

    -- New per-user policies
    EXECUTE format($p$CREATE POLICY "own select" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)$p$, t);
    EXECUTE format($p$CREATE POLICY "own insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)$p$, t);
    EXECUTE format($p$CREATE POLICY "own update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)$p$, t);
    EXECUTE format($p$CREATE POLICY "own delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)$p$, t);
  END LOOP;
END $$;
