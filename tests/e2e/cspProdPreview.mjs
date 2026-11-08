/**
 * cspProdPreview — security headers v1. Loads the LIVE public pages (queryhawk.net) and the holding
 * page with prod's policy from scripts/csp.mjs added as an ENFORCING header in the browser only, so
 * the policy is tested against prod's real code before anything is deployed. Read-only: no form is
 * submitted, and the Cloudflare beacon's POST is aborted so no visit is counted.
 *   node tests/e2e/cspProdPreview.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { CONFIGS, headersFor } from "../../scripts/csp.mjs";

const policyOf = (file) => headersFor({ ...CONFIGS.find((c) => c.file === file), csp: "enforce" })[0].value;
const BREAK = (s) => (process.env.CSP_BREAK ? s.replace(/ https:\/\/fonts\.gstatic\.com/g, "").replace(/ https:\/\/static\.cloudflareinsights\.com/g, "").replace(/ 'sha256-[^']+'/g, "") : s);
const APP = BREAK(policyOf("firebase.json")), HOLD = BREAK(policyOf("firebase.holding.json"));
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const res = {};
let label = "";
await ctx.route(/cloudflareinsights\.com\/cdn-cgi\/rum/, (r) => { (res[label] ??= { v: [], rum: 0 }).rum++; return r.abort(); });
await ctx.route((u) => u.hostname === "queryhawk.net" && !/\.[a-z0-9]{2,5}$/i.test(u.pathname), async (r) => {
  if (r.request().resourceType() !== "document") return r.continue();
  const resp = await r.fetch(); return r.fulfill({ response: resp, headers: { ...resp.headers(), "content-security-policy": APP } });
});
await ctx.route("http://holding.test/**", (r) => {
  const p = new URL(r.request().url()).pathname;
  if (p === "/" ) return r.fulfill({ status: 200, contentType: "text/html", headers: { "content-security-policy": HOLD }, body: readFileSync("holding/index.html") });
  try { return r.fulfill({ status: 200, body: readFileSync("holding" + p) }); } catch { return r.fulfill({ status: 404, body: "" }); }
});
const p = await ctx.newPage();
p.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) (res[label] ??= { v: [], rum: 0 }).v.push(m.text().slice(0, 200)); });
const fontsOf = () => p.evaluate(async () => { await document.fonts.ready; return [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")))].sort(); });
for (const path of ["/", "/pricing", "/about", "/contact", "/founders", "/privacy", "/terms", "/welcome", "/welcome?verified=verified"]) {
  label = "prod " + path; res[label] ??= { v: [], rum: 0 };
  await p.goto("https://queryhawk.net" + path, { waitUntil: "load" }); await p.waitForTimeout(path === "/" ? 12000 : 3500);
  await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await p.waitForTimeout(800);
  res[label].fonts = (await fontsOf()).join(",");
  res[label].beaconScript = await p.locator('script[src*="cloudflareinsights"]').count();
}
label = "holding (repo version)"; res[label] ??= { v: [], rum: 0 };
await p.goto("http://holding.test/"); await p.waitForTimeout(4000); res[label].fonts = (await fontsOf()).join(",");
console.log(JSON.stringify(res, null, 1)); await b.close();
