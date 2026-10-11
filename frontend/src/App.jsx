import React, { useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_SLA, STAGES } from "./constants/stages";
import { slaStatus, isAtRisk } from "./utils/sla";
import * as auth from "./services/auth";
import * as ordersApi from "./services/orders";
import { fetchSlaSettings, saveSlaSettings } from "./services/settings";
import { subscribeToChanges } from "./services/realtime";
import { fetchCatalog, createCatalogItem, updateCatalogItem } from "./services/catalogs";
import { isPushSupported, registerServiceWorker, getPushSubscription, subscribePush, unsubscribePush } from "./services/push";
import LoginScreen from "./components/auth/LoginScreen";
import AppShell from "./components/layout/AppShell";
import OrdersPage from "./components/orders/OrdersPage";
import OrderDetail from "./components/orders/OrderDetail";
import NewOrderModal from "./components/orders/NewOrderModal";
import ReportsView from "./components/reports/ReportsView";
import SlaSettingsModal from "./components/settings/SlaSettingsModal";
import CatalogModal from "./components/settings/CatalogModal";
import Toast from "./components/ui/Toast";
import BoardView from "./components/board/BoardView";

// Modo tablero (TV): /tablero o /tablero?etapa=bodega
const IS_BOARD = window.location.pathname.replace(/\/+$/, "") === "/tablero";
const BOARD_REFRESH_MS = 30000; // respaldo: la TV recarga los pedidos aunque Realtime no esté activo

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
  const [catalogModal, setCatalogModal] = useState(null); // "origins" | "carriers" | null
  const [origins, setOrigins] = useState([]); // null = no se pudieron cargar
  const [carriers, setCarriers] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [lastUpdate, setLastUpdate] = useState(null);
  const ordersRef = useRef(orders); // versión más reciente, para guardados en segundo plano (borradores)
  ordersRef.current = orders;

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
    if (data) { setOrders(data); setLastUpdate(Date.now()); }
  }

  async function loadCatalog(kind) {
    const items = await fetchCatalog(kind);
    (kind === "origins" ? setOrigins : setCarriers)(items);
  }

  async function loadSlaSettings() {
    const sla = await fetchSlaSettings();
    if (sla) setSlaSettings(sla);
  }

  useEffect(() => {
    if (!session) return;
    loadOrders();
    loadSlaSettings();
    if (!IS_BOARD) { loadCatalog("origins"); loadCatalog("carriers"); }
    const unsubscribe = subscribeToChanges({ onOrders: loadOrders, onSettings: loadSlaSettings });
    const poll = IS_BOARD ? setInterval(() => { loadOrders(); loadSlaSettings(); }, BOARD_REFRESH_MS) : null;
    return () => { unsubscribe(); if (poll) clearInterval(poll); };
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

  // Catálogos de Configuración: orígenes de venta y transportadoras
  async function handleCreateCatalogItem(kind, name) {
    const { error } = await createCatalogItem(kind, name, session.user.id);
    if (error) { notify(error.code === "23505" ? "Ya existe una opción con ese nombre." : SAVE_ERROR, "error"); return false; }
    await loadCatalog(kind);
    notify(`“${name}” agregado.`);
    return true;
  }

  async function handleUpdateCatalogItem(kind, id, changes) {
    const { error } = await updateCatalogItem(kind, id, changes);
    if (error) { notify(error.code === "23505" ? "Ya existe una opción con ese nombre." : SAVE_ERROR, "error"); return false; }
    await loadCatalog(kind);
    return true;
  }

  // Despacho: recogido por la transportadora, pendiente de guía (el SLA sigue contando)
  async function handleSetPickup(pending, transportadora) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.setPickupPending(order, pending, transportadora, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(pending ? `Registrado: ${order.id} recogido por ${transportadora}, guía pendiente.` : `Se desmarcó "recogido, pendiente de guía" en ${order.id}.`);
  }

  // Borrador de la etapa activa (guardado automático, sin aviso; solo avisa si falla)
  async function handleSaveDraft(orderId, stageId, draft) {
    const order = ordersRef.current.find((o) => o.id === orderId);
    if (!order || order.status !== "abierto" || order.current_stage !== stageId) return { error: null };
    const { error, stages } = await ordersApi.saveStageDraft(order, stageId, draft);
    if (!error) setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, stages } : o)));
    return { error };
  }

  // Pago y preventa (cualquier etapa)
  async function handleSetPaid(paid) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.setPaid(order, paid, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(paid ? `Pedido ${order.id} marcado como pagado.` : `Se desmarcó el pago de ${order.id}.`);
  }

  async function handleSetProof(path) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.setPaymentProof(order, path, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(path ? "Comprobante de pago cargado." : "Comprobante de pago quitado.");
  }

  // Stand by: congela el SLA hasta reanudar (la preventa es un stand by automático)
  async function handlePause(reason) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.pauseOrder(order, reason, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(`Pedido ${order.id} en stand by: su SLA quedó congelado.`);
  }

  async function handleResume() {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.resumeOrder(order, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(`Pedido ${order.id} reanudado: el SLA de ${STAGES[order.current_stage - 1].short} sigue desde donde quedó.`);
  }

  async function handleFinalizeStage(stageId, data) {
    const order = orders.find((o) => o.id === selectedId);
    if (!order) return;
    const { error } = await ordersApi.finalizeStage(order, stageId, data, session.user.email);
    if (error) { notify(SAVE_ERROR, "error"); return; }
    await loadOrders();
    notify(stageId === 1 && data.preventa
      ? `Etapa Ingreso finalizada: ${order.id} queda en stand by hasta que llegue la mercancía (preventa).`
      : stageId < 4 ? `Etapa ${STAGES[stageId - 1].short} finalizada: ${order.id} pasó a ${STAGES[stageId].short}.` : `Pedido ${order.id} entregado y cerrado.`);
  }

  if (session === undefined) {
    return <LoadingShell />;
  }

  if (!session) {
    return <LoginScreen onAuthed={setSession} />;
  }

  if (IS_BOARD) {
    return <BoardView orders={orders} slaSettings={slaSettings} now={now} lastUpdate={lastUpdate}
      onExit={() => { window.location.href = "/"; }} />;
  }

  const selected = orders.find((o) => o.id === selectedId);
  const alertsCount = orders.filter((o) => isAtRisk(slaStatus(o, slaSettings, now))).length;

  return (
    <>
      <AppShell
        email={session.user.email} page={page} ordersView={ordersTab} alertsCount={alertsCount}
        orders={orders} slaSettings={slaSettings} now={now} search={search} onSearch={setSearch}
        onNavigate={navigate} onOpenOrder={openOrder} onOpenSla={() => setShowSlaSettings(true)} onOpenOrigins={() => setCatalogModal("origins")} onOpenCarriers={() => setCatalogModal("carriers")}
        pushEnabled={pushEnabled} onTogglePush={togglePush} onLogout={() => auth.signOut()}>
        {page === "reports" ? (
          <ReportsView orders={orders} slaSettings={slaSettings} now={now} onOpenOrder={openOrder} />
        ) : selected ? (
          <OrderDetail order={selected} now={now} slaSettings={slaSettings} origins={origins} carriers={carriers} onSetPickup={handleSetPickup} onBack={() => setSelectedId(null)}
            onFinalizeStage={handleFinalizeStage} onCancelOrder={handleCancelOrder} onEditStage={handleEditStage}
            onSetPaid={handleSetPaid} onSetProof={handleSetProof} onPause={handlePause} onResume={handleResume}
            onSaveDraft={(stageId, draft) => handleSaveDraft(selected.id, stageId, draft)} />
        ) : (
          <OrdersPage orders={orders} now={now} slaSettings={slaSettings} tab={ordersTab} onTabChange={setOrdersTab}
            search={search} onSearch={setSearch} onOpen={openOrder} onNew={() => setShowNewOrder(true)} />
        )}
      </AppShell>

      {showNewOrder && <NewOrderModal onClose={() => setShowNewOrder(false)} onCreate={handleCreate} />}
      {catalogModal && (
        <CatalogModal kind={catalogModal} items={(catalogModal === "origins" ? origins : carriers) || []} onClose={() => setCatalogModal(null)}
          onCreate={(name) => handleCreateCatalogItem(catalogModal, name)} onUpdate={(id, changes) => handleUpdateCatalogItem(catalogModal, id, changes)} />
      )}
      {showSlaSettings && <SlaSettingsModal current={slaSettings} onClose={() => setShowSlaSettings(false)} onSave={handleSaveSlaSettings} />}
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
