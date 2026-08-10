alter table public.optical_records
drop column record_number;

alter table public.optical_records
add column record_number text generated always as (
  'ECO-' || case
    when length(id::text) < 4 then lpad(id::text, 4, '0')
    else id::text
  end
) stored unique;
