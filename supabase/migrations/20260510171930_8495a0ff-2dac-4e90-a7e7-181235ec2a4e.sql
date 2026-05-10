-- Add deleted_at to all main tables
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.customer_ledger ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.customer_ledger ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.worker_ledger ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.worker_ledger ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.daily_production ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.daily_production ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- updated_at triggers (function set_updated_at already exists)
DROP TRIGGER IF EXISTS trg_measurements_updated ON public.measurements;
CREATE TRIGGER trg_measurements_updated BEFORE UPDATE ON public.measurements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated ON public.invoices;
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_ledger_updated ON public.customer_ledger;
CREATE TRIGGER trg_customer_ledger_updated BEFORE UPDATE ON public.customer_ledger FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_worker_ledger_updated ON public.worker_ledger;
CREATE TRIGGER trg_worker_ledger_updated BEFORE UPDATE ON public.worker_ledger FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_production_updated ON public.daily_production;
CREATE TRIGGER trg_daily_production_updated BEFORE UPDATE ON public.daily_production FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workers_updated ON public.workers;
CREATE TRIGGER trg_workers_updated BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated ON public.inventory;
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Partial indexes for active rows
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_measurements_active ON public.measurements(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_active ON public.orders(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workers_active ON public.workers(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_active ON public.inventory(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_active ON public.invoices(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customer_ledger_active ON public.customer_ledger(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_worker_ledger_active ON public.worker_ledger(worker_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_production_active ON public.daily_production(production_date) WHERE deleted_at IS NULL;