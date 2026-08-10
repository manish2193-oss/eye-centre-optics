drop policy "authorized users select own records" on public.optical_records;
drop policy "authorized users insert own records" on public.optical_records;
drop policy "authorized users update own records" on public.optical_records;
drop policy "authorized users delete own records" on public.optical_records;

create policy "authenticated users select shop records"
on public.optical_records for select to authenticated
using (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy "authenticated users insert shop records"
on public.optical_records for insert to authenticated
with check (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  and owner_id = (select auth.uid())
);

create policy "authenticated users update shop records"
on public.optical_records for update to authenticated
using (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
)
with check (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy "authenticated users delete shop records"
on public.optical_records for delete to authenticated
using (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

revoke execute on function private.is_shop_user() from authenticated;
drop function private.is_shop_user();
drop table private.allowed_users;
drop schema private;
