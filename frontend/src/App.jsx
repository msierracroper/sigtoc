import React, { useState, useEffect } from "react";
import { C, FONT_SANS } from "./styles/tokens";
import { DEFAULT_SLA } from "./constants/stages";
import * as auth from "./services/auth";
import * as ordersApi from "./services/orders";
import { fetchSlaSettings, saveSlaSettings } from "./services/settings";
import { subscribeToChanges } from "./services/realtime";
import { isPushSupported, registerServiceWorker, getPushSubscription, subscribePush, unsubscribePush } from "./services/push";
import LoginScreen from "./components/auth/LoginScreen";
import AppHeader from "./components/layout/AppHeader";
import Dashboard from "./components/dashboard/Dashboard";
import OrderDetail from "./components/orders/OrderDetail";
import NewOrderModal from "./components/orders/NewOrderModal";
import ReportsView from "./components/reports/ReportsView";
import SlaSettingsModal from "./components/settings/SlaSettingsModal";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [orders, setOrders] = useState([]);
  const [slaSettings, setSlaSettings] = useState(DEFAULT_SLA);
  const [selectedId, setSelectedId] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showSlaSettings, setShowSlaSettings] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [now, setNow] = useState(Date.now());

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
      setSelectedId(orderId);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [session, orders]);

  async function togglePush() {
    if (!isPushSupported()) {
      alert("Este navegador no soporta notificaciones push. Instala SIGTOC desde Chrome/Android o Safari 16.4+ en iOS.");
      return;
    }
    const existing = await getPushSubscription();

    if (pushEnabled && existing) {
      await unsubscribePush(existing);
      setPushEnabled(false);
      return;
    }

    const granted = await subscribePush(session.user.id);
    if (!granted) { alert("Necesitas aceptar el permiso de notificaciones para activarlas."); return; }
    setPushEnabled(true);
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

  async function handleSaveSlaSettings(newSla) {
    const { error } = await saveSlaSettings(newSla);
    if (!error) { setSlaSettings(newSla); setShowSlaSettings(false); }
  }

  async function handleCreate(cliente) {
    const { id, error } = await ordersApi.createOrder({ cliente, user: session.user, slaSettings, existingCount: orders.length });
    if (!error) { await loadOrders(); setShowNewOrder(false); setSelectedId(id); }
  }

  async function handleCancelOrder(reason) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.cancelOrder(order, reason, session.user.email);
    if (!error) loadOrders();
  }

  async function handleEditStage(stageId, newData) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.editStage(order, stageId, newData, session.user.email);
    if (!error) loadOrders();
  }

  async function handleFinalizeStage(stageId, data) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.finalizeStage(order, stageId, data, session.user.email);
    if (!error) loadOrders();
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.paperDark }}>
        <p className="text-xs" style={{ color: C.inkSoft }}>Cargando...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ fontFamily: FONT_SANS }}>
        <LoginScreen onAuthed={setSession} />
      </div>
    );
  }

  const selected = orders.find((o) => o.id === selectedId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.paperDark, fontFamily: FONT_SANS }}>
      <AppHeader orders={orders} slaSettings={slaSettings} now={now}
        onOpenOrder={(id) => { setShowReports(false); setSelectedId(id); }} />

      {showReports ? (
        <ReportsView orders={orders} slaSettings={slaSettings} onBack={() => setShowReports(false)} />
      ) : selected ? (
        <OrderDetail order={selected} now={now} slaSettings={slaSettings} onBack={() => setSelectedId(null)}
          onFinalizeStage={handleFinalizeStage} onCancelOrder={handleCancelOrder} onEditStage={handleEditStage} />
      ) : (
        <Dashboard orders={orders} now={now} slaSettings={slaSettings} onOpen={setSelectedId} onNew={() => setShowNewOrder(true)}
          onOpenSettings={() => setShowSlaSettings(true)} onOpenReports={() => setShowReports(true)}
          pushEnabled={pushEnabled} onTogglePush={togglePush}
          email={session.user.email} onLogout={() => auth.signOut()} />
      )}

      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreate={handleCreate} />}
      {showSlaSettings && <SlaSettingsModal current={slaSettings} onClose={() => setShowSlaSettings(false)} onSave={handleSaveSlaSettings} />}
    </div>
  );
}
