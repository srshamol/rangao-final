-- Enable Realtime replication for target tables
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  t text;
  tables_to_add text[] := array[
    'orders',
    'order_items',
    'incomplete_orders',
    'products',
    'inventory_log',
    'coupons',
    'order_history',
    'order_notes',
    'store_settings',
    'categories',
    'testimonials',
    'brands'
  ];
begin
  foreach t in array tables_to_add loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then
        -- Table is already in the publication, ignore
        null;
      when undefined_table then
        -- Table doesn't exist, ignore
        null;
    end;
  end loop;
end $$;
