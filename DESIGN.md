# Design

Sistema visual de SIGTOC. Dirección elegida: **estándar de la categoría**, con acabado tipo Shopify Polaris / Stripe Dashboard (ver `PRODUCT.md`). Las fuentes de verdad en código son `frontend/src/styles/tokens.js` (valores), `frontend/tailwind.config.js` (los expone como clases) y `frontend/src/components/ui/` (piezas base).

## Principios

- **El riesgo se ve primero.** Toda lista de pedidos se ordena por % de SLA consumido; los cerrados van al final y atenuados.
- **El color de estado nunca va solo.** Siempre lleva ícono + texto (`SlaBadge`). El rojo es exclusivo de "excedido"; entregado y anomalía son neutros (gris).
- **Familiaridad sobre sorpresa.** Controles estándar (botones, pestañas, selects, tablas); la marca vive en los detalles, no en adornos.
- **Móvil = piso de bodega.** Objetivos táctiles ≥ 44 px, inputs de 16 px (sin zoom en iOS), acción principal fija abajo, filtros secundarios plegados.

## Color

| Rol | Token | Valor |
|---|---|---|
| Fondo de la app | `bg` | `#F1F2F4` |
| Superficie (tarjetas) | `surface` / `surface2` | `#FFFFFF` / `#F7F7F8` |
| Menú lateral | `nav` | `#EBEBEB` |
| Barra superior | `topbar` | `#1A1A1A` |
| Texto | `ink` / `ink2` / `ink3` | `#202223` / `#616161` / `#8A8A8A` |
| Líneas | `line` / `line2` | `#E3E3E3` / `#EBEBEB` |
| Acción primaria | `primary` | `#202223` (botón casi negro, como Polaris) |
| Enlaces y foco | `link` / `focus` | `#005BD3` |
| Excedido | `crit` / `critBg` / `critBar` | `#8E1F0B` / `#FEE9E8` / `#E51C00` |
| Por vencer (≥ 75 %) | `warn` / `warnBg` / `warnBar` | `#5E4200` / `#FFF1D6` / `#E8A200` |
| En tiempo / completado | `ok` / `okBg` / `okBar` | `#0C5132` / `#CDFEE1` / `#29845A` |
| Neutro (entregado, anomalía) | `neutral` / `neutralBg` | `#4A4A4A` / `#EBEBEB` |
| Etapa activa sin riesgo | `infoBar` | `#9BB8F0` |
| Serie de datos (gráficas) | `series` / `seriesSoft` | `#4F5FD6` / `#C9CCE8` |

## Tipografía

- Una sola familia: **Inter** (400–700), cargada en `styles/index.css`. Cifras con `.num` (números tabulares).
- Escala: títulos de página 20 px bold; títulos de tarjeta 14–15 px semibold; cuerpo 13.5 px (14–15 px en móvil); metadatos 12–12.5 px.
- Sin mayúsculas sostenidas ni monoespaciada decorativa.

## Forma y profundidad

- Tarjetas: `.card` → radio 12 px + `shadow-card` (sin borde). Modales y menús: `shadow-pop`.
- Botones y campos: radio 8 px; altura 44 px en móvil / 32 px en escritorio (`.field`, `Button`).
- Insignias: 22 px de alto, radio 8 px.

## Componentes base (`components/ui/`)

- `Button` — `primary`, `secondary`, `critical`, `criticalOutline` (acción destructiva aislada), `plain`. Deshabilitado = fondo `surface2` + texto `ink3`.
- `Badge`, `SlaBadge`, `OrderStatusBadge` — estados de pedido y SLA.
- `SlaMeter` — barra de consumo del SLA (verde → ámbar 75 % → rojo 100 %). `StageTrack` — progreso en 4 tramos.
- `Modal` — foco gestionado (entra, queda atrapado, vuelve al cerrar), Esc, hoja inferior en móvil.
- `Banner` — avisos (crítico / advertencia / info). `Toast` — confirmación o error de cada acción.

## Estructura de pantalla

- `AppShell`: barra superior oscura (marca, búsqueda global con Ctrl K, campanita, cuenta) + menú lateral de 240 px (drawer en móvil).
- Contenido con ancho máximo de 1200 px y márgenes de 12 / 24 / 32 px.

## Gráficas

- Una serie en `series`; estados con los colores de estado. Barras ≤ 24 px, extremos redondeados; líneas de 2 px; cuadrícula de 1 px recesiva.
- La meta (80 %) y los límites de SLA se marcan con una línea vertical.
- "Sin datos" se escribe, nunca se dibuja como 0. Cada gráfica ofrece "Ver como tabla".

## Movimiento

- Transiciones de 150–200 ms solo para estado (hover, aparición del toast). Se respeta `prefers-reduced-motion`.
