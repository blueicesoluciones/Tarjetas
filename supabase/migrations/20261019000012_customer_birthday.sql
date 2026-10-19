-- Cumpleaños del cliente: solo mes y día (no se pide el año).
-- Ambos van juntos; el 29 de febrero se permite (en años no bisiestos se
-- celebra el 28).
alter table public.customers
  add column birth_month smallint,
  add column birth_day smallint,
  add constraint customers_birthday_check check (
    (birth_month is null and birth_day is null)
    or (
      birth_month between 1 and 12
      and birth_day between 1 and (case when birth_month = 2 then 29 when birth_month in (4, 6, 9, 11) then 30 else 31 end)
    )
  );

create index customers_birthday_idx on public.customers (business_id, birth_month, birth_day)
  where deleted_at is null and birth_month is not null;

-- El dueño ve y corrige el cumpleaños de sus clientes.
grant select (birth_month, birth_day) on public.customers to authenticated;
grant update (birth_month, birth_day) on public.customers to authenticated;
