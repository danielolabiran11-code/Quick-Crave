create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists "Admins can read their own access" on public.admin_users;
create policy "Admins can read their own access"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_restaurant_id uuid;
  requested_type text;
begin
  requested_type := coalesce(new.raw_user_meta_data ->> 'account_type', 'customer');
  if requested_type not in ('customer', 'restaurant') then
    requested_type := 'customer';
  end if;

  insert into public.profiles (id, account_type, full_name, phone)
  values (
    new.id,
    requested_type,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );

  if requested_type = 'restaurant'
    and nullif(trim(new.raw_user_meta_data ->> 'restaurant_name'), '') is not null then
    insert into public.restaurants (owner_user_id, name, location, status)
    values (
      new.id,
      trim(new.raw_user_meta_data ->> 'restaurant_name'),
      left(trim(coalesce(new.raw_user_meta_data ->> 'restaurant_location', '')), 120),
      'pending'
    )
    returning id into new_restaurant_id;

    insert into public.restaurant_contacts (
      restaurant_id, contact_email, phone
    )
    values (
      new_restaurant_id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data ->> 'phone', '')
    );

    insert into public.restaurant_members (restaurant_id, user_id, role)
    values (new_restaurant_id, new.id, 'owner');
  end if;

  return new;
end;
$$;

drop policy if exists "Admins can read all restaurants" on public.restaurants;
create policy "Admins can read all restaurants"
  on public.restaurants for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update restaurant status" on public.restaurants;
create policy "Admins can update restaurant status"
  on public.restaurants for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant update (status) on public.restaurants to authenticated;

drop policy if exists "Admins can read restaurant contacts" on public.restaurant_contacts;
create policy "Admins can read restaurant contacts"
  on public.restaurant_contacts for select to authenticated
  using (public.is_admin());

create or replace function public.protect_restaurant_ownership_and_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null
    and not public.is_admin()
    and (new.owner_user_id <> old.owner_user_id or new.status <> old.status) then
    raise exception 'Restaurant ownership and approval status are managed by QuickCrave.';
  end if;
  return new;
end;
$$;

create table if not exists public.customer_signup_rate_limits (
  rate_limit_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);

alter table public.customer_signup_rate_limits enable row level security;
revoke all on public.customer_signup_rate_limits from public, anon, authenticated;
grant all on public.customer_signup_rate_limits to service_role;

create or replace function public.consume_customer_signup_rate_limit(
  ip_key text,
  email_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  allowed boolean := true;
  candidate record;
begin
  for candidate in
    select ip_key as rate_limit_key, 8 as max_requests
    union all
    select email_key as rate_limit_key, 3 as max_requests
  loop
    insert into public.customer_signup_rate_limits (
      rate_limit_key, window_started_at, request_count
    )
    values (candidate.rate_limit_key, now(), 1)
    on conflict (rate_limit_key) do update
      set request_count = case
        when public.customer_signup_rate_limits.window_started_at < now() - interval '15 minutes' then 1
        else public.customer_signup_rate_limits.request_count + 1
      end,
      window_started_at = case
        when public.customer_signup_rate_limits.window_started_at < now() - interval '15 minutes' then now()
        else public.customer_signup_rate_limits.window_started_at
      end
    returning request_count into current_count;

    if current_count > candidate.max_requests then
      allowed := false;
    end if;
  end loop;

  delete from public.customer_signup_rate_limits
  where window_started_at < now() - interval '1 day';

  return allowed;
end;
$$;

revoke all on function public.consume_customer_signup_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.consume_customer_signup_rate_limit(text, text) to service_role;
