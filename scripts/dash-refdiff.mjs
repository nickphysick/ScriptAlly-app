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
const REF = join(ROOT, "design-refs", "dashboard-cappuccino-v22.html");

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const SELF_TEST = argv.includes("--self-test");
const OUT = resolve(ROOT, flag("--out", "run-artifacts/dash-refdiff.json"));
const WIDTHS = flag("--widths", "1536,1920,2520").split(",").map(Number);
const HEIGHT = 1456;
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";

/* ── the contract ────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE PROBE SET IS THE REF'S, AND v22 CHANGED SIX OF THEM. `activity-tabs` → `activity-filters`
 * (the tabs are a collapsible filter row now), `community-card` → `community-strip` (it is a
 * full-width footer strip rather than a card in a column), `goals-card` is GONE, and `toprow` is
 * new — the manuscript tile and the chart card share a row, and the row itself is the thing that
 * has to line up.
 *
 * ⚠️ A RENAMED PROBE IS REPORTED, NEVER SILENTLY DROPPED. Run against v22 with v16's list the
 * harness said "the ref has no such probe" four times, which is the correct answer and the reason
 * this list is worth keeping honest: a probe quietly removed is coverage quietly removed.
 */
const PROBES = [
  "main", "hero", "stats", "grid", "toprow",
  "manuscript-card", "chart-card", "plot", "brush",
  "todo-card", "todo-badge", "todo-rule",
  "activity-card", "activity-filters", "feed",
  "community-strip",
];

/**
 * ⚠️ EACH PROBE IS ANCHORED TO THE EDGE ITS DESIGN PINS IT TO, AND THIS IS THE SECOND HALF OF THE
 * RELATIVE-DATUM DECISION — the first half moved position off the viewport and onto `main`, and
 * left every WIDTH absolute, which reintroduced the same fault one level down.
 *
 * The app's `main` is 1650 wide at 1920 where the ref's is 1634: the ref draws no rail, no window
 * and no bar, so its page padding is the only thing inset from the viewport. In a `440px 1fr 420px`
 * grid that 16px lands entirely in the elastic middle track — which is CORRECT behaviour, and was
 * being reported as a miss on the chart card, the to-do card, the plot, the rule, and as an x miss
 * on all four right-column probes. Nine misses, none of them a difference anyone could fix, and all
 * of them ones a design change could hide behind.
 *
 * So: a `left` probe is pinned to the left and its left inset and width are the facts. A `right`
 * probe is pinned to the right and its RIGHT inset and width are the facts. A `span` probe fills the
 * elastic track, so its two insets are the facts and its width is derived from them — pinning both
 * edges pins the width too, against whatever container the shell gives it.
 */
const ANCHOR = {
  main: "datum",
  hero: "span", stats: "span", grid: "span", toprow: "span",
  /* the tile is the only fixed track in the top row; everything beside it is elastic */
  "manuscript-card": "left",
  "chart-card": "span", plot: "span", brush: "right",
  "todo-card": "span", "todo-badge": "right", "todo-rule": "span",
  /* the right column is 360px pinned to the right edge, and everything in it goes with it */
  "activity-card": "right", "activity-filters": "right", feed: "right",
  /* the strip runs the full width beneath both columns */
  "community-strip": "span",
};
/**
 * ⚠️ THE REF'S OWN THREE, NOT SIX OF MINE — v16 instruments itself and the app carries its names.
 *
 * ⚠️ AND THREE TEXT PROBES ARE NOT A TYPE GATE, WHICH IS WHAT THE LAST PASS GOT WRONG. Six probes
 * were added by hand, and all six landed on runs that already matched: the greeting at 52, the stat
 * figure at 34, the card title at 23, the bubble sentence at 15. The whole mono and caption band —
 * where the app runs 8 / 8.5 / 9 against the ref's 9.5 / 10 / 11 — had no probe at all, so a page
 * whose small type was a quarter to a third short of the ref reported clean. That is this repo's own
 * monoculture-fixture fault wearing a harness's clothes: the sample was drawn from the population
 * that was already correct. `TYPE_SCALE` below is the coverage fix, and it is the actual gate.
 */
const TEXT_PROBES = ["greeting", "panel-title", "chart-title", "stat-figure"];

/**
 * The type scale, as SELECTOR PAIRS — one row per treatment the design names, ref side and app side.
 *
 * ⚠️ SELECTOR PAIRS RATHER THAN MORE `data-probe-text` ATTRIBUTES, because attributes would mean
 * editing the ref, and a ref whose md5 moves is a ref that can no longer be checked against the one
 * the pack named. Every row is compared for `font-size` at the pack's ±0.5px, and for family and
 * weight, which is what a "scale" is.
 */
const TYPE_SCALE = [
  ["card title",      ".hd h3",              ".os-ahead h2, .os-th2 h2"],
  ["chart figure",    "#hdB .statblk b",     ".os-ahead .os-n"],
  ["hero greeting",   ".hero h1",            ".os-greet h1"],
  ["stat label",      ".stat .lab",          ".os-cl"],
  ["stat figure",     ".stat .fig b",        ".os-cn"],
  ["stat chip",       ".stat .mini",         ".os-cd"],
  ["legend",          ".legend span",        ".os-bk"],
  ["tab",             ".ftabs button",       ".os-ftab"],
  ["tab count",       ".ftabs .n",           ".os-ftabn"],
  ["ticket title",    ".tk .ttl",            ".tkt .ttl"],
  ["ticket tag",      ".tk .tag",            ".tkt .tag"],
  /* ⚠️ NO ROW FOR THE TICKET'S SUB-LINE — the ref's shipping ticket does not have one. `snip:'a'`
     makes `sub(t)` return an empty string, so its ticket is a tag and a deed and nothing else. A
     row for a treatment the design does not have can never pass, and leaving it in as a permanent
     "no element in the REF" is a miss that teaches the reader to skip the table. The app's own
     sub-line is a CONTENT question and belongs to Phase 6, not to the type scale. */
  ["bubble sentence", ".cv .msg .b .s",      ".os-bubsay"],
  ["bubble meta",     ".cv .msg .b .m",      ".os-bubmeta"],
  ["bubble label",    ".cv .msg .b .slab",   ".os-bublab"],
  ["todo badge",      ".badge b",            ".os-tbadge b"],
];

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
  const out = { probes: {}, text: {}, scale: {}, checks: {} };
  for (const el of roots) {
    const k = el.getAttribute("data-probe");
    if (out.probes[k] || !visibleIn(el)) continue;   // first VISIBLE match wins
    out.probes[k] = box(el);
  }
  /* ⚠️ A TEXT PROBE READS ITS ELEMENT WHETHER OR NOT IT IS VISIBLE, AND THE REF IS WHY.
     v16 puts data-probe-text=card-title on the chart card's h3 inside hdA — which its own shipping
     config sets to display:none, because hdr is b and the stat block hdB takes over. A visible-only
     read reports "the ref has no such text probe" about a probe the ref ships. Type is readable on
     a hidden element (getComputedStyle still resolves it) and type is all a text probe compares, so
     the honest fix is to read it and RECORD that it was hidden. Boxes still require visibility —
     a hidden box has no geometry to compare. */
  for (const el of document.querySelectorAll("[data-probe-text]")) {
    const k = el.getAttribute("data-probe-text");
    if (out.text[k]) continue;
    const cs = getComputedStyle(el);
    out.text[k] = {
      family: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: parseFloat(cs.fontSize),
      weight: cs.fontWeight,
      color: cs.color,
      hidden: !visibleIn(el),
    };
  }
  /* the type scale — a named list of selectors handed in from Node, read the same way */
  const scale = JSON.parse(document.documentElement.getAttribute("data-refdiff-scale") || "[]");
  for (const [name, sel] of scale) {
    const el = [...document.querySelectorAll(sel)].find(visibleIn)
            || document.querySelector(sel);
    if (!el) { out.scale[name] = null; continue; }
    const cs = getComputedStyle(el);
    out.scale[name] = {
      family: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      size: parseFloat(cs.fontSize),
      weight: cs.fontWeight,
    };
  }
  /* ── the four page-level checks ── */
  /* The ground is what is PAINTED BEHIND main, not whatever body happens to carry. The ref paints
     it on body; the app paints it on a shell element several levels up, and both are the same fact.
     Reading body alone reported the app transparent while the page was the right colour.
     NO BACKTICKS IN HERE — this whole block is a template literal and one ends it. */
  const painted = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const mainEl = document.querySelector("[data-probe='main']");
  out.checks.ground = mainEl ? painted(mainEl) : getComputedStyle(document.body).backgroundColor;
  out.checks.hScroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  /* The three column bottoms, read from the COLUMNS rather than from named cards. The first
     version named community/todo/activity — and Community stopped being the left column's last
     card the moment Pro rendered beneath it, so the check reported a 490px spread about three
     columns that were closing correctly. A column's bottom is the column's, whatever is in it. */
  const cols = [...document.querySelectorAll(".col, .os-colL, .os-colM, .os-colR")]
    .filter((e) => e.getBoundingClientRect().height > 0);
  const bottoms = cols.map((e) => { const r = e.getBoundingClientRect(); return num(r.y + r.height); });
  out.checks.columnBottoms = bottoms;
  out.checks.columnSpread = bottoms.length >= 3 ? num(Math.max(...bottoms) - Math.min(...bottoms)) : null;
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

/* ⚠️ THE GUARD FOR THE TRAP ABOVE, AND IT IS HERE BECAUSE I FELL INTO IT TWICE IN ONE PHASE.
   A backtick anywhere inside READ ends the template literal, and the file then dies at PARSE time
   with a message pointing at whatever word followed it — which reads like a typo in the browser
   code rather than what it is. Checked once, at load, naming the fault. */
if (READ.includes("\u0060")) {
  throw new Error("dash-refdiff: READ contains a backtick — it is a template literal and a backtick ends it.");
}

/**
 * ⚠️ NAVIGATION AND SIGN-IN GET A LONG LEASH, AND THAT IS NOT A TOLERANCE. This repo runs several
 * sessions in one checkout; measured here at a load average of 17, a `file://` load of the ref and
 * a cold Firebase auth both blew a 30s default and the run died with a TimeoutError that reads
 * exactly like a broken page. Nothing about what is COMPARED moves — the edge, size and font
 * tolerances are untouched. What moves is how long the harness is willing to wait for a page it has
 * not measured yet.
 */
const NAV_MS = 120_000;

async function readPage(page, url, { app } = {}) {
  page.setDefaultTimeout(NAV_MS);
  page.setDefaultNavigationTimeout(NAV_MS);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (app) await signIn(page);
  /* fonts settled and one paint past any entrance, or type reads at its fallback size */
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(app ? 2600 : 900);
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await page.waitForTimeout(160);
  /* the type scale's selectors for THIS side, handed to the page rather than baked into READ */
  const which = app ? 2 : 1;
  await page.evaluate(
    (rows) => document.documentElement.setAttribute("data-refdiff-scale", JSON.stringify(rows)),
    TYPE_SCALE.map((r) => [r[0], r[which]]),
  );
  const data = await page.evaluate(READ);
  /**
   * ⚠️ A SIGNED-OUT PAGE MUST STOP THE RUN, NOT BE MEASURED. This caught nothing on the round it was
   * missing from: the sign-in failed transiently, the harness measured the AUTH page, and reported
   * 92 plausible misses — every card at x 0, the hero headline at 14px — which reads exactly like a
   * layout regression and is nothing of the kind. That is the fault this whole pass exists to close,
   * committed inside the harness written to close it.
   *
   * The tell is cheap and total: the dashboard has sixteen probes, and the auth page has none of the
   * ones that matter. Fewer than twelve is not a page worth diffing.
   */
  if (app) {
    const n = Object.keys(data.probes).length;
    const authForm = await page.locator("#au-email, #au-pw").count();
    if (authForm > 0 || n < 12) {
      throw new Error(
        `dash-refdiff: the app page is not the signed-in dashboard — ${n}/16 probes found` +
        `${authForm ? ", and the sign-in form is on screen" : ""}. Refusing to diff it.`,
      );
    }
  }
  return data;
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
    page.locator(SHELL).first().waitFor({ state: "attached", timeout: 60000 }).then(() => "shell").catch(() => null),
    page.locator("#au-email").waitFor({ state: "attached", timeout: 60000 }).then(() => "form").catch(() => null),
  ]);
  if (settled === "shell") return;
  const pw = process.env.SA_E2E_PASSWORD || envLocal("SA_E2E_PASSWORD");
  if (!pw) throw new Error("No SA_E2E_PASSWORD — see tests/e2e/auth.setup.ts");
  await page.goto(`${APP}/#/signin`);
  await page.locator("#au-email").fill(process.env.SA_E2E_EMAIL || envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
  await page.locator("#au-pw").fill(pw);
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.locator(SHELL).first().waitFor({ state: "visible", timeout: 90000 });
  await page.goto(`${APP}/dashboard`, { waitUntil: "domcontentloaded" });
}

/* ── diffing ─────────────────────────────────────────────────────────────────────────────────── */

const rgb = (v) => (v || "").replace(/\s+/g, " ").trim();

/**
 * ⚠️ POSITION IS COMPARED RELATIVE TO `main`, NOT TO THE VIEWPORT — and this is a decision, not a
 * loosening. The ref never drew the app's nav: it has no rail and no bar, so its `main` starts at
 * the top of the window while the app's starts below a 77px control row the pack explicitly keeps
 * ("they are not in the ref because the ref did not draw the nav"). Comparing absolute `y` would
 * report that one fact as a miss on EVERY probe, at every width, forever — a number that can never
 * go to zero and tells you nothing about the design.
 *
 * ⚠️ `main` IS THE DATUM AND A DATUM IS NOT A SUBJECT. Its own box is REPORTED, never compared: its
 * y differs by the 77px control row the pack explicitly keeps, its height by the same, and its
 * width by the shell's gutters — three numbers that can never go to zero and that would sit in the
 * table forever teaching the reader to skip the first row. The table prints them so a silent shrink
 * is still visible; what is CHECKED is where things sit inside it, which is what a ref specifies.
 */
function diffOne(key, ref, app, refOrigin, appOrigin) {
  const misses = [];
  if (!ref) return [{ key, field: "ref", why: "the ref has no such probe" }];
  if (!app) return [{ key, field: "present", why: "the app renders no visible element for this probe" }];
  const anchor = ANCHOR[key] || "left";
  if (anchor === "datum") return misses;
  const off = (f, o) => (f === "x" ? o.x : f === "y" ? o.y : 0);
  const cmp = (field, rv0, av0, tol) => {
    const rv = Math.round(rv0 * 10) / 10, av = Math.round(av0 * 10) / 10;
    const d = Math.round((av - rv) * 10) / 10;
    if (Math.abs(d) > tol) misses.push({ key, field, ref: rv, app: av, delta: d, tol });
  };
  const near = (f, tol) => cmp(f, ref[f] - off(f, refOrigin), app[f] - off(f, appOrigin), tol);
  /* the right inset: how far the element's right edge sits from `main`'s */
  const rIn = (o, e) => o.x + o.w - (e.x + e.w);
  near("y", TOL.edge);
  if (anchor === "left") { near("x", TOL.edge); near("w", TOL.size); }
  else if (anchor === "right") { cmp("xr", rIn(refOrigin, ref), rIn(appOrigin, app), TOL.edge); near("w", TOL.size); }
  else { near("x", TOL.edge); cmp("xr", rIn(refOrigin, ref), rIn(appOrigin, app), TOL.edge); }
  near("h", TOL.size);
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

/**
 * ⚠️ THE SCALE IS COMPARED FOR SIZE, FAMILY AND WEIGHT — and a row missing on ONE side is a miss,
 * not a skip. A skip is how a type gate quietly stops covering the treatment nobody rebuilt yet;
 * the two cases are named apart so the table says which.
 */
function diffScale(key, ref, app) {
  if (!ref && !app) return [{ key, field: "scale", why: "neither side has this treatment" }];
  if (!ref) return [{ key, field: "scale", why: "no element in the REF for this row" }];
  if (!app) return [{ key, field: "scale", why: "no element in the APP for this row" }];
  const m = [];
  if (Math.abs(ref.size - app.size) > TOL.font) {
    m.push({ key, field: "size", ref: ref.size, app: app.size, delta: Math.round((app.size - ref.size) * 10) / 10, tol: TOL.font });
  }
  if (ref.family !== app.family) m.push({ key, field: "family", ref: ref.family, app: app.family });
  if (String(ref.weight) !== String(app.weight)) m.push({ key, field: "weight", ref: ref.weight, app: app.weight });
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
    m.push({ key: "page", field: "columnBottoms", why: "fewer than three columns were visible" });
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
  const rows = [...PROBES, ...TEXT_PROBES.map((t) => `text:${t}`), ...TYPE_SCALE.map(([k]) => `type:${k}`), "page"];
  for (const p of rows) {
    const cells = result.widths.map((w) => {
      const misses = result.byWidth[w].misses.filter((m) => m.key === p || `text:${m.key}` === p);
      if (!misses.length) return "·";
      return misses.map((m) => (m.why ? m.why : `${m.field} ${m.ref}→${m.app}`)).join("<br>");
    });
    if (cells.every((c) => c === "·")) { L.push(`| ${p} | ${cells.join(" | ")} |`); continue; }
    L.push(`| **${p}** | ${cells.join(" | ")} |`);
  }
  /* ⚠️ THE DATUM IS REPORTED, NEVER COMPARED — see `diffOne`. Printing it is what stops "not
     compared" turning into "not looked at": a `main` that silently halved would show here. */
  L.push(`| _main (datum, not compared)_ | ` + result.widths.map((w) => {
    const r = result.byWidth[w].ref.probes.main, a = result.byWidth[w].app.probes.main;
    const f = result.byWidth[w].app.viewportFitted;
    return r && a
      ? `ref ${Math.round(r.w)}×${Math.round(r.h)} · app ${Math.round(a.w)}×${Math.round(a.h)}` +
        (f ? ` (window ${f.width}×${f.height})` : "")
      : "—";
  }).join(" | ") + " |");
  L.push("");
  L.push(result.widths.map((w) => `**${w}**: ${result.byWidth[w].misses.length} misses`).join("  ·  "));
  L.push("");
  L.push(`**total misses: ${result.total}**`);
  return L.join("\n");
}

/* ── run ─────────────────────────────────────────────────────────────────────────────────────── */

const browser = await chromium.launch();
const result = { when: new Date().toISOString(), ref: "design-refs/dashboard-cappuccino-v22.html", app: APP, widths: WIDTHS, byWidth: {}, total: 0 };
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
      /* the self-test compares the ref against itself, so the datum is the SAME `main` on both
         sides — which is what makes a 40px shrink show up as a right-inset miss under `span`. */
      const sO = refData.probes.main ?? { x: 0, y: 0, w: 0 };
      selfTestSaw = diffOne("chart-card", broken.probes["chart-card"], refData.probes["chart-card"], sO, sO);
    }

    const appPage = await ctx.newPage();
    let appData = await readPage(appPage, `${APP}/dashboard`, { app: true });

    /**
     * ⚠️ THE APP IS RE-READ IN A WINDOW THAT GIVES IT THE REF'S OWN CONTENT BOX, AND THIS IS A
     * DATUM DECISION RATHER THAN A TOLERANCE.
     *
     * Both grids are viewport-driven — the ref's `.grid3` is `min-height: calc(100vh - 176px)` and
     * the app's fills what the shell leaves it. The app's shell spends 84px at 1456 on a control
     * row the pack explicitly keeps ("they are not in the ref because the ref did not draw the
     * nav"), so its content box is 84px shorter and every card with any flex in it absorbs a share.
     * Measured before this: the chart card 52px short, goals 78px short, and a `y` miss on every
     * probe beneath either of them — nine numbers reporting one fact, none of them fixable, and all
     * of them room for a real height fault to hide in.
     *
     * The same holds across: the app's `main` is 1650 wide at 1920 where the ref's is 1634, so its
     * elastic middle track is 16px wider and anything whose HEIGHT derives from its width — the plot
     * has the ref's 1000:330 ratio — is then wrong in the other axis too.
     *
     * ⚠️ WHAT MOVES IS THE WINDOW, NOT A TOLERANCE, AND IT MOVES BY A MEASURED DIFFERENCE RATHER
     * THAN A CHOSEN ONE. The pack's three widths are the design intent and they are unchanged; the
     * app is simply given a window in which the box the design describes is the same size on both
     * sides. Both deltas stay inside the same media-query regime at all three widths (16px at 1920
     * does not cross 1700), so the app is measured in the layout the width names. A card that is
     * genuinely the wrong height still fails, which is the test of whether this is a datum or a
     * fudge — and the self-test proves that on every run.
     */
    const rM = refData.probes.main, aM = appData.probes.main;
    const dw = rM && aM ? Math.round(rM.w - aM.w) : 0;
    const dh = rM && aM ? Math.round(rM.h - aM.h) : 0;
    if (Math.abs(dw) > 1 || Math.abs(dh) > 1) {
      const fit = await browser.newContext({
        viewport: { width: width + dw, height: HEIGHT + dh }, deviceScaleFactor: 1,
      });
      const fitPage = await fit.newPage();
      appData = await readPage(fitPage, `${APP}/dashboard`, { app: true });
      appData.viewportFitted = { dw, dh, width: width + dw, height: HEIGHT + dh };
      await fit.close();
    }

    const misses = [];
    /* the datum: each side's own `main`. Absent on either side and the comparison falls back to
       the viewport, which is honest — a page with no `main` has bigger problems than an offset. */
    const rO = refData.probes.main ?? { x: 0, y: 0, w: 0 };
    const aO = appData.probes.main ?? { x: 0, y: 0, w: 0 };
    for (const k of PROBES) misses.push(...diffOne(k, refData.probes[k], appData.probes[k], rO, aO));
    for (const k of TEXT_PROBES) misses.push(...diffText(k, refData.text[k], appData.text[k]));
    for (const [k] of TYPE_SCALE) misses.push(...diffScale(`type:${k}`, refData.scale[k], appData.scale[k]));
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
  /* ⚠️ THE CLAIM IS "A 40px BREAK IS SEEN AS 40px", NOT "A FIELD CALLED `w` IS REPORTED".
     This asserted the field NAME and went red the day `chart-card` became a `span` probe, where a
     width break is reported as a right-inset — the break was caught, in the right size, and the
     self-test called the harness untrustworthy over the spelling of the column heading. */
  const ok = Array.isArray(selfTestSaw) && selfTestSaw.some((m) => Math.abs(Math.abs(m.delta ?? 0) - 40) < 2);
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
