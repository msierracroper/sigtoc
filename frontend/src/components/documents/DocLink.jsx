import React from "react";
import { ExternalLink } from "lucide-react";
import { openDocument } from "../../services/storage";

export default function DocLink({ label, path, emptyText = "—" }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span><span className="text-ink2">{label}: </span>{path ? "Cargado" : emptyText}</span>
      {path && (
        <button onClick={() => openDocument(path)} className="h-8 flex items-center gap-1 font-semibold text-link flex-none">
          Ver <ExternalLink size={13} />
        </button>
      )}
    </div>
  );
}
