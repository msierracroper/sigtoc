# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Cuatro roles operan el mismo flujo de pedido, cada uno en un momento distinto:

- **Bodega (piso):** operarios de pie, con celular o tablet y lector de código de barras. Registran seriales (Etapa 2) con prisa, a menudo con una sola mano.
- **Oficina / facturación:** personal administrativo en escritorio. Carga el PDF del pedido y el RUT (Etapa 1) y registra el número de factura (Etapa 3).
- **Despacho / mensajería:** registran la guía de envío (número y/o foto/PDF) o la entrega en tienda (Etapa 4), a veces desde el celular.
- **Supervisor / gerente:** vigila SLA, alertas y reportes. Su trabajo es detectar qué pedido está en riesgo y presionar al equipo correcto.

Hoy todos tienen el mismo rol y los mismos permisos. Los roles por etapa están en el roadmap.

## Product Purpose

SIGTOC es una torre de control de pedidos: hace trazable cada orden de compra a través de 4 etapas (Ingreso → Bodega → Facturación → Despacho), mide el SLA de cada etapa en vivo y deja una auditoría completa (quién hizo qué, cuándo y por qué). El éxito es que ningún pedido se quede atascado sin que alguien lo note, y que cualquier pregunta sobre un pedido se pueda responder con evidencia.

## Positioning

Producto comercial para empresas de logística y distribución. La propuesta de venta es el seguimiento de SLA por etapa, con alertas push reales, más la auditoría completa y versionada (cada corrección conserva la versión anterior: v1, v2…).

## Operating Context

- PWA instalable, con notificaciones push que abren directo el pedido en riesgo.
- Lector de código de barras en bodega: escanear + Enter salta al siguiente campo.
- Documentos reales: PDF del pedido, RUT, foto o PDF de la guía física.
- Finalizar por anomalía es posible en cualquier etapa, con motivo obligatorio.
- SLA global configurable por etapa, en minutos; alerta al 75 % y excedido al 100 %.

## Capabilities and Constraints

- Stack existente: React 18 + Vite + Tailwind (compilado) + Supabase. Despliegue en Vercel.
- Idioma de la interfaz: español (es-CO).
- El diseño debe funcionar igual de bien en escritorio y en celular (decisión del usuario: ambos por igual).
- Aún sin definir: marca comercial (SIGTOC propia, marca blanca o C&C). El usuario indicó que no es importante por ahora, así que el diseño no debe depender de esa decisión.

## Brand Commitments

- Dirección visual elegida por el usuario (9 oct 2026): **el estándar de la categoría**, ejecutado sin ironía. Panel SaaS con barra lateral, encabezado oscuro, KPIs por etapa y tabla filtrable.
- Listón de calidad: **Shopify Admin (Polaris)** y **Stripe Dashboard**.
- Maquetas de referencia en `.impeccable/mocks/canon/` (pedidos y reportes, escritorio y celular).

## Evidence on Hand

- Logo C&C (óvalo plateado/rojo sobre negro) en `frontend/public/icon-*.png`.
- No hay testimonios, clientes ni métricas públicas; no inventarlos.

## Product Principles

1. **El riesgo se ve primero.** Lo que está por vencer o vencido manda en cada pantalla.
2. **Cada rol encuentra su siguiente acción en segundos,** sin recorrer pedidos ajenos a su etapa.
3. **La auditoría es evidencia, no decoración:** quién, cuándo y qué versión, siempre a la mano.
4. **Rápido en el piso, profundo en la oficina:** el móvil optimiza la captura y el escritorio la supervisión.
