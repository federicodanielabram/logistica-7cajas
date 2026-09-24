-- Un cliente puede pedir más de un producto el mismo día: el vendedor lo carga
-- como filas separadas en Sheets, pero es una sola parada física. El parser
-- las combina en una sola fila de `parada` y marca esta columna, para que las
-- pantallas sepan que el campo `producto` ya trae el texto completo armado
-- ("40lts SEDA AO + 20lts SEDA MO") en vez de un solo producto.
alter table parada add column if not exists multiproducto boolean not null default false;
