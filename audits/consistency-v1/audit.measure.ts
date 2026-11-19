/**
 * Consistency audit v1 — the measurement run.
 *
 * Opens every route in routes.json, one page at a time, at 1512×982 and 1920×1080, runs collect.js in
 * the page, and writes one JSON per route × viewport to $CA_OUT (default audits/consistency-v1/.run).
 * At 1512 it also crops a screenshot of one example element per distinct value set per part.
 *
 * Run it ONLY through the emulator lane (the test slot, the snapshot import, no export):
 *   npm run e2e:emu -- --config audits/consistency-v1/playwright.audit.config.ts
 * Optional: CA_ONLY=/queries,/agents (route filter) · CA_SHOTS=0 (no crops) · CA_VIEWPORTS=1512
 *
 * ⚠️ IT WRITES NOTHING. Overlays are opened by a click on an opener or a shortcut and closed with
 * Escape; no form is ever submitted. The emulator imports a fixed snapshot and exports nothing, so
 * even an accidental write cannot outlive the run.
 */
import { test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STORAGE_STATE } from "../../playwright.config";
import { ensureSignedIn, KILL_MOTION, KILL_MOTION_ID } from "../../tests/e2e/measure";

const DIR = resolve(process.cwd(), "audits/consistency-v1");
const OUT = resolve(process.cwd(), process.env.CA_OUT || "audits/consistency-v1/.run");
const COLLECT = readFileSync(resolve(DIR, "collect.js"), "utf8");
const CFG = JSON.parse(readFileSync(resolve(DIR, "routes.json"), "utf8")) as {
  routes: { path: string; family: string; name?: string; signedOut?: boolean; key?: string; note?: string }[];
  overlays: { from: string; name: string; open: { button?: string; firstOf?: string; key?: string } }[];
};
const ONLY = (process.env.CA_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const SHOTS = process.env.CA_SHOTS !== "0";
const VIEWPORTS = [
  { w: 1512, h: 982 },
  { w: 1920, h: 1080 },
].filter((v) => !process.env.CA_VIEWPORTS || process.env.CA_VIEWPORTS.split(",").includes(String(v.w)));

const slug = (s: string) => s.replace(/^\/#?\/?/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
const keyOf = (r: { path: string; key?: string }) => r.key || slug(r.path);
const hash = (o: unknown) => createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 10);

async function settle(page: Page, signedIn: boolean) {
  await page.waitForLoadState("domcontentloaded");
  await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` }).catch(() => {});
  if (signedIn) {
    await page.locator("#ws-sidebar, .ws-work, #app-stage-scroll").first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  } else {
    await page.locator("body *").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  }
  await page.evaluate(() => document.fonts.ready.then(() => true));
  /* skeletons and busy regions clear before anything is read */
  for (let i = 0; i < 16; i++) {
    const busy = await page.locator("[aria-busy='true']:visible, [class*='skeleton']:visible").count();
    if (!busy) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1800);
  /* a first-visit layer (a how-it-works carousel, a tour) sits over the page: Escape it, then click its close.
     It is not the page; overlays are measured in their own pass. (The emulator exports nothing, so a "seen" flag
     this writes dies with the run.) */
  if (signedIn) {
    for (let i = 0; i < 3; i++) {
      const dim = await page.evaluate(() => [...document.querySelectorAll("body *")].some((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); const m = /rgba?\(([^)]+)\)/.exec(c.backgroundColor); const a = m ? +(m[1].split(/[ ,/]+/)[3] ?? 1) : 0; return c.position === "fixed" && r.width >= innerWidth - 2 && r.height >= innerHeight - 2 && a > 0.05 && a < 0.95; }));
      if (!dim) break;
      const before = page.url();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      /* ⚠️ ESCAPE CAN LEAVE THE PAGE. In Settings mode Escape exits Settings (to the Dashboard): the first full run
         measured the Dashboard and called it Settings. If the URL moved, go back and stop dismissing. */
      if (page.url() !== before) {
        await page.goto(before, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2500);
        break;
      }
      if (i === 1) {
        const close = page.getByRole("button", { name: /^(close|skip|got it|done|not now|×)/i }).locator("visible=true").first();
        if (await close.count()) await close.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(400);
      }
    }
  }
  await page.evaluate(() => { const s = document.querySelector("#app-stage-scroll"); if (s) s.scrollTop = 0; window.scrollTo(0, 0); });
  await page.waitForTimeout(250);
}

type Collected = { records: { id: string; part: string; role: string; sig: unknown; rect: { w: number; h: number } }[]; meta: Record<string, unknown>; census: unknown };

async function collectAndCrop(page: Page, key: string, vw: number, label: string) {
  const data = (await page.evaluate(COLLECT)) as Collected;
  const shots: Record<string, string> = {};
  if (SHOTS && vw === VIEWPORTS[0].w) {
    const dir = resolve(OUT, "shots", key);
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: resolve(dir, `_page-${label}.png`), animations: "disabled", scale: "css" }).catch(() => {});
    const seen = new Set<string>();
    let taken = 0;
    for (const r of data.records) {
      const sk = `${r.part}/${r.role}/${hash(r.sig)}`;
      if (seen.has(sk) || taken >= 140) continue;
      seen.add(sk);
      if (r.part === "surfaces" && ["sheet", "stage", "page-background", "sidebar", "rail"].includes(r.role)) continue;
      if (r.rect.w < 4 || r.rect.h < 4) continue;
      const file = `${r.part}-${r.role.replace(/\//g, "_")}-${hash(r.sig)}.png`;
      try {
        const loc = page.locator(`[data-ca-id="${r.id}"]`).first();
        await loc.scrollIntoViewIfNeeded({ timeout: 1500 });
        const box = await loc.boundingBox();
        if (!box) continue;
        const pad = 6;
        const vp = page.viewportSize()!;
        const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
        const clip = { x, y, width: Math.min(box.width + pad * 2, 900, vp.width - x), height: Math.min(box.height + pad * 2, 420, vp.height - y) };
        if (clip.width < 4 || clip.height < 4) continue;
        await page.screenshot({ path: resolve(dir, file), clip, animations: "disabled", scale: "css" });
        shots[sk] = `shots/${key}/${file}`;
        taken++;
      } catch { /* an element that moved or vanished is not cropped; its values still stand */ }
    }
    await page.evaluate(() => { const s = document.querySelector("#app-stage-scroll"); if (s) s.scrollTop = 0; window.scrollTo(0, 0); });
  }
  return { ...data, shots };
}

async function failedReason(page: Page): Promise<string | null> {
  const body = (await page.locator("body").innerText().catch(() => "")).trim();
  if (!body) return "blank page (no text rendered)";
  if (/Something went wrong|This page hit a snag|Unexpected Application Error/i.test(body) && body.length < 600) return `error boundary: ${body.slice(0, 120)}`;
  return null;
}

test.describe.configure({ mode: "serial" });

test("consistency audit v1 — every route, both viewports", async ({ browser }) => {
  test.setTimeout(4 * 60 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  const log: Record<string, unknown>[] = [];
  const routes = CFG.routes.filter((r) => !ONLY.length || ONLY.includes(r.path) || ONLY.includes(keyOf(r)));

  for (const vp of VIEWPORTS) {
    const signedIn = await browser.newContext({ storageState: STORAGE_STATE, viewport: { width: vp.w, height: vp.h } });
    const signedOut = await browser.newContext({ storageState: { cookies: [], origins: [] }, viewport: { width: vp.w, height: vp.h } });
    /* ⚠️ SIGN IN ONCE PER CONTEXT. Firebase keeps its session in IndexedDB, which storageState cannot carry, so
       a fresh context is signed OUT — the first trial measured the sign-up screen on every workspace route.
       ensureSignedIn is the harness's own (password from env / .env.local, never printed). */
    {
      const p = await signedIn.newPage();
      await p.goto("/dashboard");
      await ensureSignedIn(p);
      await p.close();
    }
    for (const r of routes) {
      const ctx: BrowserContext = r.signedOut ? signedOut : signedIn;
      const page = await ctx.newPage();
      const key = keyOf(r);
      const entry: Record<string, unknown> = { key, path: r.path, family: r.family, name: r.name || r.path, vw: vp.w, vh: vp.h };
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
      try {
        await page.goto(r.path, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await settle(page, !r.signedOut);
        entry.finalUrl = page.url().replace(/^https?:\/\/[^/]+/, "");
        const why = await failedReason(page);
        if (why) { entry.failed = why; }
        else {
          if (process.env.CA_DEBUG) {
            const dump = await page.evaluate(() => {
              const out: string[] = [];
              const walk = (e: Element, d: number) => {
                if (d > 9) return;
                for (const c of [...e.children]) {
                  const r = c.getBoundingClientRect();
                  if (r.width < 300 || r.height < 30) continue;
                  const cs = getComputedStyle(c);
                  out.push(`${"  ".repeat(d)}${c.tagName.toLowerCase()}${c.id ? "#" + c.id : ""}.${String((c as HTMLElement).className || "").split(/\s+/).slice(0, 5).join(".")} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} bg=${cs.backgroundColor} ov=${cs.overflowY}`);
                  walk(c, d + 1);
                }
              };
              walk(document.body, 0);
              const btns = [...document.querySelectorAll("button, [role=button], a")].filter((b) => (b as HTMLElement).offsetParent).map((b) => (b.textContent || b.getAttribute("aria-label") || "").trim().slice(0, 30)).filter(Boolean);
              return out.slice(0, 220).join("\n") + "\nBUTTONS: " + [...new Set(btns)].slice(0, 80).join(" | ");
            });
            writeFileSync(resolve(OUT, `${key}@${vp.w}.dom.txt`), dump);
          }
          const data = await collectAndCrop(page, key, vp.w, String(vp.w));
          writeFileSync(resolve(OUT, `${key}@${vp.w}.json`), JSON.stringify({ ...entry, ...data, errors }, null, 1));
          entry.records = data.records.length;
          entry.header = (data.meta as { header?: unknown }).header ?? null;
        }
      } catch (e) {
        entry.failed = `load error: ${String((e as Error).message).slice(0, 200)}`;
      }
      entry.errors = errors;
      log.push(entry);
      console.log(`[ca] ${vp.w} ${r.path} → ${entry.failed ? "FAILED " + entry.failed : `${entry.records} records, header ${JSON.stringify(entry.header)}`}`);
      await page.close();
    }

    /* overlays: opened by an action that writes nothing, measured, closed with Escape */
    const ovs = CFG.overlays.filter((o) => !ONLY.length || ONLY.includes(o.from) || ONLY.includes("overlays"));
    for (const o of ovs) {
      const page = await signedIn.newPage();
      const key = `overlay-${slug(o.name)}`;
      const entry: Record<string, unknown> = { key, path: o.from, family: "overlays", name: o.name, vw: vp.w, vh: vp.h };
      try {
        await page.goto(o.from, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await settle(page, true);
        let opened = false;
        if (o.open.button) {
          const re = new RegExp(o.open.button, "i");
          let b = page.getByRole("button", { name: re }).locator("visible=true").first();
          if (!(await b.count())) b = page.getByRole("link", { name: re }).locator("visible=true").first();
          if (await b.count()) { await b.click({ timeout: 5000 }); opened = true; }
        } else if (o.open.firstOf) {
          const b = page.locator(o.open.firstOf).locator("visible=true").first();
          if (await b.count()) { await b.click({ timeout: 5000 }); opened = true; }
        } else if (o.open.key) {
          await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});
          await page.keyboard.press(o.open.key); opened = true;
        }
        await page.waitForTimeout(1200);
        const dialogs = await page.locator("[role='dialog']:visible, [aria-modal='true']:visible, dialog[open]").count();
        if (!opened) entry.failed = "opener not found";
        else if (!dialogs) entry.failed = "opened, but no dialog / aria-modal surface rendered";
        else {
          const data = await collectAndCrop(page, key, vp.w, String(vp.w));
          /* the collector's own count is the one that matters: it measures only what it can see */
          if (!(data.meta as { dialogs?: number }).dialogs) entry.failed = "opened, but the collector found no visible dialog surface";
          else {
            writeFileSync(resolve(OUT, `${key}@${vp.w}.json`), JSON.stringify({ ...entry, ...data }, null, 1));
            entry.records = data.records.length;
          }
        }
        await page.keyboard.press("Escape").catch(() => {});
      } catch (e) {
        entry.failed = `overlay error: ${String((e as Error).message).slice(0, 200)}`;
      }
      log.push(entry);
      console.log(`[ca] ${vp.w} overlay ${o.name} → ${entry.failed ? "FAILED " + entry.failed : `${entry.records} records`}`);
      await page.close();
    }
    await signedIn.close();
    await signedOut.close();
  }
  writeFileSync(resolve(OUT, "_log.json"), JSON.stringify(log, null, 1));
});

export type { Browser };
