import { FileText, Warehouse, Receipt, Truck } from "lucide-react";

// Las 4 etapas del flujo de un pedido (el id coincide con las claves de orders.stages)
export const STAGES = [
  { id: 1, name: "Ingreso de Pedido", short: "Ingreso", icon: FileText, desc: "PDF del pedido + RUT" },
  { id: 2, name: "Bodega", short: "Bodega", icon: Warehouse, desc: "Verificación de seriales" },
  { id: 3, name: "Facturación", short: "Facturación", icon: Receipt, desc: "Número de factura" },
  { id: 4, name: "Despacho y Entrega", short: "Despacho", icon: Truck, desc: "Guía o entrega en tienda" },
];

// SLA por defecto (minutos por etapa) mientras carga app_settings
export const DEFAULT_SLA = { 1: 30, 2: 45, 3: 20, 4: 60 };
