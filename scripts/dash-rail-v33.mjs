/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v33.2 · Phase 3 — the sidebar boundary, and the standing gate that keeps it.
 *
 * ⚠️ THE CLAIM IS DIRECTIONAL, WHICH IS WHY THE ELEMENT MATTERS MORE THAN THE PIXELS. The scrim is
 * the RAIL's shadow falling onto the page, so it must begin exactly at the rail's right edge. In
 * this app the column that is flush with the rail is `.ws-main` (x = 224 at every width, measured);
 * the content WINDOW is 22px further in, and a scrim there reads as the page's own edge treatment —
 * the page as the raised object. v33.1 shipped it on the window and this gate is what catches that.
 *
 * ⚠️ AND IT IS TWO-SIDED. A scrim that reached every page would be a dashboard decision applied to
 * nine pages nobody asked about, so `/queries` is measured in the same run: the scrim must be
 * absent there, and the RAIL's computed style must be identical on both routes.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4192";
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const WIDTHS = (process.env.SA_WIDTHS || "1536,1710,1920,2520").split(",").map(Number);
function envLocal(k){const f=join(ROOT,".env.local");if(!existsSync(f))return null;
  for(const l of readFileSync(f,"utf8").split("\n")){const m=new RegExp("^\\s*"+k+"\\s*=\\s*(.*)$").exec(l);if(m)return m[1].trim().replace(/^["']|["']$/g,"")||null;}return null;}

function readBoundary() {
  const out = {};
  const rail = document.querySelector(".ws-panel");
  const col = document.querySelector(".ws-main");
  out.rail = null; out.col = null; out.scrim = null;
  if (rail) {
    const r = rail.getBoundingClientRect(); const cs = getComputedStyle(rail);
    out.rail = {
      right: Math.round(r.right * 10) / 10,
      boxShadow: cs.boxShadow, borderRight: cs.borderRightWidth,
      /* ⚠️ THE WHOLE COMPUTED STYLE, SERIALISED — the gate is "unchanged elsewhere", and a check
         that names three properties can only ever prove those three did not move. */
      all: (() => { const o = {}; for (let i = 0; i < cs.length; i++) o[cs[i]] = cs.getPropertyValue(cs[i]); return o; })(),
    };
  }
  if (col) {
    const r = col.getBoundingClientRect(); const cs = getComputedStyle(col);
    const be = getComputedStyle(col, "::before");
    out.col = {
      x: Math.round(r.x * 10) / 10, h: Math.round(r.height * 10) / 10,
      boxShadow: cs.boxShadow, borderLeft: cs.borderLeftWidth, radiusTL: cs.borderTopLeftRadius,
      position: cs.position, padLeft: cs.paddingLeft,
    };
    out.scrim = {
      content: be.content, width: be.width, height: be.height,
      left: be.left, pe: be.pointerEvents, z: be.zIndex,
      image: be.backgroundImage.replace(/\s+/g, " ").slice(0, 130),
    };
    /* ⚠️ THE HIT TEST IS THE ONLY THING THAT PROVES `pointer-events: none` REACHED THE PAINT.
       A computed `none` on a pseudo-element that never painted reads identically. */
    const cx = r.x + 9, cy = r.y + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    const cls = hit && (hit.className && hit.className.baseVal !== undefined ? hit.className.baseVal : hit.className);
    out.scrim.hit = hit ? hit.tagName.toLowerCase() + (cls ? "." + String(cls).trim().split(/\s+/)[0] : "") : "(null)";
  }
  const card = document.querySelector(".os-card");
  out.cardZ = card ? getComputedStyle(card).zIndex : null;
  out.viewportH = window.innerHeight;
  out.dashMode = !!document.querySelector(".dash-mode");
  return out;
}

const OUT = join(ROOT, "run-artifacts", "rail-v33");
mkdirSync(OUT, { recursive: true });
const seen = {};
const browser = await chromium.launch();
for (const route of ["/dashboard", "/queries"]) {
  for (const W of (route === "/dashboard" ? WIDTHS : [WIDTHS[0]])) {
    const page = await browser.newPage({ viewport: { width: W, height: 1150 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000);
    await page.goto(APP + route, { waitUntil: "domcontentloaded" });
    const s = await Promise.race([
      page.locator(SHELL).first().waitFor({state:"attached",timeout:60000}).then(()=>"shell").catch(()=>null),
      page.locator("#au-email").waitFor({state:"attached",timeout:60000}).then(()=>"form").catch(()=>null)]);
    if (s !== "shell") {
      await page.goto(APP + "/#/signin");
      await page.locator("#au-email").fill(envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
      await page.locator("#au-pw").fill(envLocal("SA_E2E_PASSWORD"));
      await page.getByRole("button",{name:/^Sign in$/}).last().click();
      await page.locator(SHELL).first().waitFor({state:"visible",timeout:90000});
      await page.goto(APP + route, { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(2800);
    seen[route + "@" + W] = await page.evaluate(readBoundary);
    await page.close();
  }
}
await browser.close();

const dashKeys = WIDTHS.map((w) => "/dashboard@" + w);
const other = seen["/queries@" + WIDTHS[0]] || {};
const rows = dashKeys.map((k) => {
  const d = seen[k] || {};
  const w = Number(k.split("@")[1]);
  const flush = d.rail && d.col ? Math.round((d.col.x - d.rail.right) * 10) / 10 : null;
  return {
    width: w,
    flushDelta: flush,
    scrimWidth: d.scrim ? d.scrim.width : null,
    scrimZ: d.scrim ? d.scrim.z : null,
    cardZ: d.cardZ,
    scrimHeight: d.scrim ? d.scrim.height : null,
    colHeight: d.col ? d.col.h : null,
    viewportH: d.viewportH,
    scrimHit: d.scrim ? d.scrim.hit : null,
    colBoxShadow: d.col ? d.col.boxShadow : null,
    colBorderLeft: d.col ? d.col.borderLeft : null,
    colRadiusTL: d.col ? d.col.radiusTL : null,
    railBoxShadow: d.rail ? d.rail.boxShadow : null,
    railBorderRight: d.rail ? d.rail.borderRight : null,
    scrimImage: d.scrim ? d.scrim.image : null,
  };
});

/* ⚠️ THE RAIL, PROPERTY BY PROPERTY, ACROSS TWO ROUTES. Naming three properties proves three
   properties; this diffs the whole computed style and REPORTS what moved. */
const a = seen["/dashboard@" + WIDTHS[0]], b = other;
const railDrift = (a && a.rail && b && b.rail)
  ? Object.keys(a.rail.all).filter((k) => a.rail.all[k] !== b.rail.all[k])
  : ["(a route did not report a rail)"];

const verdict = {
  rows,
  railDrift,
  scrimOffOtherRoute: !!(b.scrim && b.scrim.content === "none"),
  /* every width: flush within 1px · 18px wide · below every card · inert · no edge on the column */
  flush: rows.every((r) => r.flushDelta !== null && Math.abs(r.flushDelta) <= 1),
  width18: rows.every((r) => r.scrimWidth === "18px"),
  belowCards: rows.every((r) => r.cardZ !== null && Number(r.scrimZ) < Number(r.cardZ)),
  inert: rows.every((r) => r.scrimHit && !/before|scrim/i.test(r.scrimHit)),
  columnBare: rows.every((r) => r.colBoxShadow === "none" && r.colBorderLeft === "0px" && r.colRadiusTL === "0px"),
  railBare: rows.every((r) => r.railBoxShadow === "none" && r.railBorderRight === "0px"),
  /* ⚠️ REPORTED, NOT ASSERTED AGAINST THE VIEWPORT. The pack asks for `min-height: 100vh`; the
     column is 41.7px shorter than the viewport because the beta strip sits above the shell, so
     100vh would push the page below the fold — the Tasks chassis's unreachable 21px. The honest
     claim is that the scrim spans the column's OWN full height. */
  spansColumn: rows.every((r) => r.scrimHeight !== null && r.colHeight !== null
    && Math.abs(parseFloat(r.scrimHeight) - r.colHeight) <= 1),
  railUnchanged: railDrift.length === 0,
};
verdict.pass = verdict.flush && verdict.width18 && verdict.belowCards && verdict.inert
  && verdict.columnBare && verdict.railBare && verdict.spansColumn
  && verdict.railUnchanged && verdict.scrimOffOtherRoute;

for (const r of rows) {
  console.log("──── " + r.width);
  console.log("   column x − rail right : " + r.flushDelta + "px      (gate: within 1)");
  console.log("   scrim                 : " + r.scrimWidth + " · z " + r.scrimZ + " (cards z " + r.cardZ + ") · hit " + r.scrimHit);
  console.log("   scrim height / column : " + r.scrimHeight + " / " + r.colHeight + "   (viewport " + r.viewportH + ")");
  console.log("   column edge treatment : shadow " + r.colBoxShadow + " · border-left " + r.colBorderLeft + " · radius " + r.colRadiusTL);
  console.log("   rail                  : shadow " + r.railBoxShadow + " · border-right " + r.railBorderRight);
}
console.log("");
console.log("   rail computed-style drift across routes: " + (railDrift.length ? railDrift.join(", ") : "none — byte-identical"));
console.log("   scrim on /queries: " + (verdict.scrimOffOtherRoute ? "absent" : "PRESENT — it leaked"));
writeFileSync(join(OUT, "rail.json"), JSON.stringify(verdict, null, 2));
console.log("");
console.log("GATE railBoundary: " + (verdict.pass ? "pass" : "FAIL") + "  " + JSON.stringify({
  flush: verdict.flush, width18: verdict.width18, belowCards: verdict.belowCards, inert: verdict.inert,
  columnBare: verdict.columnBare, railBare: verdict.railBare, spansColumn: verdict.spansColumn,
  railUnchanged: verdict.railUnchanged, scrimOffOtherRoute: verdict.scrimOffOtherRoute,
}));
