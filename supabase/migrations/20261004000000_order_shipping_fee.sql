alter table public.orders
add column if not exists shipping_fee integer not null default 0;

alter table public.orders
drop constraint if exists orders_shipping_fee_range;

alter table public.orders
add constraint orders_shipping_fee_range
check (shipping_fee between 0 and 100000);
