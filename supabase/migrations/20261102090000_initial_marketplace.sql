create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  account_type text not null check (account_type in ('customer', 'restaurant')),
  full_name text not null default '',
  phone text not null default '',
  delivery_address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  location text not null default '',
  opening_hours text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_contacts (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  contact_email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_members (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null default 'Main',
  price numeric(10, 2) not null check (price > 0),
  image_url text not null default '',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_items_restaurant_available_idx
  on public.menu_items (restaurant_id, is_available);
create index if not exists restaurants_status_location_idx
  on public.restaurants (status, location);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.account_type <> old.account_type then
    raise exception 'Profile identity and account type cannot be changed.';
  end if;
  return new;
end;
$$;

create or replace function public.protect_restaurant_ownership_and_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null
    and (new.owner_user_id <> old.owner_user_id or new.status <> old.status) then
    raise exception 'Restaurant ownership and approval status are managed by QuickCrave.';
  end if;
  return new;
end;
$$;

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
      '',
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

create or replace function public.is_restaurant_member(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurant_members
    where restaurant_id = target_restaurant_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_restaurant_owner(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurant_members
    where restaurant_id = target_restaurant_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_protect_identity on public.profiles;
create trigger profiles_protect_identity
  before update on public.profiles
  for each row execute procedure public.protect_profile_identity();

drop trigger if exists restaurants_protect_ownership_status on public.restaurants;
create trigger restaurants_protect_ownership_status
  before update on public.restaurants
  for each row execute procedure public.protect_restaurant_ownership_and_status();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute procedure public.set_updated_at();

drop trigger if exists restaurant_contacts_set_updated_at on public.restaurant_contacts;
create trigger restaurant_contacts_set_updated_at
  before update on public.restaurant_contacts
  for each row execute procedure public.set_updated_at();

drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.menu_items enable row level security;
alter table public.restaurant_contacts enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Public can read approved restaurants" on public.restaurants;
create policy "Public can read approved restaurants"
  on public.restaurants for select to anon, authenticated
  using (
    status = 'approved'
    or public.is_restaurant_member(id)
  );

drop policy if exists "Restaurant owners can update their restaurant" on public.restaurants;
create policy "Restaurant owners can update their restaurant"
  on public.restaurants for update to authenticated
  using (public.is_restaurant_owner(id))
  with check (public.is_restaurant_owner(id));

drop policy if exists "Restaurant members can read their restaurant contacts" on public.restaurant_contacts;
create policy "Restaurant members can read their restaurant contacts"
  on public.restaurant_contacts for select to authenticated
  using (public.is_restaurant_member(restaurant_id));

drop policy if exists "Restaurant owners can update their restaurant contacts" on public.restaurant_contacts;
create policy "Restaurant owners can update their restaurant contacts"
  on public.restaurant_contacts for update to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

drop policy if exists "Members can read their restaurant membership" on public.restaurant_members;
create policy "Members can read their restaurant membership"
  on public.restaurant_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Public can read available items from approved restaurants" on public.menu_items;
create policy "Public can read available items from approved restaurants"
  on public.menu_items for select to anon, authenticated
  using (
    (
      is_available
      and exists (
        select 1
        from public.restaurants
        where restaurants.id = menu_items.restaurant_id
          and restaurants.status = 'approved'
      )
    )
    or public.is_restaurant_member(restaurant_id)
  );

drop policy if exists "Restaurant owners can add menu items" on public.menu_items;
create policy "Restaurant owners can add menu items"
  on public.menu_items for insert to authenticated
  with check (public.is_restaurant_owner(restaurant_id));

drop policy if exists "Restaurant owners can update menu items" on public.menu_items;
create policy "Restaurant owners can update menu items"
  on public.menu_items for update to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

drop policy if exists "Restaurant owners can delete menu items" on public.menu_items;
create policy "Restaurant owners can delete menu items"
  on public.menu_items for delete to authenticated
  using (public.is_restaurant_owner(restaurant_id));

revoke all on public.profiles from anon, authenticated;
revoke all on public.restaurants from anon, authenticated;
revoke all on public.restaurant_members from anon, authenticated;
revoke all on public.menu_items from anon, authenticated;
revoke all on public.restaurant_contacts from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select (id, name, location, opening_hours, created_at, updated_at)
  on public.restaurants to anon;
grant select (id, name, location, opening_hours, status, created_at, updated_at)
  on public.restaurants to authenticated;
grant update (name, location, opening_hours)
  on public.restaurants to authenticated;
grant select on public.restaurant_members to authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant select on public.restaurant_contacts to authenticated;
grant update (contact_email, phone, whatsapp)
  on public.restaurant_contacts to authenticated;

revoke all on function public.is_restaurant_member(uuid) from public;
revoke all on function public.is_restaurant_owner(uuid) from public;
grant execute on function public.is_restaurant_member(uuid) to anon, authenticated;
grant execute on function public.is_restaurant_owner(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Menu images are publicly readable" on storage.objects;
create policy "Menu images are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'menu-images');

drop policy if exists "Restaurant owners can upload menu images" on storage.objects;
create policy "Restaurant owners can upload menu images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Restaurant owners can update menu images" on storage.objects;
create policy "Restaurant owners can update menu images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Restaurant owners can delete menu images" on storage.objects;
create policy "Restaurant owners can delete menu images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
  );
