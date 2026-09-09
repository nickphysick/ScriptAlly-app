/**
 * v30 recon + gate — the drawer's stacking.
 *
 * Opens a to-do ticket on the dashboard, then reports:
 *   · the drawer's DOM parent chain (is it portalled to body, or inside the page tree?)
 *   · every ancestor between the drawer and <body> that CREATES A STACKING CONTEXT, and why
 *   · what elementFromPoint returns at the drawer's centre and over the page behind it
 *   · the drawer's and the scrim's computed z-index
 * Every browser-side read is a real function, never a template literal.
 */
import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.SA_REFDIFF_APP_URL || "http://127.0.0.1:4173";
const REF = join(ROOT, "design-refs", "dashboard-cappuccino-v30.html");
const SHELL = ".ws-panel, .ws-work, .ws-window, #app-stage-scroll";
const W = Number(process.env.SA_RECON_W || 1710);
const SIDE = process.env.SA_SIDE || "APP";

function envLocal(k) {
  const f = join(ROOT, ".env.local");
  if (!existsSync(f)) return null;
  for (const l of readFileSync(f, "utf8").split("\n")) {
    const m = new RegExp("^\\s*" + k + "\\s*=\\s*(.*)$").exec(l);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "") || null;
  }
  return null;
}

/* what the page looks like once a drawer is open */
function readStack(sel) {
  const d = document.querySelector(sel.drawer);
  if (!d) return { found: false };
  const out = { found: true };

  /* the parent chain, up to <html> */
  const chain = [];
  for (let el = d.parentElement; el; el = el.parentElement) {
    const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
    chain.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
      (cls ? "." + String(cls).trim().split(/\s+/).slice(0, 3).join(".") : ""));
  }
  out.parent = chain[0] || "(none)";
  out.chain = chain;
  out.portalled = d.parentElement === document.body;

  /**
   * every ancestor that CREATES A STACKING CONTEXT, with the reason. A fixed-position panel is
   * trapped inside the nearest one, so its z-index is only ever compared with that context's
   * siblings — which is how a z-index of 70 loses to a card at 1.
   */
  const ctx = [];
  for (let el = d.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    const cs = getComputedStyle(el);
    const why = [];
    if (cs.transform !== "none") why.push("transform: " + cs.transform.slice(0, 28));
    if (cs.filter !== "none") why.push("filter: " + cs.filter);
    if (cs.willChange !== "auto") why.push("will-change: " + cs.willChange);
    if (parseFloat(cs.opacity) < 1) why.push("opacity: " + cs.opacity);
    if (cs.zIndex !== "auto" && cs.position !== "static") why.push("position: " + cs.position + " + z-index: " + cs.zIndex);
    if ((cs.contain || "").indexOf("paint") >= 0 || (cs.contain || "").indexOf("layout") >= 0) why.push("contain: " + cs.contain);
    if (cs.isolation === "isolate") why.push("isolation: isolate");
    if (cs.mixBlendMode !== "normal") why.push("mix-blend-mode: " + cs.mixBlendMode);
    if (cs.perspective !== "none") why.push("perspective: " + cs.perspective);
    if (why.length) {
      const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
      ctx.push({
        el: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
          (cls ? "." + String(cls).trim().split(/\s+/).slice(0, 3).join(".") : ""),
        why,
      });
    }
  }
  out.stackingContexts = ctx;

  const dr = d.getBoundingClientRect();
  const scrim = document.querySelector(sel.scrim);
  out.drawerBox = { x: Math.round(dr.x), y: Math.round(dr.y), w: Math.round(dr.width), h: Math.round(dr.height) };
  out.drawerZ = getComputedStyle(d).zIndex;
  out.scrimZ = scrim ? getComputedStyle(scrim).zIndex : null;

  /* what is actually on top, at the drawer's centre and over the page behind it */
  const cx = dr.x + dr.width / 2, cy = dr.y + dr.height / 2;
  const hitC = document.elementFromPoint(cx, cy);
  const name = (el) => {
    if (!el) return "(null)";
    const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className;
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
      (cls ? "." + String(cls).trim().split(/\s+/).slice(0, 3).join(".") : "");
  };
  out.atDrawerCentre = name(hitC);
  out.atDrawerCentreInsideDrawer = !!(hitC && (hitC === d || d.contains(hitC)));
  const bx = Math.max(8, dr.x / 2), by = Math.round(window.innerHeight / 2);
  const hitB = document.elementFromPoint(bx, by);
  out.atPageBehind = name(hitB);
  out.atPageBehindIsScrim = !!(hitB && scrim && (hitB === scrim || scrim.contains(hitB)));

  /* anything painted OVER the drawer: walk the stack at the centre */
  const stackAt = document.elementsFromPoint(cx, cy).map(name);
  out.stackAtCentre = stackAt.slice(0, 6);
  return out;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: 1150 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(120000);

let sel;
if (SIDE === "APP") {
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  const settled = await Promise.race([
    page.locator(SHELL).first().waitFor({ state: "attached", timeout: 60000 }).then(() => "shell").catch(() => null),
    page.locator("#au-email").waitFor({ state: "attached", timeout: 60000 }).then(() => "form").catch(() => null),
  ]);
  if (settled !== "shell") {
    await page.goto(APP + "/#/signin");
    await page.locator("#au-email").fill(envLocal("SA_E2E_EMAIL") || "harness@scriptally.test");
    await page.locator("#au-pw").fill(envLocal("SA_E2E_PASSWORD"));
    await page.getByRole("button", { name: /^Sign in$/ }).last().click();
    await page.locator(SHELL).first().waitFor({ state: "visible", timeout: 90000 });
    await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2600);
  /**
   * ⚠️ THE OPEN ONE, NOT THE FIRST ONE. Every workspace page stays MOUNTED, and portalling
   * `SlideOver` to `body` puts all three of the app's drawers in the document at once — so
   * `document.querySelector(".slo")` answers about whichever page happens to be first. The first
   * run of this probe reported a drawer at x=1723 in a 1710px viewport with `elementFromPoint`
   * returning null: a closed drawer belonging to another page, measured perfectly. Selecting on
   * `[data-on="true"]` asks for the one that is open.
   */
  sel = { drawer: '.slo[data-on="true"]', scrim: '.slo-scrim[data-on="true"]', ticket: '[data-probe="todo-card"] .tkt' };
} else {
  await page.goto(pathToFileURL(REF).href, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  sel = { drawer: "#drawer", scrim: "#scrim", ticket: "#todoCard .tk" };
}

const n = await page.locator(sel.ticket).count();
console.log("──── " + SIDE + " @" + W + "  ·  tickets found: " + n);
if (!n) { console.log("  no ticket to open"); await browser.close(); process.exit(0); }
await page.locator(sel.ticket).first().click();
await page.waitForTimeout(700);

const r = await page.evaluate(readStack, sel);
if (!r.found) { console.log("  no drawer element after the click"); await browser.close(); process.exit(0); }

console.log("\n  PORTALLED TO BODY: " + r.portalled + "        parent: " + r.parent);
console.log("  chain to <html>: " + r.chain.join("  <  "));
console.log("\n  STACKING CONTEXTS BETWEEN THE DRAWER AND <body>  (" + r.stackingContexts.length + ")");
if (!r.stackingContexts.length) console.log("    none — the drawer's z-index is compared against the root");
for (const c of r.stackingContexts) console.log("    " + c.el + "\n        " + c.why.join("\n        "));
console.log("\n  z-index  drawer " + r.drawerZ + "   scrim " + r.scrimZ);
console.log("  drawer box " + JSON.stringify(r.drawerBox));
console.log("\n  elementFromPoint at the drawer's centre : " + r.atDrawerCentre + "   inside the drawer: " + r.atDrawerCentreInsideDrawer);
console.log("  elementFromPoint over the page behind   : " + r.atPageBehind + "   is the scrim: " + r.atPageBehindIsScrim);
console.log("  stack at the drawer's centre, top first : " + r.stackAtCentre.join("  >  "));
await browser.close();
