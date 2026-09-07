#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE REF-DIFF HARNESS ═════════════════════════════════════════════════════════════════════
 *
 * ⚠️ THE REF IS THE ORACLE, AND THIS EXISTS BECAUSE THE LAST PASS'S "13 OF 13 GREEN" WAS MEASURING
 * THE WRONG THINGS. Every one of those assertions was true and self-consistent, and the page did
 * not look like the ref: the bands and the line came from different sources, the axis clipped, the
 * brush drew a blob, the ground was white. A measurement that only ever asks the questions its
 * author thought of confirms the author's model of the page, not the page. This asks ONE question —
 * "where does the ref put this, and where does the app put it" — and it asks it of sixteen boxes at
 * three widths in the same headless browser, so neither side gets a different engine, a different
 * device pixel ratio or a different font stack to hide behind.
 *
 * ⚠️ IT COMPARES GEOMETRY, COLOUR AND TYPE — NEVER DATA. The two pages hold different records and
 * always will; a diff that cared about counts would be red forever for a reason nobody can fix.
 * Boxes, fills, radii and type are the things a design ref actually specifies.
 *
 * ⚠️ AND IT MUST BE PROVED RED BEFORE ANYTHING IS BUILT ON IT. A harness nobody has watched fail is
 * a harness that reports what you hoped. `--self-test` breaks one probe's geometry in the loaded ref
 * and requires the miss to be reported; the run refuses to continue if it is not.
 *
 * USAGE
 *   node scripts/dash-refdiff.mjs                    verify — writes JSON + a table, exits 1 on any miss
 *   node scripts/dash-refdiff.mjs --self-test        prove the harness reports a miss it should
 *   node scripts/dash-refdiff.mjs --widths 1920      one width, for a fast loop
 *   node scripts/dash-refdiff.mjs --out run-artifacts/dash-refdiff.json
 *
 * ENV
 *   SA_REFDIFF_APP_URL   the app's origin (default http://127.0.0.1:4173)
 *   SA_E2E_PASSWORD      the harness account's password, from .env.local
 */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = join(ROOT, "design-refs", "dashboard-cappuccino-v14.html");

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const SELF_TEST = argv.includes("--self-test");
const OUT = resolve(ROOT, flag("--out", "run-artifacts/dash-refdiff.json"));
const WIDTHS = flag("--widths", "1536,1920,2520").split(",").map(Number);
const HEIGHT = 1456;
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";

/* ── the contract ────────────────────────────────────────────────────────────────────────────── */

const PROBES = [
  "main", "hero", "stats", "grid",
  "manuscript-card", "community-card", "chart-card", "plot", "brush",
  "todo-card", "todo-badge", "todo-rule",
  "goals-card", "activity-card", "activity-tabs", "feed",
];
const TEXT_PROBES = ["hero-h1", "card-h3", "stat-figure", "chart-figure", "ticket-title", "bubble-sentence"];

/**
 * ⚠️ TOLERANCES ARE THE PACK'S, AND THEY ARE ASYMMETRIC ON PURPOSE. An EDGE may sit ±3px out
 * because a 1px hairline and a sub-pixel gap are not a design difference; a SIZE may be ±4px
 * because two edges can each be off by their own tolerance. Colour and radius are exact: those are
 * decisions, not measurements, and "nearly the right grey" is the fault this whole pass exists for.
 */
const TOL = { edge: 3, size: 4, font: 0.5 };

/** ⚠️ THE GROUND IS A STATED VALUE, not "whatever the ref happens to compute". */
const GROUND = "rgb(244, 240, 234)";

/* ── reading a page ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ SCOPED TO THE VISIBLE PAGE, ALWAYS. Every workspace page in this app stays MOUNTED and the
 * shell toggles `display`, so `document.querySelector` routinely answers about a page the reader
 * cannot see. It cost this very pass a wrong recon answer — a `.tkt .tag` read off `document` on
 * `/todo` returned the DASHBOARD's copy and reported the token as resolved when it is not.
 */
const READ = `(() => {
  const num = (v) => Math.round(v * 10) / 10;
  const roots = [...document.querySelectorAll("[data-probe]")];
  const visibleIn = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const box = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: num(r.x), y: num(r.y), w: num(r.width), h: num(r.height),
      bg: cs.backgroundColor,
      /* the width travels with the colour — see diffOne. A border-top-color computes to the
         element's own colour on a box with no border, so comparing it bare is noise.
         NO BACKTICKS IN HERE: this whole block is a template literal, and one ends it. */
      borderTopW: parseFloat(cs.borderTopWidth) || 0,
      borderTop: cs.borderTopColor,
      radius: cs.borderTopLeftRadius,
    };
  };
  const out = { probes: {}, text: {}, checks: {} };
  for (const el of roots) {
    const k = el.getAttribute("data-probe");
    if (out.probes[k] || !visibleIn(el)) continue;   // first VISIBLE match wins
    out.probes[k] = box(el);
  }
  for (const el of document.querySelectorAll("[data-probe-text]")) {
    const k = el.getAttribute("data-probe-text");
    if (out.text[k] || !visibleIn(el)) continue;
    const cs = getComputedStyle(el);
    out.text[k] = {
      family: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: parseFloat(cs.fontSize),
      weight: cs.fontWeight,
      color: cs.color,
    };
  }
  /* ── the four page-level checks ── */
  out.checks.ground = getComputedStyle(document.body).backgroundColor;
  out.checks.hScroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const col = (k) => out.probes[k] ? out.probes[k].y + out.probes[k].h : null;
  /* the three column bottoms — the LAST card in each column, which the ref and the app agree on */
  const bottoms = ["community-card", "todo-card", "activity-card"].map(col).filter((v) => v !== null);
  out.checks.columnBottoms = bottoms;
  out.checks.columnSpread = bottoms.length === 3 ? num(Math.max(...bottoms) - Math.min(...bottoms)) : null;
  /* ⚠️ THE BLEND TRAP: a transform on ANY ancestor isolates the blend group and the stat artwork's
     white field returns, silently, with the rule applying cleanly. */
  const marks = [...document.querySelectorAll("[data-probe='stats'] img, .os-greet .os-mark-il img")];
  const bad = [];
  for (const m of marks) {
    for (let el = m.parentElement; el; el = el.parentElement) {
      const t = getComputedStyle(el).transform;
      if (t && t !== "none") { bad.push(el.className || el.tagName); break; }
    }
  }
  out.checks.markCount = marks.length;
  out.checks.transformedAncestors = [...new Set(bad)];
  return out;
})()`;

async function readPage(page, url, { app } = {}) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (app) await signIn(page);
  /* fonts settled and one paint past any entrance, or type reads at its fallback size */
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(app ? 2600 : 900);
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await page.waitForTimeout(160);
  return page.evaluate(READ);
}

/**
 * ⚠️ THE SIGN-IN IS `tests/e2e/measure.ts`'s, COPIED EXACTLY, INCLUDING THE RACE.
 * Checking `count()` straight after a `goto` reads a document the app has not rendered into yet, so
 * it always looks signed-out — and then signs in again on a route that redirects away from the form
 * when the session is live, and hangs until the timeout. Racing the shell against the form settles
 * it. This is a plain script rather than a Playwright test, so it cannot import that helper; the
 * duplication is deliberate and the reason is that a second, cleverer sign-in would be a second
 * thing to get wrong.
 *
 * ⚠️ AND `storageState` IS NOT ENOUGH HERE — Firebase's session lives in IndexedDB, which
 * `storageState` does not carry. Every measurement signs in. Two of this pass's own recon probes
 * were silently reading a SIGN-IN page because they trusted a saved state.
 */
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";

function envLocal(key) {
  const f = join(ROOT, ".env.local");
  if (!existsSync(f)) return null;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`).exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "") || null;
  }
  return null;
}

async function signIn(page) {
  const settled = await Promise.race([
    page.locator(SHELL).first().waitFor({ state: "attached", timeout: 15000 }).then(() => "shell").catch(() => null),
    page.locator("#au-email").waitFor({ state: "attached", timeout: 15000 }).then(() => "form").catch(() => null),
  ]);
  if (settled === "shell") return;
  const pw = process.env.SA_E2E_PASSWORD || envLocal("SA_E2E_PASSWORD");
  if (!pw) throw new Error("No SA_E2E_PASSWORD — see tests/e2e/auth.setup.ts");
  await page.goto(`${APP}/#/signin`);
  await page.locator("#au-email").fill(process.env.SA_E2E_EMAIL || envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
  await page.locator("#au-pw").fill(pw);
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.locator(SHELL).first().waitFor({ state: "visible", timeout: 30000 });
  await page.goto(`${APP}/dashboard`, { waitUntil: "domcontentloaded" });
}

/* ── diffing ─────────────────────────────────────────────────────────────────────────────────── */

const rgb = (v) => (v || "").replace(/\s+/g, " ").trim();

function diffOne(key, ref, app) {
  const misses = [];
  if (!ref) return [{ key, field: "ref", why: "the ref has no such probe" }];
  if (!app) return [{ key, field: "present", why: "the app renders no visible element for this probe" }];
  const near = (f, tol) => {
    const d = Math.round((app[f] - ref[f]) * 10) / 10;
    if (Math.abs(d) > tol) misses.push({ key, field: f, ref: ref[f], app: app[f], delta: d, tol });
  };
  near("x", TOL.edge); near("y", TOL.edge);
  near("w", TOL.size); near("h", TOL.size);
  for (const f of ["bg", "radius"]) {
    if (rgb(ref[f]) !== rgb(app[f])) misses.push({ key, field: f, ref: ref[f], app: app[f] });
  }
  /* the border is compared as a PAIR — a width difference is a real miss, and a colour difference
     only means anything where at least one side actually draws one */
  if (Math.abs(ref.borderTopW - app.borderTopW) > 0.5) {
    misses.push({ key, field: "borderW", ref: ref.borderTopW, app: app.borderTopW });
  } else if (ref.borderTopW > 0 && rgb(ref.borderTop) !== rgb(app.borderTop)) {
    misses.push({ key, field: "borderTop", ref: ref.borderTop, app: app.borderTop });
  }
  return misses;
}

function diffText(key, ref, app) {
  if (!ref) return [{ key, field: "ref", why: "the ref has no such text probe" }];
  if (!app) return [{ key, field: "present", why: "the app renders no visible element for this text probe" }];
  const m = [];
  if (ref.family !== app.family) m.push({ key, field: "family", ref: ref.family, app: app.family });
  if (Math.abs(ref.size - app.size) > TOL.font) m.push({ key, field: "size", ref: ref.size, app: app.size, tol: TOL.font });
  if (String(ref.weight) !== String(app.weight)) m.push({ key, field: "weight", ref: ref.weight, app: app.weight });
  if (rgb(ref.color) !== rgb(app.color)) m.push({ key, field: "color", ref: ref.color, app: app.color });
  return m;
}

function diffChecks(app) {
  const m = [];
  if (rgb(app.checks.ground) !== GROUND) {
    m.push({ key: "page", field: "ground", ref: GROUND, app: app.checks.ground });
  }
  if (app.checks.hScroll > 1) {
    m.push({ key: "page", field: "hScroll", ref: 0, app: app.checks.hScroll });
  }
  if (app.checks.columnSpread === null) {
    m.push({ key: "page", field: "columnBottoms", why: "fewer than three column cards were visible" });
  } else if (app.checks.columnSpread > 1) {
    m.push({ key: "page", field: "columnBottoms", ref: "≤1", app: app.checks.columnSpread });
  }
  if (app.checks.transformedAncestors.length) {
    m.push({ key: "page", field: "blendAncestorTransform", app: app.checks.transformedAncestors.join(", ") });
  }
  return m;
}

/* ── the table ───────────────────────────────────────────────────────────────────────────────── */

function table(result) {
  const L = [];
  L.push(`# dash-refdiff · ${result.when}`);
  L.push("");
  L.push(`ref: \`${result.ref}\`  ·  app: \`${result.app}\``);
  L.push("");
  L.push("| probe | " + result.widths.map((w) => `${w}`).join(" | ") + " |");
  L.push("|---|" + result.widths.map(() => "---").join("|") + "|");
  const rows = [...PROBES, ...TEXT_PROBES.map((t) => `text:${t}`), "page"];
  for (const p of rows) {
    const cells = result.widths.map((w) => {
      const misses = result.byWidth[w].misses.filter((m) => m.key === p || `text:${m.key}` === p);
      if (!misses.length) return "·";
      return misses.map((m) => (m.why ? m.why : `${m.field} ${m.ref}→${m.app}`)).join("<br>");
    });
    if (cells.every((c) => c === "·")) { L.push(`| ${p} | ${cells.join(" | ")} |`); continue; }
    L.push(`| **${p}** | ${cells.join(" | ")} |`);
  }
  L.push("");
  L.push(result.widths.map((w) => `**${w}**: ${result.byWidth[w].misses.length} misses`).join("  ·  "));
  L.push("");
  L.push(`**total misses: ${result.total}**`);
  return L.join("\n");
}

/* ── run ─────────────────────────────────────────────────────────────────────────────────────── */

const browser = await chromium.launch();
const result = { when: new Date().toISOString(), ref: "design-refs/dashboard-cappuccino-v14.html", app: APP, widths: WIDTHS, byWidth: {}, total: 0 };
let selfTestSaw = null;

try {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 1 });
    const refPage = await ctx.newPage();
    const refData = await readPage(refPage, pathToFileURL(REF).href);

    /* ⚠️ THE SELF-TEST BREAKS THE REF'S GEOMETRY, NOT THE APP'S — so the miss it produces is
       unmistakably the harness's own doing and cannot be confused for a real difference. */
    if (SELF_TEST) {
      await refPage.evaluate(() => {
        const el = document.querySelector("[data-probe='chart-card']");
        if (el) el.style.width = `${el.getBoundingClientRect().width - 40}px`;
      });
      const broken = await refPage.evaluate(READ);
      selfTestSaw = diffOne("chart-card", broken.probes["chart-card"], refData.probes["chart-card"]);
    }

    const appPage = await ctx.newPage();
    const appData = await readPage(appPage, `${APP}/dashboard`, { app: true });

    const misses = [];
    for (const k of PROBES) misses.push(...diffOne(k, refData.probes[k], appData.probes[k]));
    for (const k of TEXT_PROBES) misses.push(...diffText(k, refData.text[k], appData.text[k]));
    misses.push(...diffChecks(appData));

    result.byWidth[width] = { ref: refData, app: appData, misses };
    result.total += misses.length;
    await ctx.close();
    process.stdout.write(`  ${width}: ${misses.length} misses\n`);
  }
} finally {
  await browser.close();
}

if (SELF_TEST) {
  const ok = Array.isArray(selfTestSaw) && selfTestSaw.some((m) => m.field === "w");
  console.log(`\nself-test: a 40px width break on chart-card ${ok ? "WAS" : "was NOT"} reported`);
  if (!ok) { console.error("✗ the harness did not report a break it was shown. It cannot be trusted."); process.exit(2); }
  console.log("✓ the harness reports a miss it should. Discarding the break.");
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
const md = table(result);
writeFileSync(OUT.replace(/\.json$/, ".md"), `${md}\n`);
console.log(`\n${md}\n`);
console.log(`written: ${OUT}`);
process.exit(result.total === 0 ? 0 : 1);
