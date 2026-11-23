// Respaldo de SIGTOC: exporta las tablas y descarga los archivos del bucket a una carpeta local
// (idealmente sincronizada con Google Drive). Los backups de Supabase solo cubren la base de datos:
// los archivos (PDF, guías, comprobantes) únicamente quedan respaldados con este script.
//
// Uso:   node backup.mjs            → exporta tablas + descarga archivos nuevos o cambiados
//        node backup.mjs --full     → revisa todas las carpetas del bucket, no solo las de pedidos recientes
// Configuración: backup.env junto a este archivo (copiar de backup.env.example). Solo necesita Node 18+.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TABLES = ["orders", "app_settings", "sale_origins", "carriers"];
const BUCKET = "pedido-pdfs";
const PAGE = 1000;

// ---------- configuración ----------
function loadEnv(file) {
  if (!fs.existsSync(file)) throw new Error(`No existe ${file}. Copia backup.env.example a backup.env y complétalo.`);
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
const DIR = env.BACKUP_DIR;
const KEEP = Number(env.KEEP_EXPORTS || 12);
if (!URL_BASE || !KEY || !DIR) throw new Error("backup.env debe tener SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y BACKUP_DIR.");

const FULL = process.argv.includes("--full");
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const dataDir = path.join(DIR, "datos");
const filesDir = path.join(DIR, "archivos");
const manifestFile = path.join(DIR, "manifiesto.json");
const logFile = path.join(DIR, "backup.log");

function log(msg) {
  const line = `${new Date().toISOString()}  ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + "\n");
}

async function http(url, init = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
      if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
      return res;
    } catch (err) {
      if (attempt >= 3) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// ---------- tablas ----------
async function fetchTable(table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await http(`${URL_BASE}/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

function pruneExports() {
  const files = fs.readdirSync(dataDir).filter((f) => /^sigtoc-.*\.json$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.unlinkSync(path.join(dataDir, f));
}

// ---------- archivos ----------
async function listFolder(prefix) {
  const items = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await http(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: PAGE, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const page = await res.json();
    items.push(...page);
    if (page.length < PAGE) return items;
  }
}

async function downloadFile(objectPath, dest) {
  const res = await http(`${URL_BASE}/storage/v1/object/${BUCKET}/${objectPath.split("/").map(encodeURIComponent).join("/")}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + ".part";
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, dest);
}

// ---------- principal ----------
async function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(filesDir, { recursive: true });
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : { files: {}, lastRun: null };
  const startedAt = new Date().toISOString();
  log(`Inicio del respaldo${FULL ? " (completo)" : ""}`);

  // 1) Tablas → un JSON por respaldo
  const tables = {};
  for (const t of TABLES) tables[t] = await fetchTable(t);
  const stamp = startedAt.slice(0, 16).replace(/[:T]/g, "-");
  fs.writeFileSync(path.join(dataDir, `sigtoc-${stamp}.json`), JSON.stringify({ exportedAt: startedAt, tables }, null, 1));
  pruneExports();
  log(`Tablas exportadas: ${TABLES.map((t) => `${t} ${tables[t].length}`).join(", ")}`);

  // 2) Archivos: carpetas de pedidos modificados desde el último respaldo (o todas, la primera vez o con --full)
  const since = !FULL && manifest.lastRun ? new Date(manifest.lastRun).getTime() - 24 * 3600e3 : 0; // 1 día de margen
  const folders = since
    ? tables.orders.filter((o) => new Date(o.updated_at || o.created_at).getTime() >= since).map((o) => o.id)
    : (await listFolder("")).filter((i) => i.id === null).map((i) => i.name);

  let downloaded = 0, unchanged = 0;
  for (const folder of folders) {
    for (const item of await listFolder(folder)) {
      if (item.id === null) continue; // subcarpeta (no se usan)
      const objectPath = `${folder}/${item.name}`;
      const version = item.updated_at || item.metadata?.lastModified || "";
      const dest = path.join(filesDir, ...objectPath.split("/"));
      if (manifest.files[objectPath] === version && fs.existsSync(dest)) { unchanged++; continue; }
      await downloadFile(objectPath, dest);
      manifest.files[objectPath] = version;
      downloaded++;
    }
  }

  manifest.lastRun = startedAt;
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
  log(`Archivos: ${downloaded} descargados, ${unchanged} sin cambios, ${folders.length} carpetas revisadas. Respaldo terminado.`);
}

main().catch((err) => {
  try { log(`ERROR: ${err.message}`); } catch { console.error(err); }
  process.exit(1);
});
