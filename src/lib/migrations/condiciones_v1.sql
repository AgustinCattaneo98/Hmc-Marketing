-- ============================================================
-- condiciones_v1.sql
-- 1) Asegura las columnas de ubicación en empresas (arregla el error
--    "Could not find the 'direccion' column").
-- 2) Agrega condiciones de pago y generales editables por cotización.
-- 3) Agrega los defaults de esas condiciones en la config del usuario.
-- Idempotente: se puede correr varias veces sin error.
-- ============================================================

-- 1) Ubicación de empresas
alter table empresas add column if not exists direccion text;
alter table empresas add column if not exists provincia text;
alter table empresas add column if not exists pais text;

-- 2) Condiciones por cotización
alter table cotizaciones add column if not exists condiciones_pago text;
alter table cotizaciones add column if not exists condiciones_generales text;

-- 3) Defaults de condiciones (por usuario) en la tabla de configuración
alter table configuracion add column if not exists cot_condiciones_pago text not null default '';
alter table configuracion add column if not exists cot_condiciones_generales text not null default '';
