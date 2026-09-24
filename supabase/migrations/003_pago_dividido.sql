-- A veces el cliente paga parte en efectivo y parte por transferencia, y eso
-- se define recién en el momento de la entrega (no es algo que venga
-- decidido de la planilla, aunque la planilla puede avisar que va a pasar
-- escribiendo los dos métodos, ej. "Transferencia/Efectivo", sin los montos).
-- Cuando el chofer carga los dos montos en "Editar entrega", el texto de
-- `forma_pago_confirmada` pasa a ser algo ya armado del todo
-- ("Efectivo ($30.000) + Transferencia ($15.000)") y esta columna le avisa a
-- las pantallas que no lo tienen que volver a formatear como un solo método.
alter table parada_chofer add column if not exists pago_dividido boolean not null default false;
