import React from "react";
import { C, FONT_MONO } from "../../../styles/tokens";
import DocLink from "../../documents/DocLink";

export default function StageDataView({ stageId, data }) {
  if (!data) return <p className="text-xs" style={{ color: C.inkFaint }}>Sin datos.</p>;
  if (stageId === 1) {
    return (
      <div className="space-y-2 text-xs">
        <DocLink label="PDF del pedido" path={data.pdfPath} />
        <DocLink label="RUT" path={data.rutPath} />
      </div>
    );
  }
  if (stageId === 2) {
    const list = data.serialesList?.length ? data.serialesList : (data.seriales && data.seriales !== "Sin serial" ? data.seriales.split(",").map((s) => s.trim()).filter(Boolean) : []);
    return (
      <div className="text-xs">
        <p style={{ color: C.inkSoft }} className="mb-1.5">Seriales{list.length > 1 ? ` (${list.length})` : ""}:</p>
        {list.length === 0 ? (
          <span style={{ color: C.ink }}>{data.seriales || "—"}</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            {list.map((s, i) => (
              <span key={i} className="px-2.5 py-1.5 rounded font-medium" style={{ backgroundColor: C.paperDark, color: C.ink, fontFamily: FONT_MONO }}>{s}</span>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (stageId === 3) return <p className="text-xs"><span style={{ color: C.inkSoft }}>Factura: </span><span style={{ color: C.ink }}>{data.factura || "—"}</span></p>;
  return (
    <div className="space-y-1.5 text-xs">
      <p><span style={{ color: C.inkSoft }}>Modo de entrega: </span><span style={{ color: C.ink }}>{data.modo === "tienda" ? "Entrega en tienda" : "Envío con guía"}</span></p>
      {data.modo !== "tienda" && (
        <>
          <p><span style={{ color: C.inkSoft }}>Número de guía: </span><span style={{ color: C.ink }}>{data.guiaNumero || "—"}</span></p>
          <DocLink label="Archivo de guía" path={data.guiaFilePath} />
        </>
      )}
    </div>
  );
}
