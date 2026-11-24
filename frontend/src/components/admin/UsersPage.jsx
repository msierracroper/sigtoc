import React, { useEffect, useState } from "react";
import { Users, RefreshCw } from "lucide-react";
import { fetchUsers, setUserRole, ROLES } from "../../services/roles";
import { fmtShort } from "../../utils/format";
import Button from "../ui/Button";

// Roles de los usuarios (solo administradores). Las cuentas se crean en Supabase → Authentication;
// toda cuenta nueva entra como operador. Cada cambio de rol queda en Actividad.
export default function UsersPage({ myId, notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  async function load() {
    setLoading(true);
    setUsers(await fetchUsers());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function change(u, role) {
    setSaving(u.user_id);
    const { error } = await setUserRole(u.user_id, role);
    setSaving(null);
    if (error) {
      notify(/administrador/.test(error.message || "") ? "Debe quedar al menos un administrador." : "No se pudo cambiar el rol.", "error");
      return;
    }
    setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? { ...x, role } : x)));
    notify(`${u.email} ahora es ${ROLES[role].toLowerCase()}.`);
  }

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[20px] font-bold tracking-tight mr-auto">Usuarios</h1>
        <Button size="sm" icon={RefreshCw} busy={loading} onClick={load}>Actualizar</Button>
      </div>
      <div className="card p-4 text-[13.5px] text-ink2 space-y-1">
        <p><b className="font-semibold text-ink">Administrador:</b> todo, incluida la configuración (SLA, orígenes de venta, transportadoras), los usuarios y la actividad.</p>
        <p><b className="font-semibold text-ink">Operador:</b> todo el flujo de pedidos (crear, avanzar etapas, pagos, stand by, correcciones) y los reportes, sin tocar la configuración.</p>
      </div>

      <div className="card">
        {users === null ? (
          <p className="p-6 text-crit">No se pudieron cargar los usuarios.</p>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-ink2"><Users size={26} className="mx-auto mb-2 text-ink3" />{loading ? "Cargando…" : "No hay usuarios."}</div>
        ) : (
          <ul>
            {users.map((u) => (
              <li key={u.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-line2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{u.email}{u.user_id === myId && <span className="font-normal text-ink2"> (tú)</span>}</p>
                  <p className="text-[12px] text-ink2 num">Desde {fmtShort(u.created_at)}</p>
                </div>
                <select value={u.role} disabled={saving === u.user_id} onChange={(e) => change(u, e.target.value)}
                  className="field w-auto min-w-[170px]" aria-label={`Rol de ${u.email}`}>
                  {Object.entries(ROLES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[12.5px] text-ink2">Para crear una cuenta: Supabase → Authentication → Users → Add user. Entra como operador y aquí le cambias el rol si hace falta.</p>
    </div>
  );
}
