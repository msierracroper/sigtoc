import React, { useEffect, useState } from "react";
import { Users, RefreshCw, UserPlus, Pencil, KeyRound, Ban, CheckCircle2, Trash2, Copy, Check, Eye, EyeOff, Wand2 } from "lucide-react";
import { listUsers, createUser, updateUser, resetPassword, setUserActive, deleteUser } from "../../services/adminUsers";
import { ROLES } from "../../services/roles";
import { isValidEmail } from "../../utils/validation";
import { fmtShort } from "../../utils/format";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

const MIN_PASSWORD = 8;

// Contraseña legible (sin 0/O, 1/l/I): ej. Kp7m-Qx3a-Zr9w
function generatePassword() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const c = [...crypto.getRandomValues(new Uint32Array(12))].map((n) => abc[n % abc.length]).join("");
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}

// Campo de contraseña que pone el admin. Vacío = el sistema genera una temporal.
function PasswordField({ id, value, onChange }) {
  const [show, setShow] = useState(false);
  const short = value && value.length < MIN_PASSWORD;
  return (
    <div>
      <label className="label" htmlFor={id}>Contraseña</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input id={id} type={show ? "text" : "password"} autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)}
            className="field pr-11" placeholder={`Mínimo ${MIN_PASSWORD} caracteres`} aria-invalid={short || undefined} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-0 top-0 h-full w-11 grid place-items-center text-ink2 hover:text-ink">
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <Button type="button" icon={Wand2} onClick={() => { onChange(generatePassword()); setShow(true); }}>Generar</Button>
      </div>
      <p className={`text-[12.5px] mt-1.5 ${short ? "text-crit" : "text-ink2"}`}>
        {short ? `Usa al menos ${MIN_PASSWORD} caracteres.` : "Si la dejas vacía se genera una temporal. La persona puede cambiarla después en el menú de su cuenta."}
      </p>
    </div>
  );
}

// ---------- crear / editar ----------
function UserFormModal({ user, isSelf, onClose, onSave }) {
  const [nombre, setNombre] = useState(user?.nombre || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState(user?.role || "operador");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editing = !!user;

  async function submit(e) {
    e.preventDefault();
    if (!isValidEmail(email)) { setError("Escribe un correo válido."); return; }
    if (!editing && password && password.length < MIN_PASSWORD) { setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`); return; }
    setBusy(true); setError("");
    const err = await onSave({ nombre: nombre.trim(), email: email.trim().toLowerCase(), role, ...(editing ? {} : { password }) });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Modal title={editing ? "Editar usuario" : "Nuevo usuario"} onClose={onClose}
      subtitle={editing ? user.email : "Puedes escribirle una contraseña o dejar que el sistema genere una."}>
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
        {!editing && <PasswordField id="u-password" value={password} onChange={setPassword} />}
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
      <p className="text-[13.5px]">Contraseña para iniciar sesión:</p>
      <div className="flex items-center gap-2 mt-2">
        <code className="flex-1 text-[20px] font-semibold tracking-wide bg-surface2 rounded-lg px-3 py-2.5 num select-all">{password}</code>
        <Button icon={copied ? Check : Copy} onClick={copy}>{copied ? "Copiada" : "Copiar"}</Button>
      </div>
      <p className="text-[12.5px] text-ink2 mt-3">Entrégasela a la persona por un medio privado. Al entrar, debe cambiarla en el menú de su cuenta → <b className="font-semibold">Cambiar contraseña</b>. Por seguridad no se vuelve a mostrar.</p>
    </Modal>
  );
}

// ---------- restablecer contraseña ----------
function ResetModal({ user, onClose, onReset }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const invalid = password && password.length < MIN_PASSWORD;
  return (
    <Modal title="Restablecer contraseña" subtitle={user.nombre ? `${user.nombre} · ${user.email}` : user.email} onClose={onClose}
      footer={<>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" busy={busy} disabled={invalid} onClick={async () => { setBusy(true); await onReset(password); setBusy(false); }}>Restablecer</Button>
      </>}>
      <p className="text-[13.5px] mb-4">La contraseña actual deja de funcionar.</p>
      <PasswordField id="reset-password" value={password} onChange={setPassword} />
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

  async function doReset(user, password) {
    const { data, error } = await resetPassword(user.id, password);
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
      {modal?.type === "reset" && <ResetModal user={modal.user} onClose={close} onReset={(pw) => doReset(modal.user, pw)} />}
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
