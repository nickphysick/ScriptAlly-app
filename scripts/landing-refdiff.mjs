#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE LANDING REF-DIFF ═════════════════════════════════════════════════════════════════════
 *
 * ⚠️ IT ASKS ONE QUESTION — "where does the ref put this, and where does the app put it" — of the
 * hero, the bird's-eye band and the vision section, at 1440, in the SAME headless browser. Neither
 * side gets a different engine, a different device pixel ratio or a different font stack to hide
 * behind. That is the whole reason it exists: a measurement that only asks the questions its author
 * thought of confirms the author's model of the page rather than the page.
 *
 * ⚠️ THE REF IS THE ORACLE AT 1440 AND NOWHERE ELSE. `design-refs/landing-v6.html` is a fixed
 * 1440px frame with no media queries, so every "difference" it reports at another width is the ref
 * failing to respond. One width, stated, rather than a sweep whose extra rows mean nothing.
 *
 * ⚠️ AND SOME DIFFERENCES ARE DECISIONS, NOT FAULTS. The hero keeps the page's own 1180/56 container
 * where the ref was drawn at 1440/120 — so the copy column starts 66px further right and every
 * x-position downstream follows. Those are listed in `EXPECTED` with the reason, and printed as
 * `expected` rather than silently subtracted: a tolerance that hides a known difference also hides
 * the day it stops being the one you knew about.
 *
 * ⚠️ IT SERVES `dist/` ITSELF. A harness that needs a server started beside it is a harness that
 * measures whatever happened to be on that port — the `SA_E2E_BASE_URL` fault this repo already
 * records, where an unset variable produced true readings about the wrong build. Here the script
 * owns the server, it dies with the run, and the bundle it serves is checked against `src/` first.
 *
 * ⚠️ AND IT MUST BE PROVED RED BEFORE ANYTHING IS BUILT ON IT. `--self-test` moves one probe in the
 * loaded REF and requires the miss to be reported; the run refuses to continue if it is not.
 *
 * USAGE
 *   node scripts/landing-refdiff.mjs               verify — table + JSON, exits 1 on an unexpected miss
 *   node scripts/landing-refdiff.mjs --self-test   prove the harness reports a miss it should
 *   node scripts/landing-refdiff.mjs --all         print the expected differences too
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = join(ROOT, "design-refs", "landing-v6.html");
const DIST = join(ROOT, "dist");
const WIDTH = 1440;
const HEIGHT = 1000;
/** Anything in the vision section over this is a fault; the brief says report over 2px. */
const TOL = 2;

/* ── the probes ───────────────────────────────────────────────────────────────────────────────
   ⚠️ THE APP IS ALWAYS READ BY ITS OWN CLASS AND THE REF BY ITS OWN, AND THE MAP IS ONE-WAY. A
   probe that could be re-pointed on the app's side is a probe that can be made to pass by moving
   the question; the app selector is fixed, and only the ref's translation lives in a table. */
/* ⚠️ TYPE IS ONLY COMPARED ON THINGS THAT SET TYPE. A figure and an `<img>` inherit a family, a
   colour and a line-height from whatever wraps them, so comparing those across two documents with
   different body fonts produces a page of differences about nothing — noise that buries the rows
   worth reading. `box` probes are compared on geometry alone. */
const BOX_ONLY = new Set(["band", "points", "fig1", "fig2", "fig3", "img1", "img2", "img3", "shadow"]);

const PROBES = [
  // section, name, app selector, ref selector
  ["hero", "h1", ".mk-herotitle", "h1"],
  ["hero", "sub", ".mk-herosub", ".sub"],
  ["hero", "cta", ".mk-heropill", ".solid"],
  ["hero", "link", ".mk-herolink", ".ghost"],
  ["hero", "shadow", ".mk-heroart img", ".shadow"],
  ["hero", "navcta", ".mk-navright .mk-btn--navy", ".dash"],

  ["band", "eyebrow", ".mk-stateyebrow", ".band .eyebrow"],
  ["band", "heading", ".mk-stattitle", ".band h2"],

  ["vision", "band", ".mk-vision", ".vision"],
  ["vision", "h2", ".mk-visionh2", ".vision h2"],
  ["vision", "points", ".mk-visionpoints", ".points"],
  ["vision", "fig1", ".mk-vpoint:nth-child(1) .mk-vfig", ".points > div:nth-child(1) figure"],
  ["vision", "img1", ".mk-vpoint:nth-child(1) .mk-vfig img", ".points > div:nth-child(1) img"],
  ["vision", "h3a", ".mk-vpoint:nth-child(1) .mk-vh3", ".points > div:nth-child(1) h3"],
  ["vision", "p1", ".mk-vpoint:nth-child(1) .mk-vbody", ".points > div:nth-child(1) p"],
  ["vision", "p2", ".mk-vpoint:nth-child(2) .mk-vbody", ".points > div:nth-child(2) p"],
  ["vision", "p3", ".mk-vpoint:nth-child(3) .mk-vbody", ".points > div:nth-child(3) p"],
  ["vision", "fig2", ".mk-vpoint:nth-child(2) .mk-vfig", ".points > div:nth-child(2) figure"],
  ["vision", "img2", ".mk-vpoint:nth-child(2) .mk-vfig img", ".points > div:nth-child(2) img"],
  ["vision", "h3b", ".mk-vpoint:nth-child(2) .mk-vh3", ".points > div:nth-child(2) h3"],
  ["vision", "fig3", ".mk-vpoint:nth-child(3) .mk-vfig", ".points > div:nth-child(3) figure"],
  ["vision", "img3", ".mk-vpoint:nth-child(3) .mk-vfig img", ".points > div:nth-child(3) img"],
  ["vision", "h3c", ".mk-vpoint:nth-child(3) .mk-vh3", ".points > div:nth-child(3) h3"],
  ["vision", "more", ".mk-visionmore", ".vision .more"],
];

/**
 * Differences agreed in advance, with the reason. Matched on `<probe>.<field>`; a `why` is printed
 * beside the number so nobody has to remember which of them were decisions.
 *
 * ⚠️ THE HERO'S ARE A FAMILY, NOT A LIST OF VALUES. Keeping the page's 1180/56 container moves the
 * copy column's left edge from 120 to 186, so every x in the hero and the band follows. Listing the
 * FIELD rather than a tolerance is what keeps the size claims live: `h1.w` is still compared.
 */
const EXPECTED = [
  [/^hero\.\w+\.(x|right|cx)$/, "the hero keeps the page's 1180/56 container; the ref was drawn at 1440/120"],
  [/^band\.\w+\.(x|right|cx|w)$/, "same container — the band's column is 1068 against the ref's 1200"],
  [/^hero\.h1\.(fontSize|w|h|lineHeight|letterSpacing|bottom|y)$/, "the headline stays at 74px; the ref draws 68"],
  [/^hero\.sub\.(fontSize|w|h|lineHeight|y|bottom|maxWidth)$/, "the sub stays 21px/1.65; the ref draws 19/1.7"],
  [/^hero\.(cta|link|shadow|navcta)\.(y|bottom|h|w)$/, "follows the headline and sub above it, and the narrower art column"],
  [/^hero\.shadow\.(fontSize|lineHeight|letterSpacing|color)$/, "not text"],
  [/^band\.eyebrow\.(fontSize|letterSpacing|h|y|bottom|lineHeight)$/, "the eyebrow is left as it is: 21px/.13em against the ref's 17/.2em"],
  [/^band\.heading\.(fontSize|h|y|bottom|lineHeight|letterSpacing)$/, "33px, not the ref's 34 — 34 overflows a 1068px column by 3.4px"],
  [/^vision\.(band|h2|points|fig\d|img\d|h3[abc]|p\d|more)\.(x|right|cx|y|bottom)$/, "the band sits lower on a page whose hero and band differ above it, and 66px further in"],
  [/^vision\.(points|fig\d|p\d|h3[abc])\.w$/, "the column is 318.7px against the ref's 362.7 — the page's own container"],
  [/^vision\.img2\.w$/, "the current artwork carries a paper aeroplane the ref's older export cropped off"],
  [/^vision\.h2\.w$/, "the band's column is 1068 against the ref's 1200 — the page's own container"],
  [/^vision\.(band|points|p1|p3)\.h$/, "paragraphs 1 and 3 take one more line each in a 318.7px measure where the ref's 330 just holds them"],
  [/^hero\.navcta\.(fontFamily|fontWeight)$/, "the nav button's family and weight are the tier's and were left unchanged"],
  [/^\w+\.\w+\.lineHeight$/, "the ref leaves these at `normal`; the app states a value, and the rendered heights agree"],
];

const expectedFor = (key) => (EXPECTED.find(([re]) => re.test(key)) ?? [])[1] ?? null;

/* ── the page-side reader ─────────────────────────────────────────────────────────────────────
   ⚠️ A REAL FUNCTION, NOT A TEMPLATE STRING, AND THAT IS NOT A STYLE CHOICE. `page.evaluate` DOES
   NOT PASS ARGUMENTS to a string page-function — it evaluates the expression and drops the rest. It
   does not throw: the probe list simply never arrives, the reader returns `undefined`, and the
   failure lands two hundred lines later as "cannot read properties of undefined". Measured here
   before it was fixed.
   ⚠️ AND A FUNCTION IS ALSO WHAT MAKES A REGEX SAFE IN HERE. The house rule — never write a regex
   inside a `page.evaluate` TEMPLATE — exists because the template eats the escape before the
   browser sees it (`\s` becomes the letter s, a backtick ends the literal). A function is
   serialised by Playwright rather than interpolated, so its source survives intact. */
const READ = (arg) => {
  const probes = arg.probes;
  const out = {};
  for (const [section, name, sel] of probes) {
    const el = document.querySelector(sel);
    if (!el) { out[section + "." + name] = null; continue; }
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    out[section + "." + name] = {
      x: b.x, right: b.right, cx: b.x + b.width / 2,
      y: b.y + scrollY, bottom: b.bottom + scrollY,
      w: b.width, h: b.height,
      fontSize: parseFloat(cs.fontSize),
      lineHeight: cs.lineHeight === "normal" ? null : parseFloat(cs.lineHeight),
      letterSpacing: cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing),
      fontFamily: cs.fontFamily.split(",")[0].split('"').join("").trim(),
      fontWeight: cs.fontWeight,
      color: cs.color,
      background: cs.backgroundColor,
      maxWidth: cs.maxWidth === "none" ? null : parseFloat(cs.maxWidth),
    };
  }
  /* ⚠️ INK, NOT THE BOX, FOR ANYTHING HELD ON ONE LINE. A `nowrap` fails by SPILLING out of its
     element, so the element's own rect is unchanged and a geometry diff reports nothing at all. The
     page's own padding usually swallows the spill, so no scrollbar appears either. This reads the
     rendered text runs and the column that is meant to hold them. */
  out.__ink = {};
  for (const [name, sel] of Object.entries(arg.ink)) {
    const el = sel && document.querySelector(sel);
    if (!el) { out.__ink[name] = null; continue; }
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const inner = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    out.__ink[name] = {
      lines: rects.length,
      widest: rects.length ? Math.max.apply(null, rects.map((r) => r.width)) : 0,
      column: inner,
      overflow: (rects.length ? Math.max.apply(null, rects.map((r) => r.width)) : 0) - inner,
    };
  }
  out.__doc = { scrollWidth: document.documentElement.scrollWidth };
  return out;
};

const NUMERIC = ["x", "right", "cx", "y", "bottom", "w", "h", "fontSize", "lineHeight", "letterSpacing", "maxWidth"];
const TEXTUAL = ["fontFamily", "fontWeight", "color", "background"];

/** A tiny static server for `dist/` — the harness owns it, so nothing can be running in its place. */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2",
  ".ico": "image/x-icon", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
function serveDist() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(req.url.split("?")[0]);
    let file = join(DIST, path);
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port })));
}

/**
 * ⚠️ REFUSE TO MEASURE A BUNDLE OLDER THAN ITS SOURCES. The alternative is reporting your own edit
 * as absent — which this repo has done, confidently, more than once.
 */
function assertBundleFresh() {
  const index = join(DIST, "index.html");
  if (!existsSync(index)) { console.error("✗ no dist/ — run `npm run build:dev` first"); process.exit(1); }
  const built = statSync(index).mtimeMs;
  let newest = 0, newestFile = "";
  const walk = (dir) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else { const m = statSync(p).mtimeMs; if (m > newest) { newest = m; newestFile = p; } }
    }
  };
  walk(join(ROOT, "src"));
  if (newest > built) {
    console.error(`✗ dist/ predates src/ — ${newestFile.replace(ROOT + "/", "")} is newer than the build`);
    console.error("  rebuild:  npm run build:dev");
    process.exit(1);
  }
}

const num = (v) => (v === null || v === undefined ? null : Math.round(v * 10) / 10);

async function run() {
  const selfTest = process.argv.includes("--self-test");
  const showAll = process.argv.includes("--all");
  assertBundleFresh();

  const { server, port } = await serveDist();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

  /* ⚠️ NOT `networkidle`. The app opens a Firebase channel and holds it, so the idle event never
     arrives and the run dies at 30s looking like a broken page. Wait for the thing being measured
     to exist instead — which is also the stronger check: it fails if the section never rendered. */
  /* ⚠️ EVERY STEP ANNOUNCES ITSELF. A harness that hangs silently reads as a broken page; this repo
     has spent hours on exactly that (a 16-minute run that was a socket, not an assertion). */
  const step = (m) => process.stderr.write("  · " + m + "\n");
  const read = async (url, mutate, landmark) => {
    const isRef = url.startsWith("file:");
    const imgSelectors = PROBES.filter(([, n]) => n === "shadow" || n.startsWith("img"))
      .map(([, , a, r]) => (isRef ? r : a));
    const page = await ctx.newPage();
    step("goto " + (url.startsWith("file:") ? "ref" : "app"));
    await page.goto(url, { waitUntil: "load" });
    step("wait for " + landmark);
    await page.waitForSelector(landmark, { state: "attached", timeout: 30000 });
    step("fonts");
    await page.evaluate(() => document.fonts.ready);
    /* ⚠️ EAGER, NOT A SCROLL DANCE. Walking the page to the bottom and back USUALLY starts the lazy
       images and does not always: the page grows as they arrive, so a loop bounded by the height it
       read first stops early, and anything still pending when it returns to the top stays pending.
       Flipping the attribute asks for them outright and is the only version that is deterministic.
       Measured before this: five images still PENDING after two full-page scrolls. */
    await page.evaluate(() => { for (const i of document.images) i.loading = "eager"; });
    /* ⚠️ WAIT ON THE IMAGES THIS MEASURES, NOT ON `document.images`. A `loading="lazy"` image that
       has never been asked for reports `complete === false` and fires NEITHER `load` NOR `error` —
       so a blanket `Promise.all` over every incomplete image waits forever, with no error and
       nothing to point at. It looks exactly like a broken page. The plates are scrolled past above,
       which is what starts them; this waits for the ones with a probe on them and nothing else. */
    step("images");
    await page.waitForFunction((sels) => sels.every((s) => {
      const i = document.querySelector(s);
      return !i || (i.complete && i.naturalWidth > 0);
    }), imgSelectors, { timeout: 20000 });
    if (mutate) await page.evaluate(mutate);
    /* Settle: the nav condenses on scroll and the page has entrance transitions. Read at rest. */
    step("settle");
    await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    step("read");
    const pick = (section, name) => {
      const row = PROBES.find(([s, n]) => s === section && n === name);
      return isRef ? row[3] : row[2];
    };
    const out = await page.evaluate(READ, {
      probes: PROBES.map(([s, n, a, r]) => [s, n, isRef ? r : a]),
      ink: {
        h1: pick("hero", "h1"), bandHeading: pick("band", "heading"),
        vh3a: pick("vision", "h3a"), vh3b: pick("vision", "h3b"), vh3c: pick("vision", "h3c"),
        vp1: pick("vision", "p1"), vp2: pick("vision", "p2"), vp3: pick("vision", "p3"),
      },
    });
    step("done");
    await page.close();
    return out;
  };

  const refUrl = pathToFileURL(REF).href;
  const appUrl = `http://127.0.0.1:${port}/`;
  /* ⚠️ THE SELF-TEST MOVES THE REF, NOT THE APP. Mutating the app would prove the app can be broken;
     mutating the oracle proves the COMPARISON reports a difference it should. */
  const refData = await read(refUrl, selfTest ? () => { document.querySelector(".points").style.gap = "96px"; } : null, ".vision .points");
  const appData = await read(appUrl, null, ".mk-visionpoints");

  const rows = [];
  for (const [section, name] of PROBES) {
    const key = section + "." + name;
    const a = appData[key], r = refData[key];
    if (!a || !r) { rows.push({ key, field: "—", app: a ? "found" : "MISSING", ref: r ? "found" : "MISSING", delta: null, why: null, miss: true }); continue; }
    const boxOnly = BOX_ONLY.has(name);
    for (const f of NUMERIC) {
      if (boxOnly && (f === "fontSize" || f === "lineHeight" || f === "letterSpacing")) continue;
      if (a[f] === null && r[f] === null) continue;
      if (a[f] === null || r[f] === null) { rows.push({ key: key + "." + f, field: f, app: num(a[f]), ref: num(r[f]), delta: null, why: expectedFor(key + "." + f), miss: !expectedFor(key + "." + f) }); continue; }
      const d = a[f] - r[f];
      if (Math.abs(d) <= TOL) continue;
      const why = expectedFor(key + "." + f);
      rows.push({ key: key + "." + f, field: f, app: num(a[f]), ref: num(r[f]), delta: num(d), why, miss: !why });
    }
    for (const f of TEXTUAL) {
      if (boxOnly && f !== "background") continue;
      if (a[f] === r[f]) continue;
      const why = expectedFor(key + "." + f);
      rows.push({ key: key + "." + f, field: f, app: a[f], ref: r[f], delta: null, why, miss: !why });
    }
  }

  const misses = rows.filter((x) => x.miss);
  const expected = rows.filter((x) => !x.miss);

  const table = (list, title) => {
    if (!list.length) { console.log(`\n${title}: none`); return; }
    console.log(`\n${title} (${list.length}):`);
    console.log("  " + "probe.field".padEnd(30) + "app".padEnd(14) + "ref".padEnd(14) + "Δ");
    for (const x of list) {
      console.log("  " + x.key.padEnd(30) + String(x.app).padEnd(14) + String(x.ref).padEnd(14) +
        (x.delta === null ? "" : String(x.delta)) + (x.why ? "   · " + x.why : ""));
    }
  };

  console.log(`landing ref-diff @ ${WIDTH}px — ref ${REF.replace(ROOT + "/", "")}, app dist/ on :${port}`);
  console.log(`document scrollWidth: app ${appData.__doc.scrollWidth}, ref ${refData.__doc.scrollWidth} (viewport ${WIDTH})`);
  console.log("\nINK — rendered text against the column that must hold it:");
  console.log("  " + "run".padEnd(14) + "app lines/widest/column/over".padEnd(34) + "ref lines/widest/column/over");
  const fmt = (i) => i ? `${i.lines}  ${num(i.widest)} / ${num(i.column)}  ${num(i.overflow) > 0 ? "OVER " + num(i.overflow) : "ok"}` : "—";
  /* ⚠️ THE HEADLINE'S OVERFLOW IS THE DESIGN, AND IT IS THE ONE EXEMPTION. "The hunt begins." at
     74px is deliberately wider than its column so it runs across the shadow beside it; the page
     cannot scroll sideways because `html`/`body` clip that axis. What must hold is not that it
     stays inside its box but that the SHADOW stays out of its way — asserted below, in pixels, as
     the thing the rule actually claims. Exempting it without that check would be a hole. */
  const SANCTIONED = new Set(["h1"]);
  const spilling = [];
  for (const name of Object.keys(appData.__ink)) {
    const a = appData.__ink[name], r = refData.__ink[name];
    if (a && a.overflow > 0.5 && !SANCTIONED.has(name)) spilling.push(`${name}: ink ${num(a.widest)} in a ${num(a.column)} column`);
    console.log("  " + name.padEnd(14) + fmt(a).padEnd(34) + fmt(r) + (SANCTIONED.has(name) && a && a.overflow > 0.5 ? "   · overflow is the design — see the clearance below" : ""));
  }

  /* ⚠️ THE CLEARANCE IS THE HERO'S WHOLE RULE, AND NO BOX COMPARISON CAN SEE IT. The headline's ink
     leaves its element, so the gap between the words and the wing is a fact about a text run and an
     image — two things that never appear in one rect. Measured here, on both sides, at the width
     the ref was drawn at. */
  const inkRight = await (async () => {
    const page = await ctx.newPage();
    await page.goto(appUrl, { waitUntil: "load" });
    await page.waitForSelector(".mk-herotitle", { state: "attached", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    const v = await page.evaluate(() => {
      const h = document.querySelector(".mk-herotitle");
      const range = document.createRange();
      range.selectNodeContents(h);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
      const shadow = document.querySelector(".mk-heroart img").getBoundingClientRect();
      return {
        ink: Math.max.apply(null, rects.map((r) => r.right)),
        shadowLeft: shadow.x, shadowRight: shadow.right, shadowW: shadow.width,
        viewport: document.documentElement.clientWidth,
      };
    });
    await page.close();
    return v;
  })();
  const clear = inkRight.shadowLeft - inkRight.ink;
  const edge = inkRight.viewport - inkRight.shadowRight;
  console.log("\nHERO SHADOW — placed by rule, so the rule is what is measured:");
  console.log(`  headline ink ends   ${num(inkRight.ink)}`);
  console.log(`  wing tip starts     ${num(inkRight.shadowLeft)}   clearance ${num(clear)}  (minimum 24)`);
  console.log(`  shadow right edge   ${num(inkRight.shadowRight)}   from viewport ${num(edge)}  (minimum 24)`);
  console.log(`  shadow width        ${num(inkRight.shadowW)}   (104% of the art column when both margins hold)`);
  const heroFaults = [];
  if (clear < 24) heroFaults.push(`the wing is ${num(24 - clear)}px inside the headline's clearance`);
  if (edge < 24) heroFaults.push(`the shadow is ${num(24 - edge)}px inside the viewport's margin`);
  if (showAll) table(expected, "EXPECTED — agreed differences");
  else console.log(`\nexpected differences: ${expected.length} (run with --all to list them)`);
  table(misses, "MISSES — over " + TOL + "px and not agreed");

  mkdirSync(join(ROOT, "run-artifacts"), { recursive: true });
  writeFileSync(resolve(ROOT, "run-artifacts", "landing-refdiff.json"),
    JSON.stringify({ width: WIDTH, misses, expected }, null, 2));

  if (selfTest) {
    const caught = misses.some((x) => x.key.startsWith("vision.") && x.field === "w");
    console.log(caught
      ? "\n✓ self-test: the harness reported the miss it was given"
      : "\n✗ self-test: the harness did NOT report a moved probe — it proves nothing");
    process.exit(caught ? 0 : 1);
  }
  /* ── the hero's rule at every two-column width ───────────────────────────────────────────────
     ⚠️ THE REF CANNOT ANSWER THIS AND THAT IS WHY IT IS HERE. It is a fixed 1440 frame; the rule it
     was translated into claims something at EVERY width the hero is two columns, and a law that
     holds at exactly one width is a coincidence. The shrink is the half worth watching: past ~1375
     the 104% stops fitting and the picture has to give way rather than the clearance. */
  const SWEEP = [1920, 1600, 1440, 1375, 1280, 1180, 1000, 901];
  console.log("\nHERO SWEEP — the rule at every width the hero is two columns:");
  console.log("  " + "width".padEnd(8) + "ink ends".padEnd(11) + "wing at".padEnd(10) + "clear".padEnd(8) +
    "shadow w".padEnd(11) + "from edge".padEnd(11) + "scrollW");
  for (const w of SWEEP) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: HEIGHT });
    await page.goto(appUrl, { waitUntil: "load" });
    await page.waitForSelector(".mk-herotitle", { state: "attached", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    const v = await page.evaluate(() => {
      const h = document.querySelector(".mk-herotitle");
      const range = document.createRange();
      range.selectNodeContents(h);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
      const img = document.querySelector(".mk-heroart img").getBoundingClientRect();
      const grid = getComputedStyle(document.querySelector(".mk-hero")).gridTemplateColumns;
      return {
        ink: Math.max.apply(null, rects.map((r) => r.right)),
        x: img.x, right: img.right, w: img.width,
        viewport: document.documentElement.clientWidth,
        scrollW: document.documentElement.scrollWidth,
        twoCol: grid.split(" ").length === 2,
      };
    });
    await page.close();
    if (!v.twoCol) { console.log("  " + String(w).padEnd(8) + "stacked — the rule does not apply"); continue; }
    const c = v.x - v.ink, e = v.viewport - v.right;
    console.log("  " + String(w).padEnd(8) + num(v.ink).toString().padEnd(11) + num(v.x).toString().padEnd(10) +
      num(c).toString().padEnd(8) + num(v.w).toString().padEnd(11) + num(e).toString().padEnd(11) + v.scrollW);
    if (c < 24) heroFaults.push(`${w}: the wing is ${num(24 - c)}px inside the headline's clearance`);
    if (e < 24) heroFaults.push(`${w}: the shadow is ${num(24 - e)}px inside the viewport's margin`);
    if (v.scrollW > w) heroFaults.push(`${w}: the page scrolls sideways (scrollWidth ${v.scrollW})`);
  }

  await browser.close();
  server.close();

  if (heroFaults.length) {
    console.log("\n✗ the hero's placement rule is broken:");
    heroFaults.forEach((x) => console.log("   " + x));
    process.exit(1);
  }
  if (spilling.length) {
    console.log("\n✗ text is spilling out of its column — a `nowrap` that fails by overflow:");
    spilling.forEach((x) => console.log("   " + x));
    process.exit(1);
  }
  if (appData.__doc.scrollWidth > WIDTH) {
    console.log(`\n✗ the app scrolls horizontally at ${WIDTH} (scrollWidth ${appData.__doc.scrollWidth})`);
    process.exit(1);
  }
  process.exit(misses.length ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
