/**
 * v29 pixel probe — two questions the DOM cannot answer:
 *   (a) what colour sits immediately ABOVE the total line, and
 *   (b) what paints BELOW the chart's zero baseline.
 * Both are read from the rendered pixels of the plot, decoded through a canvas in the same browser
 * that drew them. Every browser-side read is a real function, never a template literal.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";
const REF = join(ROOT, "design-refs", "dashboard-cappuccino-v29.html");
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const W = Number(process.env.SA_RECON_W || 1710);
const OUT = process.env.SA_PIX_OUT || "";

function envLocal(key) {
  const f = join(ROOT, ".env.local");
  if (!existsSync(f)) return null;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = new RegExp("^\\s*" + key + "\\s*=\\s*(.*)$").exec(line);
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
  await page.goto(APP + "/#/signin");
  await page.locator("#au-email").fill(process.env.SA_E2E_EMAIL || envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
  await page.locator("#au-pw").fill(pw);
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.locator(SHELL).first().waitFor({ state: "visible", timeout: 90000 });
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
}

/* geometry, in CSS px relative to the plot element's own box */
function geometry() {
  const host = document.querySelector('[data-probe="plot"]');
  if (!host) return null;
  const svg = host.tagName.toLowerCase() === "svg" ? host : host.querySelector("svg");
  if (!svg) return null;
  const hb = host.getBoundingClientRect(), sb = svg.getBoundingClientRect();
  const vb = (svg.getAttribute("viewBox") || "0 0 1 1").split(/\s+/).map(Number);
  const sx = sb.width / vb[2], sy = sb.height / vb[3];
  const toHostX = (ux) => (sb.left - hb.left) + (ux - vb[0]) * sx;
  const toHostY = (uy) => (sb.top - hb.top) + (uy - vb[1]) * sy;

  const paths = [...svg.querySelectorAll("path")].filter((p) => !p.closest("defs"));
  const line = paths.find((p) => (p.getAttribute("stroke") || "").toLowerCase() === "#1c130f"
    && (p.getAttribute("fill") || "none") === "none" && Number(p.getAttribute("stroke-width")) >= 1.6);

  /* the zero baseline: the app classes it, the ref draws a plain line at the foot */
  const lines = [...svg.querySelectorAll("line")].filter((l) => !l.closest("defs"));
  const axis = lines.find((l) => (l.getAttribute("class") || "").indexOf("axis0") >= 0)
    || lines.filter((l) => (l.getAttribute("stroke") || "") === "#d8cec2")[0];
  const zeroU = axis ? Number(axis.getAttribute("y1")) : null;

  /* the line's y at 40 evenly spaced x, in host px */
  const samples = [];
  if (line) {
    const L = line.getTotalLength();
    for (let k = 0; k < 40; k++) {
      const p = line.getPointAtLength((L * k) / 39);
      samples.push([Math.round(toHostX(p.x) * 10) / 10, Math.round(toHostY(p.y) * 10) / 10]);
    }
  }
  return {
    hostW: Math.round(hb.width), hostH: Math.round(hb.height),
    zeroHost: zeroU == null ? null : Math.round(toHostY(zeroU) * 10) / 10,
    svgBottomHost: Math.round(toHostY(vb[1] + vb[3]) * 10) / 10,
    lineW: line ? Number(line.getAttribute("stroke-width")) : null,
    lineJoin: line ? (line.getAttribute("stroke-linejoin") || getComputedStyle(line).strokeLinejoin) : null,
    bandJoin: (() => { const b = paths.find((p) => (p.getAttribute("fill") || "none") !== "none"); return b ? (b.getAttribute("stroke-linejoin") || getComputedStyle(b).strokeLinejoin) : null; })(),
    bandW: (() => { const b = paths.find((p) => (p.getAttribute("fill") || "none") !== "none"); return b ? Number(b.getAttribute("stroke-width")) : null; })(),
    samples,
  };
}

/* decode a PNG data URL and read the requested points */
function readPixels(arg) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const at = (x, y) => {
        if (x < 0 || y < 0 || x >= c.width || y >= c.height) return null;
        const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        return d[0] + "," + d[1] + "," + d[2];
      };
      resolve({ w: c.width, h: c.height, points: arg.points.map(([x, y]) => at(x, y)) });
    };
    img.src = arg.url;
  });
}

const browser = await chromium.launch();
const report = {};
for (const [side, url, app] of [["REF", pathToFileURL(REF).href, false], ["APP", APP + "/dashboard", true]]) {
  const page = await browser.newPage({ viewport: { width: W, height: 1150 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (app) await signIn(page);
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(app ? 2600 : 900);
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  await page.waitForTimeout(200);

  const g = await page.evaluate(geometry);
  const shot = await page.locator('[data-probe="plot"]').first().screenshot();
  if (OUT) { mkdirSync(OUT, { recursive: true }); writeFileSync(join(OUT, side.toLowerCase() + "-plot.png"), shot); }
  const dataUrl = "data:image/png;base64," + shot.toString("base64");

  /* (a) close above the line's OUTER edge, densely, with the end marker's radius excluded — the
         marker is a sage ring by design and would otherwise be reported as band ink escaping. */
  const above = [];
  const lastX = g.samples.length ? g.samples[g.samples.length - 1][0] : 0;
  const firstX = g.samples.length ? g.samples[0][0] : 0;
  for (const [x, y] of g.samples) {
    if (Math.abs(x - lastX) < 12 || Math.abs(x - firstX) < 12) continue;   // both markers
    for (const dy of [0.8, 1.6, 2.5, 4]) above.push([x, y - (g.lineW / 2) - dy]);
  }
  /* (b) a column below the zero baseline, at 20 x positions */
  const below = [];
  const x0 = g.samples.length ? g.samples[0][0] : 0;
  const x1 = g.samples.length ? g.samples[g.samples.length - 1][0] : g.hostW;
  for (let k = 0; k < 20; k++) {
    const x = x0 + ((x1 - x0) * k) / 19;
    for (const dy of [3, 8, 14, 20]) below.push([x, g.zeroHost + dy]);
  }
  const px = await page.evaluate(readPixels, { url: dataUrl, points: [...above, ...below] });
  report[side] = { g, aboveN: above.length, px, above, below };
  await page.close();
}
await browser.close();

for (const side of ["REF", "APP"]) {
  const r = report[side];
  const g = r.g;
  console.log("\n════════ " + side + " · " + W + "px ════════");
  console.log("  plot box " + g.hostW + "x" + g.hostH + "   image " + r.px.w + "x" + r.px.h);
  console.log("  zero baseline at y=" + g.zeroHost + "   svg bottom at y=" + g.svgBottomHost
    + "   (" + (g.zeroHost == null ? "?" : Math.round((g.svgBottomHost - g.zeroHost) * 10) / 10) + "px below zero)");
  console.log("  line width " + g.lineW + " join " + g.lineJoin + "   ·   band stroke " + g.bandW + " join " + g.bandJoin);

  const aboveCols = r.px.points.slice(0, r.aboveN);
  const tally = {};
  aboveCols.forEach((c) => { if (c) tally[c] = (tally[c] || 0) + 1; });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  console.log("\n  — COLOURS ABOVE THE LINE, MARKERS EXCLUDED (" + aboveCols.filter(Boolean).length + " samples) —");
  for (const [c, n] of sorted.slice(0, 8)) console.log("    rgb(" + c + ")  ×" + n);
  const CARDISH = (c) => { const [R, G, B] = c.split(",").map(Number); return R > 246 && G > 243 && B > 238; };
  const off = aboveCols.map((c, i) => [c, r.above[i]]).filter(([c]) => c && !CARDISH(c));
  console.log("    non-card hits: " + off.length + (off.length ? "" : "  (nothing paints above the line)"));
  off.slice(0, 12).forEach(([c, xy]) => console.log("      x=" + xy[0] + " y=" + Math.round(xy[1] * 10) / 10 + "  rgb(" + c + ")"));

  const belowCols = r.px.points.slice(r.aboveN).filter(Boolean);
  const tally2 = {};
  for (const c of belowCols) tally2[c] = (tally2[c] || 0) + 1;
  console.log("\n  — COLOURS BELOW THE ZERO BASELINE (" + belowCols.length + " samples) —");
  for (const [c, n] of Object.entries(tally2).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log("    rgb(" + c + ")  ×" + n);
}
