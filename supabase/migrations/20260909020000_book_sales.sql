alter table public.books
add column if not exists is_on_sale boolean not null default false;

alter table public.books
add column if not exists discount_amount integer not null default 0;

alter table public.books
drop constraint if exists books_sale_discount_check;

alter table public.books
add constraint books_sale_discount_check
check (
  (not is_on_sale and discount_amount = 0)
  or
  (is_on_sale and discount_amount > 0 and discount_amount < price)
);

create or replace function public.create_book_claim(
  p_book_ids bigint[],
  p_customer_name text,
  p_facebook_profile text,
  p_phone text,
  p_delivery_method text,
  p_address text default '',
  p_notes text default ''
)
returns table(claim_code text, claim_total integer, claim_items jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids bigint[];
  v_claimable_count integer;
  v_order_id uuid := gen_random_uuid();
  v_code text := 'READ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
  v_claim_items jsonb;
begin
  select array_agg(distinct item order by item) into v_ids
  from unnest(p_book_ids) as item;

  if coalesce(cardinality(v_ids), 0) < 1 or cardinality(v_ids) > 20 then
    raise exception 'INVALID_BOOK_COUNT';
  end if;

  perform id from public.books
  where id = any(v_ids)
  order by id
  for update;

  select count(*) into v_claimable_count
  from public.books
  where id = any(v_ids)
    and status <> 'sold'
    and publish_at <= now();

  if v_claimable_count <> cardinality(v_ids) then
    raise exception 'BOOK_SOLD_OR_UNPUBLISHED';
  end if;

  insert into public.orders (id,code,customer_name,facebook_profile,phone,delivery_method,address,notes)
  values (v_order_id,v_code,left(trim(p_customer_name),80),left(trim(p_facebook_profile),200),left(trim(p_phone),30),left(trim(p_delivery_method),40),left(trim(coalesce(p_address,'')),300),left(trim(coalesce(p_notes,'')),300));

  insert into public.order_items (order_id,book_id,price,miner_position)
  select
    v_order_id,
    book.id,
    case when book.is_on_sale then book.price - book.discount_amount else book.price end,
    coalesce((
      select max(existing.miner_position)
      from public.order_items as existing
      where existing.book_id = book.id
    ), 0) + 1
  from public.books as book
  where book.id = any(v_ids);

  update public.orders
  set total = (
    select coalesce(sum(price),0)
    from public.order_items
    where order_id = v_order_id
  )
  where id = v_order_id;

  select jsonb_agg(
    jsonb_build_object(
      'book_id', item.book_id,
      'title', book.title,
      'position', item.miner_position
    )
    order by item.id
  )
  into v_claim_items
  from public.order_items as item
  join public.books as book on book.id = item.book_id
  where item.order_id = v_order_id;

  return query
  select orders.code, orders.total, v_claim_items
  from public.orders as orders
  where orders.id = v_order_id;
end;
$$;

revoke all on function public.create_book_claim(bigint[],text,text,text,text,text,text)
from public, anon, authenticated;

grant execute on function public.create_book_claim(bigint[],text,text,text,text,text,text)
to service_role;
