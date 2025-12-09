 
#CHECK BELOW ALL TABLES SQL IN SUPABASE AND TRIGGERS

this is the current sql for table profits  

create table public.profits (
  id bigserial not null,
  order_id bigint null,
  investor_id uuid null,
  gross_profit numeric null,
  net_profit numeric null,
  created_at timestamp with time zone null default now(),
  cost_per_piece numeric(10, 2) null,
  price_per_piece numeric(10, 2) null,
  constraint profits_pkey primary key (id),
  constraint profits_order_id_investor_id_key unique (order_id, investor_id),
  constraint profits_investor_id_fkey foreign KEY (investor_id) references investors (id),
  constraint profits_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint profits_exclude_investor_10fd29e7 check (
    (
      investor_id <> '10fd29e7-ad45-4784-a57a-8022fa5c5b41'::uuid
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_profits_order_id on public.profits using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_profits_investor_id on public.profits using btree (investor_id) TABLESPACE pg_default;

create index IF not exists idx_profits_created_at on public.profits using btree (created_at) TABLESPACE pg_default;   ///  and for table orders is   create table public.orders (
  id bigserial not null,
  product_id bigint null,
  order_number bigint not null,
  shipping_number bigint null,
  paid_amount numeric not null,
  total_price numeric not null,
  quantity integer not null,
  sizes text not null,
  payment_method text null,
  payment_fees numeric null default 0,
  delivery_fees numeric null default 0,
  status text null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  cost_per_piece numeric(10, 2) null,
  price_per_piece numeric(10, 2) null,
  constraint orders_pkey primary key (id),
  constraint orders_product_id_fkey foreign KEY (product_id) references products (id),
  constraint orders_payment_method_check check (
    (
      payment_method = any (array['cash'::text, 'card'::text, 'tabby'::text])
    )
  ),
  constraint orders_status_check check (
    (
      status = any (
        array[
          'completed'::text,
          'canceled'::text,
          'pending'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_orders_product_id on public.orders using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_orders_status on public.orders using btree (status) TABLESPACE pg_default;

create index IF not exists idx_orders_order_number on public.orders using btree (order_number) TABLESPACE pg_default;

create index IF not exists idx_orders_created_at on public.orders using btree (created_at) TABLESPACE pg_default;

create trigger trg_new_order
after INSERT on orders for EACH row
execute FUNCTION handle_new_order ();

create trigger trigger_calculate_profit
after INSERT
or
update OF status,
total_price,
quantity,
payment_fees,
delivery_fees,
cost_per_piece,
price_per_piece on orders for EACH row when (
  new.status = any (array['completed'::text, 'canceled'::text])
)
execute FUNCTION calculate_and_store_profit ();

create trigger update_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at_column ();    


/////////  and for table investors  create table public.investors (
  id uuid not null default gen_random_uuid (),
  name text not null,
  email text not null,
  profit_percentage numeric not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint investors_pkey primary key (id),
  constraint investors_email_key unique (email)
) TABLESPACE pg_default;

create trigger update_investors_updated_at BEFORE
update on investors for EACH row
execute FUNCTION update_updated_at_column ();   


///  and for table products   create table public.products (
  id bigserial not null,
  name text not null,
  cost_per_piece numeric not null,
  price_per_piece numeric not null,
  quantity integer not null,
  image_url text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint products_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_products_name on public.products using btree (name) TABLESPACE pg_default;

create trigger update_products_updated_at BEFORE
update on products for EACH row
execute FUNCTION update_updated_at_column ();    


///// and table product_variants  create table public.product_variants (
  id bigserial not null,
  product_id bigint null,
  size text not null,
  quantity integer not null,
  price numeric not null,
  cost numeric not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  shipment_id bigint null,
  constraint product_variants_pkey primary key (id),
  constraint product_variants_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE,
  constraint product_variants_shipment_id_fkey foreign KEY (shipment_id) references shipments (id)
) TABLESPACE pg_default;

create index IF not exists idx_product_variants_product_size on public.product_variants using btree (product_id, size) TABLESPACE pg_default;

create index IF not exists idx_product_variants_quantity on public.product_variants using btree (quantity) TABLESPACE pg_default;

create index IF not exists idx_product_variants_product_id on public.product_variants using btree (product_id) TABLESPACE pg_default;

create trigger update_product_variants_updated_at BEFORE
update on product_variants for EACH row
execute FUNCTION update_updated_at_column ();    


///  and for table expenses  create table public.expenses (
  id bigserial not null,
  details text not null,
  amount numeric not null,
  paid_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint expenses_pkey primary key (id),
  constraint expenses_paid_by_fkey foreign KEY (paid_by) references investors (id)
) TABLESPACE pg_default;

create trigger update_expenses_updated_at BEFORE
update on expenses for EACH row
execute FUNCTION update_updated_at_column ();    


/////  and for table shipments  create table public.shipments (
  id bigserial not null,
  name text not null,
  cost numeric not null,
  details text null,
  paid_by uuid null,
  date date not null,
  tracking_number text null,
  destination text null,
  status text null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint shipments_pkey primary key (id),
  constraint shipments_paid_by_fkey foreign KEY (paid_by) references investors (id),
  constraint shipments_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'shipped'::text,
          'delivered'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_shipments_status on public.shipments using btree (status) TABLESPACE pg_default;

create trigger update_shipments_updated_at BEFORE
update on shipments for EACH row
execute FUNCTION update_updated_at_column ();     


.........................

#TRIGGERS

Name	Table	Function	Events	Orientation	Enabled	

trg_new_order
orders
handle_new_order
AFTER INSERT
ROW



trigger_calculate_profit
orders
calculate_and_store_profit
AFTER UPDATE
AFTER INSERT
ROW



update_expenses_updated_at
expenses
update_updated_at_column
BEFORE UPDATE
ROW



update_investors_updated_at
investors
update_updated_at_column
BEFORE UPDATE
ROW



update_orders_updated_at
orders
update_updated_at_column
BEFORE UPDATE
ROW



update_product_variants_updated_at
product_variants
update_updated_at_column
BEFORE UPDATE
ROW



update_products_updated_at
products
update_updated_at_column
BEFORE UPDATE
ROW



update_shipments_updated_at
shipments
update_updated_at_column
BEFORE UPDATE
ROW


.........................





>>>>>>  please check them all and find the issue and what should be updated 