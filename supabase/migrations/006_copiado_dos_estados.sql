-- El check de "copiado" (004_copiado.sql) era una sola columna compartida
-- entre el texto de pendiente (amarillo) y el de entregado (verde) de la
-- misma parada, en "Recorrido de hoy" — al pasar de amarillo a verde el
-- texto a copiar cambia, pero el tilde de "ya copiado" quedaba puesto desde
-- antes, mintiendo que ese texto nuevo ya se había copiado. Se separa en dos
-- marcas independientes, una por estado.
alter table parada add column if not exists copiado_pendiente boolean not null default false;
alter table parada add column if not exists copiado_entregado boolean not null default false;
alter table parada drop column if exists copiado;
