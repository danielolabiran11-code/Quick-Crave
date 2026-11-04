alter table public.order_request_items
  add column if not exists image_url text not null default '';

update public.order_request_items
set image_url = menu_items.image_url
from public.menu_items
where order_request_items.menu_item_id = menu_items.id
  and order_request_items.image_url = '';

create or replace function public.snapshot_order_item_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.menu_item_id is not null then
    select menu_items.image_url
    into new.image_url
    from public.menu_items
    where menu_items.id = new.menu_item_id;
  end if;

  return new;
end;
$$;

drop trigger if exists order_request_items_snapshot_image on public.order_request_items;
create trigger order_request_items_snapshot_image
  before insert on public.order_request_items
  for each row execute procedure public.snapshot_order_item_image();

drop policy if exists "Admins can read restaurant menu items" on public.menu_items;
create policy "Admins can read restaurant menu items"
  on public.menu_items for select to authenticated
  using (public.is_admin());
