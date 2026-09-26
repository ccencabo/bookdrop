alter table public.books
add column if not exists image_urls text[] not null default '{}';

update public.books
set image_urls = array[image_url]
where image_url is not null
  and cardinality(image_urls) = 0;

alter table public.books
add constraint books_image_urls_limit
check (cardinality(image_urls) <= 8);
