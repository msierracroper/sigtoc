import React from "react";
import DocLink from "../../documents/DocLink";

export default function StageDataView({ stageId, data }) {
  if (!data || Object.keys(data).length === 0) return <p className="text-ink2">Sin datos.</p>;
  if (stageId === 1) {
    return (
      <div>
        <DocLink label="PDF del pedido" path={data.pdfPath} />
        <DocLink label="RUT" path={data.rutPath} emptyText="No adjuntado" />
      </div>
    );
  }
  if (stageId === 2) {
    const list = data.serialesList?.length ? data.serialesList : (data.seriales && data.seriales !== "Sin serial" ? data.seriales.split(",").map((s) => s.trim()).filter(Boolean) : []);
    return (
      <div>
        <p className="text-ink2 mb-1.5">Seriales{list.length > 1 ? ` (${list.length})` : ""}</p>
        {list.length === 0 ? (
          <p>{data.seriales || "—"}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {list.map((s, i) => <li key={i} className="px-2 py-1 rounded-md bg-surface2 shadow-[inset_0_0_0_1px_#EBEBEB] font-medium num">{s}</li>)}
          </ul>
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
          <p><span className="text-ink2">Número de guía: </span>{data.guiaNumero || "—"}</p>
          <DocLink label="Archivo de guía" path={data.guiaFilePath} />
        </>
      )}
    </div>
  );
}
