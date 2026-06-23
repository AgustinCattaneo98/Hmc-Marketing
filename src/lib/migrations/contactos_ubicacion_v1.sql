-- ============================================================
-- contactos_ubicacion_v1.sql
-- Agrega las columnas de ubicación a `contactos` (el modal de contacto
-- ya tiene los campos Dirección / Provincia / País, pero las columnas
-- no existían). Arregla el error:
--   "Could not find the 'direccion' column of 'contactos'".
-- Idempotente.
-- ============================================================

alter table contactos add column if not exists direccion text;
alter table contactos add column if not exists provincia text;
alter table contactos add column if not exists pais text;
