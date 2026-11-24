// Crea las cuentas de SIGTOC desde un CSV (se puede guardar desde Excel) con su rol y una
// contraseña temporal para cada una. Cada persona la cambia en la app: menú de la cuenta → Cambiar contraseña.
//
// Uso:   node crear-usuarios.mjs usuarios.csv              → simulación: valida el archivo, no crea nada
//        node crear-usuarios.mjs usuarios.csv --confirmar  → crea las cuentas
// CSV (separado por coma o punto y coma, con encabezado):  nombre;correo;rol
//   rol: admin u operador (vacío = operador). Ver usuarios.ejemplo.csv.
// Resultado: usuarios-creados-<fecha>.csv junto al CSV de entrada, con las contraseñas temporales.
// Ese archivo contiene contraseñas: entrégalas y bórralo.
// Usa la misma configuración que el respaldo (backup.env: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(file) {
  if (!fs.existsSync(file)) { console.error(`No existe ${file}. Copia backup.env.example a backup.env y complétalo.`); process.exit(1); }
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
const env = loadEnv(path.join(HERE, "backup.env"));
const URL_BASE = (env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) { console.error("backup.env debe tener SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const [csvPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const CONFIRM = process.argv.includes("--confirmar");
if (!csvPath || !fs.existsSync(csvPath)) { console.error("Uso: node crear-usuarios.mjs usuarios.csv [--confirmar]"); process.exit(1); }

// ---------- leer el CSV ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_ALIASES = { "": "operador", operador: "operador", operadora: "operador", admin: "admin", administrador: "admin", administradora: "admin" };

function parseCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const cells = (l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const head = cells(lines[0]).map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const col = (names) => head.findIndex((h) => names.includes(h));
  const iName = col(["nombre", "name"]), iMail = col(["correo", "email", "correo electronico", "e-mail"]), iRole = col(["rol", "role"]);
  if (iMail < 0) throw new Error("El CSV necesita una columna 'correo'.");
  return lines.slice(1).map((l, n) => {
    const c = cells(l);
    return { fila: n + 2, nombre: iName >= 0 ? c[iName] || "" : "", correo: (c[iMail] || "").toLowerCase(), rolTexto: iRole >= 0 ? (c[iRole] || "").toLowerCase() : "" };
  });
}

// Contraseña temporal legible (sin 0/O, 1/l/I): ej. Kp7m-Qx3a-Zr9w
function tempPassword() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const pick = () => Array.from({ length: 4 }, () => abc[crypto.randomInt(abc.length)]).join("");
  return `${pick()}-${pick()}-${pick()}`;
}

async function api(url, init) {
  const res = await fetch(url, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const seen = new Set();
  const problems = [];
  for (const r of rows) {
    r.rol = ROLE_ALIASES[r.rolTexto];
    if (!EMAIL_RE.test(r.correo)) problems.push(`Fila ${r.fila}: correo inválido "${r.correo}".`);
    else if (seen.has(r.correo)) problems.push(`Fila ${r.fila}: ${r.correo} está repetido.`);
    if (!r.rol) problems.push(`Fila ${r.fila}: rol "${r.rolTexto}" no válido (usa admin u operador).`);
    seen.add(r.correo);
  }
  console.log(`${rows.length} usuarios en el archivo: ${rows.filter((r) => r.rol === "admin").length} admin, ${rows.filter((r) => r.rol === "operador").length} operador.`);
  if (problems.length) { console.error("Corrige el archivo antes de continuar:\n  " + problems.join("\n  ")); process.exit(1); }
  if (!rows.some((r) => r.rol === "admin")) console.log("Aviso: nadie queda como admin en este archivo.");
  if (!CONFIRM) { console.log("Archivo válido. Nada se creó. Para crear las cuentas agrega --confirmar."); return; }

  const results = [];
  for (const r of rows) {
    const password = tempPassword();
    const created = await api(`${URL_BASE}/auth/v1/admin/users`, {
      method: "POST",
      body: JSON.stringify({ email: r.correo, password, email_confirm: true, user_metadata: { nombre: r.nombre } }),
    });
    if (!created.ok) {
      const exists = /already|registered|exists/i.test(JSON.stringify(created.body));
      results.push({ ...r, password: "", estado: exists ? "Ya existía (no se cambió su contraseña ni su rol)" : `Error: ${created.body.msg || created.body.message || created.status}` });
      continue;
    }
    // La base crea el rol como operador al registrar la cuenta; aquí se asigna el del archivo
    let estado = "Creado";
    if (r.rol === "admin") {
      const upd = await api(`${URL_BASE}/rest/v1/user_roles?user_id=eq.${created.body.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
      if (!upd.ok) estado = "Creado, pero no se pudo poner como admin (¿se corrió el script de roles?)";
    }
    results.push({ ...r, password, estado });
    console.log(`${r.correo}: ${estado}`);
  }

  const out = path.join(path.dirname(path.resolve(csvPath)), `usuarios-creados-${new Date().toISOString().slice(0, 10)}.csv`);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  fs.writeFileSync(out, "﻿" + ["nombre;correo;rol;contraseña temporal;estado", ...results.map((r) => [r.nombre, r.correo, r.rol, r.password, r.estado].map(esc).join(";"))].join("\r\n"));
  console.log(`\nListo: ${results.filter((r) => r.estado.startsWith("Creado")).length} cuentas creadas. Contraseñas en ${out}`);
  console.log("Entrega a cada persona su contraseña temporal, pídele que la cambie al entrar y borra ese archivo.");
}

main().catch((err) => { console.error(`ERROR: ${err.message}`); process.exit(1); });
