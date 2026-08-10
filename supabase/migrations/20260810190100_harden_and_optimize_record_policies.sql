create or replace function private.is_shop_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_shop_user() to authenticated;

drop policy "authorized users select own records" on public.optical_records;
drop policy "authorized users insert own records" on public.optical_records;
drop policy "authorized users update own records" on public.optical_records;
drop policy "authorized users delete own records" on public.optical_records;

create policy "authorized users select own records"
on public.optical_records for select to authenticated
using ((select private.is_shop_user()) and owner_id = (select auth.uid()));

create policy "authorized users insert own records"
on public.optical_records for insert to authenticated
with check ((select private.is_shop_user()) and owner_id = (select auth.uid()));

create policy "authorized users update own records"
on public.optical_records for update to authenticated
using ((select private.is_shop_user()) and owner_id = (select auth.uid()))
with check ((select private.is_shop_user()) and owner_id = (select auth.uid()));

create policy "authorized users delete own records"
on public.optical_records for delete to authenticated
using ((select private.is_shop_user()) and owner_id = (select auth.uid()));

drop function public.is_shop_user();
