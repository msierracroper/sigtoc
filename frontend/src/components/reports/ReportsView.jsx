import React, { useState, useMemo } from "react";
import { Package, AlertTriangle, ArrowLeft, BarChart3, Timer, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, AreaChart, Area, ReferenceLine } from "recharts";
import { C, FONT_MONO } from "../../styles/tokens";
import { chartFont, chartTooltipStyle } from "../../styles/charts";
import { STAGES } from "../../constants/stages";
import { fmtShort } from "../../utils/format";
import KpiCard from "./KpiCard";
import ChartCard from "./ChartCard";

function avg(arr) { if (!arr.length) return 0; return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10; }

export default function ReportsView({ orders, slaSettings, onBack }) {
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });

  const filtered = useMemo(() => orders.filter((o) => {
    const d = o.created_at.slice(0, 10);
    return d >= range.from && d <= range.to;
  }), [orders, range]);

  const stats = useMemo(() => {
    const abiertos = filtered.filter((o) => o.status === "abierto").length;
    const cerrados = filtered.filter((o) => o.status === "cerrado").length;
    const cancelados = filtered.filter((o) => o.status === "cancelado").length;

    const stageDurations = { 1: [], 2: [], 3: [], 4: [] };
    const stageCompliance = { 1: { ok: 0, total: 0 }, 2: { ok: 0, total: 0 }, 3: { ok: 0, total: 0 }, 4: { ok: 0, total: 0 } };

    filtered.forEach((o) => {
      STAGES.forEach((s) => {
        const st = o.stages[s.id];
        if (st?.startedAt && st?.completedAt) {
          const mins = (new Date(st.completedAt) - new Date(st.startedAt)) / 60000;
          stageDurations[s.id].push(mins);
          const limit = o.sla_config?.[s.id] ?? slaSettings[s.id] ?? 30;
          stageCompliance[s.id].total += 1;
          if (mins <= limit) stageCompliance[s.id].ok += 1;
        }
      });
    });

    const avgDurationData = STAGES.map((s) => ({
      name: s.short, promedio: avg(stageDurations[s.id]), limite: slaSettings[s.id] ?? 30,
    }));

    const complianceData = STAGES.map((s) => {
      const c = stageCompliance[s.id];
      const pct = c.total ? Math.round((100 * c.ok) / c.total) : null;
      return { name: s.short, cumplimiento: pct ?? 0, sinDatos: pct === null };
    });

    let totalCompleted = 0, totalOk = 0;
    STAGES.forEach((s) => { totalCompleted += stageCompliance[s.id].total; totalOk += stageCompliance[s.id].ok; });
    const slaCompliancePct = totalCompleted ? Math.round((100 * totalOk) / totalCompleted) : null;

    const flowTimes = filtered.filter((o) => o.status === "cerrado").map((o) => {
      const start = o.stages[1]?.startedAt, end = o.stages[4]?.completedAt;
      if (!start || !end) return null;
      return (new Date(end) - new Date(start)) / 60000;
    }).filter((v) => v !== null);
    const avgFlowMin = flowTimes.length ? Math.round(avg(flowTimes)) : null;

    const perDayMap = {};
    filtered.forEach((o) => {
      const d = o.created_at.slice(0, 10);
      perDayMap[d] = (perDayMap[d] || 0) + 1;
    });
    const perDayData = Object.entries(perDayMap).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));

    const statusData = [
      { name: "Abiertos", value: abiertos, color: C.steel },
      { name: "Entregados", value: cerrados, color: C.ok },
      { name: "Cancelados", value: cancelados, color: C.alert },
    ].filter((d) => d.value > 0);

    const cancelledList = filtered.filter((o) => o.status === "cancelado" && o.cancel_info)
      .sort((a, b) => new Date(b.cancel_info.at) - new Date(a.cancel_info.at)).slice(0, 8);

    return { abiertos, cerrados, cancelados, avgDurationData, complianceData, slaCompliancePct, avgFlowMin, perDayData, statusData, cancelledList };
  }, [filtered, slaSettings]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold mb-4" style={{ color: C.inkSoft }}>
        <ArrowLeft size={14} /> Volver al panel
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold" style={{ color: C.ink, fontFamily: FONT_MONO }}>REPORTES</h2>
        <div className="flex items-center gap-2 text-xs" style={{ color: C.inkSoft }}>
          <span>Del</span>
          <input type="date" value={range.from} max={range.to}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            className="px-2 py-1.5 rounded text-xs outline-none" style={{ border: `1px solid ${C.line}` }} />
          <span>al</span>
          <input type="date" value={range.to} min={range.from} max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            className="px-2 py-1.5 rounded text-xs outline-none" style={{ border: `1px solid ${C.line}` }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-lg" style={{ backgroundColor: C.card, border: `1px dashed ${C.lineStrong}` }}>
          <BarChart3 size={28} color={C.inkFaint} className="mx-auto mb-2" />
          <p className="text-sm font-semibold" style={{ color: C.ink }}>Sin pedidos en este rango</p>
          <p className="text-xs mt-1" style={{ color: C.inkSoft }}>Ajusta las fechas para ver datos.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <KpiCard icon={Package} label="Pedidos en rango" value={filtered.length} fg={C.steel} />
            <KpiCard icon={ShieldCheck} label="Cumplimiento SLA" value={stats.slaCompliancePct !== null ? `${stats.slaCompliancePct}%` : "—"} fg={stats.slaCompliancePct >= 80 ? C.ok : stats.slaCompliancePct === null ? C.inkFaint : C.alert} />
            <KpiCard icon={Timer} label="Tiempo prom. flujo completo" value={stats.avgFlowMin !== null ? `${stats.avgFlowMin} min` : "—"} fg={C.steel} />
            <KpiCard icon={AlertTriangle} label="Pedidos cancelados" value={stats.cancelados} fg={stats.cancelados > 0 ? C.alert : C.ok} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Pedidos creados por día">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.perDayData}>
                  <defs>
                    <linearGradient id="fillDay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.steel} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={C.steel} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                  <XAxis dataKey="date" tick={chartFont} axisLine={{ stroke: C.line }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={chartFont} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="count" name="Pedidos" stroke={C.steel} strokeWidth={2} fill="url(#fillDay)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Distribución por estado">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {stats.statusData.map((d, i) => <Cell key={i} fill={d.color} stroke={C.card} strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-1">
                {stats.statusData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[11px]" style={{ color: C.inkSoft }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Tiempo promedio por etapa vs. límite SLA (min)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.avgDurationData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                  <XAxis dataKey="name" tick={chartFont} axisLine={{ stroke: C.line }} tickLine={false} />
                  <YAxis tick={chartFont} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="promedio" name="Promedio real" fill={C.steel} radius={[4, 4, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="limite" name="Límite SLA" fill={C.line} radius={[4, 4, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cumplimiento de SLA por etapa (%)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.complianceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                  <XAxis dataKey="name" tick={chartFont} axisLine={{ stroke: C.line }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={chartFont} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <ReferenceLine y={80} stroke={C.warn} strokeDasharray="4 4" />
                  <Bar dataKey="cumplimiento" name="% en tiempo" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {stats.complianceData.map((d, i) => (
                      <Cell key={i} fill={d.sinDatos ? C.line : d.cumplimiento >= 80 ? C.ok : d.cumplimiento >= 50 ? C.warn : C.alert} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="rounded-lg p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <h5 className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: C.inkSoft }}>
              Motivos de finalización por anomalía (más recientes)
            </h5>
            {stats.cancelledList.length === 0 ? (
              <p className="text-xs" style={{ color: C.inkFaint }}>No hay cancelaciones en este rango.</p>
            ) : (
              <div className="space-y-1.5">
                {stats.cancelledList.map((o) => (
                  <div key={o.id} className="flex items-start gap-3 text-[11px] px-2.5 py-2 rounded" style={{ backgroundColor: C.paperDark }}>
                    <span className="font-bold flex-shrink-0" style={{ color: C.steel, fontFamily: FONT_MONO }}>{o.id}</span>
                    <span className="flex-1" style={{ color: C.ink }}>{o.cancel_info.reason}</span>
                    <span className="flex-shrink-0" style={{ color: C.inkFaint }}>{o.cancel_info.by} · {fmtShort(o.cancel_info.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
