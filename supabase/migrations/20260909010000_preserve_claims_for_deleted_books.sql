alter table public.order_items
add column if not exists book_title text;

update public.order_items as item
set book_title = book.title
from public.books as book
where book.id = item.book_id
  and item.book_title is null;

create or replace function public.set_order_item_book_title()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.book_title is null then
    select title into new.book_title
    from public.books
    where id = new.book_id;
  end if;
  return new;
end;
$$;

drop trigger if exists snapshot_order_item_book_title on public.order_items;

create trigger snapshot_order_item_book_title
before insert on public.order_items
for each row
execute function public.set_order_item_book_title();

alter table public.order_items
alter column book_title set not null;

alter table public.order_items
drop constraint if exists order_items_book_id_fkey;

alter table public.order_items
alter column book_id drop not null;

alter table public.order_items
add constraint order_items_book_id_fkey
foreign key (book_id)
references public.books(id)
on delete set null;
