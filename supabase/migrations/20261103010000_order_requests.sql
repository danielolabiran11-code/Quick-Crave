create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete restrict,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  status text not null default 'submitted'
    check (status in ('submitted', 'accepted', 'preparing', 'ready', 'completed', 'rejected', 'cancelled')),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_address text not null,
  customer_note text not null default '',
  subtotal numeric(12, 2) not null check (subtotal > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_requests_customer_created_idx
  on public.order_requests (customer_id, created_at desc);
create index if not exists order_requests_restaurant_created_idx
  on public.order_requests (restaurant_id, created_at desc);

create table if not exists public.order_request_items (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  item_name text not null,
  unit_price numeric(10, 2) not null check (unit_price > 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total numeric(12, 2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now()
);

create index if not exists order_request_items_order_idx
  on public.order_request_items (order_request_id);

drop trigger if exists order_requests_set_updated_at on public.order_requests;
create trigger order_requests_set_updated_at
  before update on public.order_requests
  for each row execute procedure public.set_updated_at();

alter table public.order_requests enable row level security;
alter table public.order_request_items enable row level security;

revoke all on public.order_requests from public, anon, authenticated;
revoke all on public.order_request_items from public, anon, authenticated;
grant select on public.order_requests to authenticated;
grant select on public.order_request_items to authenticated;

drop policy if exists "Customers and restaurant members can read order requests" on public.order_requests;
create policy "Customers and restaurant members can read order requests"
  on public.order_requests for select to authenticated
  using (
    customer_id = (select auth.uid())
    or public.is_restaurant_member(restaurant_id)
  );

drop policy if exists "Order participants can read order request items" on public.order_request_items;
create policy "Order participants can read order request items"
  on public.order_request_items for select to authenticated
  using (
    exists (
      select 1
      from public.order_requests
      where order_requests.id = order_request_items.order_request_id
        and (
          order_requests.customer_id = (select auth.uid())
          or public.is_restaurant_member(order_requests.restaurant_id)
        )
    )
  );

create or replace function public.create_order_request(
  target_restaurant_id uuid,
  requested_items jsonb,
  delivery_address text,
  customer_phone text,
  customer_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  customer_profile public.profiles%rowtype;
  new_order_id uuid;
  item_count integer;
  matched_item_count integer;
  order_subtotal numeric(12, 2);
begin
  if current_user_id is null then
    raise exception 'Sign in to submit an order request.';
  end if;

  if jsonb_typeof(requested_items) is distinct from 'array' then
    raise exception 'Order items must be provided as a list.';
  end if;

  if jsonb_array_length(requested_items) < 1
    or jsonb_array_length(requested_items) > 30 then
    raise exception 'An order must contain between 1 and 30 different menu items.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(requested_items) as entries(entry)
    where jsonb_typeof(entry -> 'id') is distinct from 'string'
      or (entry ->> 'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(entry -> 'quantity') is distinct from 'number'
      or (entry ->> 'quantity') !~ '^(?:[1-9]|1[0-9]|20)$'
  ) then
    raise exception 'The order contains invalid menu items or quantities.';
  end if;

  select count(*), count(distinct entry ->> 'id')
  into item_count, matched_item_count
  from jsonb_array_elements(requested_items) as entries(entry);
  if item_count <> matched_item_count then
    raise exception 'Each menu item can only appear once in the request.';
  end if;

  if char_length(trim(coalesce(delivery_address, ''))) < 5
    or char_length(delivery_address) > 500
    or char_length(trim(coalesce(customer_phone, ''))) < 7
    or char_length(customer_phone) > 40
    or char_length(coalesce(customer_note, '')) > 1000 then
    raise exception 'Enter a valid delivery address and phone number.';
  end if;

  if not exists (
    select 1 from public.restaurants
    where id = target_restaurant_id and status = 'approved'
  ) then
    raise exception 'This restaurant is not currently accepting order requests.';
  end if;

  perform menu_items.id
  from jsonb_array_elements(requested_items) as entries(entry)
  join public.menu_items
    on menu_items.id = (entry ->> 'id')::uuid
   and menu_items.restaurant_id = target_restaurant_id
   and menu_items.is_available
  for share of menu_items;

  select count(*), coalesce(sum(menu_items.price * (entry ->> 'quantity')::integer), 0)
  into matched_item_count, order_subtotal
  from jsonb_array_elements(requested_items) as entries(entry)
  join public.menu_items
    on menu_items.id = (entry ->> 'id')::uuid
   and menu_items.restaurant_id = target_restaurant_id
   and menu_items.is_available;

  if matched_item_count <> item_count then
    raise exception 'One or more selected dishes are no longer available.';
  end if;

  select * into customer_profile
  from public.profiles
  where id = current_user_id and account_type = 'customer';

  if not found or char_length(trim(customer_profile.full_name)) = 0 then
    raise exception 'Add your name to your customer profile before ordering.';
  end if;

  insert into public.order_requests (
    customer_id, restaurant_id, customer_name, customer_email,
    customer_phone, delivery_address, customer_note, subtotal
  )
  values (
    current_user_id, target_restaurant_id, customer_profile.full_name,
    coalesce(auth.jwt() ->> 'email', ''),
    trim(customer_phone), trim(delivery_address),
    trim(coalesce(customer_note, '')), order_subtotal
  )
  returning id into new_order_id;

  insert into public.order_request_items (
    order_request_id, menu_item_id, item_name, unit_price, quantity
  )
  select
    new_order_id, menu_items.id, menu_items.name, menu_items.price,
    (entry ->> 'quantity')::integer
  from jsonb_array_elements(requested_items) as entries(entry)
  join public.menu_items
    on menu_items.id = (entry ->> 'id')::uuid
   and menu_items.restaurant_id = target_restaurant_id
   and menu_items.is_available;

  return new_order_id;
end;
$$;

create or replace function public.update_order_request_status(
  target_order_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.order_requests%rowtype;
begin
  select * into current_order
  from public.order_requests
  where id = target_order_id
  for update;

  if not found or not public.is_restaurant_member(current_order.restaurant_id) then
    raise exception 'Order request not found.';
  end if;

  if not (
    (current_order.status = 'submitted' and next_status in ('accepted', 'rejected'))
    or (current_order.status = 'accepted' and next_status = 'preparing')
    or (current_order.status = 'preparing' and next_status = 'ready')
    or (current_order.status = 'ready' and next_status = 'completed')
  ) then
    raise exception 'This order request cannot be moved to that status.';
  end if;

  update public.order_requests
  set status = next_status
  where id = target_order_id;
end;
$$;

create or replace function public.cancel_order_request(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.order_requests
  set status = 'cancelled'
  where id = target_order_id
    and customer_id = auth.uid()
    and status = 'submitted';

  if not found then
    raise exception 'Only a submitted order request can be cancelled by its customer.';
  end if;
end;
$$;

revoke all on function public.create_order_request(uuid, jsonb, text, text, text) from public, anon;
revoke all on function public.update_order_request_status(uuid, text) from public, anon;
revoke all on function public.cancel_order_request(uuid) from public, anon;
grant execute on function public.create_order_request(uuid, jsonb, text, text, text) to authenticated;
grant execute on function public.update_order_request_status(uuid, text) to authenticated;
grant execute on function public.cancel_order_request(uuid) to authenticated;
