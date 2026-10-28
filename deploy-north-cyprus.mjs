#!/usr/bin/env node
/**
 * Deploy the North Cyprus landing to Netlify (no dependencies, Node 18+).
 *
 * Usage:
 *   node deploy-north-cyprus.mjs                    # creates/reuses a site, deploys ./landing-north-cyprus
 *   NETLIFY_SITE_ID=<id> node deploy-north-cyprus.mjs   # deploy into an existing site
 *
 * Token: NETLIFY_AUTH_TOKEN env var, or NETLIFY_AUTH_TOKEN=... in ./.env
 * Get a token: app.netlify.com → User settings → Applications → Personal access tokens → New access token
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SITE_NAME = process.env.NETLIFY_SITE_NAME || "severny-kipr-invest";
const DIR = path.resolve(process.env.DEPLOY_DIR || "landing-north-cyprus");
const BASE = "https://api.netlify.com";

function token() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN.trim();
  for (const f of [".env", "../.env"]) {
    try {
      const m = fs.readFileSync(f, "utf8").match(/NETLIFY_AUTH_TOKEN=(\S+)/);
      if (m) return m[1].trim();
    } catch {}
  }
  throw new Error("No token: set NETLIFY_AUTH_TOKEN or add NETLIFY_AUTH_TOKEN=... to .env");
}

const H = () => ({ Authorization: "Bearer " + token(), "Content-Type": "application/json" });

async function api(method, p, body) {
  const r = await fetch(BASE + p, { method, headers: H(), body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch {}
  if (!r.ok) throw new Error(method + " " + p + " -> " + r.status + " " + ((j && j.message) || t).slice(0, 200));
  return j;
}

function collect(dir) {
  const files = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else {
        const rel = "/" + path.relative(dir, full).split(path.sep).join("/");
        files[rel] = fs.readFileSync(full);
      }
    }
  };
  walk(dir);
  return files;
}

if (!fs.existsSync(DIR)) throw new Error("Deploy dir not found: " + DIR + " (expected index.html inside)");
const contents = collect(DIR);
const shas = {}, bySha = {};
for (const [rel, buf] of Object.entries(contents)) {
  const sha = crypto.createHash("sha1").update(buf).digest("hex");
  shas[rel] = sha;
  bySha[sha] = rel;
}
console.log("Files to deploy:", Object.keys(contents).length, "->", Object.keys(contents).join(", "));

let siteId = process.env.NETLIFY_SITE_ID;
let site = null;
if (siteId) {
  site = await api("GET", "/api/v1/sites/" + siteId);
} else {
  try { site = await api("POST", "/api/v1/sites", { name: SITE_NAME }); }
  catch (e) { console.log("Named site unavailable (" + e.message.split("\n")[0] + "), creating with auto name"); site = await api("POST", "/api/v1/sites", {}); }
  siteId = site.id;
}
console.log("Site:", site.name, "|", site.id);

// Account-level Edge/SAML access can gate the public URL with a 401 login redirect.
// Clear it on the site, otherwise the deploy is live but unreachable without a Netlify login.
if (site.sso_login) {
  site = await api("PATCH", "/api/v1/sites/" + siteId, { sso_login: false });
  console.log("sso_login disabled ->", site.sso_login);
}

const deploy = await api("POST", "/api/v1/sites/" + siteId + "/deploys", {});
const deployId = deploy.id;
console.log("Deploy created:", deployId);

const put = await api("PUT", "/api/v1/sites/" + siteId + "/deploys/" + deployId, { files: shas });
const required = put.required || [];
console.log("Files needing upload:", required.length, "of", Object.keys(contents).length);

for (const sha of required) {
  const rel = bySha[sha];
  if (!rel) { console.warn("unknown sha", sha); continue; }
  const r = await fetch(BASE + "/api/v1/deploys/" + deployId + "/files" + encodeURI(rel), {
    method: "PUT",
    headers: { Authorization: "Bearer " + token(), "Content-Type": "application/octet-stream" },
    body: contents[rel],
  });
  console.log("  upload", rel, "->", r.status);
  if (!r.ok) throw new Error("upload failed for " + rel + ": " + (await r.text()).slice(0, 200));
}

let state = null;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const d = await api("GET", "/api/v1/deploys/" + deployId);
  state = d.state;
  process.stdout.write(".");
  if (state === "ready") break;
  if (d.error_message) throw new Error("Deploy error: " + d.error_message);
}
console.log("");
if (state !== "ready") throw new Error("Deploy did not become ready (state=" + state + ")");

const live = deploy.ssl_url || deploy.deploy_ssl_url || site.ssl_url || "https://" + site.name + ".netlify.app";
const v = await fetch(live + "/", { redirect: "follow" });
const html = await v.text();
if (v.status !== 200) throw new Error("Live URL returned HTTP " + v.status + " (expected 200) at " + live);
if (!html.includes("Инвестируйте")) throw new Error("Live URL does not contain the hero headline at " + live);
console.log("Live:", live, "| HTTP", v.status, "| bytes", Buffer.byteLength(html, "utf8"), "| hero text ok");
console.log("DONE: " + live + "/");
