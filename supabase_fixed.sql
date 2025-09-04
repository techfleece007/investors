-- ==========================
-- 1. Investors
-- ==========================
create table investors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  profit_percentage numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into investors (id, name, email, profit_percentage) values
('fdd6c5c2-a39b-476d-a59b-396732f126e9', 'Shady', 'prvyit@gmail.com', 80),
('c6455e11-e4ba-4240-9b6c-45b7352988ae', 'Tamer', 'qudaih.tamer@gmail.com', 20);

-- ==========================
-- 2. Shipments
-- ==========================
create table shipments (
  id bigserial primary key,
  name text not null,
  cost numeric not null,
  details text,
  paid_by uuid references investors(id),
  date date not null,
  tracking_number text,
  destination text,
  status text check (status in ('pending', 'shipped', 'delivered')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into shipments (name, cost, details, paid_by, date, tracking_number, destination, status) values
('China Products', 8480, '55 pieces', 'c6455e11-e4ba-4240-9b6c-45b7352988ae', '2025-08-27', 'CH001', 'China', 'pending'),
('Turkey Products', 4935, '46 pieces', 'c6455e11-e4ba-4240-9b6c-45b7352988ae', '2025-08-26', 'TR001', 'Turkey', 'delivered'),
('Local Delivery', 500, 'Express delivery service', 'ec91efc1-3d73-4395-8290-f1700e55dad1', '2025-08-25', 'LD001', 'Local', 'delivered');

-- ==========================
-- 3. Products
-- ==========================
create table products (
  id bigserial primary key,
  name text not null,
  cost_per_piece numeric not null,
  price_per_piece numeric not null,
  quantity int not null,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table product_variants (
  id bigserial primary key,
  product_id bigint references products(id) on delete cascade,
  size text not null,
  quantity int not null,
  price numeric not null,
  cost numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert Products with corrected image URLs and added price field
insert into products (name, cost_per_piece, price_per_piece, quantity, image_url) values
('Nike Tech New Black', 107, 250, 10, '/images/nike-new-black.jpg'),
('Nike Tech Old Black', 107, 220, 6, '/images/nike-old-black.jpeg'),
('Nike Tech Red White', 107, 250, 5, '/images/nike-redwhite.jpg'),
('Nike Tech Off White', 107, 250, 10, '/images/nike-offwhite.jpg'),
('Nike Tech New Grey', 107, 250, 5, '/images/nike-new-grey.jpg'),
('Nike Tech Syna', 107, 250, 10, '/images/syna-nike.jpeg'),
('Nocta Black Zip', 154, 350, 23, '/images/nocta-black-zip.jpg'),
('Nocta Blue Zip', 154, 350, 18, '/images/nocta-blue-zip.jpg'),
('Nocta Green Zip', 154, 350, 7, '/images/nocta-green-zip.jpg'),
('Nocta Black NO-Zip', 154, 320, 7, '/images/nocta-black-nozip.jpg');

-- Insert Variants with price field
insert into product_variants (product_id, size, quantity, price, cost)
values
-- Nike Tech New Black
(1,'S',2,250,107),(1,'M',2,250,107),(1,'L',2,250,107),(1,'XL',2,250,107),(1,'XXL',2,250,107),
-- Nike Tech Old Black
(2,'S',2,220,107),(2,'M',2,220,107),(2,'L',1,220,107),(2,'XL',1,220,107),
-- Nike Tech Red White
(3,'S',1,250,107),(3,'M',1,250,107),(3,'L',1,250,107),(3,'XL',1,250,107),(3,'XXL',1,250,107),
-- Nike Tech Off White
(4,'S',2,250,107),(4,'M',2,250,107),(4,'L',2,250,107),(4,'XL',2,250,107),(4,'XXL',2,250,107),
-- Nike Tech New Grey
(5,'S',1,250,107),(5,'M',1,250,107),(5,'L',1,250,107),(5,'XL',1,250,107),(5,'XXL',1,250,107),
-- Nike Tech Syna
(6,'S',2,250,107),(6,'M',2,250,107),(6,'L',2,250,107),(6,'XL',2,250,107),(6,'XXL',2,250,107),
-- Nocta Black Zip
(7,'S',3,350,154),(7,'M',6,350,154),(7,'L',9,350,154),(7,'XL',5,350,154),
-- Nocta Blue Zip
(8,'S',3,350,154),(8,'M',5,350,154),(8,'L',7,350,154),(8,'XL',3,350,154),
-- Nocta Green Zip
(9,'S',2,350,154),(9,'M',2,350,154),(9,'L',2,350,154),(9,'XL',1,350,154),
-- Nocta Black NO-Zip
(10,'S',2,320,154),(10,'M',2,320,154),(10,'L',2,320,154),(10,'XL',1,320,154);

-- Add indexes for better performance
create index idx_product_variants_product_size on product_variants(product_id, size);
create index idx_product_variants_quantity on product_variants(quantity);

-- ==========================
-- 4. Orders
-- ==========================
-- Note: sizes field can contain multiple sizes separated by commas (e.g., 'L,XL')
-- quantity represents total quantity across all sizes
create table orders (
  id bigserial primary key,
  product_id bigint references products(id),
  product_variant_id bigint references product_variants(id),
  order_number bigint not null,
  shipping_number bigint,
  paid_amount numeric not null,
  total_price numeric not null,
  quantity int not null,
  sizes text not null,
  payment_method text check (payment_method in ('cash','card','tabby')),
  payment_fees numeric default 0,
  delivery_fees numeric default 0,
  status text check (status in ('completed','canceled', 'pending')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sample orders - each product/size combination gets its own row
insert into orders
(product_id, product_variant_id, order_number, shipping_number, paid_amount, total_price, quantity, sizes, payment_method, payment_fees, delivery_fees, status)
values
-- Order 3296: Nike Tech Old Black - Size L (1 piece)
(2, 6, 3296, 233298, 220, 220, 1, 'L', 'cash', 0, 10, 'completed'),
-- Order 3296: Nike Tech Old Black - Size XL (1 piece) 
(2, 7, 3296, 233298, 220, 220, 1, 'XL', 'cash', 0, 10, 'completed'),
-- Order 3297: Nike Tech New Grey - Size XXL (1 piece)
(5, 20, 3297, 233297, 250, 250, 1, 'XXL', 'tabby', 27, 20, 'completed'),
-- Additional orders for better profit calculation
(1, 1, 3298, 233296, 250, 250, 1, 'S', 'cash', 0, 15, 'completed'),
(7, 25, 3299, 233295, 350, 350, 1, 'L', 'card', 10, 20, 'completed'),
(8, 29, 3300, 233294, 350, 350, 1, 'M', 'tabby', 27, 20, 'completed');

-- ==========================
-- 5. Expenses
-- ==========================
create table expenses (
  id bigserial primary key,
  details text not null,
  amount numeric not null,
  paid_by uuid references investors(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into expenses (details, amount, paid_by) values
('shelves', 188, 'c6455e11-e4ba-4240-9b6c-45b7352988ae');

-- ==========================
-- 6. Profits
-- ==========================
create table profits (
  id bigserial primary key,
  order_id bigint references orders(id) on delete cascade,
  investor_id uuid references investors(id),
  gross_profit numeric,
  net_profit numeric,
  created_at timestamptz default now()
);

-- ==========================
-- 7. Functions & Triggers
-- ==========================

-- Function: update product stock on order insert
create or replace function handle_new_order()
returns trigger as $$
declare
  product_cost numeric;
  gross numeric;
  shared_expense_per_order numeric;
  variant_size text;
begin
  -- reduce product stock
  update products
  set quantity = quantity - new.quantity
  where id = new.product_id;

  -- Update product variant quantity based on the size
  -- Parse the sizes field (it can contain multiple sizes like 'L,XL')
  variant_size := split_part(new.sizes, ',', 1); -- Take first size if multiple
  
  -- Update the specific variant quantity
  update product_variants
  set quantity = greatest(0, quantity - new.quantity)
  where product_id = new.product_id and size = variant_size;

  -- calculate profit
  select cost_per_piece into product_cost from products where id = new.product_id;

  gross := (new.paid_amount - new.payment_fees - new.delivery_fees - (product_cost * new.quantity));

  -- distribute expenses equally per order
  select coalesce(sum(amount),0) / nullif((select count(*) from orders),0)
  into shared_expense_per_order
  from expenses;

  gross := gross - coalesce(shared_expense_per_order,0);

  -- insert profits for each investor
  insert into profits (order_id, investor_id, gross_profit, net_profit)
  select new.id, i.id, gross, (gross * (i.profit_percentage/100.0))
  from investors i;

  return new;
end;
$$ language plpgsql;

create trigger trg_new_order
after insert on orders
for each row execute function handle_new_order();

-- ==========================
-- 8. Row Level Security (RLS) Policies
-- ==========================

-- Enable RLS on all tables
alter table investors enable row level security;
alter table shipments enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;
alter table expenses enable row level security;
alter table profits enable row level security;

-- Create policies for anonymous access (for dashboard)
create policy "Allow anonymous read access to investors" on investors for select using (true);
create policy "Allow anonymous read access to shipments" on shipments for select using (true);
create policy "Allow anonymous read access to products" on products for select using (true);
create policy "Allow anonymous read access to product_variants" on product_variants for select using (true);
create policy "Allow anonymous read access to orders" on orders for select using (true);
create policy "Allow anonymous read access to expenses" on expenses for select using (true);
create policy "Allow anonymous read access to profits" on profits for select using (true);

-- Create policies for anonymous write access (for dashboard)
create policy "Allow anonymous insert to products" on products for insert with check (true);
create policy "Allow anonymous update to products" on products for update using (true);
create policy "Allow anonymous delete from products" on products for delete using (true);

create policy "Allow anonymous insert to product_variants" on product_variants for insert with check (true);
create policy "Allow anonymous update to product_variants" on product_variants for update using (true);
create policy "Allow anonymous delete from product_variants" on product_variants for delete using (true);

create policy "Allow anonymous insert to orders" on orders for insert with check (true);
create policy "Allow anonymous update to orders" on orders for update using (true);
create policy "Allow anonymous delete from orders" on orders for delete using (true);

create policy "Allow anonymous insert to shipments" on shipments for insert with check (true);
create policy "Allow anonymous update to shipments" on shipments for update using (true);
create policy "Allow anonymous delete from shipments" on shipments for delete using (true);

create policy "Allow anonymous insert to expenses" on expenses for insert with check (true);
create policy "Allow anonymous update to expenses" on expenses for update using (true);
create policy "Allow anonymous delete from expenses" on expenses for delete using (true);

create policy "Allow anonymous insert to profits" on profits for insert with check (true);
create policy "Allow anonymous update to profits" on profits for update using (true);
create policy "Allow anonymous delete from profits" on profits for delete using (true);

-- ==========================
-- 9. Indexes for Performance
-- ==========================

create index idx_products_name on products(name);
create index idx_product_variants_product_id on product_variants(product_id);
create index idx_orders_product_id on orders(product_id);
create index idx_orders_status on orders(status);
create index idx_shipments_status on shipments(status);
create index idx_profits_order_id on profits(order_id);
create index idx_profits_investor_id on profits(investor_id);

-- ==========================
-- 10. Update Timestamps Function
-- ==========================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at columns
create trigger update_investors_updated_at before update on investors for each row execute function update_updated_at_column();
create trigger update_shipments_updated_at before update on shipments for each row execute function update_updated_at_column();
create trigger update_products_updated_at before update on products for each row execute function update_updated_at_column();
create trigger update_product_variants_updated_at before update on product_variants for each row execute function update_updated_at_column();
create trigger update_orders_updated_at before update on orders for each row execute function update_updated_at_column();
create trigger update_expenses_updated_at before update on expenses for each row execute function update_updated_at_column();
