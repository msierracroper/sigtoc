import React from "react";
import { ExternalLink } from "lucide-react";
import { C } from "../../styles/tokens";
import { openDocument } from "../../services/storage";

export default function DocLink({ label, path }) {
  return (
    <p className="flex items-center justify-between gap-2">
      <span><span style={{ color: C.inkSoft }}>{label}: </span><span style={{ color: C.ink }}>{path ? "Cargado" : label === "RUT" ? "No adjuntado" : "—"}</span></span>
      {path && (
        <button onClick={() => openDocument(path)} className="flex items-center gap-1 text-[11px] font-semibold flex-shrink-0" style={{ color: C.steel }}>
          Ver <ExternalLink size={11} />
        </button>
      )}
    </p>
  );
}
