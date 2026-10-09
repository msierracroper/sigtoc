import React, { useEffect, useRef, useState } from "react";
import { Layers, BarChart3, Clock3, Bell, BellOff, Search, Menu, X, LogOut, MonitorPlay } from "lucide-react";
import AlertBell from "./AlertBell";

export const ORDER_VIEWS = [
  { id: "todos", label: "Todos" },
  { id: "riesgo", label: "En riesgo" },
  { id: "anomalias", label: "Anomalías" },
];

function NavItem({ icon: Icon, label, active, onClick, count }) {
  return (
    <button onClick={onClick}
      className={`w-full h-10 sm:h-8 rounded-lg flex items-center gap-2.5 px-2.5 text-[14px] sm:text-[13.5px] font-semibold text-left transition-colors ${active ? "bg-surface shadow-[0_1px_0_rgba(0,0,0,.06)] text-ink" : "text-[#303030] hover:bg-black/[.04]"}`}>
      <Icon size={17} strokeWidth={2} />
      {label}
      {count > 0 && <span className="ml-auto text-[12px] font-semibold text-crit bg-critBg rounded-md px-1.5 num">{count}</span>}
    </button>
  );
}

export default function AppShell({
  email, page, ordersView, alertsCount, orders, slaSettings, now, search, onSearch,
  onNavigate, onOpenOrder, onOpenSla, pushEnabled, onTogglePush, onLogout, children,
}) {
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);

  // Ctrl/⌘ + K enfoca la búsqueda global
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
    }
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, []);

  function go(p, view) { onNavigate(p, view); setDrawer(false); }
  const initials = (email || "?").slice(0, 2).toUpperCase();

  const sidebar = (
    <nav className="flex flex-col gap-0.5 h-full p-2.5" aria-label="Principal">
      <NavItem icon={Layers} label="Pedidos" active={page === "orders"} onClick={() => go("orders", "todos")} count={alertsCount} />
      {ORDER_VIEWS.map((v) => (
        <button key={v.id} onClick={() => go("orders", v.id)}
          className={`h-9 sm:h-7 pl-9 rounded-lg text-left text-[14px] sm:text-[13px] ${page === "orders" && ordersView === v.id ? "text-ink font-semibold" : "text-ink2 hover:text-ink"}`}>
          {v.label}
        </button>
      ))}
      <NavItem icon={BarChart3} label="Reportes" active={page === "reports"} onClick={() => go("reports")} />
      <NavItem icon={Clock3} label="Configuración de SLA" onClick={() => { onOpenSla(); setDrawer(false); }} />
      <NavItem icon={MonitorPlay} label="Tablero para TV" onClick={() => { window.open("/tablero", "_blank", "noopener"); setDrawer(false); }} />
      <div className="mt-auto pt-3">
        <button onClick={onTogglePush}
          className="w-full h-10 sm:h-8 rounded-lg flex items-center gap-2.5 px-2.5 text-[14px] sm:text-[13px] font-semibold text-[#303030] hover:bg-black/[.04]">
          {pushEnabled ? <Bell size={17} /> : <BellOff size={17} />}
          Alertas push
          <span className={`ml-auto text-[11.5px] font-semibold rounded-md px-1.5 ${pushEnabled ? "bg-okBg text-ok" : "bg-surface text-ink2"}`}>{pushEnabled ? "Activas" : "Activar"}</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 h-14 bg-topbar text-[#E3E3E3] flex items-center gap-3 px-3 sm:px-4">
        <button className="lg:hidden -ml-2 w-11 h-11 grid place-items-center rounded-lg text-white hover:bg-white/10" onClick={() => setDrawer(true)} aria-label="Abrir menú"><Menu size={20} /></button>
        <div className="flex items-center gap-2 font-bold text-white text-[15px] tracking-tight lg:w-[220px]">
          <span className="w-[26px] h-[26px] rounded-[7px] bg-white text-topbar grid place-items-center text-[13px] font-extrabold">S</span>
          SIGTOC
        </div>
        <label className="hidden md:flex flex-1 max-w-[480px] h-[34px] rounded-[9px] bg-topbarField items-center gap-2 px-3 text-[#B5B5B5] shadow-[inset_0_0_0_1px_#4A4A4A] focus-within:shadow-[inset_0_0_0_2px_#7FB0F5]">
          <Search size={16} />
          <input ref={searchRef} value={search} onChange={(e) => { onSearch(e.target.value); if (page !== "orders") onNavigate("orders", ordersView); }}
            placeholder="Buscar pedidos, clientes o seriales" aria-label="Buscar pedidos"
            className="flex-1 bg-transparent outline-none text-white placeholder:text-[#B5B5B5] !text-[13.5px]" />
          <kbd className="text-[11px] text-[#9A9A9A] border border-[#555] rounded px-1.5 font-sans">Ctrl K</kbd>
        </label>
        <div className="ml-auto flex items-center gap-1.5">
          <AlertBell orders={orders} slaSettings={slaSettings} now={now} onOpenOrder={onOpenOrder} />
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenu((v) => !v)} aria-label="Cuenta" aria-expanded={menu}
              className="w-11 h-11 lg:w-[34px] lg:h-[34px] grid place-items-center rounded-lg -mr-1.5 lg:mr-0">
              <span className="w-[30px] h-[30px] rounded-lg bg-[#5C6AC4] text-white text-[12px] font-semibold grid place-items-center">{initials}</span>
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-64 card shadow-pop p-1.5 text-ink z-50">
                <p className="px-2.5 py-2 text-[12.5px] text-ink2 truncate">{email}</p>
                <button onClick={onLogout} className="w-full h-9 px-2.5 rounded-lg flex items-center gap-2 text-[13.5px] font-semibold hover:bg-surface2">
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden lg:block w-[240px] flex-none bg-nav sticky top-14 h-[calc(100vh-56px)]">{sidebar}</aside>
        {drawer && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
            <aside className="w-[280px] h-full bg-nav shadow-pop flex flex-col">
              <div className="h-14 flex items-center justify-between px-4 font-bold">SIGTOC
                <button onClick={() => setDrawer(false)} aria-label="Cerrar menú" className="w-11 h-11 -mr-2 grid place-items-center rounded-lg hover:bg-black/5"><X size={20} /></button>
              </div>
              <div className="flex-1">{sidebar}</div>
            </aside>
          </div>
        )}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
