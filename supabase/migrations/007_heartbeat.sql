-- Tabla dedicada para el pulso de keep-alive (evita pausa por inactividad
-- en el plan free de Supabase). Separada de las tablas reales para no
-- ensuciar chofer_dia/parada con filas de prueba.
create table if not exists heartbeat (
  id int primary key default 1,
  pinged_en timestamptz not null default now()
);

insert into heartbeat (id) values (1)
on conflict (id) do nothing;

alter table heartbeat enable row level security;

create policy "lectura publica heartbeat" on heartbeat for select using (true);
create policy "update publico heartbeat" on heartbeat for update using (true);
