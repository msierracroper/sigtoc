import React from "react";
import { STAGES } from "../../constants/stages";
import { fmtShort } from "../../utils/format";
import StageDataView from "./stages/StageDataView";
import { itemsFromData, stageDataFromItems } from "../../utils/items";

// Convierte el borrador de una etapa a la misma forma de sus datos finalizados (para mostrarlo con StageDataView)
function draftAsData(stageId, d) {
  if (!d) return null;
  if (stageId === 2) {
    const data = stageDataFromItems(itemsFromData(d), d.sinSerial);
    return data.items.length || d.sinSerial ? data : null;
  }
  if (stageId === 4) {
    if (!d.guiaNumero && !d.guiaFilePath && d.modoEntrega !== "tienda") return null;
    return { modo: d.modoEntrega, transportadora: d.transportadora || null, guiaNumero: d.guiaNumero || null, guiaFilePath: d.guiaFilePath || null };
  }
  if (stageId === 3) return d.factura ? { factura: d.factura } : null;
  return d.origen || d.pdfPath || d.rutPath ? { origen: d.origen, preventa: d.preventa, pdfPath: d.pdfPath, rutPath: d.rutPath } : null;
}

// Resumen de solo lectura de todo lo registrado en el pedido: etapas completadas + lo capturado en la etapa actual.
// Sirve para validar un pedido detenido (stand by o anomalía) sin tener que abrir etapa por etapa.
export default function OrderDataSummary({ order }) {
  const blocks = [];
  for (const s of STAGES) {
    const st = order.stages[s.id];
    if (!st) continue;
    if (st.completedAt) blocks.push({ s, data: st.data, note: `Completada ${fmtShort(st.completedAt)}` });
    else if (s.id === order.current_stage) {
      const data = draftAsData(s.id, st.draft);
      if (data) blocks.push({ s, data, note: "Capturado hasta ahora (sin finalizar)" });
    }
  }

  return (
    <section aria-label="Datos registrados en el pedido">
      <h3 className="font-semibold mb-2">Datos registrados</h3>
      {blocks.length === 0 ? (
        <p className="text-ink2 text-[13.5px]">Aún no hay datos capturados en este pedido.</p>
      ) : (
        <ol className="space-y-2.5">
          {blocks.map(({ s, data, note }) => (
            <li key={s.id} className="rounded-xl p-3.5 shadow-[inset_0_0_0_1px_#E3E3E3]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-1">
                <p className="font-semibold text-[13.5px]">Etapa {s.id} · {s.short}</p>
                <p className="text-[12px] text-ink2 num">{note}</p>
              </div>
              <div className="text-[13.5px] sm:text-[13px]"><StageDataView stageId={s.id} data={data} /></div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
