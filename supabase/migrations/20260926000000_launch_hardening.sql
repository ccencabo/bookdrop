create table if not exists public.request_rate_limits (
  action text not null check (char_length(action) between 1 and 60),
  identifier_hash text not null check (char_length(identifier_hash) = 64),
  window_started_at timestamptz not null default clock_timestamp(),
  request_count integer not null default 1 check (request_count > 0),
  primary key (action, identifier_hash)
);

alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_action text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if char_length(p_action) not between 1 and 60
    or char_length(p_identifier_hash) <> 64
    or p_limit < 1
    or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;

  insert into public.request_rate_limits as limits (
    action,
    identifier_hash,
    window_started_at,
    request_count
  )
  values (p_action, p_identifier_hash, v_now, 1)
  on conflict (action, identifier_hash) do update
  set
    window_started_at = case
      when limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
      else limits.request_count + 1
    end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text,text,integer,integer)
from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,text,integer,integer)
to service_role;
