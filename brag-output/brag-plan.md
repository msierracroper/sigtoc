# SIGTOC · plan del video de lanzamiento

**Qué es:** SIGTOC es una torre de control de pedidos: sigue cada orden por 4 etapas (Ingreso → Bodega → Facturación → Despacho) con SLA en vivo y auditoría de cada paso.
**Para quién:** empresas de logística y distribución (bodega en el piso, oficina, despacho y supervisión).
**Qué lo distingue:** el riesgo manda: la lista se ordena por SLA consumido; y funciona igual en PC, celular (bodega con lector de barras) y una TV tipo tablero de aeropuerto.
**Claim más fuerte:** "¿Qué pedido se te está atrasando ahora mismo?" — SIGTOC lo responde de un vistazo.
**Gancho visual:** el tablero de TV oscuro con filas EXCEDIDO / POR VENCER, desenfocado detrás de la pregunta.
**UI real que se muestra:** panel de pedidos (escritorio), captura de Bodega referencia + serial (celular), tablero `/tablero` (TV), insignias reales de stand by, preventa, pago y guía pendiente.
**Tono:** `app-store` con energía de lanzamiento: limpio, rápido, tarjetas que entran al ritmo.
**Caption:** "SIGTOC: el riesgo de cada pedido, a la vista — en el PC, en el celular de bodega y en la TV."

**Datos:** todos ficticios (clientes de ejemplo, usuarios `@ejemplo.co`). Nada de URLs internas, claves ni datos reales.

## Identidad
- Fondo del video: `#0F1114` (el negro del tablero de TV). Dispositivos claros encima → contraste máximo.
- Tipografía Inter (la de la app). Colores de estado reales: rojo `#E51C00`, ámbar `#E8A200`, verde `#29845A`, azul `#005BD3`.

## Audio
`happy-beats-business-moves-vol-1` (ende.app, incluida en la skill), 120 BPM, tiempos cada 0,5 s desde 3,02 s. Cortes de escena alineados a tiempos fuertes (3,0 · 6,0 · 10,0 · 14,0 · 18,0 · 21,0). Fade-out en el último 1,5 s. Sin efectos sueltos: la música carga el ritmo.

## Storyboard v3 (27 s, 1920×1080, 30 fps) — el gancho son los jefes y los reportes

Quien aprueba la compra es el administrador, y lo que usa son los reportes. Por eso el video abre y cierra con ellos.

| # | Tiempo | Escena | Texto en pantalla |
|---|---|---|---|
| 1 | 0,0–3,0 | **Gancho.** Reportes reales desenfocados; pregunta grande. | "¿Sabes qué porcentaje de tus pedidos llega **a tiempo**?" |
| 2 | 3,0–5,0 | **Revelación.** Logo + promesa. | "SIGTOC" / "La torre de control de tus pedidos" |
| 3 | 5,0–9,5 | **Reportes (escena más larga).** Vista real de Reportes en el portátil con zoom lento: cumplimiento 88 % (+32 pts), SLA por etapa, tiempo vs. límite, pedidos que más excedieron. | "Reportes para quien decide" / ✓ Cumplimiento de SLA por etapa · ✓ Tiempo real vs. límite · ✓ Dónde se atascan los pedidos |
| 4 | 9,5–13,0 | **Alertas de SLA.** Notificaciones push en pantalla de bloqueo. | "Te avisa antes de que se venza" |
| 5 | 13,0–17,5 | **Auditoría.** Línea de tiempo del pedido, entrada por entrada. | "Auditoría de cada movimiento" |
| 6 | 17,5–20,0 | **PC.** Panel ordenado por riesgo, anillo rojo sobre el excedido. | "El riesgo se ve primero" |
| 7 | 20,0–22,5 | **Bodega.** Celular escaneando referencia + serial. | "Bodega escanea desde el celular" |
| 8 | 22,5–24,5 | **TV.** Tablero en vivo. | "Y en la TV de bodega, en vivo" |
| 9 | 24,5–27,0 | **Cierre.** | "SIGTOC" / "Reportes para quien decide · Alertas de SLA · Auditoría" / "PC · Celular · TV" |

Póster (cuadro 0): la escena de reportes con los tres beneficios (t ≈ 8,6 s).

## Storyboard v2 (25,5 s, 1920×1080, 30 fps) — énfasis en alertas de SLA y auditoría (reemplazado)

| # | Tiempo | Escena | Texto en pantalla |
|---|---|---|---|
| 1 | 0,0–3,0 | **Gancho.** Tablero de TV real desenfocado; pregunta grande. | "¿Qué pedido se te está **atrasando** ahora mismo?" |
| 2 | 3,0–5,0 | **Revelación.** Logo + promesa. | "SIGTOC" / "La torre de control de tus pedidos" |
| 3 | 5,0–9,0 | **Alertas de SLA.** Celular en pantalla de bloqueo recibe las notificaciones push reales (texto de `sla-push-check`). | "Te avisa antes de que se venza" / "Alerta push al 75 % y al 100 % del SLA de cada etapa, directo al celular." |
| 4 | 9,0–12,5 | **PC.** Panel real ordenado por riesgo, anillo rojo sobre el excedido. | "El riesgo se ve primero" |
| 5 | 12,5–15,5 | **Bodega.** Celular escaneando referencia + serial. | "Bodega escanea desde el celular" |
| 6 | 15,5–20,5 | **Auditoría (escena más larga).** Línea de tiempo del pedido: creado, ingreso, pagado, bodega, stand by con motivo, reanudado, corrección v2 — cada movimiento entra al ritmo con quién y cuándo. | "Auditoría de cada movimiento" / "Quién, qué, cuándo y por qué. Cada corrección guarda su versión anterior." |
| 7 | 20,5–23,0 | **TV.** Tablero en vivo dentro de un televisor. | "Y en la TV de bodega, en vivo" |
| 8 | 23,0–25,5 | **Cierre.** | "SIGTOC" / "Alertas de SLA · Auditoría de cada paso" / "PC · Celular · TV" |

Nota: el texto de las notificaciones push se corrigió en `sla-push-check` (tildes y separador "·") para que el video muestre exactamente lo que envía la app.
