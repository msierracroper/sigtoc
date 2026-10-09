import { supabase } from "../lib/supabaseClient";
import { STAGES } from "../constants/stages";
import { nowIso } from "../utils/format";

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
  const audit_log = [...order.audit_log, {
    ts, user: userEmail,
    action: `Pedido finalizado por anomalía en etapa ${order.current_stage} (${STAGES[order.current_stage - 1].name}). Motivo: ${reason}`,
  }];
  const whatsapp_log = [...order.whatsapp_log, { ts, text: `Pedido ${order.id} finalizado por anomalía: ${reason}` }];
  const { error } = await supabase.from("orders")
    .update({ status: "cancelado", cancel_info, audit_log, whatsapp_log })
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
  const stages = { ...order.stages, [stageId]: { ...order.stages[stageId], completedAt: ts, data } };
  let current_stage = order.current_stage;
  let status = order.status;
  const audit_log = [...order.audit_log];
  const whatsapp_log = [...order.whatsapp_log];

  const messages = {
    1: `Pedido ${order.id} creado. Archivos PDF y RUT cargados correctamente.`,
    2: `Seriales de ${order.id} adjuntados: ${data.seriales}.`,
    3: `Pedido ${order.id} facturado. Factura N.º ${data.factura}.`,
    4: `Pedido ${order.id} entregado. Proceso cerrado y auditado.`,
  };
  audit_log.push({ ts, user: userEmail, action: `Etapa ${stageId} (${STAGES[stageId - 1].name}) finalizada.` });
  whatsapp_log.push({ ts, text: messages[stageId] });

  if (stageId < 4) {
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
