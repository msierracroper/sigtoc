import React from "react";
import DocLink from "../../documents/DocLink";
import { itemsFromData } from "../../../utils/items";
import { fmtShort, shortUser } from "../../../utils/format";

export default function StageDataView({ stageId, data }) {
  if (!data || Object.keys(data).length === 0) return <p className="text-ink2">Sin datos.</p>;
  if (stageId === 1) {
    return (
      <div>
        <p className="py-1.5"><span className="text-ink2">Origen de la venta: </span>{data.origen || "—"}</p>
        {data.preventa && <p className="py-1.5"><span className="text-ink2">Tipo: </span>Preventa</p>}
        <DocLink label="PDF del pedido" path={data.pdfPath} />
        <DocLink label="RUT" path={data.rutPath} emptyText="No adjuntado" />
      </div>
    );
  }
  if (stageId === 2) {
    const items = itemsFromData(data);
    return (
      <div>
        <p className="text-ink2 mb-1.5">Artículos{items.length > 1 ? ` (${items.length})` : ""}</p>
        {items.length === 0 ? (
          <p>{data.seriales || "—"}</p>
        ) : (
          <table className="w-full max-w-md text-[13px] num">
            <thead><tr className="text-left text-[12px] text-ink2">
              <th className="font-semibold bg-surface2 px-2.5 py-1.5 rounded-l-md">Referencia</th>
              <th className="font-semibold bg-surface2 px-2.5 py-1.5 rounded-r-md">Serial</th>
            </tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-line2 last:border-0">
                  <td className="px-2.5 py-1.5 font-semibold uppercase">{it.ref || <span className="text-ink3 font-normal normal-case">—</span>}</td>
                  <td className="px-2.5 py-1.5 font-medium">{it.serial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
  if (stageId === 3) return <p><span className="text-ink2">Factura: </span>{data.factura || "—"}</p>;
  return (
    <div className="space-y-1">
      <p><span className="text-ink2">Modo de entrega: </span>{data.modo === "tienda" ? "Entrega en tienda" : "Envío con guía"}</p>
      {data.modo !== "tienda" && (
        <>
          <p><span className="text-ink2">Transportadora: </span>{data.transportadora || "—"}</p>
          {data.recogidoSinGuia && (
            <p className="text-[12.5px] text-ink2 num">Recogido antes de recibir la guía: {fmtShort(data.recogidoSinGuia.at)} · marcado por {shortUser(data.recogidoSinGuia.by)}</p>
          )}
          <p><span className="text-ink2">Número de guía: </span>{data.guiaNumero || "—"}</p>
          <DocLink label="Archivo de guía" path={data.guiaFilePath} />
        </>
      )}
    </div>
  );
}
