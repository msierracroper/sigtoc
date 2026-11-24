import React, { useEffect, useState } from "react";
import { Users, RefreshCw, UserPlus, Pencil, KeyRound, Ban, CheckCircle2, Trash2, Copy, Check } from "lucide-react";
import { listUsers, createUser, updateUser, resetPassword, setUserActive, deleteUser } from "../../services/adminUsers";
import { ROLES } from "../../services/roles";
import { isValidEmail } from "../../utils/validation";
import { fmtShort } from "../../utils/format";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

// ---------- crear / editar ----------
function UserFormModal({ user, isSelf, onClose, onSave }) {
  const [nombre, setNombre] = useState(user?.nombre || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState(user?.role || "operador");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editing = !!user;

  async function submit(e) {
    e.preventDefault();
    if (!isValidEmail(email)) { setError("Escribe un correo válido."); return; }
    setBusy(true); setError("");
    const err = await onSave({ nombre: nombre.trim(), email: email.trim().toLowerCase(), role });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Modal title={editing ? "Editar usuario" : "Nuevo usuario"} onClose={onClose}
      subtitle={editing ? user.email : "Se crea con una contraseña temporal que verás al guardar."}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="u-nombre">Nombre</label>
          <input id="u-nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className="field" placeholder="Ej: Laura Gómez" />
        </div>
        <div>
          <label className="label" htmlFor="u-email">Correo <span className="text-crit">*</span></label>
          <input id="u-email" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="persona@empresa.com" />
          {editing && <p className="text-[12.5px] text-ink2 mt-1.5">Es con el que inicia sesión. Si lo cambias, debe usar el nuevo desde ya.</p>}
        </div>
        <div>
          <label className="label" htmlFor="u-rol">Rol</label>
          <select id="u-rol" value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf} className="field">
            {Object.entries(ROLES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          {isSelf && <p className="text-[12.5px] text-ink2 mt-1.5">No puedes cambiar tu propio rol.</p>}
        </div>
        {error && <p className="text-[13px] font-medium text-crit" role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" busy={busy}>{editing ? "Guardar cambios" : "Crear usuario"}</Button>
          <Button type="button" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- contraseña temporal (se muestra una sola vez) ----------
function PasswordModal({ email, password, created, onClose }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* el texto queda visible para copiarlo a mano */ }
  }
  return (
    <Modal title={created ? "Usuario creado" : "Contraseña restablecida"} subtitle={email} onClose={onClose}
      footer={<Button variant="primary" onClick={onClose}>Listo</Button>}>
      <p className="text-[13.5px]">Contraseña temporal:</p>
      <div className="flex items-center gap-2 mt-2">
        <code className="flex-1 text-[20px] font-semibold tracking-wide bg-surface2 rounded-lg px-3 py-2.5 num select-all">{password}</code>
        <Button icon={copied ? Check : Copy} onClick={copy}>{copied ? "Copiada" : "Copiar"}</Button>
      </div>
      <p className="text-[12.5px] text-ink2 mt-3">Entrégasela a la persona por un medio privado. Al entrar, debe cambiarla en el menú de su cuenta → <b className="font-semibold">Cambiar contraseña</b>. Por seguridad no se vuelve a mostrar.</p>
    </Modal>
  );
}

// ---------- confirmación ----------
function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant={danger ? "critical" : "primary"} busy={busy} onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}>{confirmLabel}</Button>
      </>}>
      <p className="text-[13.5px]">{message}</p>
    </Modal>
  );
}

// Módulo de usuarios (solo administradores): crear, editar, restablecer contraseña, desactivar y eliminar.
// Lo hace la Edge Function admin-users; cada acción queda en Actividad a nombre del admin.
export default function UsersPage({ myId, notify }) {
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type, user?, password?, created? }

  async function load() {
    setLoading(true);
    const { data, error } = await listUsers();
    setLoading(false);
    setLoadError(error || "");
    if (data) setUsers(data.users);
  }
  useEffect(() => { load(); }, []);

  const close = () => setModal(null);

  async function saveNew(form) {
    const { data, error } = await createUser(form);
    if (error) return error;
    await load();
    setModal({ type: "password", created: true, user: { email: form.email }, password: data.password });
    if (data.warning) notify(data.warning, "error");
    return null;
  }

  async function saveEdit(user, form) {
    const changes = {};
    if (form.nombre !== (user.nombre || "")) changes.nombre = form.nombre;
    if (form.email !== user.email) changes.email = form.email;
    if (form.role !== user.role) changes.role = form.role;
    if (!Object.keys(changes).length) { close(); return null; }
    const { error } = await updateUser(user.id, changes);
    if (error) return error;
    await load(); close();
    notify(`Usuario ${form.email} actualizado.`);
    return null;
  }

  async function doReset(user) {
    const { data, error } = await resetPassword(user.id);
    if (error) { notify(error, "error"); close(); return; }
    setModal({ type: "password", created: false, user, password: data.password });
  }

  async function doActive(user, active) {
    const { error } = await setUserActive(user.id, active);
    close();
    if (error) { notify(error, "error"); return; }
    await load();
    notify(active ? `${user.email} puede volver a entrar.` : `${user.email} ya no puede iniciar sesión.`);
  }

  async function doDelete(user) {
    const { error } = await deleteUser(user.id);
    close();
    if (error) { notify(error, "error"); return; }
    await load();
    notify(`Usuario ${user.email} eliminado.`);
  }

  const name = (u) => u.nombre || u.email;

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[20px] font-bold tracking-tight mr-auto">Usuarios</h1>
        <Button size="sm" icon={RefreshCw} busy={loading} onClick={load}>Actualizar</Button>
        <Button variant="primary" icon={UserPlus} onClick={() => setModal({ type: "new" })}>Nuevo usuario</Button>
      </div>
      <div className="card p-4 text-[13.5px] text-ink2 space-y-1">
        <p><b className="font-semibold text-ink">Administrador:</b> todo, incluidos los reportes, la configuración (SLA, orígenes de venta, transportadoras), los usuarios y la actividad.</p>
        <p><b className="font-semibold text-ink">Operador:</b> todo el flujo de pedidos (crear, avanzar etapas, pagos, stand by, guías, correcciones, finalizar por anomalía con su motivo). No ve reportes ni configuración.</p>
      </div>

      {loadError && <p className="text-[13px] text-crit" role="alert">{loadError}</p>}

      <div className="card">
        {users.length === 0 ? (
          <div className="text-center py-12 text-ink2"><Users size={26} className="mx-auto mb-2 text-ink3" />{loading ? "Cargando…" : "No hay usuarios."}</div>
        ) : (
          <ul>
            {users.map((u) => {
              const self = u.id === myId;
              return (
                <li key={u.id} className={`flex flex-col lg:flex-row lg:items-center gap-2.5 px-4 py-3 border-b border-line2 last:border-0 ${u.active ? "" : "bg-surface2/60"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold truncate">{name(u)}{self && <span className="font-normal text-ink2"> (tú)</span>}</p>
                      <Badge tone={u.role === "admin" ? "info" : "neutral"}>{ROLES[u.role]}</Badge>
                      {!u.active && <Badge tone="warning" icon={Ban}>Desactivado</Badge>}
                    </div>
                    <p className="text-[12.5px] text-ink2 truncate">{u.nombre ? `${u.email} · ` : ""}<span className="num">{u.last_sign_in_at ? `Último ingreso ${fmtShort(u.last_sign_in_at)}` : "Nunca ha ingresado"}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" icon={Pencil} onClick={() => setModal({ type: "edit", user: u })}>Editar</Button>
                    {!self && <>
                      <Button size="sm" icon={KeyRound} onClick={() => setModal({ type: "reset", user: u })}>Restablecer contraseña</Button>
                      {u.active
                        ? <Button size="sm" icon={Ban} onClick={() => setModal({ type: "deactivate", user: u })}>Desactivar</Button>
                        : <Button size="sm" icon={CheckCircle2} onClick={() => doActive(u, true)}>Reactivar</Button>}
                      <Button size="sm" variant="criticalOutline" icon={Trash2} onClick={() => setModal({ type: "delete", user: u })}>Eliminar</Button>
                    </>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modal?.type === "new" && <UserFormModal onClose={close} onSave={saveNew} />}
      {modal?.type === "edit" && <UserFormModal user={modal.user} isSelf={modal.user.id === myId} onClose={close} onSave={(f) => saveEdit(modal.user, f)} />}
      {modal?.type === "password" && <PasswordModal email={modal.user.email} password={modal.password} created={modal.created} onClose={close} />}
      {modal?.type === "reset" && (
        <ConfirmModal title="Restablecer contraseña" confirmLabel="Restablecer" onClose={close} onConfirm={() => doReset(modal.user)}
          message={`Se genera una contraseña temporal nueva para ${name(modal.user)} y la actual deja de funcionar.`} />
      )}
      {modal?.type === "deactivate" && (
        <ConfirmModal title="Desactivar usuario" confirmLabel="Desactivar" onClose={close} onConfirm={() => doActive(modal.user, false)}
          message={`${name(modal.user)} no podrá iniciar sesión hasta que lo reactives. Su historial queda intacto. Es la opción recomendada cuando alguien sale de la empresa.`} />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal danger title="Eliminar usuario" confirmLabel="Eliminar definitivamente" onClose={close} onConfirm={() => doDelete(modal.user)}
          message={`Se borra la cuenta de ${name(modal.user)} y no se puede deshacer. Lo que registró en los pedidos y la auditoría se conserva con su correo. Si solo quieres quitarle el acceso, usa Desactivar.`} />
      )}
    </div>
  );
}
