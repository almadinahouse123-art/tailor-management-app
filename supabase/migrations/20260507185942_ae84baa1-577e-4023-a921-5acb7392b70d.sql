-- Workers
CREATE TABLE public.workers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  rate_per_suit NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.workers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_workers_updated BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Worker Ledger
CREATE TABLE public.worker_ledger (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  worker_id BIGINT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  earned_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.worker_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_worker_ledger_worker ON public.worker_ledger(worker_id);

-- Inventory
CREATE TABLE public.inventory (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily Production
CREATE TABLE public.daily_production (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  worker_id BIGINT REFERENCES public.workers(id) ON DELETE SET NULL,
  order_id BIGINT,
  suits_count INTEGER NOT NULL DEFAULT 0,
  rate_per_suit NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_production ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.daily_production FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_dp_date ON public.daily_production(production_date);
CREATE INDEX idx_dp_worker ON public.daily_production(worker_id);