ALTER TABLE public.daily_production
  ADD COLUMN IF NOT EXISTS simple_suits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS simple_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chakpate_suits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chakpate_rate numeric NOT NULL DEFAULT 0;