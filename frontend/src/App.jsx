import React, { useState, useEffect, useCallback } from "react";
import { DEFAULT_SLA, STAGES } from "./constants/stages";
import { slaStatus, isAtRisk } from "./utils/sla";
import * as auth from "./services/auth";
import * as ordersApi from "./services/orders";
import { fetchSlaSettings, saveSlaSettings } from "./services/settings";
import { subscribeToChanges } from "./services/realtime";
import { isPushSupported, registerServiceWorker, getPushSubscription, subscribePush, unsubscribePush } from "./services/push";
import LoginScreen from "./components/auth/LoginScreen";
import AppShell from "./components/layout/AppShell";
import OrdersPage from "./components/orders/OrdersPage";
import OrderDetail from "./components/orders/OrderDetail";
import NewOrderModal from "./components/orders/NewOrderModal";
import ReportsView from "./components/reports/ReportsView";
import SlaSettingsModal from "./components/settings/SlaSettingsModal";
import Toast from "./components/ui/Toast";

// Esqueleto mientras se valida la sesión: misma estructura que la app, sin saltos al cargar
function LoadingShell() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Cargando SIGTOC">
      <div className="h-14 bg-topbar" />
      <div className="flex">
        <div className="hidden lg:block w-[240px] bg-nav h-[calc(100vh-56px)]" />
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-8 py-6 space-y-4 animate-pulse">
          <div className="h-7 w-40 rounded-lg bg-line" />
          <div className="hidden md:grid grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[86px] card" />)}</div>
          <div className="card p-3 space-y-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded-lg bg-surface2" />)}</div>
        </div>
      </div>
    </div>
  );
}

const SAVE_ERROR = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [orders, setOrders] = useState([]);
  const [slaSettings, setSlaSettings] = useState(DEFAULT_SLA);
  const [page, setPage] = useState("orders"); // "orders" | "reports"
  const [ordersTab, setOrdersTab] = useState("todos");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showSlaSettings, setShowSlaSettings] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());

  const notify = useCallback((message, tone = "success") => setToast({ message, tone, id: Date.now() }), []);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    auth.getSession().then(setSession);
    const unsubscribeAuth = auth.onAuthChange(setSession);
    const t = setInterval(() => setNow(Date.now()), 1000);
    registerServiceWorker(setPushEnabled);
    return () => { unsubscribeAuth(); clearInterval(t); };
  }, []);

  // Deep link: si la notificación push trae ?order=ID, abre ese pedido directo.
  useEffect(() => {
    if (!session || orders.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    if (orderId && orders.some((o) => o.id === orderId)) {
      openOrder(orderId);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [session, orders]);

  async function togglePush() {
    if (!isPushSupported()) {
      notify("Este navegador no soporta alertas push. Instala SIGTOC desde Chrome en Android o Safari 16.4+ en iPhone.", "error");
      return;
    }
    try {
      const existing = await getPushSubscription();
      if (pushEnabled && existing) {
        await unsubscribePush(existing);
        setPushEnabled(false);
        notify("Alertas push desactivadas en este dispositivo.");
        return;
      }
      const granted = await subscribePush(session.user.id);
      if (!granted) { notify("Acepta el permiso de notificaciones del navegador para activarlas.", "error"); return; }
      setPushEnabled(true);
      notify("Alertas push activadas: te avisaremos cuando un pedido esté en riesgo.");
    } catch {
      notify("No se pudieron configurar las alertas push.", "error");
    }
  }

  async function loadOrders() {
    const data = await ordersApi.fetchOrders();
    if (data) setOrders(data);
  }

  async function loadSlaSettings() {
    const sla = await fetchSlaSettings();
    if (sla) setSlaSettings(sla);
  }

  useEffect(() => {
    if (!session) return;
    loadOrders();
    loadSlaSettings();
    return subscribeToChanges({ onOrders: loadOrders, onSettings: loadSlaSettings });
  }, [session]);

  function openOrder(id) { setPage("orders"); setSelectedId(id); window.scrollTo(0, 0); }
  function navigate(p, view) {
    setPage(p);
    setSelectedId(null);
    if (view) setOrdersTab(view);
    window.scrollTo(0, 0);
  }

  async function handleSaveSlaSettings(newSla) {
    const { error } = await saveSlaSettings(newSla);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    setSlaSettings(newSla); setShowSlaSettings(false);
    notify("Configuración de SLA guardada.");
  }

  async function handleCreate(cliente) {
    const { id, error } = await ordersApi.createOrder({ cliente, user: session.user, slaSettings, existingCount: orders.length });
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders(); setShowNewOrder(false); openOrder(id);
    notify(`Pedido ${id} creado. Sube el PDF del pedido para avanzar.`);
  }

  async function handleCancelOrder(reason) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.cancelOrder(order, reason, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(`Pedido ${order.id} finalizado por anomalía.`);
  }

  async function handleEditStage(stageId, newData) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.editStage(order, stageId, newData, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(`${STAGES[stageId - 1].name} corregida: v${(order.stages[stageId].editHistory?.length || 0) + 2}.`);
  }

  async function handleFinalizeStage(stageId, data) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.finalizeStage(order, stageId, data, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(stageId < 4 ? `Etapa ${STAGES[stageId - 1].short} finalizada: ${order.id} pasó a ${STAGES[stageId].short}.` : `Pedido ${order.id} entregado y cerrado.`);
  }

  if (session === undefined) {
    return <LoadingShell />;
  }

  if (!session) {
    return <LoginScreen onAuthed={setSession} />;
  }

  const selected = orders.find((o) => o.id === selectedId);
  const alertsCount = orders.filter((o) => isAtRisk(slaStatus(o, slaSettings, now))).length;

  return (
    <>
      <AppShell
        email={session.user.email} page={page} ordersView={ordersTab} alertsCount={alertsCount}
        orders={orders} slaSettings={slaSettings} now={now} search={search} onSearch={setSearch}
        onNavigate={navigate} onOpenOrder={openOrder} onOpenSla={() => setShowSlaSettings(true)}
        pushEnabled={pushEnabled} onTogglePush={togglePush} onLogout={() => auth.signOut()}>
        {page === "reports" ? (
          <ReportsView orders={orders} slaSettings={slaSettings} now={now} onOpenOrder={openOrder} />
        ) : selected ? (
          <OrderDetail order={selected} now={now} slaSettings={slaSettings} onBack={() => setSelectedId(null)}
            onFinalizeStage={handleFinalizeStage} onCancelOrder={handleCancelOrder} onEditStage={handleEditStage} />
        ) : (
          <OrdersPage orders={orders} now={now} slaSettings={slaSettings} tab={ordersTab} onTabChange={setOrdersTab}
            search={search} onSearch={setSearch} onOpen={openOrder} onNew={() => setShowNewOrder(true)} />
        )}
      </AppShell>

      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreate={handleCreate} />}
      {showSlaSettings && <SlaSettingsModal current={slaSettings} onClose={() => setShowSlaSettings(false)} onSave={handleSaveSlaSettings} />}
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
