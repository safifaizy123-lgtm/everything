const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4173);
const HOST = "0.0.0.0";
const APP_USER = process.env.APP_USER || "owner";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const ROOT = __dirname;
const PRIVATE_DIR = path.join(ROOT, ".private");
const KEY_FILE = path.join(PRIVATE_DIR, "keys.json");
const DEMO_FILE = path.join(PRIVATE_DIR, "saved-demos.json");
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml" };

if (!APP_PASSWORD) {
  console.error("Set APP_PASSWORD before starting the hosted app.");
  process.exit(1);
}

fs.mkdirSync(PRIVATE_DIR, { recursive: true, mode: 0o700 });
try { fs.chmodSync(PRIVATE_DIR, 0o700); } catch {}
if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, "{}", { mode: 0o600 });
if (!fs.existsSync(DEMO_FILE)) fs.writeFileSync(DEMO_FILE, "[]", { mode: 0o600 });
try { fs.chmodSync(KEY_FILE, 0o600); fs.chmodSync(DEMO_FILE, 0o600); } catch {}

function send(res, status, body, type="application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options":"nosniff", "Cache-Control":"no-store" });
  res.end(Buffer.isBuffer(body) ? body : (typeof body === "string" ? body : JSON.stringify(body)));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; if (data.length > 100000) reject(new Error("Request too large")); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { reject(new Error("Invalid JSON")); } });
  });
}
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writePrivate(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
}
function mask(value) {
  if (!value) return "";
  if (value.length < 9) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}
const server = http.createServer(async (req, res) => {
  const auth = req.headers.authorization || "";
  const expected = "Basic " + Buffer.from(`${APP_USER}:${APP_PASSWORD}`).toString("base64");
  if (auth !== expected) {
    res.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="Product Suite", charset="UTF-8"',
      "Cache-Control": "no-store"
    });
    return res.end("Authentication required.");
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && origin !== `http://${req.headers.host}`) {
    return send(res, 403, { error:"Cross-origin requests are not allowed." });
  }
  if (req.method === "GET" && url.pathname === "/api/status") {
    return send(res, 200, { helper:"running", mode:"hosted-preview", liveIntegrations:"not enabled in this starter build" });
  }
  if (req.method === "GET" && url.pathname === "/api/keys") {
    return send(res, 200, {});
  }
  if (req.method === "POST" && url.pathname === "/api/keys") {
    return send(res, 403, { error:"API-key storage is disabled in this hosted preview. Do not enter provider keys here." });
  }
  if (req.method === "POST" && url.pathname === "/api/demos") {
    try {
      const body = await readBody(req);
      const demos = readJson(DEMO_FILE, []);
      const item = { id:crypto.randomUUID(), name:String(body.name || "My demo").slice(0,80), createdAt:new Date().toISOString(), snapshot:body.snapshot || {} };
      demos.unshift(item);
      writePrivate(DEMO_FILE, demos.slice(0,20));
      return send(res, 200, item);
    } catch (e) { return send(res, 400, { error:e.message }); }
  }
  if (req.method === "GET" && url.pathname === "/api/demos") return send(res, 200, readJson(DEMO_FILE, []));
  if (req.method === "DELETE" && url.pathname.startsWith("/api/demos/")) {
    const id = url.pathname.split("/").pop();
    const demos = readJson(DEMO_FILE, []).filter(d => d.id !== id);
    writePrivate(DEMO_FILE, demos);
    return send(res, 200, { ok:true });
  }
  if (req.method === "POST" && url.pathname === "/api/live-action") {
    return send(res, 403, { error:"Live actions are disabled in this starter build. No money was spent and nothing was sent or published." });
  }
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith("/.private") || pathname.startsWith("/node_modules")) return send(res, 404, "Not found", "text/plain; charset=utf-8");
  if (pathname === "/") pathname = "/index.html";
  const target = path.normalize(path.join(ROOT, pathname));
  if (!target.startsWith(ROOT + path.sep) && target !== path.join(ROOT, "index.html")) return send(res, 403, "Forbidden", "text/plain");
  fs.readFile(target, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    send(res, 200, data, MIME[path.extname(target)] || "application/octet-stream");
  });
});
server.listen(PORT, HOST, () => {
  console.log(`Product Suite is listening on ${HOST}:${PORT}`);
  console.log("Hosted preview: Basic Auth enabled; API-key storage disabled.");
  console.log("Press Ctrl+C to stop.");
});