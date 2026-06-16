-- ============================================================
-- configuracion_v1.sql
-- Persiste TODA la Configuración (antes en localStorage) en Supabase,
-- para que sincronice entre dispositivos y se vea en el deploy (Vercel).
-- Una fila por usuario.
-- ============================================================

create table if not exists public.configuracion (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  empresa             jsonb       not null default '{}'::jsonb,
  perfil              jsonb       not null default '{}'::jsonb,
  apariencia          jsonb       not null default '{}'::jsonb,
  email_config        jsonb       not null default '{}'::jsonb,
  integraciones       jsonb       not null default '{}'::jsonb,
  firma               text        not null default '',
  logo_url            text        not null default '',
  dashboard_cover_url text        not null default '',
  perfil_foto_url     text        not null default '',
  wallpaper_url       text        not null default '',
  updated_at          timestamptz not null default now()
);

alter table public.configuracion enable row level security;

-- Cada usuario solo ve y edita su propia fila.
drop policy if exists "config_own" on public.configuracion;
create policy "config_own" on public.configuracion
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- IMPORTANTE (Storage):
-- Las imágenes (logo, portada, foto de perfil, wallpaper) se guardan
-- en el bucket PÚBLICO existente "logos", bajo la carpeta config/.
-- No hace falta crear un bucket nuevo. Verificá que "logos" sea público
-- y tenga política de subida para usuarios autenticados (ya la usás en Empresas).
-- ------------------------------------------------------------
