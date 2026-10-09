import React, { useState } from "react";
import { ClipboardList, Lock, Mail } from "lucide-react";
import { C, FONT_MONO } from "../../styles/tokens";
import { signIn, signUp } from "../../services/auth";

/* ============ LOGIN / SIGNUP (Supabase Auth) ============ */
export default function LoginScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setInfo(""); setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await signUp(email, password);
        if (err) throw err;
        if (data.session) onAuthed(data.session);
        else setInfo("Cuenta creada. Si tu proyecto exige confirmación, revisa tu correo antes de iniciar sesión.");
      } else {
        const { data, error: err } = await signIn(email, password);
        if (err) throw err;
        onAuthed(data.session);
      }
    } catch (err) {
      setError(err.message || "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: C.paperDark }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded mb-3" style={{ backgroundColor: C.steelDark }}>
            <ClipboardList size={22} color="#fff" />
          </div>
          <h1 className="text-lg font-bold" style={{ color: C.ink, fontFamily: FONT_MONO }}>SIGTOC</h1>
          <p className="text-xs mt-1" style={{ color: C.inkSoft }}>Trazabilidad y auditoría de pedidos</p>
        </div>
        <form onSubmit={submit} className="rounded-lg p-6 space-y-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-1.5" style={{ color: C.inkSoft }}>
              <Mail size={12} /> Correo
            </label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              className="w-full text-sm px-3 py-2 rounded outline-none" style={{ border: `1px solid ${C.line}` }} placeholder="tucorreo@empresa.com" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-1.5" style={{ color: C.inkSoft }}>
              <Lock size={12} /> Contraseña
            </label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
              className="w-full text-sm px-3 py-2 rounded outline-none" style={{ border: `1px solid ${C.line}` }} placeholder="Mínimo 6 caracteres" />
          </div>
          {error && <p className="text-xs font-medium" style={{ color: C.alert }}>{error}</p>}
          {info && <p className="text-xs font-medium" style={{ color: C.ok }}>{info}</p>}
          <button type="submit" disabled={busy} className="w-full py-2.5 rounded text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: C.steel }}>
            {busy ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
            className="w-full text-[11px] text-center" style={{ color: C.inkSoft }}>
            {mode === "login" ? "¿Primera vez? Crea tu cuenta" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
