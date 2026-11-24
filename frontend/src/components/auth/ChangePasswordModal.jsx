import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { changePassword } from "../../services/auth";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

const MIN = 8;

// Cada usuario cambia la contraseña temporal que le entregó el administrador
export default function ChangePasswordModal({ onClose, notify }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const problem = password.length < MIN ? `Usa al menos ${MIN} caracteres.` : password !== confirm ? "Las contraseñas no coinciden." : "";

  async function save(e) {
    e.preventDefault();
    if (problem) { setError(problem); return; }
    setBusy(true); setError("");
    const { error: err } = await changePassword(password);
    setBusy(false);
    if (err) {
      setError(/different|same/i.test(err.message || "") ? "La nueva contraseña debe ser distinta a la actual." : "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
      return;
    }
    notify("Contraseña actualizada.");
    onClose();
  }

  return (
    <Modal title="Cambiar contraseña" subtitle="La usarás desde tu próximo inicio de sesión, en todos tus dispositivos." onClose={onClose}>
      <form onSubmit={save} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="new-password">Nueva contraseña</label>
          <div className="relative">
            <input id="new-password" autoFocus type={show ? "text" : "password"} autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} className="field pr-11" placeholder={`Mínimo ${MIN} caracteres`} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-0 top-0 h-full w-11 grid place-items-center text-ink2 hover:text-ink">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="confirm-password">Repite la contraseña</label>
          <input id="confirm-password" type={show ? "text" : "password"} autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} className="field" />
        </div>
        {error && <p className="text-[13px] font-medium text-crit" role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" busy={busy}>Guardar contraseña</Button>
          <Button type="button" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
