/**
 * Consistency audit v2 — the measurement run (both modes).
 *
 *   npm run e2e:emu -- --config audits/consistency-v2/playwright.audit2.config.ts      the full audit (Phase 1 + 3)
 *   npm run audit:rules                                                                  the rules check only (Phase 2)
 *
 * Opens every route in audits/consistency-v1/routes.json plus the states in states.json (empty states, the
 * Dashboard's first visit), every overlay, and every step of Log a query and Record a response, one page at a
 * time, at 1512×982 and 1920×1080. On each it runs collect2.js with the role map, and writes one JSON per
 * view × width to $CA_OUT (default audits/consistency-v2/.run, git-ignored).
 *
 * CA2_MODE=audit (default) also, at 1512, reads hover and focus on the first instance of each distinct action button,
 * field and list row, and crops one example of every distinct style to $CA_CROPS (outside the repo).
 * CA2_MODE=rules skips both, then runs rules.mjs over the run and prints a pass / fail per rule per page.
 * Filters: CA_ONLY=<keys or paths> · CA_VIEWPORTS=1512 · CA_NO_JOURNEYS=1 · CA_NO_OVERLAYS=1
 *
 * ⚠️ IT WRITES NOTHING. Overlays and journeys are opened with clicks that write nothing and left with Escape and
 * Discard; a save button is never pressed (the walk throws first). The emulator imports a fixed snapshot and
 * exports nothing. A route's `storage` sets localStorage before load and is put back after it is measured.
 */
import { test, type BrowserContext, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STORAGE_STATE } from "../../playwright.config";
import { ensureSignedIn, KILL_MOTION, KILL_MOTION_ID } from "../../tests/e2e/measure";

const DIR = resolve(process.cwd(), "audits/consistency-v2");
const MODE = process.env.CA2_MODE === "rules" ? "rules" : "audit";
const OUT = resolve(process.cwd(), process.env.CA_OUT || `audits/consistency-v2/.run${MODE === "rules" ? "-rules" : ""}`);
const CROPS = resolve(process.env.CA_CROPS || "/Users/nickphysick/ScriptAlly-backups/consistency-audit-v2/crops");
const COLLECT = readFileSync(resolve(DIR, "collect2.js"), "utf8");
const ROLES = JSON.parse(readFileSync(resolve(DIR, "roles.json"), "utf8"));
type Route = { path: string; family: string; name?: string; signedOut?: boolean; key?: string; storage?: Record<string, string>; state?: string };
const V1 = JSON.parse(readFileSync(resolve(process.cwd(), "audits/consistency-v1/routes.json"), "utf8")) as { routes: Route[]; overlays: { from: string; name: string; open: { button?: string; firstOf?: string; key?: string } }[] };
const STATES = JSON.parse(readFileSync(resolve(DIR, "states.json"), "utf8")) as { routes: Route[] };
const ROUTES: Route[] = [...V1.routes, ...STATES.routes];
const ONLY = (process.env.CA_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const VIEWPORTS = [{ w: 1512, h: 982 }, { w: 1920, h: 1080 }].filter((v) => !process.env.CA_VIEWPORTS || process.env.CA_VIEWPORTS.split(",").includes(String(v.w)));
const slug = (s: string) => s.replace(/^\/#?\/?/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
const keyOf = (r: { path: string; key?: string }) => r.key || slug(r.path);
const hash = (o: unknown) => createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 10);
const want = (key: string, path: string) => !ONLY.length || ONLY.includes(key) || ONLY.includes(path);

/* hover and focus: the roles whose interactive states Phase 3 reports */
const HOVER_ROLES = /^(buttons\/(action|destructive)|controls\/(text-field|textarea|bare-input|headline-field|select)|lists\/list-row)$/;
const cropped = new Set<string>();

async function settle(page: Page, signedIn: boolean) {
  await page.waitForLoadState("domcontentloaded");
  await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` }).catch(() => {});
  if (signedIn) await page.locator("#ws-sidebar, .ws-work, #app-stage-scroll").first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  else await page.locator("body *").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready.then(() => true));
  for (let i = 0; i < 16; i++) { if (!(await page.locator("[aria-busy='true']:visible, [class*='skeleton']:visible").count())) break; await page.waitForTimeout(500); }
  await page.waitForTimeout(1800);
  if (signedIn) {
    /* a first-visit layer (a tour) sits over the page: Escape it, and stop if Escape left the page (v1's lesson) */
    for (let i = 0; i < 3; i++) {
      const dim = await page.evaluate(() => [...document.querySelectorAll("body *")].some((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); const m = /rgba?\(([^)]+)\)/.exec(c.backgroundColor); const a = m ? +(m[1].split(/[ ,/]+/)[3] ?? 1) : 0; return c.position === "fixed" && r.width >= innerWidth - 2 && r.height >= innerHeight - 2 && a > 0.05 && a < 0.95; }));
      if (!dim) break;
      const before = page.url();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      if (page.url() !== before) { await page.goto(before, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2500); break; }
      if (i === 1) { const c = page.getByRole("button", { name: /^(close|skip|got it|done|not now|×)/i }).locator("visible=true").first(); if (await c.count()) await c.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(400); }
    }
  }
  await top(page);
}
const top = (page: Page) => page.evaluate(() => { const s = document.querySelector("#app-stage-scroll"); if (s) s.scrollTop = 0; window.scrollTo(0, 0); }).then(() => page.waitForTimeout(200));

type Rec = { id: string; role: string; sig: unknown; rect: { w: number; h: number }; scope: string };
async function interactive(page: Page, recs: Rec[]) {
  const seen = new Set<string>(), out: Record<string, unknown>[] = [];
  const READ = (id: string) => { const e = document.querySelector(`[data-ca2="${id}"]`) as HTMLElement | null; if (!e) return null; const c = getComputedStyle(e); return { bg: c.backgroundColor, color: c.color, border: `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`, shadow: c.boxShadow, outline: `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor}`, outlineOffset: c.outlineOffset, textDecoration: c.textDecorationLine, transform: c.transform, opacity: c.opacity, focusVisible: e.matches(":focus-visible"), focused: document.activeElement === e }; };
  for (const r of recs) {
    if (!HOVER_ROLES.test(r.role) || r.scope === "shell") continue;
    const k = `${r.role}|${hash(r.sig)}`;
    if (seen.has(k) || out.length >= 36) continue;
    seen.add(k);
    try {
      const loc = page.locator(`[data-ca2="${r.id}"]`).first();
      await loc.scrollIntoViewIfNeeded({ timeout: 1200 });
      await page.mouse.move(2, 2); await page.waitForTimeout(120);
      const rest = await page.evaluate(READ, r.id);
      await loc.hover({ timeout: 1500 }); await page.waitForTimeout(200);
      const hover = await page.evaluate(READ, r.id);
      await page.mouse.move(2, 2); await page.waitForTimeout(120);
      await page.keyboard.press("Shift");
      await page.evaluate((id) => { const e = document.querySelector(`[data-ca2="${id}"]`) as HTMLElement | null; (e as unknown as { focus: (o: unknown) => void })?.focus({ preventScroll: true, focusVisible: true }); }, r.id);
      await page.waitForTimeout(150);
      const focus = await page.evaluate(READ, r.id);
      await page.evaluate((id) => (document.querySelector(`[data-ca2="${id}"]`) as HTMLElement | null)?.blur(), r.id);
      out.push({ key: k, id: r.id, role: r.role, rest, hover, focus });
    } catch { /* moved or covered: no reading, and none is invented */ }
  }
  await top(page);
  return out;
}

async function crops(page: Page, key: string, recs: Rec[]) {
  const shots: Record<string, string> = {};
  mkdirSync(CROPS, { recursive: true });
  let taken = 0;
  for (const r of recs) {
    if (/^surfaces\/(sheet|stage|page-background|sidebar|rail)$/.test(r.role)) continue;
    const k = `${r.role}|${hash(r.sig)}`;
    if (cropped.has(k) || taken >= 220) continue;
    if (r.rect.w < 3 || r.rect.h < 3) continue;
    const file = `${r.role.replace(/\//g, "--")}--${hash(r.sig)}.png`;
    try {
      const loc = page.locator(`[data-ca2="${r.id}"]`).first();
      await loc.scrollIntoViewIfNeeded({ timeout: 1200 });
      const b = await loc.boundingBox(); if (!b) continue;
      const vp = page.viewportSize()!; const pad = 6; const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
      const clip = { x, y, width: Math.min(b.width + pad * 2, 1000, vp.width - x), height: Math.min(b.height + pad * 2, 520, vp.height - y) };
      if (clip.width < 3 || clip.height < 3) continue;
      await page.screenshot({ path: resolve(CROPS, file), clip, animations: "disabled", scale: "css" });
      cropped.add(k); shots[k] = file; taken++;
    } catch { /* not cropped; its values stand */ }
  }
  await top(page);
  return shots;
}

async function measure(page: Page, entry: Record<string, unknown>, vw: number) {
  await page.evaluate((r) => { (window as unknown as { __ca2Roles: unknown }).__ca2Roles = r; }, ROLES);
  const data = (await page.evaluate(COLLECT)) as { records: Rec[]; meta: { dialogs: string[] } } & Record<string, unknown>;
  let hover: unknown[] = [], shots: Record<string, string> = {};
  /* hover / focus and crops at 1512 only: a style's interactive states do not change with the width */
  if (vw === 1512) {
    /* roll-out v2: the rules check reads focus (R15), so rules mode takes the readings too; crops stay audit-only */
    hover = await interactive(page, data.records);
    if (MODE === "audit") shots = await crops(page, String(entry.key), data.records);
  }
  if (vw === 1512 && TRACE.length) await trace(page, String(entry.key), data.records);
  /* CA_PROBE=<file of JS>: evaluated on the page at 1512 (it must only read, or put back what it changes); the result goes to <key>@probe.json */
  if (vw === 1512 && process.env.CA_PROBE) writeFileSync(resolve(OUT, `${entry.key}@probe.json`), JSON.stringify(await page.evaluate(readFileSync(process.env.CA_PROBE, "utf8")).catch((e) => ({ error: String(e) })), null, 1));
  writeFileSync(resolve(OUT, `${entry.key}@${vw}.json`), JSON.stringify({ ...entry, ...data, hover, shots }, null, 1));
  return data;
}

/* Consolidate and finish v1, B1: CA_TRACE=<comma-separated sels> reads, at 1512, where each matching element's font size
   is set: the matched rules of the element and then of each ancestor (CDP CSS.getMatchedStylesForNode), up to the first
   rule that declares font-size or the font shorthand. Writes <key>@trace.json beside the run. Reads only. */
const TRACE = (process.env.CA_TRACE || "").split(",").map((s) => s.trim()).filter(Boolean);
async function trace(page: Page, key: string, recs: Rec[]) {
  const hits = (recs as unknown as { id: string; sel: string }[]).filter((r) => TRACE.includes(r.sel));
  if (!hits.length) return;
  const cdp = await page.context().newCDPSession(page);
  const out: Record<string, unknown>[] = [];
  try {
    await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const seen = new Set<string>();
    for (const h of hits) {
      if (seen.has(h.sel)) continue; seen.add(h.sel);
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `[data-ca2="${h.id}"]` });
      if (!nodeId) continue;
      const m = await cdp.send("CSS.getMatchedStylesForNode", { nodeId }) as { matchedCSSRules?: { rule: { selectorList: { text: string }; origin: string; style: { cssProperties: { name: string; value: string; disabled?: boolean }[] } } }[]; inherited?: { matchedCSSRules: { rule: { selectorList: { text: string }; origin: string; style: { cssProperties: { name: string; value: string }[] } } }[] }[]; inlineStyle?: { cssProperties: { name: string; value: string }[] } };
      const pick = (rules: { rule: { selectorList: { text: string }; origin: string; style: { cssProperties: { name: string; value: string }[] } } }[] = []) => {
        for (let i = rules.length - 1; i >= 0; i--) { const r = rules[i]; if (r.rule.origin !== "regular") continue; const p = r.rule.style.cssProperties.find((c) => (c.name === "font-size" || c.name === "font") && c.value); if (p) return { sel: r.rule.selectorList.text, prop: p.name, value: p.value }; }
        return null;
      };
      const chain: unknown[] = [];
      const own = pick(m.matchedCSSRules); chain.push({ level: 0, rule: own });
      if (!own) (m.inherited || []).some((inh, i) => { const r = pick(inh.matchedCSSRules); chain.push({ level: i + 1, rule: r }); return !!r; });
      const info = await page.evaluate((id) => { const e = document.querySelector(`[data-ca2="${id}"]`) as HTMLElement; const c = getComputedStyle(e); const path: string[] = []; let x: Element | null = e; for (let i = 0; x && i < 6; i++, x = x.parentElement) path.push(x.tagName.toLowerCase() + (x.className && typeof x.className === "string" ? "." + x.className.trim().split(/\s+/).join(".") : "")); return { size: c.fontSize, lh: c.lineHeight, path, w: e.getBoundingClientRect().width, text: (e.textContent || "").slice(0, 60) }; }, h.id);
      out.push({ sel: h.sel, ...info, chain });
    }
  } catch (e) { out.push({ error: String(e) }); }
  await cdp.detach().catch(() => {});
  writeFileSync(resolve(OUT, `${key}@trace.json`), JSON.stringify(out, null, 1));
}

async function failedReason(page: Page): Promise<string | null> {
  const body = (await page.locator("body").innerText().catch(() => "")).trim();
  if (!body) return "blank page (no text rendered)";
  if (/Something went wrong|This page hit a snag|Unexpected Application Error/i.test(body) && body.length < 600) return `error boundary: ${body.slice(0, 120)}`;
  return null;
}

/* ── the journeys: Log a query and Record a response, walked forward without saving (from roll-out v1.1) ── */
const SAVES = /^(Log query|Log and start another|Logging|Save|Record|Mark |Add to your list|Create package|Add comp|Add and add)/;
const visL = (page: Page, sel: string) => page.locator(sel).locator("visible=true").first();
async function clickIf(page: Page, sel: string) {
  const l = visL(page, sel);
  if (!(await l.count())) return false;
  const t = ((await l.innerText().catch(() => "")) || "").trim();
  if (SAVES.test(t)) throw new Error(`refused to press a save button: ${t}`);
  await l.click(); await page.waitForTimeout(450);
  return true;
}
async function journeys(ctx: BrowserContext, vw: number, log: Record<string, unknown>[]) {
  const page = await ctx.newPage();
  const at = async (key: string, name: string) => {
    const entry: Record<string, unknown> = { key, path: "/queries", family: "overlays", name, vw, state: "journey step" };
    try { const d = await measure(page, entry, vw); entry.records = d.records.length; if (!d.meta.dialogs.length) entry.failed = "no dialog surface at this step"; }
    catch (e) { entry.failed = `collect error: ${String((e as Error).message).slice(0, 160)}`; }
    log.push(entry); console.log(`[ca2] ${vw} ${key} → ${entry.failed ? "FAILED " + entry.failed : entry.records + " records"}`);
  };
  /* Log a query */
  try {
    await page.goto("/queries", { waitUntil: "domcontentloaded" }); await settle(page, true);
    await page.getByRole("button", { name: /^Log a query$/ }).locator("visible=true").first().click({ timeout: 30_000 });
    await visL(page, ".laq").waitFor({ timeout: 15_000 });
    const done = new Set<string>();
    for (let i = 0; i < 12; i++) {
      if (await visL(page, "[data-qls='log']").count()) { await at("journey-laq-check", "Log a query · check"); break; }
      const step = await page.evaluate(() => { const q = (s: string) => [...document.querySelectorAll(s)].some((e) => (e as HTMLElement).offsetParent); return q("[data-qls='find']") ? "who" : q("[data-qls='when-opt']") ? "when" : q("[data-qls='fork']") ? "fork" : q("[data-qls='package']") ? "package" : q("[data-qls='pieces']") ? "pieces" : q("[data-qls='how-opt']") ? "how" : q("[data-qls='nudge-continue']") ? "nudge" : "unknown"; });
      if (step === "who") await visL(page, ".laq-big button").waitFor({ timeout: 15_000 }).catch(() => {});
      if (!done.has(step)) { done.add(step); await at(`journey-laq-${step}`, `Log a query · ${step}`); }
      if (step === "who") { if (!(await clickIf(page, ".laq-big button"))) throw new Error("no agent row"); }
      else if (step === "when") await clickIf(page, "[data-qls='when-opt'][data-k='today']");
      else if (step === "fork") { if (!(await clickIf(page, "[data-qls='fork'] button:not([disabled])"))) throw new Error("no fork tile"); }
      else if (step === "package") await clickIf(page, "[data-qls='package']");
      else if (step === "pieces") { await clickIf(page, "[data-qls='pieces'] button"); await clickIf(page, "[data-qls='pieces-continue']"); }
      else if (step === "how") await clickIf(page, "[data-qls='how-opt']");
      else if (step === "nudge") { if (await visL(page, "[data-qls='nudge-continue'][disabled]").count()) await clickIf(page, "[data-qls='nudge-chip']"); await clickIf(page, "[data-qls='nudge-continue']"); }
      else throw new Error("an unknown step");
    }
    if (await clickIf(page, "[data-qls='add-note']")) await at("journey-laq-note", "Log a query · check, note open");
    await page.keyboard.press("Escape"); await page.waitForTimeout(400); await clickIf(page, "[data-qls='leave-discard']");
  } catch (e) { log.push({ key: "journey-laq", vw, family: "overlays", failed: `walk stopped: ${String((e as Error).message).slice(0, 160)}` }); console.log(`[ca2] ${vw} journey-laq FAILED ${String((e as Error).message).slice(0, 160)}`); }
  /* Record a response */
  try {
    await page.goto("/queries", { waitUntil: "domcontentloaded" }); await settle(page, true);
    await page.getByRole("button", { name: /^Record a response/ }).locator("visible=true").first().click({ timeout: 30_000 });
    await visL(page, "[data-qcrr='picker']").waitFor({ timeout: 15_000 });
    await at("journey-rr-picker", "Record a response · who replied");
    if (!(await clickIf(page, "[data-qcrr='row']"))) throw new Error("no waiting row");
    await visL(page, "[data-qc1522='composer']").waitFor({ timeout: 15_000 });
    await at("journey-rr-composer", "Record a response · what they said");
    if (!(await clickIf(page, "[data-qc161='tile'][data-v='more']"))) throw new Error("no 'more' tile");
    await at("journey-rr-more", "Record a response · asked for more");
    (await clickIf(page, "[data-qc1522='cancel']")) || (await clickIf(page, "[data-qc1522='composer-x']"));
    await clickIf(page, "[data-qc1522='discard']");
  } catch (e) { log.push({ key: "journey-rr", vw, family: "overlays", failed: `walk stopped: ${String((e as Error).message).slice(0, 160)}` }); console.log(`[ca2] ${vw} journey-rr FAILED ${String((e as Error).message).slice(0, 160)}`); }
  await page.close();
}

test.describe.configure({ mode: "serial" });

test(`consistency audit v2 — ${MODE}`, async ({ browser }) => {
  test.setTimeout(5 * 60 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  const log: Record<string, unknown>[] = [];
  for (const vp of VIEWPORTS) {
    const signedIn = await browser.newContext({ storageState: STORAGE_STATE, viewport: { width: vp.w, height: vp.h } });
    const signedOut = await browser.newContext({ storageState: { cookies: [], origins: [] }, viewport: { width: vp.w, height: vp.h } });
    { const p = await signedIn.newPage(); await p.goto("/dashboard"); await ensureSignedIn(p); await p.close(); }

    for (const r of ROUTES) {
      const key = keyOf(r);
      if (!want(key, r.path)) continue;
      const page = await (r.signedOut ? signedOut : signedIn).newPage();
      const entry: Record<string, unknown> = { key, path: r.path, family: r.family, name: r.name || r.path, state: r.state || "default", vw: vp.w, vh: vp.h };
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
      if (r.storage) await page.addInitScript((st) => { const w = window as unknown as { __caPrevLs?: Record<string, string | null> }; if (!w.__caPrevLs) w.__caPrevLs = Object.fromEntries(Object.keys(st).map((k) => [k, localStorage.getItem(k)])); for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); }, r.storage);
      try {
        await page.goto(r.path, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await settle(page, !r.signedOut);
        entry.finalUrl = page.url().replace(/^https?:\/\/[^/]+/, "");
        const why = await failedReason(page);
        if (why) entry.failed = why;
        else { entry.errors = errors; const d = await measure(page, entry, vp.w); entry.records = d.records.length; }
      } catch (e) { entry.failed = `load error: ${String((e as Error).message).slice(0, 200)}`; }
      if (r.storage) await page.evaluate(() => { const prev = (window as unknown as { __caPrevLs?: Record<string, string | null> }).__caPrevLs || {}; for (const [k, v] of Object.entries(prev)) { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } }).catch(() => { entry.storageNotRestored = true; });
      entry.errors = errors; log.push(entry);
      console.log(`[ca2] ${vp.w} ${key} → ${entry.failed ? "FAILED " + entry.failed : `${entry.records} records`}`);
      await page.close();
    }

    if (process.env.CA_NO_OVERLAYS !== "1") for (const o of V1.overlays) {
      const key = `overlay-${slug(o.name)}`;
      if (!want(key, o.from) && !ONLY.includes("overlays")) continue;
      const page = await signedIn.newPage();
      const entry: Record<string, unknown> = { key, path: o.from, family: "overlays", name: o.name, state: "overlay", vw: vp.w, vh: vp.h };
      try {
        await page.goto(o.from, { waitUntil: "domcontentloaded", timeout: 45_000 }); await settle(page, true);
        let opened = false;
        if (o.open.button) { const re = new RegExp(o.open.button, "i"); let b = page.getByRole("button", { name: re }).locator("visible=true").first(); if (!(await b.count())) b = page.getByRole("link", { name: re }).locator("visible=true").first(); if (await b.count()) { await b.click({ timeout: 5000 }); opened = true; } }
        else if (o.open.firstOf) { const b = page.locator(o.open.firstOf).locator("visible=true").first(); if (await b.count()) { await b.click({ timeout: 5000 }); opened = true; } }
        else if (o.open.key) { await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {}); await page.keyboard.press(o.open.key); opened = true; }
        await page.waitForTimeout(1200);
        if (!opened) entry.failed = "opener not found";
        else if (!(await page.locator("[role='dialog']:visible, [aria-modal='true']:visible, dialog[open]").count())) {
          /* a menu (the account menu is role="menu", not a dialog) is measured as the overlay's surface */
          if (await page.locator("[role='menu']:visible").count()) {
            await page.evaluate(() => { (window as unknown as { __ca2ExtraDialog: string }).__ca2ExtraDialog = ", [role='menu']"; });
            entry.state = "overlay (menu)";
            const d = await measure(page, entry, vp.w); entry.records = d.records.length;
          } else entry.failed = "opened, but no dialog or menu surface rendered";
        }
        else { const d = await measure(page, entry, vp.w); entry.records = d.records.length; if (!d.meta.dialogs.length) entry.failed = "the collector found no visible dialog surface"; }
        await page.keyboard.press("Escape").catch(() => {});
      } catch (e) { entry.failed = `overlay error: ${String((e as Error).message).slice(0, 200)}`; }
      log.push(entry); console.log(`[ca2] ${vp.w} ${key} → ${entry.failed ? "FAILED " + entry.failed : `${entry.records} records`}`);
      await page.close();
    }

    if (process.env.CA_NO_JOURNEYS !== "1" && (!ONLY.length || ONLY.includes("journeys"))) await journeys(signedIn, vp.w, log);
    await signedIn.close(); await signedOut.close();
  }
  writeFileSync(resolve(OUT, "_log.json"), JSON.stringify(log, null, 1));
  if (MODE === "rules") {
    /* rules.mjs exits 1 when any rule fails: print its table either way; the run itself is not a failure */
    const res = spawnSync("node", [resolve(DIR, "rules.mjs"), OUT], { encoding: "utf8" });
    console.log(res.stdout);
    if (res.stderr) console.log(res.stderr);
  }
});
