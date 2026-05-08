ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_worker_id bigint REFERENCES public.workers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_rate numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_worker ON public.orders(assigned_worker_id);