import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, ArrowUpDown, Package, AlertCircle, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { STAGES } from "../../constants/stages";
import { sortByRisk, isAtRisk } from "../../utils/sla";
import { fmtShort, fmtMinutes, shortUser } from "../../utils/format";
import Button from "../ui/Button";
import Badge, { OrderStatusBadge } from "../ui/Badge";
import Banner from "../ui/Banner";
import { SlaMeter, StageTrack } from "../ui/Meter";

export const ORDER_TABS = [
  { id: "todos", label: "Todos" },
  { id: "riesgo", label: "En riesgo" },
  { id: "abiertos", label: "Abiertos" },
  { id: "entregados", label: "Entregados" },
  { id: "anomalias", label: "Anomalías" },
];

const STAGE_FILTER_KEY = "sigtoc.stageFilter";

function readStageFilter() {
  try { return localStorage.getItem(STAGE_FILTER_KEY) || ""; } catch { return ""; }
}

function matchesSearch(o, q) {
  if (!q) return true;
  const seriales = o.stages?.[2]?.data?.serialesList?.join(" ") || o.stages?.[2]?.data?.seriales || "";
  return `${o.id} ${o.cliente} ${seriales}`.toLowerCase().includes(q.toLowerCase());
}

function inTab(o, sla, tab) {
  if (tab === "riesgo") return isAtRisk(sla);
  if (tab === "abiertos") return o.status === "abierto";
  if (tab === "entregados") return o.status === "cerrado";
  if (tab === "anomalias") return o.status === "cancelado";
  return true;
}

function TimeCell({ order, sla }) {
  if (order.status === "cerrado") {
    const start = order.stages[1]?.startedAt, end = order.stages[4]?.completedAt;
    return <span className="text-ink2">{start && end ? `Flujo completo en ${fmtMinutes((new Date(end) - new Date(start)) / 60000)}` : "—"}</span>;
  }
  if (order.status === "cancelado") return <span className="text-ink2 line-clamp-1">{order.cancel_info?.reason || "Finalizado por anomalía"}</span>;
  if (!sla) return <span className="text-ink3">—</span>;
  return (
    <div className="flex flex-col gap-1.5 w-[150px]">
      <span><b className={`font-semibold ${sla.state === "excedido" ? "text-crit" : ""}`}>{Math.floor(sla.elapsedMin)}</b> de {sla.limitMin} min</span>
      <SlaMeter sla={sla} />
    </div>
  );
}

// Resumen corto para el celular: "1 excedido en Facturación, 1 vence en 7 min en Bodega"
function riskSummary(atRisk) {
  const over = atRisk.filter((x) => x.sla.state === "excedido");
  const warn = atRisk.filter((x) => x.sla.state === "alerta");
  const parts = [];
  if (over.length === 1) parts.push(`1 excedido en ${STAGES[over[0].o.current_stage - 1].short}`);
  else if (over.length > 1) parts.push(`${over.length} excedidos`);
  if (warn.length === 1) parts.push(`1 vence en ${fmtMinutes(warn[0].sla.remainingMin)} en ${STAGES[warn[0].o.current_stage - 1].short}`);
  else if (warn.length > 1) parts.push(`${warn.length} por vencer`);
  return parts.join(", ");
}

function stageLabel(o) {
  if (o.status === "cerrado") return "Entregado";
  if (o.status === "cancelado") return `Detenido en ${STAGES[o.current_stage - 1].short}`;
  return STAGES[o.current_stage - 1].short;
}

export default function OrdersPage({ orders, now, slaSettings, tab, onTabChange, search, onSearch, onOpen, onNew }) {
  const [stageFilter, setStageFilter] = useState(readStageFilter);
  const [slaFilter, setSlaFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [sort, setSort] = useState("riesgo");
  const [showFilters, setShowFilters] = useState(false); // móvil: filtros secundarios plegados

  useEffect(() => { try { localStorage.setItem(STAGE_FILTER_KEY, stageFilter); } catch { /* sin almacenamiento */ } }, [stageFilter]);

  const ranked = useMemo(() => sortByRisk(orders, slaSettings, now), [orders, slaSettings, now]);
  const atRisk = ranked.filter((x) => isAtRisk(x.sla));
  const creators = useMemo(() => [...new Set(orders.map((o) => o.created_by_email).filter(Boolean))], [orders]);

  const stageStats = STAGES.map((s) => {
    const open = ranked.filter((x) => x.o.status === "abierto" && x.o.current_stage === s.id);
    return {
      ...s, open: open.length,
      over: open.filter((x) => x.sla?.state === "excedido").length,
      warn: open.filter((x) => x.sla?.state === "alerta").length,
    };
  });

  const tabCounts = Object.fromEntries(ORDER_TABS.map((t) => [t.id, ranked.filter((x) => inTab(x.o, x.sla, t.id)).length]));

  let rows = ranked.filter((x) =>
    inTab(x.o, x.sla, tab) && matchesSearch(x.o, search) &&
    (!stageFilter || (x.o.status === "abierto" && x.o.current_stage === Number(stageFilter))) &&
    (!slaFilter || x.sla?.state === slaFilter) &&
    (!creatorFilter || x.o.created_by_email === creatorFilter));
  if (sort === "recientes") rows = [...rows].sort((a, b) => new Date(b.o.created_at) - new Date(a.o.created_at));
  if (sort === "antiguos") rows = [...rows].sort((a, b) => new Date(a.o.created_at) - new Date(b.o.created_at));

  const filtersOn = stageFilter || slaFilter || creatorFilter || search;
  function clearFilters() { setStageFilter(""); setSlaFilter(""); setCreatorFilter(""); onSearch(""); }

  const selectCls = (on) => `h-11 sm:h-7 rounded-full px-3 pr-7 text-[13.5px] sm:text-[12.5px] font-semibold appearance-none bg-no-repeat bg-[right_8px_center] bg-[length:12px] outline-none cursor-pointer ${on ? "bg-surface2 text-ink shadow-[inset_0_0_0_1px_#E3E3E3]" : "bg-surface text-ink2 shadow-[inset_0_0_0_1px_#C9C9C9]"}`;
  const chevron = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23616161' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-[20px] font-bold tracking-tight">Pedidos</h1>
        <Button variant="primary" icon={Plus} onClick={onNew} className="ml-auto">
          <span className="sm:hidden">Crear</span><span className="hidden sm:inline">Crear pedido</span>
        </Button>
      </div>

      {atRisk.length > 0 && (
        <Banner tone="critical" action={<button className="h-9 sm:h-auto font-semibold text-link hover:underline" onClick={() => onTabChange("riesgo")}>Ver pedidos en riesgo</button>}>
          {/* Escritorio: detalle completo · Celular: resumen corto */}
          <span className="hidden md:inline">
            <b className="font-semibold">{atRisk.length} pedido{atRisk.length > 1 ? "s necesitan" : " necesita"} atención.</b>{" "}
            {atRisk.slice(0, 2).map(({ o, sla }, i) => (
              <span key={o.id}>{i > 0 && " y "}{o.id} {sla.state === "excedido"
                ? `superó el SLA de ${STAGES[o.current_stage - 1].short} por ${fmtMinutes(-sla.remainingMin)}`
                : `vence en ${fmtMinutes(sla.remainingMin)} en ${STAGES[o.current_stage - 1].short}`}</span>
            ))}
            {atRisk.length > 2 && ` y ${atRisk.length - 2} más`}.
          </span>
          <span className="md:hidden">
            <b className="font-semibold">{atRisk.length} pedido{atRisk.length > 1 ? "s" : ""} en riesgo.</b>{" "}
            {riskSummary(atRisk)}.
          </span>
        </Banner>
      )}

      {/* Etapas: resumen + filtro rápido (tarjetas en escritorio) */}
      <div className="hidden md:grid md:grid-cols-4 gap-3">
        {stageStats.map((s) => {
          const on = stageFilter === String(s.id);
          return (
            <button key={s.id} onClick={() => setStageFilter(on ? "" : String(s.id))} aria-pressed={on}
              className={`card text-left px-4 py-3.5 flex flex-col gap-1.5 min-w-0 transition-shadow ${on ? "shadow-[0_0_0_2px_#005BD3,0_1px_3px_rgba(26,26,26,.08)]" : "hover:shadow-[0_0_0_1px_#C9C9C9,0_1px_3px_rgba(26,26,26,.08)]"}`}>
              <div className="flex items-center justify-between gap-2 text-ink2 font-semibold text-[13.5px]">
                {s.short}
                {s.over > 0 ? <Badge tone="critical" icon={AlertCircle}>{s.over} excedido{s.over > 1 ? "s" : ""}</Badge>
                  : s.warn > 0 ? <Badge tone="warning" icon={AlertTriangle}>{s.warn} por vencer</Badge>
                  : <Badge tone={s.open ? "success" : "neutral"}>{s.open ? "En tiempo" : "Libre"}</Badge>}
              </div>
              <div className="num"><span className="text-[22px] font-semibold tracking-tight">{s.open}</span>
                <span className="text-[13px] text-ink2 ml-1.5">{s.open === 1 ? "abierto" : "abiertos"} · límite {slaSettings[s.id]} min</span></div>
            </button>
          );
        })}
      </div>

      {/* Etapas en el celular: chips con conteo (el filtro se recuerda en el dispositivo) */}
      <div className="md:hidden flex gap-1.5 overflow-x-auto -mx-3 px-3 pb-0.5" role="group" aria-label="Filtrar por etapa">
        {[{ id: "", short: "Todas", open: null }, ...stageStats].map((s) => {
          const on = stageFilter === String(s.id);
          const risk = s.over > 0 || s.warn > 0;
          return (
            <button key={s.id || "all"} onClick={() => setStageFilter(String(s.id))} aria-pressed={on}
              className={`h-10 px-3.5 rounded-full flex-none flex items-center gap-1.5 font-semibold text-[14px] ${on ? "bg-ink text-white" : "bg-surface text-ink2 shadow-[inset_0_0_0_1px_#E3E3E3]"}`}>
              {s.short}
              {s.open !== null && <span className={`num text-[12.5px] ${on ? "text-white/75" : risk ? "text-crit" : "text-ink3"}`}>{s.open}</span>}
            </button>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="flex gap-0.5 px-2 pt-2 border-b border-line2 overflow-x-auto" role="tablist">
          {ORDER_TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => onTabChange(t.id)}
              className={`relative h-11 sm:h-8 px-3 flex items-center gap-1.5 font-semibold whitespace-nowrap ${tab === t.id ? "text-ink after:absolute after:left-2 after:right-2 after:-bottom-px after:h-0.5 after:bg-ink after:rounded" : "text-ink2 hover:text-ink"}`}>
              {t.label}<span className="text-[12px] bg-surface2 rounded-md px-1.5 text-ink2 num">{tabCounts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 px-3 py-2.5 border-b border-line2 items-center">
          <label className="flex-1 min-w-0 md:max-w-[420px] h-11 sm:h-8 rounded-lg flex items-center gap-2 px-2.5 text-ink3 shadow-[inset_0_0_0_1px_#E3E3E3] focus-within:shadow-[inset_0_0_0_2px_#005BD3]">
            <Search size={16} className="flex-none" />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar o escanear pedido"
              aria-label="Buscar por pedido, cliente o serial" title="Busca por número de pedido, cliente o serial"
              className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink3 min-w-0" />
          </label>
          <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
            className={`md:hidden h-11 px-3 rounded-lg flex items-center gap-1.5 font-semibold ${slaFilter || creatorFilter || sort !== "riesgo" ? "bg-surface2 text-ink shadow-[inset_0_0_0_1px_#E3E3E3]" : "text-ink2 shadow-[inset_0_0_0_1px_#C9C9C9]"}`}>
            <SlidersHorizontal size={16} /> Filtros
          </button>
          <div className={`${showFilters ? "flex" : "hidden"} md:flex flex-wrap gap-2 items-center w-full md:w-auto md:flex-1`}>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={`${selectCls(stageFilter)} hidden md:block`} style={chevron} aria-label="Filtrar por etapa">
              <option value="">Etapa: todas</option>
              {STAGES.map((s) => <option key={s.id} value={s.id}>Etapa: {s.short}</option>)}
            </select>
            <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} className={selectCls(slaFilter)} style={chevron} aria-label="Filtrar por estado de SLA">
              <option value="">Estado de SLA: todos</option>
              <option value="excedido">Excedido</option>
              <option value="alerta">Por vencer</option>
              <option value="ok">En tiempo</option>
            </select>
            {creators.length > 1 && (
              <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} className={selectCls(creatorFilter)} style={chevron} aria-label="Filtrar por creador">
                <option value="">Creado por: todos</option>
                {creators.map((c) => <option key={c} value={c}>{shortUser(c)}</option>)}
              </select>
            )}
            <label className="md:ml-auto h-11 md:h-8 flex items-center gap-1.5 text-ink2 font-semibold">
              <ArrowUpDown size={15} />
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar" className="h-full bg-transparent outline-none cursor-pointer font-semibold">
                <option value="riesgo">Mayor riesgo primero</option>
                <option value="recientes">Más recientes</option>
                <option value="antiguos">Más antiguos</option>
              </select>
            </label>
          </div>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-14 px-6">
            <Package size={30} className="mx-auto mb-3 text-ink3" />
            <p className="text-[15px] font-semibold">Aún no hay pedidos</p>
            <p className="text-ink2 mt-1 mb-4">Crea el primero: el SLA empieza a contar desde el ingreso.</p>
            <Button variant="primary" icon={Plus} onClick={onNew}>Crear pedido</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-[15px] font-semibold">{tab === "riesgo" && !filtersOn ? "Ningún pedido en riesgo" : "Ningún pedido coincide"}</p>
            <p className="text-ink2 mt-1 mb-4">{tab === "riesgo" && !filtersOn ? "Todos los pedidos abiertos van por debajo del 75 % de su límite de SLA." : "Prueba con otra búsqueda o quita los filtros."}</p>
            {filtersOn && <Button onClick={clearFilters}>Quitar filtros</Button>}
          </div>
        ) : (
          <>
            {/* Escritorio: tabla */}
            <table className="w-full hidden md:table num">
              <thead>
                <tr className="text-left text-[12px] font-semibold text-ink2 bg-surface2">
                  {["Pedido", "Etapa actual", "Tiempo en la etapa", "SLA", "Creado por", "Creado"].map((h) => (
                    <th key={h} className="px-3.5 py-2.5 border-b border-line2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ o, sla }) => {
                  const closed = o.status !== "abierto";
                  return (
                    <tr key={o.id} onClick={() => onOpen(o.id)} className={`cursor-pointer border-b border-line2 last:border-0 hover:bg-surface2 ${closed ? "text-ink2" : ""}`}>
                      <td className="px-3.5 py-3">
                        <button onClick={(e) => { e.stopPropagation(); onOpen(o.id); }} className="font-semibold text-ink text-left hover:underline underline-offset-2">{o.id}</button>
                        <div className="text-[12.5px] text-ink2 truncate max-w-[260px]">{o.cliente}</div>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap"><div className="flex flex-col gap-1.5">{stageLabel(o)}<StageTrack order={o} sla={sla} className="w-28" /></div></td>
                      <td className="px-3.5 py-3"><TimeCell order={o} sla={sla} /></td>
                      <td className="px-3.5 py-3"><OrderStatusBadge order={o} sla={sla} /></td>
                      <td className="px-3.5 py-3">{shortUser(o.created_by_email)}</td>
                      <td className="px-3.5 py-3 whitespace-nowrap">{fmtShort(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Celular: tarjetas táctiles */}
            <ul className="md:hidden num">
              {rows.map(({ o, sla }) => (
                <li key={o.id} className="border-b border-line2 last:border-0">
                  <button onClick={() => onOpen(o.id)} className="w-full text-left p-3.5 grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-1 active:bg-surface2">
                    <span className="font-semibold text-[15px] truncate">{o.id}</span>
                    <OrderStatusBadge order={o} sla={sla} />
                    <span className="col-span-2 text-[13.5px] text-ink2 truncate">{o.cliente}</span>
                    <span className="col-span-2 flex justify-between items-center mt-1.5 text-[13.5px] text-ink2">
                      <span>{stageLabel(o)}</span>
                      {sla && <span><b className={`font-semibold ${sla.state === "excedido" ? "text-crit" : "text-ink"}`}>{Math.floor(sla.elapsedMin)}</b> de {sla.limitMin} min</span>}
                    </span>
                    {sla && <SlaMeter sla={sla} className="col-span-2 mt-0.5" />}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {rows.length > 0 && (
          <div className="flex justify-between gap-3 px-3.5 py-2.5 border-t border-line2 text-[12.5px] text-ink2">
            <span>{rows.length} pedido{rows.length !== 1 ? "s" : ""}{sort === "riesgo" ? " · ordenados por riesgo de SLA" : ""}</span>
            {stageFilter && <span className="hidden sm:inline">Filtro de etapa guardado en este dispositivo</span>}
          </div>
        )}
      </div>
    </div>
  );
}
