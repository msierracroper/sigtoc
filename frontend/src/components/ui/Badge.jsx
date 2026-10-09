import React from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { fmtMinutes } from "../../utils/format";

const TONES = {
  critical: "bg-critBg text-crit",
  warning: "bg-warnBg text-warn",
  success: "bg-okBg text-ok",
  neutral: "bg-neutralBg text-neutral",
  info: "bg-infoBg text-info",
};

export default function Badge({ tone = "neutral", icon: Icon, children, title, className = "" }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 h-[22px] px-2 rounded-lg text-[12px] font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}>
      {Icon && <Icon size={13} strokeWidth={2.4} />}
      {children}
    </span>
  );
}

// Estado de SLA de un pedido abierto. El color nunca va solo: siempre lleva ícono + texto.
export function SlaBadge({ sla, compact }) {
  if (!sla) return null;
  if (sla.state === "excedido") {
    return <Badge tone="critical" icon={AlertCircle} title={`Superó el límite de ${sla.limitMin} min`}>{compact ? "Excedido" : `Excedido +${fmtMinutes(-sla.remainingMin)}`}</Badge>;
  }
  if (sla.state === "alerta") {
    return <Badge tone="warning" icon={AlertTriangle} title="Por vencer: superó el 75 % del límite de la etapa">{compact ? "Por vencer" : `Vence en ${fmtMinutes(sla.remainingMin)}`}</Badge>;
  }
  return <Badge tone="success">En tiempo</Badge>;
}

// Estado general del pedido (cerrado / anomalía / en proceso)
export function OrderStatusBadge({ order, sla }) {
  if (order.status === "cerrado") return <Badge tone="neutral">Entregado</Badge>;
  if (order.status === "cancelado") return <Badge tone="neutral">Anomalía</Badge>;
  return <SlaBadge sla={sla} />;
}
