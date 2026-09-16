-- Logística 7 Cajas — Schema v2
-- Reformulación completa: la planilla de Google Sheets (armada a mano por el
-- vendedor) es la fuente de la verdad del recorrido del día. Se pega en la web
-- (texto TSV) y "Actualizar recorrido" la vuelca acá. No hay ABM de clientes
-- ni de precios en este sistema — todo eso vive en Sheets.

create extension if not exists "pgcrypto";

-- Los dos choferes son fijos y conocidos de antemano.
create table if not exists chofer (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

insert into chofer (nombre) values ('Tito'), ('Meme')
on conflict (nombre) do nothing;

-- Estado del día para cada chofer: cuándo empezó (a partir de ahí su
-- selección de paradas queda congelada) y cuándo cerró.
create table if not exists chofer_dia (
  id uuid primary key default gen_random_uuid(),
  chofer_id uuid not null references chofer(id),
  fecha date not null,
  iniciado_en timestamptz,
  cerrado_en timestamptz,
  unique (chofer_id, fecha)
);

-- Una fila por parada del día, tal como sale de parsear la planilla pegada.
-- "Actualizar recorrido" reemplaza las paradas de la fecha que todavía no
-- están tomadas por un chofer con el día ya iniciado (esas quedan intactas).
create table if not exists parada (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  orden_planilla int not null,          -- orden de la fila en la planilla pegada
  cliente text not null,
  producto text not null,               -- "SEDA MO" | "SEDA AO" | "LOT" | "ARECO" | combinaciones... tal cual la planilla, sin forzar categorías
  litros int,
  precio_unitario numeric,
  total numeric,
  forma_pago text,                      -- "Efectivo" | "Transferencia" | "PAGADO" | ... tal cual la planilla
  monto_efectivo numeric,               -- solo tiene sentido si forma_pago = Efectivo
  zona text,                            -- sin usar por ahora (no viene de la hoja semanal)
  barrio text,                          -- sin usar por ahora
  direccion text,
  horario text,                         -- horario de atención del cliente
  notas text,                           -- instrucciones del cliente (Observaciones en la planilla)
  es_transporte boolean not null default false,
  empresa_transporte text,              -- solo si es_transporte
  creado_en timestamptz not null default now()
);

create index if not exists parada_fecha_idx on parada (fecha);

-- Selección de un chofer sobre una parada: cada chofer elige a mano cuáles
-- son suyas. Es posible que ambos marquen la misma por error (se resuelve a
-- mano borrando el registro que sobra). El estado de la entrega y los valores
-- confirmados por el chofer viven acá, no en `parada` (que es el dato
-- "planeado" que vino de la planilla).
create table if not exists parada_chofer (
  id uuid primary key default gen_random_uuid(),
  parada_id uuid not null references parada(id) on delete cascade,
  chofer_id uuid not null references chofer(id),
  fecha date not null,
  orden int not null default 0,         -- posición en el recorrido de ese chofer
  estado text not null default 'en_espera' check (estado in ('en_espera', 'entregado', 'descartado')),
  litros_confirmado int,
  producto_confirmado text,
  forma_pago_confirmada text,
  monto_confirmado numeric,
  editado boolean not null default false,
  entregado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (parada_id, chofer_id)
);

create index if not exists parada_chofer_fecha_idx on parada_chofer (fecha, chofer_id);

alter table chofer enable row level security;
alter table chofer_dia enable row level security;
alter table parada enable row level security;
alter table parada_chofer enable row level security;

-- La app mobile del chofer no tiene login (queda asociada al dispositivo por
-- fuera de este esquema) y necesita leer/escribir libremente. El panel web
-- exige login (Supabase Auth) para leer. Con RLS abierto a `anon` alcanza
-- para v1 dado el tamaño del proyecto; si hace falta más adelante se puede
-- cerrar a `authenticated` + una tabla de choferes autenticados.
create policy "lectura publica chofer" on chofer for select using (true);
create policy "lectura publica chofer_dia" on chofer_dia for select using (true);
create policy "escritura publica chofer_dia" on chofer_dia for insert with check (true);
create policy "update publico chofer_dia" on chofer_dia for update using (true);

create policy "lectura publica parada" on parada for select using (true);
create policy "escritura publica parada" on parada for insert with check (true);
create policy "delete publico parada" on parada for delete using (true);

create policy "lectura publica parada_chofer" on parada_chofer for select using (true);
create policy "escritura publica parada_chofer" on parada_chofer for insert with check (true);
create policy "update publico parada_chofer" on parada_chofer for update using (true);
create policy "delete publico parada_chofer" on parada_chofer for delete using (true);

-- Realtime para que el panel del administrativo vea los cambios al instante.
alter publication supabase_realtime add table parada_chofer;
alter publication supabase_realtime add table chofer_dia;
alter publication supabase_realtime add table parada;
