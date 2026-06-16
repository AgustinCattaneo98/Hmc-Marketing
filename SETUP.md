# HMC Marketing — Setup

## Requisitos

- Node.js 18+ y npm
- Un proyecto de Supabase creado

## 1. Variables de entorno

Copiá `.env.example` a `.env` y completá con las credenciales de tu proyecto
(Supabase → Project Settings → API):

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

> La `VITE_SUPABASE_URL` es **solo la URL base del proyecto**, sin `/rest/v1/` al final.

## 2. Base de datos

Abrí el **SQL Editor** de Supabase y ejecutá el contenido de
[`src/lib/schema.sql`](src/lib/schema.sql). Esto crea las tablas, los triggers
de `updated_at`, habilita RLS y crea las políticas para usuarios autenticados.

## 3. Crear el primer usuario

El acceso es **solo por invitación** (no hay registro público desde la app).
Para poder loguearte, creá el usuario manualmente desde el panel de Supabase:

1. Entrá a tu proyecto en [app.supabase.com](https://app.supabase.com).
2. En el menú lateral: **Authentication → Users**.
3. Click en **Add user → Create new user**.
4. Completá:
   - **Email**: el email con el que vas a iniciar sesión.
   - **Password**: la contraseña.
   - Marcá **Auto Confirm User** (o **Email Confirm**) para que el usuario quede
     confirmado y pueda iniciar sesión de inmediato sin verificación por email.
5. Click en **Create user**.

> Para sumar más usuarios después, repetí el mismo proceso. No hay pantalla de
> registro en la app por diseño.

## 4. Levantar el proyecto

```bash
npm install
npm run dev
```

Abrí http://localhost:5173. Te va a redirigir a `/login`. Ingresá con el email y
la contraseña del usuario que creaste en el paso 3 y vas a entrar al dashboard.

## Notas

- Si cambiás el `.env`, **reiniciá** el dev server (Vite lee las variables al
  arrancar).
- La sesión se persiste en el navegador: al recargar seguís logueado hasta que
  uses **Cerrar sesión** en el sidebar.
