import React, { useState, useEffect, useRef } from "react";
import {
  Package, Warehouse, Receipt, Truck, Clock, CheckCircle2, AlertTriangle,
  LogOut, Plus, Search, MessageCircle, ArrowLeft, X, FileText, CreditCard,
  MapPin, ClipboardList, Lock, User,
} from "lucide-react";

/* ============ TOKENS DE DISEÑO ============
   Concepto: "torre de control" de un patio logístico — libro de manifiestos.
   Papel cálido, tinta azul acero para operación, sello ámbar/rojo para SLA.
*/
const C = {
  paper: "#F6F4EE",
  paperDark: "#ECE8DC",
  card: "#FFFFFF",
  ink: "#1E2530",
  inkSoft: "#646B76",
  inkFaint: "#9B9A8F",
  steel: "#2C4A73",
  steelDark: "#1B2E47",
  steelSoft: "#E3E9F1",
  alert: "#B7472A",
  alertBg: "#F8E7E1",
  warn: "#A97327",
  warnBg: "#F6EED9",
  ok: "#3D7658",
  okBg: "#E4EFE7",
  line: "#DBD6C8",
  lineStrong: "#C1BBA7",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
`;

const STAGES = [
  { id: 1, name: "Ingreso de Pedido", short: "Ingreso", icon: FileText, desc: "PDF del pedido + RUT" },
  { id: 2, name: "Bodega", short: "Bodega", icon: Warehouse, desc: "Verificación de seriales" },
  { id: 3, name: "Facturación", short: "Facturación", icon: Receipt, desc: "Número de factura" },
  { id: 4, name: "Despacho y Entrega", short: "Despacho", icon: Truck, desc: "Guía o entrega en tienda" },
];

const USERS_KEY = "torre-users-db";
const ORDERS_KEY = "torre-orders-db";
const DEMO_USER = { username: "admin", password: "admin123" };

/* Adaptador de almacenamiento: usa localStorage del navegador.
   Los datos quedan guardados en el dispositivo/navegador de quien lo usa. */
const storage = {
  async get(key) {
    const v = window.localStorage.getItem(key);
    if (v === null) return null;
    return { key, value: v };
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
    return { key, value };
  },
};

function nowIso() { return new Date().toISOString(); }

function fmtClock(d) {
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function makeOrderId(existing) {
  const year = new Date().getFullYear();
  const seq = existing.length + 1;
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `PED-${year}-${String(seq).padStart(4, "0")}-${rand}`;
}

function freshOrder(cliente, slaConfig, user) {
  const id = null; // asignado luego con lista existente
  const ts = nowIso();
  return {
    cliente: cliente || "Cliente sin nombre",
    createdAt: ts,
    createdBy: user,
    status: "abierto",
    currentStage: 1,
    slaConfig,
    stages: {
      1: { startedAt: ts, completedAt: null, data: {} },
      2: { startedAt: null, completedAt: null, data: {} },
      3: { startedAt: null, completedAt: null, data: {} },
      4: { startedAt: null, completedAt: null, data: {} },
    },
    auditLog: [{ ts, user, action: "Pedido creado. Registro de auditoría iniciado." }],
    whatsappLog: [{ ts, text: `Pedido registrado. Auditoría en curso.` }],
  };
}

function slaStatus(order, now) {
  if (order.status === "cerrado") return null;
  const stage = order.currentStage;
  const st = order.stages[stage];
  if (!st?.startedAt) return null;
  const limitMin = order.slaConfig[stage] ?? 30;
  const elapsedMs = now - new Date(st.startedAt).getTime();
  const elapsedMin = elapsedMs / 60000;
  let state = "ok";
  if (elapsedMin >= limitMin) state = "excedido";
  else if (elapsedMin >= limitMin * 0.75) state = "alerta";
  return { state, elapsedMs, limitMin };
}

function StatusPill({ state }) {
  const map = {
    ok: { bg: C.okBg, fg: C.ok, label: "En tiempo" },
    alerta: { bg: C.warnBg, fg: C.warn, label: "Por vencer" },
    excedido: { bg: C.alertBg, fg: C.alert, label: "SLA excedido" },
  };
  const s = map[state] || map.ok;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.fg, fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: s.fg }} />
      {s.label}
    </span>
  );
}

/* ============ LOGIN ============ */
function LoginScreen({ onLogin, error }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: C.paperDark }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded mb-3"
            style={{ backgroundColor: C.steelDark }}
          >
            <ClipboardList size={22} color="#fff" />
          </div>
          <h1 className="text-lg font-bold" style={{ color: C.ink, fontFamily: "'IBM Plex Mono', monospace" }}>
            TORRE DE CONTROL
          </h1>
          <p className="text-xs mt-1" style={{ color: C.inkSoft }}>
            Trazabilidad y auditoría de pedidos
          </p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onLogin(u, p); }}
          className="rounded-lg p-6 space-y-4"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
        >
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-1.5" style={{ color: C.inkSoft }}>
              <User size={12} /> Usuario
            </label>
            <input
              value={u} onChange={(e) => setU(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded outline-none"
              style={{ border: `1px solid ${C.line}`, color: C.ink }}
              placeholder="admin"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-1.5" style={{ color: C.inkSoft }}>
              <Lock size={12} /> Contraseña
            </label>
            <input
              value={p} onChange={(e) => setP(e.target.value)} type="password"
              className="w-full text-sm px-3 py-2 rounded outline-none"
              style={{ border: `1px solid ${C.line}`, color: C.ink }}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-xs font-medium" style={{ color: C.alert }}>{error}</p>}
          <button
            type="submit"
            className="w-full py-2.5 rounded text-sm font-semibold text-white"
            style={{ backgroundColor: C.steel }}
          >
            Ingresar
          </button>
          <p className="text-[11px] text-center pt-1" style={{ color: C.inkFaint }}>
            Demo: admin / admin123
          </p>
        </form>
      </div>
    </div>
  );
}

/* ============ MODAL NUEVO PEDIDO ============ */
function NewOrderModal({ onClose, onCreate }) {
  const [cliente, setCliente] = useState("");
  const [sla, setSla] = useState({ 1: 30, 2: 45, 3: 20, 4: 60 });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(20,20,20,0.45)" }}>
      <div className="w-full max-w-md rounded-lg" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold" style={{ color: C.ink }}>Nuevo pedido</h3>
          <button onClick={onClose}><X size={18} color={C.inkSoft} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Cliente / referencia</label>
            <input
              value={cliente} onChange={(e) => setCliente(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded mt-1 outline-none"
              style={{ border: `1px solid ${C.line}` }}
              placeholder="Ej: Distribuidora Andina SAS"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>
              Tiempo límite de SLA por etapa (minutos)
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {STAGES.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded" style={{ backgroundColor: C.paperDark }}>
                  <span className="text-[11px]" style={{ color: C.inkSoft }}>{s.short}</span>
                  <input
                    type="number" min={1} value={sla[s.id]}
                    onChange={(e) => setSla({ ...sla, [s.id]: Number(e.target.value) || 1 })}
                    className="w-14 text-xs text-right px-1.5 py-1 rounded outline-none"
                    style={{ border: `1px solid ${C.line}`, fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft }}>Cancelar</button>
          <button
            onClick={() => onCreate(cliente, sla)}
            className="px-4 py-2 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: C.steel }}
          >
            Crear pedido
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ DASHBOARD ============ */
function Dashboard({ orders, now, onOpen, onNew, session, onLogout }) {
  const [query, setQuery] = useState("");
  const filtered = orders.filter((o) =>
    (o.id + " " + o.cliente).toLowerCase().includes(query.toLowerCase())
  );
  const abiertos = orders.filter((o) => o.status === "abierto").length;
  const alertas = orders.filter((o) => {
    const s = slaStatus(o, now);
    return s && (s.state === "alerta" || s.state === "excedido");
  }).length;
  const today = new Date().toDateString();
  const cerradosHoy = orders.filter((o) => {
    const st4 = o.stages[4]?.completedAt;
    return st4 && new Date(st4).toDateString() === today;
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: C.ink, fontFamily: "'IBM Plex Mono', monospace" }}>
            PANEL DE PEDIDOS
          </h2>
          <p className="text-xs mt-0.5" style={{ color: C.inkSoft }}>
            {orders.length} registrados · sesión: {session}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: C.steel }}
          >
            <Plus size={14} /> Nuevo pedido
          </button>
          <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft, border: `1px solid ${C.line}` }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Pedidos abiertos", val: abiertos, fg: C.steel },
          { label: "Alertas activas de SLA", val: alertas, fg: alertas > 0 ? C.alert : C.ok },
          { label: "Cerrados hoy", val: cerradosHoy, fg: C.ok },
        ].map((s) => (
          <div key={s.label} className="rounded-lg px-4 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.fg, fontFamily: "'IBM Plex Mono', monospace" }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={C.inkFaint} />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ID o cliente..."
          className="w-full text-xs pl-8 pr-3 py-2.5 rounded outline-none"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-lg" style={{ backgroundColor: C.card, border: `1px dashed ${C.lineStrong}` }}>
          <Package size={28} color={C.inkFaint} className="mx-auto mb-2" />
          <p className="text-sm font-semibold" style={{ color: C.ink }}>Aún no hay pedidos</p>
          <p className="text-xs mt-1" style={{ color: C.inkSoft }}>Crea el primero para empezar a auditar el flujo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice().reverse().map((o) => {
            const sla = slaStatus(o, now);
            const stage = STAGES[o.currentStage - 1];
            const barColor = o.status === "cerrado" ? C.ok : sla ? { ok: C.ok, alerta: C.warn, excedido: C.alert }[sla.state] : C.line;
            return (
              <button
                key={o.id}
                onClick={() => onOpen(o.id)}
                className="w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-lg transition hover:shadow-sm"
                style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderLeft: `4px solid ${barColor}` }}
              >
                <div className="min-w-[150px]">
                  <p className="text-xs font-bold" style={{ color: C.ink, fontFamily: "'IBM Plex Mono', monospace" }}>{o.id}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.inkSoft }}>{o.cliente}</p>
                </div>
                <div className="flex items-center gap-1.5 min-w-[160px]">
                  <stage.icon size={13} color={C.steel} />
                  <span className="text-xs font-medium" style={{ color: C.ink }}>{stage.name}</span>
                </div>
                <div className="min-w-[110px]">
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-1 rounded"
                    style={{
                      backgroundColor: o.status === "cerrado" ? C.okBg : C.steelSoft,
                      color: o.status === "cerrado" ? C.ok : C.steel,
                    }}
                  >
                    {o.status === "cerrado" ? "Entregado" : "En proceso"}
                  </span>
                </div>
                <div className="min-w-[150px]">
                  {sla ? (
                    <div className="flex items-center gap-2">
                      <StatusPill state={sla.state} />
                      <span className="text-[11px]" style={{ color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {fmtDuration(sla.elapsedMs)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px]" style={{ color: C.inkFaint }}>—</span>
                  )}
                </div>
                <div className="ml-auto text-[11px]" style={{ color: C.inkFaint }}>{fmtShort(o.createdAt)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ DETALLE DE PEDIDO ============ */
function Perforation() {
  return (
    <div className="hidden sm:flex flex-col justify-between py-2" style={{ width: 16 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: C.paperDark }} />
      ))}
    </div>
  );
}

function StageForm({ stageId, onFinalize }) {
  const [pdf, setPdf] = useState(false);
  const [rut, setRut] = useState(false);
  const [seriales, setSeriales] = useState("");
  const [sinSerial, setSinSerial] = useState(false);
  const [factura, setFactura] = useState("");
  const [modoEntrega, setModoEntrega] = useState("guia");
  const [guia, setGuia] = useState(false);

  const inputStyle = { border: `1px solid ${C.line}` };

  if (stageId === 1) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 px-3 py-3 rounded cursor-pointer" style={{ backgroundColor: C.paperDark }}>
            <input type="checkbox" checked={pdf} onChange={(e) => setPdf(e.target.checked)} />
            <FileText size={14} color={C.steel} />
            <span className="text-xs font-medium">PDF del pedido cargado</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-3 rounded cursor-pointer" style={{ backgroundColor: C.paperDark }}>
            <input type="checkbox" checked={rut} onChange={(e) => setRut(e.target.checked)} />
            <CreditCard size={14} color={C.steel} />
            <span className="text-xs font-medium">RUT cargado</span>
          </label>
        </div>
        <button
          disabled={!pdf || !rut}
          onClick={() => onFinalize({ pdf, rut })}
          className="px-5 py-2.5 rounded text-xs font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: C.steel }}
        >
          Finalizar etapa 1
        </button>
      </div>
    );
  }
  if (stageId === 2) {
    return (
      <div className="space-y-3">
        <input
          value={seriales} disabled={sinSerial} onChange={(e) => setSeriales(e.target.value)}
          placeholder="Ej: SN-998342, SN-998343"
          className="w-full text-xs px-3 py-2.5 rounded outline-none" style={inputStyle}
        />
        <label className="flex items-center gap-2 text-xs" style={{ color: C.inkSoft }}>
          <input type="checkbox" checked={sinSerial} onChange={(e) => { setSinSerial(e.target.checked); if (e.target.checked) setSeriales(""); }} />
          Opción sin serial
        </label>
        <button
          disabled={!seriales && !sinSerial}
          onClick={() => onFinalize({ seriales: sinSerial ? "Sin serial" : seriales })}
          className="px-5 py-2.5 rounded text-xs font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: C.steel }}
        >
          Finalizar etapa 2
        </button>
      </div>
    );
  }
  if (stageId === 3) {
    return (
      <div className="space-y-3">
        <input
          value={factura} onChange={(e) => setFactura(e.target.value)}
          placeholder="Ej: FE-2026-9041"
          className="w-full text-xs px-3 py-2.5 rounded outline-none" style={inputStyle}
        />
        <button
          disabled={!factura}
          onClick={() => onFinalize({ factura })}
          className="px-5 py-2.5 rounded text-xs font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: C.steel }}
        >
          Finalizar etapa 3
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label
          onClick={() => setModoEntrega("guia")}
          className="flex items-center gap-2 px-3 py-3 rounded cursor-pointer"
          style={{ backgroundColor: modoEntrega === "guia" ? C.steelSoft : C.paperDark, border: modoEntrega === "guia" ? `1px solid ${C.steel}` : "1px solid transparent" }}
        >
          <input type="checkbox" checked={guia} onChange={(e) => setGuia(e.target.checked)} disabled={modoEntrega !== "guia"} />
          <Truck size={14} color={C.steel} />
          <span className="text-xs font-medium">Envío con guía</span>
        </label>
        <label
          onClick={() => setModoEntrega("tienda")}
          className="flex items-center gap-2 px-3 py-3 rounded cursor-pointer"
          style={{ backgroundColor: modoEntrega === "tienda" ? C.steelSoft : C.paperDark, border: modoEntrega === "tienda" ? `1px solid ${C.steel}` : "1px solid transparent" }}
        >
          <MapPin size={14} color={C.steel} />
          <span className="text-xs font-medium">Entrega en tienda</span>
        </label>
      </div>
      <button
        disabled={modoEntrega === "guia" && !guia}
        onClick={() => onFinalize({ modo: modoEntrega })}
        className="px-5 py-2.5 rounded text-xs font-bold text-white disabled:opacity-40"
        style={{ backgroundColor: C.ok }}
      >
        Pedido finalizado
      </button>
    </div>
  );
}

function OrderDetail({ order, now, onBack, onFinalizeStage }) {
  const sla = slaStatus(order, now);
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold mb-4" style={{ color: C.inkSoft }}>
        <ArrowLeft size={14} /> Volver al panel
      </button>

      {/* Ticket / waybill header — elemento distintivo */}
      <div className="flex rounded-lg overflow-hidden mb-6" style={{ border: `1px solid ${C.line}` }}>
        <div className="flex-1 p-5" style={{ backgroundColor: C.card }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.inkFaint }}>ID único de pedido</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: C.ink, fontFamily: "'IBM Plex Mono', monospace" }}>{order.id}</p>
              <p className="text-xs mt-1" style={{ color: C.inkSoft }}>{order.cliente}</p>
            </div>
            <div className="text-right">
              <span
                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded"
                style={{ backgroundColor: order.status === "cerrado" ? C.okBg : C.steelSoft, color: order.status === "cerrado" ? C.ok : C.steel }}
              >
                {order.status === "cerrado" ? "Entregado" : "En proceso"}
              </span>
              {sla && <div className="mt-2"><StatusPill state={sla.state} /></div>}
            </div>
          </div>
          <div className="flex gap-6 mt-4 pt-3" style={{ borderTop: `1px dashed ${C.line}` }}>
            <div>
              <p className="text-[10px] uppercase font-semibold" style={{ color: C.inkFaint }}>Creado</p>
              <p className="text-xs mt-0.5" style={{ color: C.ink }}>{fmtShort(order.createdAt)} · {order.createdBy}</p>
            </div>
            {sla && (
              <div>
                <p className="text-[10px] uppercase font-semibold" style={{ color: C.inkFaint }}>Tiempo en etapa actual</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: C.ink, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {fmtDuration(sla.elapsedMs)} / límite {sla.limitMin} min
                </p>
              </div>
            )}
          </div>
        </div>
        <Perforation />
      </div>

      {/* Riel de etapas */}
      <div className="flex items-center mb-6">
        {STAGES.map((s, idx) => {
          const st = order.stages[s.id];
          const done = !!st.completedAt;
          const active = order.currentStage === s.id && order.status === "abierto";
          const color = done ? C.ok : active ? C.steel : C.inkFaint;
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center" style={{ minWidth: 90 }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: done ? C.okBg : active ? C.steelSoft : C.paperDark, border: `2px solid ${color}` }}
                >
                  {done ? <CheckCircle2 size={16} color={color} /> : <s.icon size={15} color={color} />}
                </div>
                <span className="text-[10px] font-semibold mt-1.5 text-center" style={{ color }}>{s.short}</span>
                <span className="text-[10px]" style={{ color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {done ? fmtShort(st.completedAt) : active ? "en curso" : "pendiente"}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1" style={{ backgroundColor: done ? C.ok : C.line }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Formulario etapa activa */}
        <div className="lg:col-span-7">
          <div className="rounded-lg p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            {order.status === "cerrado" ? (
              <div className="text-center py-6">
                <CheckCircle2 size={26} color={C.ok} className="mx-auto mb-2" />
                <p className="text-sm font-bold" style={{ color: C.ink }}>Pedido cerrado y entregado</p>
                <p className="text-xs mt-1" style={{ color: C.inkSoft }}>Todas las etapas quedaron registradas en la auditoría.</p>
              </div>
            ) : (
              <>
                <h4 className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: C.steel }}>
                  Etapa {order.currentStage} · {STAGES[order.currentStage - 1].name}
                </h4>
                <p className="text-xs mb-4" style={{ color: C.inkSoft }}>{STAGES[order.currentStage - 1].desc}</p>
                <StageForm stageId={order.currentStage} onFinalize={(data) => onFinalizeStage(order.currentStage, data)} />
              </>
            )}
          </div>
        </div>

        {/* Auditoría + WhatsApp */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-lg p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <h5 className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 mb-2.5" style={{ color: C.inkSoft }}>
              <ClipboardList size={13} /> Registro de auditoría
            </h5>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {order.auditLog.slice().reverse().map((a, i) => (
                <div key={i} className="text-[11px] px-2 py-1.5 rounded" style={{ backgroundColor: C.paperDark }}>
                  <span className="font-semibold" style={{ color: C.steel, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {fmtShort(a.ts)}
                  </span>{" "}
                  <span style={{ color: C.inkSoft }}>· {a.user} —</span> {a.action}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: "#3E7B58" }}>
              <MessageCircle size={15} color="#fff" />
              <span className="text-xs font-semibold text-white">Notificaciones WhatsApp (simulado)</span>
            </div>
            <div className="p-3 space-y-2 max-h-52 overflow-y-auto" style={{ backgroundColor: "#EFEAE2" }}>
              {order.whatsappLog.slice().reverse().map((w, i) => (
                <div key={i} className="bg-white rounded-lg px-2.5 py-2 text-[11px] shadow-sm max-w-[92%] ml-auto">
                  <p style={{ color: C.ink }}>{w.text}</p>
                  <p className="text-right text-[9px] mt-1" style={{ color: C.inkFaint }}>{fmtShort(w.ts)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ APP ============ */
export default function App() {
  const [session, setSession] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState(null);
  const [orders, setOrders] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let mounted = true;
    (async () => {
      let u = null;
      try {
        const r = await storage.get(USERS_KEY);
        if (r && r.value) u = JSON.parse(r.value);
      } catch (e) { /* clave no existe aún */ }
      if (!u || !Array.isArray(u) || u.length === 0) {
        u = [DEMO_USER];
        try { await storage.set(USERS_KEY, JSON.stringify(u)); } catch (e) { console.error("No se pudo guardar usuarios", e); }
      }

      let o = [];
      try {
        const r2 = await storage.get(ORDERS_KEY);
        if (r2 && r2.value) o = JSON.parse(r2.value);
      } catch (e) { /* clave no existe aún, arrancamos con lista vacía */ }

      if (mounted) { setUsers(u); setOrders(o); }
    })();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  async function persist(newOrders) {
    setOrders(newOrders);
    try { await storage.set(ORDERS_KEY, JSON.stringify(newOrders)); } catch (e) { console.error(e); }
  }

  function handleLogin(username, password) {
    const list = users && users.length ? users : [DEMO_USER];
    const found = list.find((x) => x.username === username && x.password === password);
    if (found) { setSession(username); setLoginError(""); }
    else setLoginError("Usuario o contraseña incorrectos.");
  }

  function handleCreate(cliente, slaConfig) {
    const order = freshOrder(cliente, slaConfig, session);
    const id = makeOrderId(orders);
    const withId = { id, ...order };
    persist([...orders, withId]);
    setShowNewOrder(false);
    setSelectedId(id);
  }

  function handleFinalizeStage(stageId, data) {
    const ts = nowIso();
    const newOrders = orders.map((o) => {
      if (o.id !== selectedId) return o;
      const stages = { ...o.stages, [stageId]: { ...o.stages[stageId], completedAt: ts, data } };
      let currentStage = o.currentStage;
      let status = o.status;
      const audit = [...o.auditLog];
      const wa = [...o.whatsappLog];

      const messages = {
        1: `Pedido ${o.id} creado. Archivos PDF y RUT cargados correctamente.`,
        2: `Seriales de ${o.id} adjuntados: ${data.seriales}.`,
        3: `Pedido ${o.id} facturado. Factura N.º ${data.factura}.`,
        4: `Pedido ${o.id} entregado. Proceso cerrado y auditado.`,
      };
      audit.push({ ts, user: session, action: `Etapa ${stageId} (${STAGES[stageId - 1].name}) finalizada.` });
      wa.push({ ts, text: messages[stageId] });

      if (stageId < 4) {
        currentStage = stageId + 1;
        stages[currentStage] = { ...stages[currentStage], startedAt: ts };
      } else {
        status = "cerrado";
      }
      return { ...o, stages, currentStage, status, auditLog: audit, whatsappLog: wa };
    });
    persist(newOrders);
  }

  if (!session) {
    return (
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <style>{FONTS}</style>
        <LoginScreen onLogin={handleLogin} error={loginError} />
      </div>
    );
  }

  if (orders === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.paperDark, fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <style>{FONTS}</style>
        <p className="text-xs" style={{ color: C.inkSoft }}>Cargando registros...</p>
      </div>
    );
  }

  const selected = orders.find((o) => o.id === selectedId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.paperDark, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{FONTS}</style>
      <header className="sticky top-0 z-40" style={{ backgroundColor: C.steelDark }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ClipboardList size={18} color="#fff" />
            <span className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              TORRE DE CONTROL · PEDIDOS
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/70" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            <Clock size={12} /> {fmtClock(new Date(now))}
          </div>
        </div>
      </header>

      {selected ? (
        <OrderDetail order={selected} now={now} onBack={() => setSelectedId(null)} onFinalizeStage={handleFinalizeStage} />
      ) : (
        <Dashboard
          orders={orders} now={now}
          onOpen={setSelectedId}
          onNew={() => setShowNewOrder(true)}
          session={session}
          onLogout={() => setSession(null)}
        />
      )}

      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreate={handleCreate} />}
    </div>
  );
}
