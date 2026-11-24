import { createClient } from "npm:@supabase/supabase-js@2";

// Administración de cuentas (solo admin): listar, crear, editar, restablecer contraseña,
// desactivar/reactivar y eliminar. Necesita la service_role (nunca va al navegador), por eso vive aquí.
// Cada acción queda en activity_log a nombre del admin que la hizo. Los cambios de rol se hacen con
// la sesión del admin para que el trigger de auditoría de roles registre quién fue.
//   POST { action: "list" | "create" | "update" | "reset" | "setActive" | "delete", ... }
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BAN_FOREVER = "876000h"; // ~100 años: "desactivado"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fail = (message: string, status = 400) => json({ error: message }, status);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "operador"];

// Contraseña temporal legible (sin 0/O, 1/l/I): ej. Kp7m-Qx3a-Zr9w
const MIN_PASSWORD = 8;

// Contraseña que escribe el admin, o una temporal generada si la deja vacía
function chosenPassword(value: unknown): { password?: string; error?: string } {
  const typed = String(value ?? "").trim();
  if (!typed) return { password: tempPassword() };
  if (typed.length < MIN_PASSWORD) return { error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  return { password: typed };
}

function tempPassword() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  const chars = [...bytes].map((b) => abc[b % abc.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    // Cliente con la sesión del admin: lo que haga pasa por RLS y los triggers ven quién es
    const asCaller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });

    const { data: me } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (!me?.user) return fail("unauthorized", 401);
    const { data: myRole } = await admin.from("user_roles").select("role").eq("user_id", me.user.id).maybeSingle();
    if (myRole?.role !== "admin") return fail("Solo un administrador puede administrar usuarios.", 403);
    const actor = me.user.email || "admin";

    const log = (entityId: string | null, action: string) =>
      admin.from("activity_log").insert({ user_id: me.user.id, user_email: actor, entity: "users", entity_id: entityId, action });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "list") {
      const { data: page, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const { data: roles } = await admin.from("user_roles").select("user_id, role, nombre");
      const byId = new Map((roles || []).map((r) => [r.user_id, r]));
      const users = page.users.map((u) => ({
        id: u.id,
        email: u.email,
        nombre: byId.get(u.id)?.nombre || u.user_metadata?.nombre || "",
        role: byId.get(u.id)?.role || "operador",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        active: !u.banned_until || new Date(u.banned_until) < new Date(),
      })).sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email, "es"));
      return json({ users });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const nombre = String(body.nombre || "").trim();
      const role = ROLES.includes(body.role) ? body.role : "operador";
      if (!EMAIL_RE.test(email)) return fail("Correo inválido.");
      const { password, error: pwErr } = chosenPassword(body.password);
      if (pwErr) return fail(pwErr);
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } });
      if (error) return fail(/already|registered|exists/i.test(error.message) ? "Ya existe una cuenta con ese correo." : error.message);
      // La base crea el rol como operador al registrar la cuenta; se completa con nombre y rol
      const { error: roleErr } = await asCaller.from("user_roles").update({ nombre, role }).eq("user_id", data.user.id);
      await log(data.user.id, `Usuario creado: ${nombre ? `${nombre} (${email})` : email}, rol ${role}.`);
      return json({ id: data.user.id, password, warning: roleErr ? "La cuenta se creó, pero no se pudo asignar el rol." : null });
    }

    const id = String(body.id || "");
    if (!id) return fail("Falta el usuario.");
    const { data: target, error: targetErr } = await admin.auth.admin.getUserById(id);
    if (targetErr || !target?.user) return fail("Usuario no encontrado.", 404);
    const who = target.user.email;
    const self = id === me.user.id;

    if (action === "update") {
      const changes: string[] = [];
      const roleRow: Record<string, string> = {};
      const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : who;
      if (email !== who) {
        if (!EMAIL_RE.test(email)) return fail("Correo inválido.");
        const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
        if (error) return fail(/already|registered|exists/i.test(error.message) ? "Ya existe una cuenta con ese correo." : error.message);
        roleRow.email = email;
        changes.push(`correo ${who} → ${email}`);
      }
      if (body.nombre !== undefined) {
        const nombre = String(body.nombre).trim();
        await admin.auth.admin.updateUserById(id, { user_metadata: { ...target.user.user_metadata, nombre } });
        roleRow.nombre = nombre;
        changes.push(`nombre "${nombre}"`);
      }
      if (body.role !== undefined && ROLES.includes(body.role)) {
        if (self && body.role !== "admin") return fail("No puedes quitarte el rol de administrador a ti mismo.");
        roleRow.role = body.role; // el trigger de roles registra el cambio a nombre del admin
      }
      if (Object.keys(roleRow).length) {
        const { error } = await asCaller.from("user_roles").update(roleRow).eq("user_id", id);
        if (error) return fail(/administrador/.test(error.message) ? "Debe quedar al menos un administrador." : error.message);
      }
      if (changes.length) await log(id, `Usuario ${who} editado: ${changes.join(", ")}.`);
      return json({ ok: true });
    }

    if (action === "reset") {
      if (self) return fail("Para tu propia cuenta usa “Cambiar contraseña” en el menú de tu cuenta.");
      const { password, error: pwErr } = chosenPassword(body.password);
      if (pwErr) return fail(pwErr);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) throw error;
      await log(id, `Contraseña restablecida para ${who}.`); // la contraseña nunca se registra
      return json({ password });
    }

    // Quitar de en medio al último admin dejaría el sistema sin quien lo administre
    async function isLastAdmin() {
      const { data: role } = await admin.from("user_roles").select("role").eq("user_id", id).maybeSingle();
      if (role?.role !== "admin") return false;
      const { count } = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
      return (count || 0) <= 1;
    }

    if (action === "setActive") {
      if (self) return fail("No puedes desactivar tu propia cuenta.");
      const active = !!body.active;
      if (!active && await isLastAdmin()) return fail("Debe quedar al menos un administrador activo.");
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : BAN_FOREVER });
      if (error) throw error;
      await log(id, `Usuario ${who} ${active ? "reactivado" : "desactivado (no puede iniciar sesión)"}.`);
      return json({ ok: true });
    }

    if (action === "delete") {
      if (self) return fail("No puedes eliminar tu propia cuenta.");
      if (await isLastAdmin()) return fail("Debe quedar al menos un administrador.");
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return fail(/administrador/.test(error.message) ? "Debe quedar al menos un administrador." : error.message);
      await log(id, `Usuario eliminado: ${who}. Sus registros en pedidos y auditoría se conservan.`);
      return json({ ok: true });
    }

    return fail("Acción no válida.");
  } catch (err) {
    return fail(String((err as Error)?.message || err).slice(0, 300), 500);
  }
});
