import React from "react";
import { ExternalLink } from "lucide-react";
import { openDocument } from "../../services/storage";
import Button from "../ui/Button";

export default function DocLink({ label, path, emptyText = "—" }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span><span className="text-ink2">{label}: </span>{path ? "Cargado" : emptyText}</span>
      {path && <Button size="sm" icon={ExternalLink} onClick={() => openDocument(path)} className="flex-none" aria-label={`Ver ${label}`}>Ver</Button>}
    </div>
  );
}
