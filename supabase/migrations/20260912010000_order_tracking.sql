alter table public.orders
add column if not exists tracking_number text;

alter table public.orders
add column if not exists status_updated_at timestamptz;

update public.orders
set status_updated_at = created_at
where status_updated_at is null;

alter table public.orders
alter column status_updated_at set default now();

alter table public.orders
alter column status_updated_at set not null;

alter table public.orders
drop constraint if exists orders_tracking_number_length;

alter table public.orders
add constraint orders_tracking_number_length
check (tracking_number is null or char_length(tracking_number) between 1 and 100);
