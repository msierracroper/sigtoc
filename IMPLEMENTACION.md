# SIGTOC · Puesta en producción para un cliente

Guía para instalar SIGTOC en **cuentas nuevas del cliente** (Supabase + Cloudflare Pages), con base de datos limpia.
El orden importa: cada paso usa datos del anterior. Anota los valores marcados con 📝; se usan más adelante.

> La demo sigue funcionando aparte: tu `frontend/.env.local` apunta al proyecto de demo y no se toca.

---

## 1. Cuenta del cliente

Pide a C&C Sonido un correo de Google Workspace para el sistema (ej. `sigtoc@ccsonido.com`).
Con ese correo se crean Supabase y Cloudflare, así **ellos son dueños** de los datos y de la facturación. Tú quedas invitado como miembro.

## 2. Proyecto de Supabase

1. Entra a https://supabase.com con el correo del cliente → **New organization** → **New project**.
   - Nombre: `sigtoc-ccsonido` · Región: **South America (São Paulo)** (la más cercana a Colombia).
   - 📝 Guarda la contraseña de la base de datos en un lugar seguro.
2. Organization → **Team** → invita tu correo como *Developer* o *Administrator*.
3. 📝 **Project Settings → API**: copia `Project URL`, la clave `anon public` y la clave `service_role` (**secreta**, da acceso total: solo para el backup y nunca en el frontend).
4. **Authentication → Sign In / Providers → Email**: desactiva **Allow new users to sign up**. Así nadie puede crearse una cuenta solo; los usuarios los creas tú.
5. **Authentication → URL Configuration**: en *Site URL* pon la dirección de Cloudflare Pages (paso 5). Se puede completar después.

**Plan:** se arranca en el gratuito. Con ~50 pedidos/día los archivos ocupan ~1 GB al mes aun comprimidos y el gratuito trae 1 GB: revisa **Project Settings → Usage** cada semana y pasa a **Pro (US$25/mes)** al llegar a ~800 MB. El gratuito no tiene backups propios: el respaldo diario del paso 6 es obligatorio desde el día uno.

## 3. Base de datos

1. **SQL Editor → New query**: pega todo `backend/supabase/instalacion/01-esquema.sql` → **Run**.
   Crea tablas, permisos (RLS), el bucket privado de archivos, los catálogos iniciales y Realtime.
2. **Authentication → Users → Add user → Create new user** por cada persona del equipo (correo + contraseña temporal, con *Auto Confirm User* marcado).

## 4. Alertas push de SLA (Edge Function + cron)

En tu PC, desde la carpeta del proyecto:

```bash
# 4.1 Claves (📝 guarda las tres salidas)
npx web-push generate-vapid-keys                                         # → VAPID public + private
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" # → CRON_SECRET
```

4.2 Supabase → **Edge Functions → Secrets** → crea:

| Secreto | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | clave pública del 4.1 |
| `VAPID_PRIVATE_KEY` | clave privada del 4.1 |
| `CRON_SECRET` | el valor aleatorio del 4.1 |
| `SITE_URL` | la dirección de Cloudflare Pages (paso 5), ej. `https://sigtoc-ccsonido.pages.dev` |

4.3 Despliega la función (inicia sesión en la CLI con una cuenta que tenga acceso al proyecto):

```bash
cd backend
npx supabase login
npx supabase functions deploy sla-push-check --project-ref <PROJECT_REF> --no-verify-jwt
```

4.4 SQL Editor: abre `backend/supabase/instalacion/02-cron-alertas.sql`, reemplaza `<PROJECT_REF>` y `<CRON_SECRET>` y córrelo.

## 5. Frontend en Cloudflare Pages (gratis, permite uso comercial)

1. Entra a https://dash.cloudflare.com con el correo del cliente → **Workers & Pages → Create → Pages → Connect to Git**.
2. Autoriza tu cuenta de GitHub y elige el repositorio de SIGTOC, rama `main`.
3. Configuración del build:

| Campo | Valor |
|---|---|
| Project name | `sigtoc-ccsonido` (define la dirección: `https://sigtoc-ccsonido.pages.dev`) |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (vacío) |

4. **Environment variables** (en *Production*), antes del primer build:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | Project URL del paso 2 |
| `VITE_SUPABASE_ANON_KEY` | clave `anon public` del paso 2 |
| `VITE_VAPID_PUBLIC_KEY` | clave pública VAPID del paso 4 |
| `NODE_VERSION` | `20` |

No pongas `VITE_ALLOW_SIGNUP` (sin ella no aparece "Crear cuenta" en el login).

5. **Save and Deploy**. Las rutas como `/tablero` funcionan sin configuración extra: Pages sirve la app para cualquier dirección.

Si cambias una variable después, hay que volver a desplegar (**Deployments → Retry deployment**), porque se incrustan al compilar.
Si la dirección final es distinta a la que pusiste en `SITE_URL` (paso 4) o en *Site URL* (paso 2), actualízalas.

**Actualizaciones:** cada push a `main` en GitHub publica automáticamente en Cloudflare (cliente) y en Vercel (demo). Lo que esté en `main` le llega al cliente: trabaja lo experimental en otra rama.

## 6. Respaldo semanal (archivos + datos)

Los backups de Supabase Pro cubren solo la base de datos; **los archivos (PDF, guías, comprobantes) solo quedan respaldados con este script**.

En un PC de la oficina que tenga **Google Drive para escritorio**:

1. Instala Node.js LTS (https://nodejs.org).
2. Copia la carpeta `backend/backup` a `C:\SIGTOC-respaldo`.
3. Copia `backup.env.example` como `backup.env` y complétalo: URL, `service_role` y `BACKUP_DIR` en una carpeta de Drive (ej. `G:\Mi unidad\SIGTOC-respaldos`).
4. Primera vez, en una terminal: `C:\SIGTOC-respaldo\respaldo.bat --full`
5. Programarlo (diario a las 7 p. m.; en una terminal como administrador):
   ```bat
   schtasks /create /tn "SIGTOC respaldo" /tr "C:\SIGTOC-respaldo\respaldo.bat" /sc daily /st 19:00
   ```
   Cada corrida exporta las tablas a `datos\` (guarda las últimas 12), descarga solo archivos nuevos o cambiados a `archivos\` y deja el detalle en `backup.log`.

## 7. Verificación antes de entregar

- [ ] Iniciar sesión con un usuario creado en el paso 3 (y comprobar que el login **no** muestra "Crear cuenta").
- [ ] Crear un pedido, subir el PDF, pasar por las 4 etapas; subir una foto de guía desde el celular.
- [ ] Configuración: ajustar SLA, orígenes de venta y transportadoras del cliente.
- [ ] Activar "Alertas push" en un celular y dejar un pedido vencer su SLA: debe llegar la notificación.
- [ ] Abrir `/tablero` en la TV.
- [ ] Revisar `backup.log` después de la primera corrida programada.
- [ ] Borrar los pedidos de prueba (Table Editor → `orders`) antes de que el equipo empiece.
