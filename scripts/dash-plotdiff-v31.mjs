/**
 * v31 · Phase 2 — PIXEL-DIFF THE PLOT.
 *
 * The chart's interior is generated at runtime, so the box diff has never looked inside it. This
 * renders both sides with the SAME NUMBERS and compares the rendered pixels of the `plot` probe.
 *
 * ⚠️ THE FIXTURES ARE MADE TO MATCH BY FEEDING THE APP'S SERIES INTO THE REF, not the other way
 * round. The ref is a static mockup whose data is a `const` in its own script — unreachable from
 * `page.evaluate` and unassignable — so the substitution happens on an IN-MEMORY COPY of its HTML,
 * three targeted replacements (the series, the labels, the point count). The file on disk is never
 * touched and its md5 is unchanged; the modified copy is loaded through `setContent`.
 *
 * ⚠️ AND IF THE SUBSTITUTION FAILS, THE RUN SAYS SO AND COMPARES NOTHING. Diffing pixels of two
 * different datasets and calling the difference a miss is worse than not looking.
 *
 * Every browser-side read is a real function, never a template literal.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
/* ⚠️ the ref path is `dash-ref.mjs`'s, never a copy — see that file */
import { REF_REL } from "./dash-ref.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";
const REF = join(ROOT, REF_REL);
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const OUT = process.env.SA_PLOTDIFF_OUT || join(ROOT, "run-artifacts", "plotdiff");
const WIDTHS = (process.env.SA_WIDTHS || "1536,1710,1920,2520").split(",").map(Number);

function envLocal(k) {
  const f = join(ROOT, ".env.local");
  if (!existsSync(f)) return null;
  for (const l of readFileSync(f, "utf8").split("\n")) {
    const m = new RegExp("^\\s*" + k + "\\s*=\\s*(.*)$").exec(l);
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
  await page.goto(APP + "/#/signin");
  await page.locator("#au-email").fill(process.env.SA_E2E_EMAIL || envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
  await page.locator("#au-pw").fill(process.env.SA_E2E_PASSWORD || envLocal("SA_E2E_PASSWORD"));
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.locator(SHELL).first().waitFor({ state: "visible", timeout: 90000 });
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
}

/** the app's own series, as published on the plot for exactly this purpose */
function readSeries() {
  const el = document.querySelector('[data-probe="plot"]');
  const raw = el && el.getAttribute("data-series");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

/**
 * decode a PNG data URL and hand back the raw pixels at a requested size — the canvas does the
 * normalising, so two crops of the same box but different device rounding still compare.
 */
function decodeTo(arg) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = arg.w; c.height = arg.h;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, arg.w, arg.h);
      resolve([...ctx.getImageData(0, 0, arg.w, arg.h).data]);
    };
    img.src = arg.url;
  });
}

const browser = await chromium.launch();
const results = [];
mkdirSync(OUT, { recursive: true });

for (const W of WIDTHS) {
  const line = { width: W };
  const ctx = await browser.newContext({ viewport: { width: W, height: 1150 }, deviceScaleFactor: 1 });

  /* ── the app ─────────────────────────────────────────────────────────────────────────────── */
  const appPage = await ctx.newPage();
  appPage.setDefaultTimeout(120000);
  await appPage.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  await signIn(appPage);
  await appPage.evaluate(() => document.fonts.ready).catch(() => {});
  await appPage.waitForTimeout(2600);
  await appPage.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await appPage.waitForTimeout(200);
  const series = await appPage.evaluate(readSeries);
  const appBox = await appPage.locator('[data-probe="plot"]').first().boundingBox();
  if (!series || !appBox) {
    line.skipped = !series ? "the app publishes no data-series" : "no plot box";
    results.push(line); await ctx.close(); continue;
  }
  line.points = series.v.length;
  const appShot = await appPage.locator('[data-probe="plot"]').first().screenshot();

  /* ── the ref, with the app's numbers substituted in memory ───────────────────────────────── */
  let html = readFileSync(REF, "utf8");
  const subs = [];
  const wd = JSON.stringify(series.v.map((r) => [r[0], r[1], r[2], 0]));
  const before = html;
  html = html.replace("const WD=WS.map(band);", "const WD=" + wd + ";");
  if (html !== before) subs.push("WD");
  /* ⚠️ THE APP'S OWN LABELS, NOT PLACEHOLDERS. The first run substituted P1..P9 and the diff
     dutifully reported every glyph of the label row as a difference — a difference the harness had
     created. A fixture made to match must match in what it SAYS as well as in what it counts. */
  const labels = JSON.stringify(series.lab);
  const b2 = html;
  html = html.replace(/const WK=\[[^\]]*\];/, "const WK=" + labels + ";");
  if (html !== b2) subs.push("WK");
  const b3 = html;
  html = html.replace("const ST={monthly:false,daily:false,n:8,dragP:null};",
    "const ST={monthly:false,daily:false,n:" + series.v.length + ",dragP:null};");
  if (html !== b3) subs.push("ST.n");
  line.substitutions = subs;

  if (subs.length < 3) {
    line.skipped = "the ref's fixture could not be substituted (" + subs.join(",") + ") — structure only, no pixel claim";
    results.push(line); await ctx.close(); continue;
  }

  const refPage = await ctx.newPage();
  refPage.setDefaultTimeout(120000);
  await refPage.setContent(html, { waitUntil: "domcontentloaded" });
  await refPage.evaluate(() => document.fonts.ready).catch(() => {});
  await refPage.waitForTimeout(900);
  await refPage.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await refPage.waitForTimeout(200);
  const refSeries = await refPage.evaluate(() => (typeof WD === "undefined" ? null : WD));
  line.refPoints = refSeries ? refSeries.length : null;
  const refBox = await refPage.locator('[data-probe="plot"]').first().boundingBox();
  if (!refBox) { line.skipped = "no ref plot box"; results.push(line); await ctx.close(); continue; }
  const refShot = await refPage.locator('[data-probe="plot"]').first().screenshot();

  line.appBox = { w: Math.round(appBox.width), h: Math.round(appBox.height) };
  line.refBox = { w: Math.round(refBox.width), h: Math.round(refBox.height) };

  /* ── normalise both to one size and diff ─────────────────────────────────────────────────── */
  const w = Math.min(Math.round(appBox.width), Math.round(refBox.width));
  const h = Math.min(Math.round(appBox.height), Math.round(refBox.height));
  const a = await appPage.evaluate(decodeTo, { url: "data:image/png;base64," + appShot.toString("base64"), w, h });
  const b = await appPage.evaluate(decodeTo, { url: "data:image/png;base64," + refShot.toString("base64"), w, h });

  let sum = 0, max = 0, n = 0;
  const diff = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    sum += d; n++; if (d > max) max = d;
    diff[i] = 255 - d; diff[i + 1] = 255 - d; diff[i + 2] = 255 - d; diff[i + 3] = 255;
  }
  line.mean = Math.round((sum / n) * 100) / 100;
  line.max = max;
  line.size = { w, h };

  const png = async (data, name) => {
    const url = await appPage.evaluate((arg) => {
      const c = document.createElement("canvas");
      c.width = arg.w; c.height = arg.h;
      const cx = c.getContext("2d");
      cx.putImageData(new ImageData(new Uint8ClampedArray(arg.px), arg.w, arg.h), 0, 0);
      return c.toDataURL("image/png");
    }, { px: [...data], w, h });
    writeFileSync(join(OUT, name), Buffer.from(url.split(",")[1], "base64"));
  };
  writeFileSync(join(OUT, "app-" + W + ".png"), appShot);
  writeFileSync(join(OUT, "ref-" + W + ".png"), refShot);
  await png(diff, "diff-" + W + ".png");

  results.push(line);
  await ctx.close();
}
await browser.close();

console.log("# plot region diff · " + new Date().toISOString());
for (const r of results) {
  if (r.skipped) { console.log("  " + r.width + "  SKIPPED — " + r.skipped); continue; }
  console.log("  " + String(r.width).padEnd(6)
    + " points " + String(r.points).padStart(3) + "/" + String(r.refPoints).padStart(3)
    + "   app box " + r.appBox.w + "x" + r.appBox.h + "  ref box " + r.refBox.w + "x" + r.refBox.h
    + "   mean " + String(r.mean).padStart(6) + "   max " + String(r.max).padStart(4)
    + "   subs " + (r.substitutions || []).join("+"));
}
writeFileSync(join(OUT, "plotdiff.json"), JSON.stringify(results, null, 2));
console.log("\nwritten: " + OUT);
