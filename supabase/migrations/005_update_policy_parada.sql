-- A `parada` le faltaba la política de `update` (tiene select/insert/delete
-- desde 001_schema.sql, pero nunca se agregó `update`). Sin esto, el campo
-- `copiado` (004_copiado.sql) se actualiza en silencio para nadie: RLS
-- bloquea el update sin tirar error visible, y el botón de copiar nunca se
-- pone en verde.
create policy "update publico parada" on parada for update using (true);
