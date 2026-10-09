import React, { useMemo, useState } from "react";
import { CalendarDays, BarChart3, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { C } from "../../styles/tokens";
import { chartFont, chartTooltipStyle } from "../../styles/charts";
import { fmtShort, fmtDay, fmtMinutes, shortUser } from "../../utils/format";
import { periodRange, inRange, summarize, dailySeries, topExceeded, recentAnomalies } from "../../utils/reports";
import { STAGES } from "../../constants/stages";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import KpiCard from "./KpiCard";
import ChartCard from "./ChartCard";
import { ComplianceBars, TimeVsLimit } from "./StageBars";

const PERIODS = [7, 30, 90];

function delta(cur, prev, { unit, lowerIsBetter, neutral, pct } = {}) {
  if (cur === null || prev === null || prev === undefined) return null;
  const diff = pct ? (prev ? ((cur - prev) / prev) * 100 : null) : cur - prev;
  if (diff === null || Math.round(diff) === 0) return { text: "sin cambio", tone: "neutral" };
  const sign = diff > 0 ? "+" : "−";
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return { text: `${sign}${Math.abs(Math.round(diff))}${unit}`, tone: neutral ? "neutral" : good ? "good" : "bad" };
}

function DayTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={chartTooltipStyle}>
      <p>{fmtDay(d.date)} · {d.created} pedido{d.created !== 1 ? "s" : ""}</p>
      {d.exceeded > 0 && <p>{d.exceeded} excedió el SLA</p>}
    </div>
  );
}

export default function ReportsView({ orders, slaSettings, now: liveNow, onOpenOrder }) {
  const now = Math.floor(liveNow / 60000) * 60000; // los reportes se recalculan una vez por minuto
  const [days, setDays] = useState(30);
  const [compare, setCompare] = useState(true);
  const [showMore, setShowMore] = useState(false); // celular: reportes secundarios plegados
  const range = useMemo(() => periodRange(days, now), [days, now]);

  const data = useMemo(() => {
    const cur = orders.filter((o) => inRange(o, range.from, range.to));
    const prev = orders.filter((o) => inRange(o, range.prevFrom, range.prevTo));
    return {
      cur, sum: summarize(cur, slaSettings), prevSum: summarize(prev, slaSettings), hasPrev: prev.length > 0,
      daily: dailySeries(cur, range, slaSettings),
      top: topExceeded(cur, slaSettings, now),
      anomalies: recentAnomalies(cur),
    };
  }, [orders, slaSettings, range, now]);

  const { sum, prevSum, daily } = data;
  const overLimit = sum.stages.filter((st) => st.avgMin !== null && st.avgMin > st.limit);
  const more = showMore ? "" : "hidden md:block"; // en el celular, plegado hasta "Ver más reportes"
  const showDelta = compare && data.hasPrev;
  const tickEvery = Math.max(1, Math.round(daily.length / 4));

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h1 className="text-[20px] font-bold tracking-tight mr-auto w-full sm:w-auto">Reportes</h1>
        <label className="relative">
          <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink2 pointer-events-none" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Período"
            className="h-11 sm:h-8 pl-9 pr-3 rounded-lg bg-surface font-semibold shadow-[inset_0_0_0_1px_#E3E3E3,0_1px_0_rgba(0,0,0,.05)] outline-none cursor-pointer">
            {PERIODS.map((p) => <option key={p} value={p}>Últimos {p} días</option>)}
          </select>
        </label>
        <button onClick={() => setCompare((v) => !v)} aria-pressed={compare}
          className={`h-11 sm:h-8 px-3 rounded-lg font-semibold ${compare ? "bg-surface text-ink shadow-[inset_0_0_0_1px_#E3E3E3,0_1px_0_rgba(0,0,0,.05)]" : "text-ink2 shadow-[inset_0_0_0_1px_#C9C9C9]"}`}>
          <span className="sm:hidden">{compare ? "vs. período anterior" : "Comparar"}</span>
          <span className="hidden sm:inline">{compare ? `Comparando con los ${days} días anteriores` : "Comparar con el período anterior"}</span>
        </button>
      </div>

      {data.cur.length === 0 ? (
        <div className="card text-center py-14 px-6">
          <BarChart3 size={30} className="mx-auto mb-3 text-ink3" />
          <p className="text-[15px] font-semibold">Sin pedidos en este período</p>
          <p className="text-ink2 mt-1">Elige un período más largo para ver datos.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <KpiCard label="Cumplimiento de SLA" help="% de etapas completadas dentro de su límite"
              value={sum.compliance === null ? "—" : `${Math.round(sum.compliance)} %`}
              delta={showDelta ? delta(sum.compliance, prevSum.compliance, { unit: " pts" }) : null}
              trend={daily.map((d) => d.compliance)} />
            <KpiCard label="Tiempo promedio de flujo completo" help="De la creación a la entrega, pedidos entregados"
              value={sum.avgFlow === null ? "—" : fmtMinutes(sum.avgFlow)}
              delta={showDelta ? delta(sum.avgFlow, prevSum.avgFlow, { unit: " min", lowerIsBetter: true }) : null}
              trend={daily.map((d) => d.avgFlow)} />
            <KpiCard label="Pedidos creados" value={sum.created}
              delta={showDelta ? delta(sum.created, prevSum.created, { unit: " %", pct: true, neutral: true }) : null}
              trend={daily.map((d) => d.created)} />
            <KpiCard label="Finalizados por anomalía" value={sum.anomalies}
              delta={showDelta ? delta(sum.anomalies, prevSum.anomalies, { unit: "", lowerIsBetter: true }) : null}
              trend={daily.map((d) => d.anomalies)} />
          </div>

          {/* Celular: lo que más baja el cumplimiento, en una sola tarjeta */}
          <section className="md:hidden card p-4">
            <h2 className="text-[15px] font-semibold">Requiere atención</h2>
            <p className="text-[12.5px] text-ink2 mt-0.5 mb-1">Lo que más está bajando el cumplimiento</p>
            {overLimit.length === 0 && data.top.length === 0 ? (
              <p className="text-ink2 py-3">Todas las etapas van dentro de su límite.</p>
            ) : (
              <ul>
                {overLimit.map((st) => (
                  <li key={st.id} className="flex justify-between items-center gap-3 py-3 border-t border-line2 first:border-0 text-[14px]">
                    <span>{st.name} promedia <b className="font-semibold num">{Math.round(st.avgMin)} de {st.limit} min</b></span>
                    <Badge tone="warning">Sobre límite</Badge>
                  </li>
                ))}
                {data.top.slice(0, 2).map((r) => (
                  <li key={r.order.id} className="flex justify-between items-center gap-3 py-3 border-t border-line2 first:border-0 text-[14px]">
                    <span className="min-w-0"><span className="font-semibold num block truncate">{r.order.id}</span><span className="text-ink2 text-[13px]">{r.stage} · </span><Badge tone={r.running ? "warning" : "critical"}>+{fmtMinutes(r.over)}</Badge></span>
                    <Button size="sm" iconRight={ChevronRight} onClick={() => onOpenOrder(r.order.id)} aria-label={`Ver pedido ${r.order.id}`}>Ver</Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard title="Cumplimiento de SLA por etapa" subtitle="% de etapas completadas dentro del límite · meta 80 %"
              table={{ head: ["Etapa", "Cumplimiento", "Etapas medidas"], rows: sum.stages.map((s) => [s.name, s.compliance === null ? "Sin datos" : `${Math.round(s.compliance)} %`, s.samples]) }}>
              <ComplianceBars stages={sum.stages} />
            </ChartCard>
            <ChartCard className={more} title="Tiempo promedio vs. límite por etapa" subtitle="Minutos · la línea vertical es el límite de SLA de cada etapa"
              table={{ head: ["Etapa", "Promedio", "Límite"], rows: sum.stages.map((s) => [s.name, s.avgMin === null ? "Sin datos" : fmtMinutes(s.avgMin), `${s.limit} min`]) }}>
              <TimeVsLimit stages={sum.stages} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard className={more} title="Pedidos creados por día" subtitle={`Últimos ${days} días`}
              table={{ head: ["Día", "Pedidos", "Excedieron el SLA"], rows: daily.filter((d) => d.created).map((d) => [fmtDay(d.date), d.created, d.exceeded]) }}>
              <div className="h-[200px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={C.line2} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDay} interval={tickEvery - 1} tick={chartFont} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={16} tickMargin={8} />
                    <YAxis allowDecimals={false} tick={chartFont} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<DayTooltip />} cursor={{ stroke: "#B5B5B5" }} />
                    <Area type="linear" dataKey="created" stroke={C.series} strokeWidth={2} fill={C.series} fillOpacity={0.1}
                      activeDot={{ r: 4.5, fill: C.series, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard className={more} title="Pedidos que más excedieron el SLA" subtitle="Tiempo sobre el límite en la etapa donde se atascaron">
              {data.top.length === 0 ? (
                <p className="text-ink2 py-6 text-center">Ningún pedido excedió su SLA en este período.</p>
              ) : (
                <table className="w-full text-[13.5px] sm:text-[13px] num">
                  <thead><tr className="text-left text-[12px] text-ink2">
                    <th className="font-semibold bg-surface2 px-2.5 py-2 border-b border-line2">Pedido</th>
                    <th className="font-semibold bg-surface2 px-2.5 py-2 border-b border-line2">Etapa</th>
                    <th className="font-semibold bg-surface2 px-2.5 py-2 border-b border-line2 whitespace-nowrap">Sobre el límite</th>
                    <th className="bg-surface2 px-2.5 py-2 border-b border-line2"><span className="sr-only">Acciones</span></th>
                  </tr></thead>
                  <tbody>
                    {data.top.map((r) => (
                      <tr key={r.order.id} className="border-b border-line2 last:border-0">
                        <td className="px-2.5 py-2.5 whitespace-nowrap font-semibold">{r.order.id}</td>
                        <td className="px-2.5 py-2.5">{r.stage}</td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap"><Badge tone={r.running ? "warning" : "critical"}>+{fmtMinutes(r.over)}{r.running ? " · en curso" : ""}</Badge></td>
                        <td className="px-2.5 py-2 text-right"><Button size="sm" iconRight={ChevronRight} onClick={() => onOpenOrder(r.order.id)} aria-label={`Ver pedido ${r.order.id}`}>Ver</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ChartCard>
          </div>

          <ChartCard className={more} title="Motivos de finalización por anomalía" subtitle={`${sum.anomalies} en el período · más recientes primero`}>
            {data.anomalies.length === 0 ? (
              <p className="text-ink2 py-4 text-center">No hubo anomalías en este período.</p>
            ) : (
              <ul>
                {data.anomalies.map((o) => (
                  <li key={o.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[180px_1fr_110px_190px_auto] items-center gap-x-4 gap-y-0.5 py-2.5 border-b border-line2 last:border-0 text-[13.5px] sm:text-[13px]">
                    <span className="font-semibold num">{o.id}</span>
                    <span className="col-start-1 sm:col-auto">{o.cancel_info.reason}</span>
                    <span className="col-start-1 sm:col-auto text-ink2">{STAGES[o.current_stage - 1].short}</span>
                    <span className="col-start-1 sm:col-auto text-ink2 num">{shortUser(o.cancel_info.by)} · {fmtShort(o.cancel_info.at)}</span>
                    <Button size="sm" iconRight={ChevronRight} onClick={() => onOpenOrder(o.id)} aria-label={`Ver pedido ${o.id}`} className="row-start-1 col-start-2 sm:row-auto sm:col-auto">Ver</Button>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>

          <Button size="lg" icon={showMore ? ChevronUp : ChevronDown} onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="md:hidden w-full">
            {showMore ? "Ver menos" : "Ver más reportes"}
          </Button>
        </>
      )}
    </div>
  );
}
