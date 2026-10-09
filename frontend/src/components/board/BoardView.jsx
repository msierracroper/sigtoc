import React, { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, LayoutList } from "lucide-react";
import { STAGES } from "../../constants/stages";
import { sortByRisk } from "../../utils/sla";
import { fmtMinutes } from "../../utils/format";

/* ============ TABLERO (modo TV) ============
 * Vista de solo lectura para pantallas grandes, estilo tablero de aeropuerto.
 * /tablero                 → todos los pedidos en curso + entregados/anomalías del día
 * /tablero?etapa=bodega     → solo los pedidos abiertos en esa etapa (una TV por área)
 * Tamaños en vh/vw para que se lea igual en una TV 1080p, 4K o un monitor.
 */
const ROWS_PER_PAGE = 9;
const PAGE_SECONDS = 10;

const STAGE_PARAM = { ingreso: 1, bodega: 2, facturacion: 3, "facturación": 3, despacho: 4 };
const STAGE_DOT = { 1: "#7FB0F5", 2: "#F5B700", 3: "#B78CF7", 4: "#5FD3C4" };

const PAL = {
  ground: "#0F1114", header: "#181B1F", row: "#14171B", rowAlt: "#111316", line: "#262A30",
  paint: "#F4F1E8", dim: "#8E949A", amber: "#F5B700", red: "#FF5A4E", green: "#5FD39A",
};

export function boardStageFromUrl() {
  const p = new URLSearchParams(window.location.search).get("etapa");
  if (!p) return null;
  return STAGE_PARAM[p.toLowerCase()] || (Number(p) >= 1 && Number(p) <= 4 ? Number(p) : null);
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function rowStatus(o, sla) {
  if (o.status === "cerrado") return { label: "ENTREGADO", color: PAL.dim };
  if (o.status === "cancelado") return { label: "ANOMALÍA", color: "#C9776F" };
  if (sla?.state === "excedido") return { label: "EXCEDIDO", color: PAL.red };
  if (sla?.state === "alerta") return { label: "POR VENCER", color: PAL.amber };
  return { label: "A TIEMPO", color: PAL.green };
}

function timeText(o, sla) {
  if (o.status !== "abierto" || !sla) return "—";
  if (sla.state === "excedido") return `+${fmtMinutes(-sla.remainingMin)}`;
  return `${fmtMinutes(sla.remainingMin)}`;
}

function useClock(now) {
  const d = new Date(now);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Mantiene la pantalla encendida mientras el tablero está visible (si el navegador lo permite)
function useWakeLock() {
  useEffect(() => {
    let lock = null;
    async function request() {
      try { if ("wakeLock" in navigator && document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen"); } catch { /* no soportado */ }
    }
    request();
    document.addEventListener("visibilitychange", request);
    return () => { document.removeEventListener("visibilitychange", request); lock?.release?.().catch(() => {}); };
  }, []);
}

// Oculta cursor y controles cuando nadie mueve el mouse (TV)
function useIdle(ms = 3000) {
  const [idle, setIdle] = useState(true);
  useEffect(() => {
    let t;
    function wake() { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), ms); }
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake);
    return () => { clearTimeout(t); window.removeEventListener("mousemove", wake); window.removeEventListener("keydown", wake); window.removeEventListener("touchstart", wake); };
  }, [ms]);
  return idle;
}

export default function BoardView({ orders, slaSettings, now, lastUpdate, onExit }) {
  const stage = useMemo(boardStageFromUrl, []);
  const [page, setPage] = useState(0);
  const idle = useIdle();
  const rootRef = useRef(null);
  useWakeLock();

  const rows = useMemo(() => {
    const visible = orders.filter((o) => stage
      ? o.status === "abierto" && o.current_stage === stage
      : o.status === "abierto" || ((o.status === "cerrado" || o.status === "cancelado") && isToday(o.updated_at)));
    return sortByRisk(visible, slaSettings, now);
  }, [orders, slaSettings, now, stage]);

  const pages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  useEffect(() => { if (page >= pages) setPage(0); }, [pages, page]);
  useEffect(() => {
    const t = setInterval(() => setPage((p) => (p + 1) % pages), PAGE_SECONDS * 1000);
    return () => clearInterval(t);
  }, [pages]);

  const pageRows = rows.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);
  const open = rows.filter((x) => x.o.status === "abierto");
  const over = open.filter((x) => x.sla?.state === "excedido").length;
  const warn = open.filter((x) => x.sla?.state === "alerta").length;
  const clock = useClock(now);
  const updated = lastUpdate ? new Date(lastUpdate).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—";

  function fullscreen() { (rootRef.current || document.documentElement).requestFullscreen?.().catch(() => {}); }

  // con una sola etapa, la columna "Etapa" sobra
  const cols = stage ? "grid-cols-[16vw_1fr_18vw_17vw]" : "grid-cols-[14vw_1fr_17vw_14vw_15vw]";

  return (
    <div ref={rootRef} className={`h-screen w-screen overflow-hidden flex flex-col select-none ${idle ? "cursor-none" : ""}`}
      style={{ background: PAL.ground, color: PAL.paint, fontFamily: "Inter, system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}>

      {/* Cabecera */}
      <header className="flex items-center gap-[2vw] px-[2.2vw] h-[11vh] flex-none" style={{ background: PAL.header, borderBottom: `1px solid ${PAL.line}` }}>
        <div className="min-w-0">
          <p className="font-bold tracking-[.06em] leading-none text-[3.6vh]">
            {stage ? `PEDIDOS EN ${STAGES[stage - 1].short.toUpperCase()}` : "PEDIDOS EN CURSO"}
          </p>
          <p className="mt-[0.8vh] text-[1.8vh]" style={{ color: PAL.dim }}>
            {open.length} abierto{open.length !== 1 ? "s" : ""}
            {over > 0 && <> · <span style={{ color: PAL.red }}>{over} excedido{over !== 1 ? "s" : ""}</span></>}
            {warn > 0 && <> · <span style={{ color: PAL.amber }}>{warn} por vencer</span></>}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-semibold leading-none text-[6vh] tracking-tight">{clock}</p>
          <p className="mt-[0.6vh] text-[1.6vh]" style={{ color: PAL.dim }}>Actualizado {updated}</p>
        </div>
      </header>

      {/* Encabezados de columna */}
      <div className={`grid ${cols} items-center px-[2.2vw] h-[5vh] flex-none text-[1.6vh] font-semibold tracking-[.14em]`} style={{ color: PAL.dim, borderBottom: `1px solid ${PAL.line}` }}>
        <span>PEDIDO</span><span>CLIENTE</span>{!stage && <span>ETAPA</span>}<span>TIEMPO</span><span>ESTADO</span>
      </div>

      {/* Filas */}
      <main className="flex-1 flex flex-col min-h-0">
        {rows.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center">
            <div>
              <p className="text-[4.5vh] font-semibold">Sin pedidos en curso</p>
              <p className="text-[2.2vh] mt-[1vh]" style={{ color: PAL.dim }}>{stage ? `No hay pedidos esperando en ${STAGES[stage - 1].name}.` : "Los pedidos nuevos aparecerán aquí automáticamente."}</p>
            </div>
          </div>
        ) : (
          pageRows.map(({ o, sla }, i) => {
            const st = rowStatus(o, sla);
            const closed = o.status !== "abierto";
            return (
              <div key={o.id} className={`grid ${cols} items-center px-[2.2vw] flex-none`}
                style={{ height: `${76 / ROWS_PER_PAGE}vh`, background: i % 2 ? PAL.rowAlt : PAL.row, borderBottom: `1px solid ${PAL.line}`, opacity: closed ? 0.55 : 1 }}>
                <span className="font-semibold text-[2.6vh] truncate pr-[1vw]">{o.id.replace(/^PED-\d{4}-/, "")}</span>
                <span className="text-[2.9vh] font-medium truncate pr-[1.5vw]">{o.cliente}</span>
                {!stage && <span className="flex items-center gap-[0.8vw] text-[2.6vh] truncate">
                  <span className="w-[1.4vh] h-[1.4vh] rounded-full flex-none" style={{ background: closed ? PAL.dim : STAGE_DOT[o.current_stage] }} />
                  {o.status === "cerrado" ? "Entregado" : STAGES[o.current_stage - 1].short}
                </span>}
                <span className="text-[2.9vh] font-semibold" style={{ color: sla?.state === "excedido" ? PAL.red : sla?.state === "alerta" ? PAL.amber : PAL.paint }}>
                  {timeText(o, sla)}
                </span>
                <span className="text-[2.6vh] font-bold tracking-[.08em]" style={{ color: st.color }}>{st.label}</span>
              </div>
            );
          })
        )}
      </main>

      {/* Pie: página actual con barra de avance */}
      <footer className="h-[6vh] flex-none flex items-center gap-[2vw] px-[2.2vw] text-[1.8vh] font-semibold tracking-[.12em]" style={{ background: PAL.header, borderTop: `1px solid ${PAL.line}`, color: PAL.dim }}>
        <span>PÁGINA {page + 1} DE {pages}</span>
        {pages > 1 && (
          <span className="flex-1 h-[0.5vh] rounded-full overflow-hidden" style={{ background: PAL.line }}>
            <span key={`${page}-${pages}`} className="block h-full rounded-full" style={{ background: PAL.paint, animation: `boardProgress ${PAGE_SECONDS}s linear forwards` }} />
          </span>
        )}
        <span className="ml-auto tracking-normal font-normal">TIEMPO = restante en la etapa · “+” = excedido</span>
      </footer>

      {/* Controles: solo aparecen al mover el mouse o tocar la pantalla */}
      <div className={`fixed top-[2vh] right-[2vw] flex gap-2 transition-opacity duration-200 ${idle ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <button onClick={fullscreen} className="h-11 px-4 rounded-lg flex items-center gap-2 font-semibold text-[14px]" style={{ background: PAL.paint, color: "#17191C" }}>
          <Maximize size={16} /> Pantalla completa
        </button>
        <button onClick={onExit} className="h-11 px-4 rounded-lg flex items-center gap-2 font-semibold text-[14px]" style={{ background: "#2C3034", color: PAL.paint }}>
          <LayoutList size={16} /> Ir al panel
        </button>
      </div>
    </div>
  );
}
