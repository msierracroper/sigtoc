import { supabase } from "../lib/supabaseClient";
import { STAGES } from "../constants/stages";
import { nowIso, fmtMinutes } from "../utils/format";

export const PREORDER_REASON = "Preventa: esperando la llegada de la mercancía";

function makeOrderId(existingCount) {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `PED-${year}-${String(existingCount + 1).padStart(4, "0")}-${rand}`;
}

// Devuelve null si falla
export async function fetchOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: true });
  if (error) return null;
  return data || [];
}

export async function createOrder({ cliente, user, slaSettings, existingCount }) {
  const ts = nowIso();
  const id = makeOrderId(existingCount);
  const newOrder = {
    id,
    cliente: cliente || "Cliente sin nombre",
    created_by: user.id,
    created_by_email: user.email,
    status: "abierto",
    current_stage: 1,
    sla_config: slaSettings,
    stages: {
      1: { startedAt: ts, completedAt: null, data: {} },
      2: { startedAt: null, completedAt: null, data: {} },
      3: { startedAt: null, completedAt: null, data: {} },
      4: { startedAt: null, completedAt: null, data: {} },
    },
    audit_log: [{ ts, user: user.email, action: "Pedido creado. Registro de auditoría iniciado." }],
    whatsapp_log: [{ ts, text: "Pedido registrado. Auditoría en curso." }],
  };
  const { error } = await supabase.from("orders").insert(newOrder);
  return { id, error };
}

// Finalizar por anomalía (motivo obligatorio)
export async function cancelOrder(order, reason, userEmail) {
  const ts = nowIso();
  const cancel_info = { reason, by: userEmail, at: ts };
  // si estaba en stand by, la pausa se cierra con la cancelación
  const n = order.current_stage;
  const pauses = order.stages[n]?.pauses;
  const stages = pauses?.length && !pauses[pauses.length - 1].until
    ? { ...order.stages, [n]: { ...order.stages[n], pauses: [...pauses.slice(0, -1), { ...pauses[pauses.length - 1], until: ts, resumedBy: userEmail }] } }
    : order.stages;
  const audit_log = [...order.audit_log, {
    ts, user: userEmail,
    action: `Pedido finalizado por anomalía en etapa ${order.current_stage} (${STAGES[order.current_stage - 1].name}). Motivo: ${reason}`,
  }];
  const whatsapp_log = [...order.whatsapp_log, { ts, text: `Pedido ${order.id} finalizado por anomalía: ${reason}` }];
  const { error } = await supabase.from("orders")
    .update({ status: "cancelado", cancel_info, audit_log, whatsapp_log, stages })
    .eq("id", order.id);
  return { error };
}

// Edita una etapa ya completada: el dato anterior se guarda en editHistory (v1, v2...)
export async function editStage(order, stageId, newData, userEmail) {
  const ts = nowIso();
  const currentStage = order.stages[stageId];
  const editHistory = [
    ...(currentStage.editHistory || []),
    { data: currentStage.data, editedAt: ts, editedBy: userEmail, version: (currentStage.editHistory?.length || 0) + 1 },
  ];
  const stages = { ...order.stages, [stageId]: { ...currentStage, data: newData, editHistory } };
  const newVersion = editHistory.length + 1;
  const audit_log = [...order.audit_log, {
    ts, user: userEmail,
    action: `Etapa ${stageId} (${STAGES[stageId - 1].name}) editada. Ahora en versión v${newVersion}.`,
  }];
  const { error } = await supabase.from("orders").update({ stages, audit_log }).eq("id", order.id);
  return { error };
}

// Completa la etapa activa y arranca la siguiente (o cierra el pedido en la etapa 4)
export async function finalizeStage(order, stageId, data, userEmail) {
  const ts = nowIso();
  const stageRest = { ...order.stages[stageId] };
  delete stageRest.draft; // el borrador ya no hace falta al finalizar
  const stages = { ...order.stages, [stageId]: { ...stageRest, completedAt: ts, data } };
  let current_stage = order.current_stage;
  let status = order.status;
  const audit_log = [...order.audit_log];
  const whatsapp_log = [...order.whatsapp_log];
  // Preventa: al terminar Ingreso el pedido pasa a Bodega pero queda en stand by hasta que llegue la mercancía
  const holdForPreorder = stageId === 1 && !!data.preventa;

  const messages = {
    1: `Pedido ${order.id} creado. Archivos PDF y RUT cargados correctamente.`,
    2: `Seriales de ${order.id} adjuntados: ${data.seriales}.`,
    3: `Pedido ${order.id} facturado. Factura N.º ${data.factura}.`,
    4: `Pedido ${order.id} entregado. Proceso cerrado y auditado.`,
  };
  audit_log.push({ ts, user: userEmail, action: `Etapa ${stageId} (${STAGES[stageId - 1].name}) finalizada.` + (stageId === 1 && data.origen ? ` Origen: ${data.origen}.` : "") });
  whatsapp_log.push({ ts, text: messages[stageId] });

  if (holdForPreorder) {
    current_stage = 2;
    stages[2] = { ...stages[2], startedAt: ts, pauses: [{ since: ts, until: null, reason: PREORDER_REASON, kind: "preventa", by: userEmail }] };
    audit_log.push({ ts, user: userEmail, action: `Pedido en stand by en etapa 2 (Bodega). Motivo: ${PREORDER_REASON}` });
    whatsapp_log.push({ ts, text: `Pedido ${order.id} en espera: preventa, se procesará cuando llegue la mercancía.` });
  } else if (stageId < 4) {
    current_stage = stageId + 1;
    stages[current_stage] = { ...stages[current_stage], startedAt: ts };
  } else {
    status = "cerrado";
  }

  const { error } = await supabase.from("orders")
    .update({ stages, current_stage, status, audit_log, whatsapp_log })
    .eq("id", order.id);
  return { error };
}

// Borrador de la etapa activa: lo que se lleva capturado antes de "Finalizar" (se guarda solo,
// sin auditoría; la auditoría registra la finalización). Vive en stages[n].draft.
export async function saveStageDraft(order, stageId, draft) {
  const stages = { ...order.stages, [stageId]: { ...order.stages[stageId], draft: { ...draft, savedAt: nowIso() } } };
  const { error } = await supabase.from("orders").update({ stages }).eq("id", order.id);
  return { error, stages };
}

// Despacho: la transportadora ya recogió el pedido pero la guía llega después (el SLA sigue contando).
// Queda en stages[4].pickup y en la auditoría.
export async function setPickupPending(order, pending, transportadora, userEmail) {
  const ts = nowIso();
  const prev = order.stages[4]?.pickup || {};
  const pickup = pending
    ? { awaitingGuide: true, at: ts, by: userEmail, transportadora }
    : { ...prev, awaitingGuide: false, clearedAt: ts, clearedBy: userEmail };
  const stages = { ...order.stages, 4: { ...order.stages[4], pickup } };
  const audit_log = [...order.audit_log, { ts, user: userEmail, action: pending
    ? `Pedido recogido por ${transportadora}; pendiente de recibir la guía.`
    : "Se desmarcó \"Recogido, pendiente de guía\"." }];
  const whatsapp_log = pending ? [...order.whatsapp_log, { ts, text: `Pedido ${order.id} recogido por ${transportadora}. Guía pendiente.` }] : order.whatsapp_log;
  const { error } = await supabase.from("orders").update({ stages, audit_log, whatsapp_log }).eq("id", order.id);
  return { error };
}

// Stand by: congela el SLA de la etapa activa hasta que se reanude. Motivo obligatorio.
export async function pauseOrder(order, reason, userEmail) {
  const ts = nowIso();
  const n = order.current_stage;
  const stage = order.stages[n];
  const stages = { ...order.stages, [n]: { ...stage, pauses: [...(stage.pauses || []), { since: ts, until: null, reason, kind: "manual", by: userEmail }] } };
  const audit_log = [...order.audit_log, { ts, user: userEmail, action: `Pedido en stand by en etapa ${n} (${STAGES[n - 1].name}). Motivo: ${reason}` }];
  const whatsapp_log = [...order.whatsapp_log, { ts, text: `Pedido ${order.id} en stand by: ${reason}` }];
  const { error } = await supabase.from("orders").update({ stages, audit_log, whatsapp_log }).eq("id", order.id);
  return { error };
}

// Reanuda el flujo: cierra la pausa abierta; el SLA sigue desde donde quedó
export async function resumeOrder(order, userEmail) {
  const ts = nowIso();
  const n = order.current_stage;
  const stage = order.stages[n];
  const pauses = [...(stage.pauses || [])];
  const open = pauses[pauses.length - 1];
  if (!open || open.until) return { error: null };
  pauses[pauses.length - 1] = { ...open, until: ts, resumedBy: userEmail };
  const minutes = (new Date(ts) - new Date(open.since)) / 60000;
  const stages = { ...order.stages, [n]: { ...stage, pauses } };
  const what = open.kind === "preventa" ? "Llegó la mercancía de preventa; se reanuda Bodega" : "Pedido reanudado";
  const audit_log = [...order.audit_log, { ts, user: userEmail, action: `${what}. Estuvo en stand by ${fmtMinutes(minutes)}.` }];
  const whatsapp_log = [...order.whatsapp_log, { ts, text: open.kind === "preventa" ? `Llegó la mercancía del pedido ${order.id}. Pasa a Bodega.` : `Pedido ${order.id} reanudado.` }];
  const { error } = await supabase.from("orders").update({ stages, audit_log, whatsapp_log }).eq("id", order.id);
  return { error };
}

// Marca o desmarca el pago (cualquier etapa). Queda en la auditoría quién lo hizo.
export async function setPaid(order, paid, userEmail) {
  const ts = nowIso();
  const payment = { ...(order.payment || {}), paid, paidBy: paid ? userEmail : null, paidAt: paid ? ts : null };
  const audit_log = [...order.audit_log, { ts, user: userEmail, action: paid ? "Pedido marcado como pagado." : "Se desmarcó el pago del pedido." }];
  const whatsapp_log = paid ? [...order.whatsapp_log, { ts, text: `Pago del pedido ${order.id} confirmado.` }] : order.whatsapp_log;
  const { error } = await supabase.from("orders").update({ payment, audit_log, whatsapp_log }).eq("id", order.id);
  return { error };
}

// Guarda (o quita, con path = null) el comprobante de pago
export async function setPaymentProof(order, path, userEmail) {
  const ts = nowIso();
  const payment = { ...(order.payment || {}), proofPath: path, proofBy: path ? userEmail : null, proofAt: path ? ts : null };
  const audit_log = [...order.audit_log, { ts, user: userEmail, action: path ? "Comprobante de pago cargado." : "Se quitó el comprobante de pago." }];
  const { error } = await supabase.from("orders").update({ payment, audit_log }).eq("id", order.id);
  return { error };
}
