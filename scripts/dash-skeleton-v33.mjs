/**
 * v33 · recon 4 + the Phase 4 gate — does the loading shell agree with the loaded page?
 *
 * Captures the five region boxes WHILE the skeleton is up and again once it has gone, and reports
 * the difference. Browser-side reads are real functions, never template literals.
 *
 * ⚠️ THIS IS THE GATE THAT MATTERS, and it is the one nothing in this repo had. A skeleton whose
 * geometry disagrees with the loaded page CAUSES the jump it exists to prevent — and every other
 * check on it (does it render, does it have the right classes, does it dissolve) is true of a ghost
 * that is 553px out. Measured before the fix: 302 / 302 / 349 / 553px at the four widths.
 *
 * ⚠️ AND IT COMPARES THE GHOST'S OWN BLOCKS, NOT THE PAGE UNDERNEATH IT. The skeleton is an OVERLAY
 * with the real page mounted beneath, so reading `[data-probe]` while it is up measures the page
 * SETTLING under the cover — which the reader never sees. That reading reported a 60.7px "jump" no
 * change to the skeleton could ever have moved.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const WIDTHS = (process.env.SA_WIDTHS || "1536,1710,1920,2520").split(",").map(Number);
function envLocal(k){const f=join(ROOT,".env.local");if(!existsSync(f))return null;
  for(const l of readFileSync(f,"utf8").split("\n")){const m=new RegExp("^\\s*"+k+"\\s*=\\s*(.*)$").exec(l);if(m)return m[1].trim().replace(/^["']|["']$/g,"")||null;}return null;}

const REGIONS = ["grid", "toprow", "todo-card", "activity-card", "community-tile"];

/**
 * ⚠️ THE GHOST'S OWN REGIONS, NOT THE PAGE'S. The skeleton is an OVERLAY with the real page MOUNTED
 * beneath it, so reading `[data-probe="toprow"]` while the cover is up measures the page SETTLING
 * underneath — which the reader never sees, and which reported a 60.7px "jump" that no fix to the
 * skeleton could ever have moved. The comparison the phase intends is GHOST against LOADED, so
 * during the wait the ghost is read by its own five `data-sk` handles.
 *
 * ⚠️ AND THERE IS NO FALLBACK TO `[data-probe]`, DELIBERATELY. There was one, and it made the
 * `community-tile` row VACUOUS for a whole pass: the ghost's class was renamed, the selector stopped
 * matching, the fallback quietly measured the REAL tile beneath the cover, and the row reported
 * Δ 0 — a perfect score for a region nobody had looked at. A missing handle is a FAILURE (`missing`,
 * which the verdict requires to be empty), never a substitution.
 *
 * ⚠️ AND THE SELECTOR MAP IS STATED ONCE. It used to be declared twice — a module-scope `GHOST`
 * nothing read, beside the `GH` inside the browser function that does — so the two drifted the
 * moment one was repointed, and the dead one read as the authority. One `data-sk` name per region,
 * built from `REGIONS`, and there is nothing left to keep in step.
 */
function readRegions(names) {
  const out = { boxes: {}, skeleton: null };
  const ghostUp = !!document.querySelector(".os-skelpage");
  for (const n of names) {
    const el = ghostUp
      ? document.querySelector('.os-skelpage [data-sk="' + n + '"]')
      : document.querySelector('[data-probe="' + n + '"]');
    if (!el) { out.boxes[n] = null; continue; }
    const r = el.getBoundingClientRect();
    out.boxes[n] = { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10,
                     w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
  }
  const sk = document.querySelector('.os-skelpage, [data-probe="skeleton"]');
  if (sk) {
    const r = sk.getBoundingClientRect();
    const cs = getComputedStyle(sk);
    out.skeleton = { present: true, position: cs.position, z: cs.zIndex,
      w: Math.round(r.width), h: Math.round(r.height),
      tickets: sk.querySelectorAll(".os-sk-ticket, .sk-ticket").length,
      stats: sk.querySelectorAll(".os-sk-stat, .sk-stat").length,
      blocks: sk.querySelectorAll(".os-sk, .sk").length,
      animated: [...sk.querySelectorAll("*")].filter((e) => getComputedStyle(e).animationName !== "none").length };
  }
  return out;
}

const OUT = join(ROOT, "run-artifacts", "skeleton-v33");
mkdirSync(OUT, { recursive: true });
const rows = [];
const browser = await chromium.launch();
for (const W of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: W, height: 1150 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000);
  /* sign in on a throwaway load so the measured load starts warm and still shows the skeleton */
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  const s = await Promise.race([
    page.locator(SHELL).first().waitFor({state:"attached",timeout:60000}).then(()=>"shell").catch(()=>null),
    page.locator("#au-email").waitFor({state:"attached",timeout:60000}).then(()=>"form").catch(()=>null)]);
  if (s !== "shell") {
    await page.goto(APP + "/#/signin");
    await page.locator("#au-email").fill(envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
    await page.locator("#au-pw").fill(envLocal("SA_E2E_PASSWORD"));
    await page.getByRole("button",{name:/^Sign in$/}).last().click();
    await page.locator(SHELL).first().waitFor({state:"visible",timeout:90000});
  }
  /* a fresh navigation, then poll fast for the skeleton */
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  let during = null;
  for (let i = 0; i < 160; i++) {
    const r = await page.evaluate(readRegions, REGIONS);
    if (r.skeleton && r.skeleton.present) { during = r; break; }
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(3200);
  const after = await page.evaluate(readRegions, REGIONS);

  console.log("──── " + W);
  /* ⚠️ NEVER CAUGHT IS A FAILURE, NOT A SKIP. A probe that finds no subject and reports nothing is
     the vacuous-green shape this repo records at length; a load too fast to show the cover would
     otherwise be indistinguishable from a cover that lines up perfectly. */
  if (!during) {
    console.log("   the skeleton was never caught on screen");
    rows.push({ width: W, caught: false, worst: null, removed: null, tickets: null, stats: null, animated: null });
    await page.close(); continue;
  }
  console.log("   skeleton: " + JSON.stringify(during.skeleton));
  console.log("   still in the DOM once loaded: " + (after.skeleton ? "YES — not removed" : "no, removed"));
  let worst = 0;
  for (const n of REGIONS) {
    const a = during.boxes[n], b = after.boxes[n];
    if (!a || !b) { console.log("   " + n.padEnd(16) + " during " + (a ? "ok" : "MISSING") + " · after " + (b ? "ok" : "MISSING")); continue; }
    const d = ["x","y","w","h"].map((k) => Math.round((a[k] - b[k]) * 10) / 10);
    worst = Math.max(worst, ...d.map(Math.abs));
    console.log("   " + n.padEnd(16) + " Δx " + String(d[0]).padStart(7) + "  Δy " + String(d[1]).padStart(7)
      + "  Δw " + String(d[2]).padStart(7) + "  Δh " + String(d[3]).padStart(7));
  }
  console.log("   WORST region delta: " + Math.round(worst * 10) / 10 + "px   (gate: <= 8)");
  rows.push({
    width: W, caught: true, worst: Math.round(worst * 10) / 10,
    removed: !after.skeleton,
    tickets: during.skeleton.tickets, stats: during.skeleton.stats,
    animated: during.skeleton.animated, blocks: during.skeleton.blocks,
    missing: REGIONS.filter((n) => !during.boxes[n] || !after.boxes[n]),
  });
  await page.close();
}
await browser.close();

/**
 * ⚠️ THE VERDICT IS WRITTEN AS JSON so `dash-refdiff.mjs` carries it as a standing gate rather than
 * as a thing somebody remembers to run. Four claims, and each one has been false at least once in
 * this phase: the ghost's regions land within 8px of the loaded page's at every width; every region
 * was actually FOUND on both sides (a missing one is a silent pass); the cover is caught on screen
 * at all (a load too fast to show it proves nothing); and it leaves the DOM once the page arrives.
 * ⚠️ AND THE SHIMMER IS COUNTED, because it used to be declared on a pseudo-element where
 * `getComputedStyle(el)` could not see it and the reading was a permanent, meaningless `0`.
 */
const verdict = {
  rows,
  widths: rows.length,
  worst: rows.reduce((a, r) => Math.max(a, r.worst ?? Infinity), 0),
  allCaught: rows.length > 0 && rows.every((r) => r.caught),
  allRemoved: rows.every((r) => r.removed === true),
  noneMissing: rows.every((r) => (r.missing ?? []).length === 0),
  animated: rows.every((r) => (r.animated ?? 0) > 0),
};
verdict.pass = verdict.allCaught && verdict.noneMissing && verdict.allRemoved
  && verdict.animated && verdict.worst <= 8;
writeFileSync(join(OUT, "skeleton.json"), JSON.stringify(verdict, null, 2));
console.log("");
console.log("GATE skeletonRegions: " + (verdict.pass ? "pass" : "FAIL")
  + "  worst " + verdict.worst + "px across " + verdict.widths + " widths"
  + " · caught " + verdict.allCaught + " · removed " + verdict.allRemoved
  + " · shimmer " + verdict.animated);
