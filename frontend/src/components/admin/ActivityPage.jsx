import React, { useEffect, useMemo, useState } from "react";
import { History, Package, Settings2, RefreshCw } from "lucide-react";
import { fetchActivity } from "../../services/roles";
import { STAGES } from "../../constants/stages";
import { fmtShort, shortUser } from "../../utils/format";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

const PAGE = 100;

// Detalle legible de un cambio de SLA: "Ingreso 30 → 40 min"
function slaDiff(details) {
  const a = details?.antes || {}, d = details?.despues || {};
  return STAGES.filter((s) => a[s.id] !== d[s.id]).map((s) => `${s.short} ${a[s.id] ?? "—"} → ${d[s.id] ?? "—"} min`).join(" · ");
}

// Actividad de todos los usuarios: lo que hicieron en los pedidos (auditoría de cada pedido)
// y en la configuración (SLA, catálogos, roles; la escribe la base). Solo para administradores.
export default function ActivityPage({ orders, onOpenOrder }) {
  const [config, setConfig] = useState([]); // null = no se pudo cargar
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState("");
  const [kind, setKind] = useState("todo");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  async function load() {
    setLoading(true);
    setConfig(await fetchActivity());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const entries = useMemo(() => {
    const fromOrders = orders.flatMap((o) => (o.audit_log || []).map((a, i) => ({
      key: `${o.id}-${i}`, ts: a.ts, user: a.user, text: a.action, kind: "pedidos", orderId: o.id, cliente: o.cliente,
    })));
    const fromConfig = (config || []).map((c) => ({
      key: `cfg-${c.id}`, ts: c.ts, user: c.user_email, kind: "configuracion",
      text: c.entity === "sla" ? `${c.action} ${slaDiff(c.details)}` : c.action,
    }));
    return [...fromOrders, ...fromConfig].sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }, [orders, config]);

  const users = useMemo(() => [...new Set(entries.map((e) => e.user).filter(Boolean))].sort(), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => (!user || e.user === user) && (kind === "todo" || e.kind === kind)
      && (!q || `${e.text} ${e.orderId || ""} ${e.cliente || ""}`.toLowerCase().includes(q)));
  }, [entries, user, kind, query]);

  useEffect(() => setShown(PAGE), [user, kind, query]);

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[20px] font-bold tracking-tight mr-auto">Actividad</h1>
        <Button size="sm" icon={RefreshCw} busy={loading} onClick={load}>Actualizar</Button>
      </div>
      <p className="text-ink2 -mt-2">Todo lo que hace cada usuario: movimientos de pedidos y cambios de configuración.</p>

      <div className="card p-3 flex flex-col sm:flex-row gap-2">
        <select value={user} onChange={(e) => setUser(e.target.value)} className="field sm:max-w-[260px]" aria-label="Usuario">
          <option value="">Todos los usuarios</option>
          {users.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="field sm:max-w-[200px]" aria-label="Tipo">
          <option value="todo">Todo</option>
          <option value="pedidos">Pedidos</option>
          <option value="configuracion">Configuración</option>
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en la actividad (pedido, cliente, acción)" className="field flex-1" aria-label="Buscar en la actividad" />
      </div>

      {config === null && (
        <p className="text-[13px] text-crit">No se pudieron cargar los cambios de configuración. Se muestran solo los movimientos de pedidos.</p>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-6 text-ink2">
            <History size={26} className="mx-auto mb-2 text-ink3" />
            {loading ? "Cargando actividad…" : "No hay actividad con estos filtros."}
          </div>
        ) : (
          <ol>
            {filtered.slice(0, shown).map((e) => (
              <li key={e.key} className="flex items-start gap-3 px-4 py-3 border-b border-line2 last:border-0">
                <span className={`w-8 h-8 rounded-lg grid place-items-center flex-none ${e.kind === "pedidos" ? "bg-surface2 text-ink2" : "bg-infoBg text-info"}`}>
                  {e.kind === "pedidos" ? <Package size={16} /> : <Settings2 size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px]">{e.text}</p>
                  <p className="text-[12px] text-ink2 mt-0.5 num">
                    {fmtShort(e.ts)} · <b className="font-semibold text-ink">{shortUser(e.user)}</b>
                    {e.orderId && <> · {e.orderId} · {e.cliente}</>}
                  </p>
                </div>
                {e.orderId
                  ? <Button size="sm" onClick={() => onOpenOrder(e.orderId)} aria-label={`Ver pedido ${e.orderId}`}>Ver</Button>
                  : <Badge tone="info">Configuración</Badge>}
              </li>
            ))}
          </ol>
        )}
      </div>
      {filtered.length > shown && (
        <div className="text-center"><Button onClick={() => setShown((n) => n + PAGE)}>Ver más ({filtered.length - shown} restantes)</Button></div>
      )}
    </div>
  );
}
