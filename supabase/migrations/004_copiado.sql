-- El check de "copiado" del botón de copiar pasa de localStorage (por
-- navegador) a la base, para que se vea en verde en todas las computadoras
-- apenas alguien lo copia, no solo en la que tocó el botón.
alter table parada add column if not exists copiado boolean not null default false;
