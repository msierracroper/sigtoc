import React, { useState } from "react";
import { Plus, Pencil, Eye, EyeOff, Check, X } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

// Administración de un catálogo (orígenes de venta, transportadoras…). Una opción no se borra: se oculta,
// para no romper los pedidos que la usan.
export const CATALOGS = {
  origins: {
    title: "Orígenes de venta",
    subtitle: "Opciones del campo “Origen de la venta” en la Etapa 1.",
    newLabel: "Nuevo origen",
    placeholder: "Ej: WhatsApp, Mercado Libre…",
    empty: "Aún no hay orígenes. Agrega el primero arriba.",
    duplicate: "Ya existe un origen con ese nombre.",
    footer: "Los orígenes ocultos no aparecen al crear pedidos, pero se conservan en los pedidos que ya los usan. Renombrar no cambia los pedidos anteriores.",
  },
  carriers: {
    title: "Transportadoras",
    subtitle: "Opciones del campo “Transportadora” en la Etapa 4 (Despacho).",
    newLabel: "Nueva transportadora",
    placeholder: "Ej: Deprisa, TCC…",
    empty: "Aún no hay transportadoras. Agrega la primera arriba.",
    duplicate: "Ya existe una transportadora con ese nombre.",
    footer: "Las transportadoras ocultas no aparecen al despachar, pero se conservan en los pedidos que ya las usan. Renombrar no cambia los pedidos anteriores.",
  },
};

export default function CatalogModal({ kind, items: origins, onClose, onCreate, onUpdate }) {
  const t = CATALOGS[kind];
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name }
  const exists = (n, exceptId) => origins.some((o) => o.id !== exceptId && o.name.trim().toLowerCase() === n.trim().toLowerCase());

  async function add(e) {
    e?.preventDefault();
    if (!name.trim() || exists(name)) return;
    setBusy(true);
    const ok = await onCreate(name.trim());
    setBusy(false);
    if (ok) setName("");
  }

  async function saveRename() {
    if (!editing.name.trim() || exists(editing.name, editing.id)) return;
    const ok = await onUpdate(editing.id, { name: editing.name.trim() });
    if (ok) setEditing(null);
  }

  return (
    <Modal title={t.title} subtitle={t.subtitle} onClose={onClose}>
      <form onSubmit={add} className="flex gap-2">
        <label className="sr-only" htmlFor="new-catalog-item">{t.newLabel}</label>
        <input id="new-catalog-item" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.placeholder} className="field flex-1" />
        <Button type="submit" variant="primary" icon={Plus} disabled={!name.trim() || exists(name)} busy={busy}>Agregar</Button>
      </form>
      {name.trim() && exists(name) && <p className="text-[12.5px] text-crit mt-1.5" role="alert">{t.duplicate}</p>}

      <ul className="mt-4 divide-y divide-line2">
        {origins.length === 0 && <li className="py-6 text-center text-ink2">{t.empty}</li>}
        {origins.map((o) => (
          <li key={o.id} className="py-2.5 flex items-center gap-2">
            {editing?.id === o.id ? (
              <>
                <input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") { e.stopPropagation(); setEditing(null); } }}
                  aria-label={`Nuevo nombre para ${o.name}`} className="field flex-1" />
                <Button size="sm" iconOnly icon={Check} variant="primary" aria-label="Guardar nombre" onClick={saveRename} disabled={!editing.name.trim() || exists(editing.name, o.id)} />
                <Button size="sm" iconOnly icon={X} aria-label="Cancelar" onClick={() => setEditing(null)} />
              </>
            ) : (
              <>
                <span className={`flex-1 font-medium ${o.active ? "" : "text-ink3"}`}>{o.name}</span>
                {!o.active && <Badge tone="neutral">Oculto</Badge>}
                <Button size="sm" icon={Pencil} onClick={() => setEditing({ id: o.id, name: o.name })} aria-label={`Renombrar ${o.name}`}>Renombrar</Button>
                <Button size="sm" icon={o.active ? EyeOff : Eye} onClick={() => onUpdate(o.id, { active: !o.active })}>{o.active ? "Ocultar" : "Mostrar"}</Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[12.5px] text-ink2 mt-3">{t.footer}</p>
    </Modal>
  );
}
