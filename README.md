# SIGTOC — Torre de Control de Pedidos

Sistema de gestión documental y trazabilidad de órdenes de compra con auditoría y alertas de SLA. Producto **comercial**, pensado para venderse a empresas de logística/distribución. La propuesta de venta principal es el seguimiento de SLA por etapa y la capacidad de auditoría completa (quién hizo qué, cuándo, y por qué).

Origen: nació de un prototipo HTML estático + un diagrama de flujo, y evolucionó iterativamente con Claude hasta una app funcional con backend real.

---

## 1. Stack técnico

- **Estructura del repo**: `frontend/` (app React) y `backend/` (Supabase: Edge Functions + migraciones SQL). Ver sección 5.
- **Frontend**: React 18 + Vite. El código vive en `frontend/src/`, separado en componentes, servicios (acceso a Supabase), estilos, constantes y utilidades. `package.json` y `vite.config.js` siguen en la raíz (`vite.config.js` apunta `root` a `./frontend` y deja el build en `./dist`), así que Vercel no necesitó ningún cambio.
- **Estilos**: Tailwind CSS **compilado en build time** (PostCSS) — `frontend/tailwind.config.js` + `frontend/postcss.config.js` + `frontend/src/styles/index.css` con las directivas `@tailwind`. **Importante**: NO usar Tailwind por CDN (`cdn.tailwindcss.com`). Se probó y falla tanto en el visor de archivos de Claude.ai (CSP restrictivo) como en producción (puede ser bloqueado por ad-blockers). Si el deploy se ve "sin estilos", esa es la primera sospecha.
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions + Realtime + pg_cron).
- **Íconos**: `lucide-react`.
- **Gráficas**: `recharts` (módulo de Reportes).
- **Tipografía**: Inter (texto, datos y cifras con números tabulares), cargada por `@import` de Google Fonts en `frontend/src/styles/index.css`.
- **Despliegue**: Vercel, conectado por Git al repo de GitHub (auto-deploy en cada `git push` a `main`). **No** se debe subir por zip manual — eso causó confusión varias veces ("por qué no se ve el cambio") porque Vercel seguía sirviendo una versión vieja.
- **PWA**: instalable (manifest + service worker), con notificaciones push reales (Web Push API + VAPID).

---

## 2. Supabase — proyecto y credenciales

- **Proyecto**: `SIGTOC`
- **Project ID / ref**: `tpxglussuqmvhprrjwqz`
- **Región**: `us-west-2`
- **Organización**: `kitlibqidvugwbjxazgu`
- Se creó una **cuenta de Supabase nueva y separada** específicamente para este proyecto (el usuario ya tenía 2 proyectos gratuitos ocupados en otra cuenta con negocios distintos — sandwich/granizados — no relacionados con SIGTOC. No tocar esos.)

### Claves (anon / publishable — seguras para el frontend, protegidas por RLS)
```
SUPABASE_URL=https://tpxglussuqmvhprrjwqz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGdsdXNzdXFtdmhwcnJqd3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NjU3MDQsImV4cCI6MjEwMTQ0MTcwNH0.mHak_G9n384IJaQxU18Sc6kupuR8HPkf0PfYsXEvgqI
```
Viven en `frontend/src/lib/supabaseClient.js` (hardcodeadas como respaldo) y opcionalmente en variables de entorno de Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

### Secretos de la Edge Function (⚠️ sensibles — configurados manualmente en el dashboard de Supabase → Edge Functions → sla-push-check → Secrets, NO están en el código ni en git)
```
VAPID_PUBLIC_KEY=BLXxMMSqlCgnRSMYgAgIJeaG4tgNkKcXZXRWmfILCb8Zogf9wyWYBZJjofvoM09QzOmRoLr98MeXBe2cZmCTzUY
VAPID_PRIVATE_KEY=DxOkgFo5CaSQ-89wap8KOjRnpcA1kGjcHFcbCZ4tv10
SITE_URL=https://cyc-auditoria-oc.vercel.app
CRON_SECRET=58fe05e3a5b47ca807e809c941ac74bb9d9da47989a9678d
```
La `VAPID_PUBLIC_KEY` también está en `frontend/src/lib/supabaseClient.js` (es pública, esa sí puede vivir en el frontend).

**Pitfall real que ya pasó**: al pegar `VAPID_PRIVATE_KEY` y `VAPID_PUBLIC_KEY` en el dashboard de Supabase, el copy-paste corrompió el valor (espacio/salto de línea invisible) y la función fallaba con `"Vapid public key should be 65 bytes long when decoded"` o `"Failed to decode base64url: invalid character"`. Solución: borrar el campo por completo y volver a pegar con cuidado. Si vuelve a pasar, verificar longitud decodificada con Node: `Buffer.from(key,'base64url').length` (debe dar 65 para la pública, 32 para la privada).

---

## 3. Esquema de base de datos (Postgres)

### Tabla `orders`
```sql
id                 text primary key   -- ej: PED-2026-0007-6PQ
cliente            text
created_at         timestamptz
created_by         uuid references auth.users(id)
created_by_email   text
status             text  -- 'abierto' | 'cerrado' | 'cancelado'
current_stage      int   -- 1..4
sla_config         jsonb -- snapshot del SLA global al momento de crear el pedido (para reportes históricos)
stages             jsonb -- { "1": {startedAt, completedAt, data, editHistory}, "2": {...}, "3": {...}, "4": {...} }
audit_log          jsonb -- [{ts, user, action}, ...]
whatsapp_log       jsonb -- [{ts, text}, ...]  (este es el "Centro de notificaciones" en la UI — el nombre de columna quedó igual por compatibilidad, no se renombró en DB)
cancel_info        jsonb -- {reason, by, at} | null — cuando se finaliza por anomalía
last_notified_state text  -- 'alerta' | 'excedido' | null — control para no duplicar push notifications
last_notified_at   timestamptz
updated_at         timestamptz (trigger automático)
```
RLS: habilitado, policy `authenticated_full_access` — cualquier usuario autenticado puede leer/escribir todo (single-tenant, un solo rol por ahora; pensado para roles diferenciados por etapa en el futuro).

**Estructura de `data` dentro de cada etapa**:
- Etapa 1: `{ pdfPath, rutPath }` (rutas dentro del bucket `pedido-pdfs`, `rutPath` puede ser `null` — es opcional)
- Etapa 2: `{ serialesList: ["SN-1","SN-2",...], seriales: "SN-1, SN-2" }` (se guardan ambos: el array para UI moderna, el string plano para compatibilidad con pedidos viejos que solo tenían `seriales` como texto)
- Etapa 3: `{ factura }`
- Etapa 4: `{ modo: "guia" | "tienda", guiaNumero: string|null, guiaFilePath: string|null }` — número y/o archivo de guía solo aplican cuando `modo === "guia"`.

**Versionado (`editHistory`)**: cuando se edita una etapa ya completada, el dato viejo se empuja a `stages[n].editHistory` como `{data, editedAt, editedBy, version}` y el dato nuevo pasa a ser el actual. La UI muestra "v1", "v2", etc.

### Tabla `app_settings`
```sql
id          boolean primary key default true  -- fila única, siempre id=true
sla_config  jsonb  -- { "1": 30, "2": 45, "3": 20, "4": 60 }  minutos límite por etapa, GLOBAL (no por pedido)
updated_at  timestamptz
```
Editable desde la UI (botón "SLA" en el dashboard). Al cambiar, afecta en vivo el cálculo de estado de SLA de todos los pedidos abiertos (los reportes históricos sí usan el snapshot guardado en `orders.sla_config` de cada pedido, para no distorsionar el pasado).

### Tabla `push_subscriptions`
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references auth.users(id)
endpoint    text unique
subscription jsonb  -- objeto de suscripción Web Push completo
created_at  timestamptz
```

### Storage
Bucket **`pedido-pdfs`** (privado). Rutas usadas:
- `{orderId}/pedido.pdf`
- `{orderId}/rut.pdf`
- `{orderId}/guia-{timestamp}.{ext}` (guía de envío, Etapa 4)

Políticas: usuarios autenticados pueden `select`/`insert`/`update` en ese bucket.

---

## 4. Edge Function: `sla-push-check`

Código fuente: [`backend/supabase/functions/sla-push-check/index.ts`](backend/supabase/functions/sla-push-check/index.ts) (copia fiel de la versión desplegada, v5). Las migraciones SQL de la BD están en `backend/supabase/migrations/`. Cómo desplegar: ver [`backend/README.md`](backend/README.md).

**Qué hace**: cada vez que se ejecuta,
1. Lee `app_settings.sla_config` (SLA global).
2. Lee todos los `orders` con `status = 'abierto'`.
3. Para cada uno, calcula si la etapa activa está en `alerta` (≥75% del límite) o `excedido` (≥100%).
4. Si cambió de estado respecto a `last_notified_state`, envía push (vía `npm:web-push`) a todas las filas de `push_subscriptions`, con payload `{title, body, url: "{SITE_URL}/?order={id}", tag: id}`.
5. Actualiza `last_notified_state` / `last_notified_at` para no reenviar el mismo aviso.
6. Si el pedido vuelve a `ok` (avanzó de etapa), resetea `last_notified_state` a `null`.

**Autenticación de la función**: `verify_jwt: false` — en su lugar valida un header propio `x-cron-secret` contra el secreto `CRON_SECRET`. Esto se hizo así porque no hay forma de obtener la `service_role key` vía las herramientas MCP de Supabase para autenticar correctamente `pg_cron` con `verify_jwt: true`.

**Probarla manualmente**:
```bash
curl -X POST https://tpxglussuqmvhprrjwqz.supabase.co/functions/v1/sla-push-check \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: 58fe05e3a5b47ca807e809c941ac74bb9d9da47989a9678d"
```
Respuesta esperada: `{"checked": N, "subs": N, "sent": N, "errors": []}`.

**Cron**: `pg_cron` + `pg_net` habilitados, job `sla-push-check-every-3-min` corriendo `*/3 * * * *`, llama la función por `net.http_post` con el header `x-cron-secret`.

---

## 5. Estructura del código

```
SIGTOC/
├── package.json, vite.config.js     # build desde la raíz (root: ./frontend, salida: ./dist) — Vercel sin cambios
├── backend/                          # Supabase: Edge Functions + migraciones SQL (ver backend/README.md)
└── frontend/
    ├── index.html
    ├── tailwind.config.js, postcss.config.js
    ├── .env.example
    ├── public/                       # PWA: manifest.json, sw.js, íconos
    └── src/
        ├── main.jsx                  # punto de entrada
        ├── App.jsx                   # componente raíz: sesión, estado global, navegación, handlers
        ├── lib/supabaseClient.js     # cliente de Supabase + PDF_BUCKET + VAPID_PUBLIC_KEY
        ├── services/                 # TODO el acceso a Supabase vive aquí (los componentes no llaman a supabase directo)
        │   ├── auth.js               # sesión, login, signup, logout
        │   ├── orders.js             # fetch/crear/finalizar etapa/editar etapa/cancelar (arma audit_log, whatsapp_log, editHistory)
        │   ├── settings.js           # SLA global (app_settings)
        │   ├── storage.js            # subir PDF/RUT/guía + abrir con signed URL
        │   ├── push.js               # service worker + suscripción Web Push
        │   └── realtime.js           # suscripción a cambios de orders/app_settings
        ├── styles/
        │   ├── index.css             # fuente Inter (@import) + directivas Tailwind + base (foco, inputs 16px en móvil) + clases .card/.field/.label
        │   ├── tokens.js             # paleta C {...} y FONT_SANS (expuestos como colores/fuente de Tailwind: bg-surface, text-ink2, bg-critBg…)
        │   └── charts.js             # estilos de recharts (chartFont, chartTooltipStyle)
        ├── constants/stages.js       # STAGES (las 4 etapas) + DEFAULT_SLA
        ├── utils/
        │   ├── format.js             # fmtShort ("9 oct, 09:30"), fmtDay, fmtMinutes ("2 h 20 min"), shortUser
        │   ├── sla.js                # slaStatus, isAtRisk, sortByRisk (alineado con slaState() de la Edge Function)
        │   └── reports.js            # cálculos de reportes: periodRange, summarize, dailySeries, topExceeded, recentAnomalies
        └── components/
            ├── ui/                   # piezas base: Button, Badge/SlaBadge/OrderStatusBadge, SlaMeter/StageTrack, Modal, Banner, Toast
            ├── layout/               # AppShell (barra superior + menú lateral/drawer), AlertBell
            ├── auth/LoginScreen.jsx
            ├── settings/SlaSettingsModal.jsx
            ├── documents/            # FileSlot, PdfUploader, GuideUploader, DocLink
            ├── orders/               # OrdersPage, OrderDetail, NewOrderModal, CancelBox
            │   └── stages/           # StageForm, StageEditForm, StageDataView, StageHistoryModal, SerialListEditor
            └── reports/              # ReportsView, KpiCard, ChartCard, StageBars
```

**Convención**: los componentes solo se encargan de UI. Cualquier lectura o escritura en Supabase va en `services/`. El estilo se escribe con clases de Tailwind usando los tokens del tema; las piezas repetidas (botón, insignia de SLA, barra de consumo, modal) salen de `components/ui/`.

**Sistema visual**: estándar de la categoría con acabado tipo Shopify Polaris / Stripe Dashboard (decisión registrada en `PRODUCT.md`). Barra superior oscura, menú lateral (drawer en móvil), tipografía Inter, estados de SLA siempre con ícono + texto, rojo reservado para "excedido". Maquetas de referencia en `.impeccable/mocks/canon/`.

Qué hace cada componente:

- `AppShell` — barra superior (búsqueda global con Ctrl K, campanita, menú de cuenta) + menú lateral (Pedidos con vistas Todos/En riesgo/Anomalías, Reportes, Configuración de SLA, alertas push). En móvil el menú es un panel deslizable.
- `AlertBell` — campanita con conteo de pedidos con SLA en riesgo y lista para saltar a ellos.
- `LoginScreen` — login + signup con Supabase Auth, ver/ocultar contraseña y errores traducidos al español.
- `OrdersPage` — panel de pedidos: aviso de pedidos en riesgo, tarjetas por etapa (también filtran), pestañas, filtros (etapa —recordado en el dispositivo—, estado de SLA, creador), orden por riesgo; tabla en escritorio y tarjetas en móvil.
- `OrderDetail` — detalle: encabezado con estado, stepper de 4 etapas (las completadas abren su historial), etapa activa con barra de SLA, auditoría y centro de notificaciones.
- `StageForm` — formulario de la etapa **activa**; botón de finalizar fijo abajo en móvil y explica qué falta cuando está deshabilitado.
- `SerialListEditor` — seriales de la Etapa 2 con soporte de lector de código de barras (Enter salta al siguiente campo o crea uno nuevo).
- `CancelBox` — "Finalizar por anomalía": aislada del botón de avanzar, motivo obligatorio.
- `StageDataView` / `StageEditForm` / `StageHistoryModal` — ver, corregir (crea nueva versión) e historial de versiones de una etapa completada.
- `FileSlot`, `PdfUploader`, `GuideUploader`, `DocLink` — subir y ver documentos (PDF del pedido, RUT, guía) con URL firmada.
- `NewOrderModal` — crear pedido (cliente obligatorio). `SlaSettingsModal` — editar el SLA global con validación.
- `ReportsView` (+ `KpiCard`, `ChartCard`, `StageBars`) — reportes por período (7/30/90 días) con comparación contra el período anterior: KPIs con tendencia, cumplimiento por etapa vs. meta 80 %, tiempo promedio vs. límite, pedidos por día, pedidos que más excedieron el SLA y motivos de anomalía. Cada gráfica tiene "Ver como tabla".
- `Toast` — confirmación (o error) de cada acción: crear, finalizar etapa, corregir, cancelar, guardar SLA, push.
- `App` — componente raíz: sesión, carga de `orders`/`app_settings` con Realtime, navegación (pedidos/reportes), service worker y push, deep-link (`?order=ID`) y los handlers `handle*` que delegan en `services/`.

### PWA
- `frontend/public/manifest.json` — nombre SIGTOC, `display: standalone`, íconos del logo real de la empresa (C&C).
- `frontend/public/sw.js` — service worker: maneja evento `push` (muestra la notificación) y `notificationclick` (navega/enfoca la ventana en la URL del pedido).
- `frontend/public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — generados a partir del logo C&C que subió el usuario (óvalo plateado/rojo sobre fondo negro), recortados a cuadrado con margen para que no se corten con máscaras del sistema operativo.

---

## 6. Funcionalidades ya construidas (resumen funcional)

1. **Login/registro real** con Supabase Auth.
2. **Flujo de 4 etapas**: Ingreso de Pedido (PDF obligatorio + RUT opcional) → Bodega (múltiples seriales, compatible con lector de barras) → Facturación (número de factura) → Despacho y Entrega (guía —número y/o archivo, con al menos uno de los dos— o entrega en tienda).
3. **SLA global configurable** (no por pedido individual), con timers en vivo y 3 estados visuales (en tiempo / por vencer / excedido).
4. **Finalizar por anomalía en cualquier etapa**: motivo obligatorio, queda registrado quién y cuándo.
5. **Historial y edición versionada de etapas completadas**: se puede ver y corregir lo que se cargó en una etapa ya cerrada, sin perder el dato original (v1, v2, v3...).
6. **Panel de pedidos** ordenado por riesgo de SLA, con filtros por etapa/estado/creador, búsqueda (también por serial) y vista móvil por tarjetas.
7. **Módulo de Reportes**: rango de fechas, cumplimiento de SLA por etapa, tiempos promedio vs. límite, distribución de estados, tendencia diaria, motivos de cancelación.
8. **Centro de notificaciones** (antes "simulación de WhatsApp"): log de hitos por pedido, visible en el detalle.
9. **Campanita de alertas global** en el header, con contador de pedidos en riesgo de SLA.
10. **PWA instalable** con **notificaciones push reales** (no simuladas): la función `sla-push-check` corre cada 3 minutos vía `pg_cron`, detecta pedidos con SLA en riesgo, y empuja notificaciones a todos los dispositivos suscritos. Clic en la notificación abre la app directo en ese pedido.
11. **Datos en tiempo real** entre dispositivos (Supabase Realtime): si dos personas tienen la app abierta, ambas ven los cambios del otro sin recargar.

## Pendiente / roadmap (mencionado por el usuario, aún no construido)
- **WhatsApp Business API real** (Meta Cloud API) para reemplazar el "Centro de notificaciones" simulado — investigado pero no implementado. Nota importante ya investigada: Meta lanzó en 2026 una API oficial de Grupos (máx. 8 participantes, requiere cuenta "Official Business Account"); la alternativa más simple es notificación individual a una lista de números vía Cloud API estándar, sin necesitar esa verificación especial.
- **Roles diferenciados por etapa** (ej: Bodega solo ve/edita Etapa 2) — hoy todos los usuarios autenticados tienen el mismo rol/permisos completos. Se dejó la RLS abierta a propósito pensando en esto a futuro.
- Posible exploración de librería de componentes (**shadcn/ui**) + **Framer Motion** para pulir estética — se hicieron 2 mockups HTML de dirección visual (uno "mismo tema pero más pulido", otro "sidebar tipo SaaS") pero **no se aplicó ningún cambio de código todavía**, quedó en pausa para retomar funcionalidad primero.

---

## 7. Etapa 4 — número y archivo de guía (completado)

En "Envío con guía" ahora se puede indicar el **número de guía**, subir una **foto o PDF de la guía física**, o ambos — con uno de los dos ya se puede finalizar el pedido.

- `StageForm` (etapa activa): estado `guiaNumero`/`guiaFilePath`; el botón de finalizar se habilita si `modoEntrega === "tienda"` o hay número y/o archivo de guía. `onFinalize` manda `{ modo, guiaNumero, guiaFilePath }`.
- `StageEditForm`: mismo patrón, para editar la guía de un pedido ya despachado (crea nueva versión, igual que RUT/PDF en Etapa 1).
- `StageDataView`: muestra el modo de entrega y, si es "guia", el número y un `DocLink` al archivo.
- No requirió migración: `stages[4].data` ya era `jsonb` flexible.

---

## 8. Aprendizajes y pitfalls (para no repetirlos)

- **Conector de Supabase MCP**: usar `list_projects` para confirmar qué cuenta está conectada — el usuario tiene varias cuentas de Supabase. Cambiar de cuenta requiere desconectar/reconectar el conector completo desde Configuración → Conectores (no basta con "elegir otra" en el chat).
- **`deploy_edge_function` a veces devuelve `"No approval received"`** sin motivo aparente — simplemente reintentar (puede funcionar al segundo intento sin cambiar nada).
- **Edge Functions llamadas por cron**: usar `verify_jwt: false` + autenticación propia por header secreto, porque no hay forma de obtener la `service_role key` por las herramientas MCP para autenticar correctamente con `verify_jwt: true`.
- **Corrupción de secretos al copiar/pegar** en el dashboard de Supabase (VAPID keys) — verificar longitud decodificada si hay errores raros de "bytes" o "invalid character".
- **Tailwind por CDN no sirve** ni en preview de Claude.ai ni en producción confiable — siempre compilar en build time.
- **Vercel**: conectar el repo de GitHub (Settings → Git) para auto-deploy; no subir zips manuales. "Environment Variables" (gratis) ≠ "Environments" (de pago, para entornos custom) — son secciones distintas del menú, fácil confundirlas.
- **Íconos de PWA instalada**: si cambias el manifest/íconos, los dispositivos que ya la instalaron pueden necesitar desinstalar y reinstalar para ver el ícono nuevo (queda cacheado).
- **`react-dom`, `lucide-react`, `recharts`, `@supabase/supabase-js` son las dependencias npm reales del proyecto** (`package.json`) — Tailwind/PostCSS/Autoprefixer son devDependencies.

---

## 9. Cómo correr el proyecto localmente

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción (verificar que compile sin errores antes de cada push)
```

No hace falta `.env.local` para que funcione (las credenciales anon/públicas están hardcodeadas como respaldo en `frontend/src/lib/supabaseClient.js`), pero si se quiere usar variables de entorno, ver `frontend/.env.example` (el `.env.local` va dentro de `frontend/`).

## 10. Flujo de trabajo esperado a partir de ahora

1. Hacer cambios en el código (Claude Code / VS Code).
2. `npm run build` para verificar que compila.
3. `git add . && git commit -m "..." && git push`.
4. Vercel despliega solo (repo ya conectado).
5. Si el cambio toca base de datos/Storage/Edge Functions, se hace directamente contra el proyecto Supabase `tpxglussuqmvhprrjwqz` (ya sea por SQL manual en el dashboard, o pidiéndole a Claude en el chat que use su conector de Supabase).
