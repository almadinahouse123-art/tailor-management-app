
-- CUSTOMERS
create table public.customers (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  address text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MEASUREMENTS (full history)
create table public.measurements (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  lambai text,
  daman text,
  chorai text,
  tera text,
  asteen text,
  collar_type text, -- 'بن' | 'دو ٹکڑا'
  cuff_paimaish text,
  jeb text, -- '2 سائیڈ' | '2+1'
  asteen_type text, -- 'کف' | 'کنار' | 'چک پٹے'
  asteen_description text,
  shalwar_size text,
  panja text,
  notes text,
  fabric_image_url text,
  created_at timestamptz not null default now()
);
create index on public.measurements (customer_id, created_at desc);

-- ORDERS
create table public.orders (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  order_date date not null default current_date,
  delivery_date date,
  status text not null default 'Pending', -- Pending|Stitching|Ready|Delivered
  fabric_image_url text,
  instructions text,
  design_type text, -- Simple|Fancy|Embroidery|Printed
  color text,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (customer_id);

-- CUSTOMER LEDGER
create table public.customer_ledger (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  order_id bigint references public.orders(id) on delete set null,
  entry_date date not null default current_date,
  description text,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index on public.customer_ledger (customer_id, entry_date desc);

-- INVOICES
create table public.invoices (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  order_id bigint references public.orders(id) on delete set null,
  invoice_date date not null default current_date,
  total_suits int not null default 0,
  price_per_suit numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.invoices (customer_id);

-- RLS
alter table public.customers enable row level security;
alter table public.measurements enable row level security;
alter table public.orders enable row level security;
alter table public.customer_ledger enable row level security;
alter table public.invoices enable row level security;

-- single-user app: any authenticated user has full access
create policy "auth all" on public.customers for all to authenticated using (true) with check (true);
create policy "auth all" on public.measurements for all to authenticated using (true) with check (true);
create policy "auth all" on public.orders for all to authenticated using (true) with check (true);
create policy "auth all" on public.customer_ledger for all to authenticated using (true) with check (true);
create policy "auth all" on public.invoices for all to authenticated using (true) with check (true);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();
