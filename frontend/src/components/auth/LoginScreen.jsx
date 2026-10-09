import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp } from "../../services/auth";
import Button from "../ui/Button";

// Mensajes de Supabase Auth traducidos (llegan en inglés)
function friendlyError(err) {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (msg.includes("email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
  if (msg.includes("already registered")) return "Ya existe una cuenta con este correo. Inicia sesión.";
  if (msg.includes("password should be")) return "La contraseña debe tener al menos 6 caracteres.";
  if (msg.includes("valid email") || msg.includes("invalid email")) return "Escribe un correo válido.";
  if (msg.includes("fetch") || msg.includes("network")) return "Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
  return "No pudimos iniciar sesión. Inténtalo de nuevo.";
}

/* ============ LOGIN / SIGNUP (Supabase Auth) ============ */
export default function LoginScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-9 h-9 rounded-[10px] bg-topbar text-white grid place-items-center text-[16px] font-extrabold">S</span>
          <div>
            <p className="text-[16px] font-bold tracking-tight leading-tight">SIGTOC</p>
            <p className="text-[12.5px] text-ink2 leading-tight">Trazabilidad y auditoría de pedidos</p>
          </div>
        </div>
        <form onSubmit={submit} className="card p-6 space-y-4" noValidate>
          <h1 className="text-[18px] font-bold tracking-tight">{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h1>
          <div>
            <label className="label" htmlFor="email">Correo</label>
            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email"
              className="field" placeholder="tucorreo@empresa.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <div className="relative">
              <input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="field pr-11" placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-0 top-0 h-full w-11 grid place-items-center text-ink2 hover:text-ink">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          {error && <p className="text-[13px] font-medium text-crit" role="alert">{error}</p>}
          {info && <p className="text-[13px] font-medium text-ok" role="status">{info}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" busy={busy}>
            {mode === "login" ? "Ingresar" : "Crear cuenta"}
          </Button>
        </form>
        <p className="text-center text-[13px] text-ink2 mt-4">
          {mode === "login" ? "¿Primera vez?" : "¿Ya tienes cuenta?"}{" "}
          <button type="button" className="font-semibold text-link hover:underline"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}>
            {mode === "login" ? "Crea tu cuenta" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
