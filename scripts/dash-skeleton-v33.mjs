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

/**
 * ⚠️ SEVEN REGIONS, AND TWO OF THEM ARE READ FROM THE SAME ELEMENT IN BOTH STATES (v33.2).
 * `navrow` and `search` are the SHELL's controls, and the loading state keeps their boxes and
 * hides their ink — which is the only way the row's geometry can be the live one rather than six
 * numbers copied out of a measurement. So for those two the comparison is the element against
 * ITSELF across the state change, and what it proves is that the row does not move or resize when
 * the ghosts come off. That is exactly the claim: a nav row that changed height between states
 * would shift everything under it, which is the jump this whole phase exists to remove.
 */
const REGIONS = ["navrow", "search", "grid", "toprow", "todo-card", "activity-card", "community-tile"];
const LIVE_IN_BOTH = new Set(["navrow", "search"]);
const TOL = Number(process.env.SA_SKEL_TOL || 4);

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
  const liveInBoth = { navrow: 1, search: 1 };
  for (const n of names) {
    const el = (ghostUp && !liveInBoth[n])
      ? document.querySelector('.os-skelpage [data-sk="' + n + '"]')
      : document.querySelector('[data-probe="' + n + '"]');
    if (!el) { out.boxes[n] = null; continue; }
    const r = el.getBoundingClientRect();
    out.boxes[n] = { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10,
                     w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
  }
  /**
   * ⚠️ THE LIVENESS READING IS INK AND CONTROLS, NOT `display` (v33.2). The pack's gate says every
   * child of the content column other than the skeleton computes `display: none`. Those children
   * ARE the live containers the ghost is built from — the bar that owns the row's 64px, the window
   * chain that owns the column's width — so hiding them forces the skeleton to restate every
   * dimension, which is the parallel tree the same pack spends a paragraph forbidding. What the
   * gate is FOR is that nothing live is on screen, so that is what is measured: no readable text
   * from the page or the row, and no control with a box.
   */
  const col = document.querySelector(".ws-main");
  out.live = null;
  if (col) {
    const inSkel = (el) => !!el.closest(".os-skelpage");
    const boxed = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const vis = (el) => { const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none"; };
    /* ⚠️ REACHABLE, NOT MERELY PRESENT. The nav row's controls keep their BOXES on purpose — that
       is how the row's geometry stays the live one — so "does it exist" is the wrong question and
       would fail on a correct build. `pointer-events: none` is what makes them shapes. */
    const clickable = (el) => getComputedStyle(el).pointerEvents !== "none";
    const controls = [...col.querySelectorAll("a[href], button, input, select, textarea, [role='button']")]
      .filter((el) => !inSkel(el) && boxed(el) && vis(el) && clickable(el));
    const inked = [];
    const walk = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      const s = (node.nodeValue || "").trim();
      if (!s) continue;
      const el = node.parentElement;
      if (!el || inSkel(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      /* transparent ink is not ink — `New` is a bare text node in its button and is hidden that way */
      if (/^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)$/.test(cs.color)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      inked.push(s.slice(0, 40));
    }
    out.live = {
      controls: controls.length,
      controlNames: controls.slice(0, 6).map((el) => (String(el.className).trim().split(/\s+/)[0] || el.tagName.toLowerCase())),
      inked: inked.length,
      inkedText: inked.slice(0, 6),
      /* the population, so a clean reading cannot mean "I measured nothing" */
      scanned: col.querySelectorAll("*").length,
    };
  }
  /**
   * ⚠️ THE HEAD AND THE FOOT OF THE COLUMN (v33.3). The reported symptom was a ghost that "reads as
   * cut off": its first block hard against the top of the content region with nothing above it.
   * The named cause — no nav-row skeleton — was fixed in v33.2, so what this measures is the claim
   * rather than the cause: the loading state's first and last pixels are where the loaded page's
   * are. Read from the CONTENT COLUMN's own children, because the column is the region the reader
   * sees framed, and the nav row is its first child.
   */
  const colEl = document.querySelector(".ws-main");
  out.edges = null;
  if (colEl) {
    const shown = [...colEl.children].filter((c) => getComputedStyle(c).display !== "none");
    const box = (e) => { const r = e.getBoundingClientRect();
      return { cls: String(e.className).trim().split(/\s+/)[0] || e.tagName.toLowerCase(),
               top: Math.round(r.top * 10) / 10, bottom: Math.round(r.bottom * 10) / 10 }; };
    /* and the page BODY's own ends, one level in — the ghost replaces the body, not the column */
    const bodyEl = document.querySelector(".os-skelpage") || document.querySelector(".os-root > .os-content");
    const bk = bodyEl ? [...bodyEl.children].filter((c) => getComputedStyle(c).display !== "none") : [];
    out.edges = {
      colFirst: shown[0] ? box(shown[0]) : null,
      colLast: shown.length ? box(shown[shown.length - 1]) : null,
      bodyTop: bodyEl ? Math.round(bodyEl.getBoundingClientRect().top * 10) / 10 : null,
      bodyBottom: bodyEl ? Math.round(bodyEl.getBoundingClientRect().bottom * 10) / 10 : null,
      bodyFirst: bk[0] ? box(bk[0]) : null,
      bodyLast: bk.length ? box(bk[bk.length - 1]) : null,
      shown: shown.length,
    };
  }

  /**
   * ⚠️ THE CLIPPING CLAIM IS MEASURED AS A CUT, NOT AS A PROPERTY. "No ancestor computes
   * `overflow: hidden` or `clip`" cannot hold in this shell and never could: `.ws-window` is the
   * content capsule and clips at its own radius, `.ws-main` clips the column, `.os-root` clips the
   * page — on every route, loading or not, by design. What the claim is FOR is that nothing of the
   * ghost is cut off, so the ancestry is walked and the actual overhang reported at each clipper.
   */
  const skEl = document.querySelector(".os-skelpage");
  out.clip = null;
  if (skEl) {
    const s = skEl.getBoundingClientRect();
    const clippers = [];
    for (let e = skEl.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (!/hidden|clip|auto|scroll/.test(cs.overflowY + cs.overflowX)) continue;
      const r = e.getBoundingClientRect();
      clippers.push({
        cls: String(e.className).trim().split(/\s+/)[0] || e.tagName.toLowerCase(),
        overflow: cs.overflowX + "/" + cs.overflowY,
        cutTop: Math.round(Math.max(0, r.top - s.top) * 10) / 10,
        cutBottom: Math.round(Math.max(0, s.bottom - r.bottom) * 10) / 10,
      });
    }
    out.clip = { clippers, worstCut: clippers.reduce((a, c) => Math.max(a, c.cutTop, c.cutBottom), 0) };
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

/**
 * ⚠️ THE PAGE SLOT'S OWN ENTRANCE IS WHAT MOVED THE MEASUREMENT, AND IT IS NOT THE PAGE'S.
 *
 * `StagePage` puts `stage-page-on` on the dashboard's slot — a shell-level entrance that
 * TRANSFORMS the whole slot and self-clears on `animationend`. `getBoundingClientRect` returns the
 * transformed box, so a reading taken while it runs reports every region on the page 4px low,
 * uniformly, with all four heights correct and the shell chain above it byte-identical. It sat
 * this gate exactly ON its 4px threshold, intermittently, on about one run in three.
 *
 * ⚠️ THE SCOPE IS `.ws-work > *`, NOT `.os-root *`. The first attempt suppressed inside the page
 * and changed nothing, because the animating element is the SLOT — one level above the page root
 * and outside anything the dashboard owns. Measured: `stage-page-on y110.8` during, a bare slot at
 * `y106.8` after.
 *
 * ⚠️ AND IT MUST NOT REACH THE SKELETON, or the shimmer clause reads its own suppression as a dead
 * animation. Direct children only.
 *
 * ⚠️ WAITING FOR `getAnimations()` TO DRAIN WAS TRIED AND CANNOT WORK HERE: this page carries
 * INFINITE decorative animations — the attention chip's 2s pulse among them — so the drain never
 * completes and a gate written that way is red forever on a correct page.
 */
/**
 * ⚠️ THE TICKET GRID, READ IN WHICHEVER STATE IS UP (v34, Phase 3).
 *
 * The cover's job here is to stand for what the reader will SEE, so the claim is against the
 * loaded card's WHOLE-VISIBLE count, never its total: the real card scrolls, holds 20, and shows
 * 15 / 15 / 12 / 10 at our four widths. Reproducing the 20 would reproduce the overflow the cover
 * exists to hide, and would break the containment clause at every width by 118-178px.
 *
 * ⚠️ THE BOUND IS THE SCROLLPORT'S CONTENT BOX, NOT THE CARD'S PADDING BOX. The grid sits inside
 * `.os-tbody` (`padding: 6px 18px 10px`, `overflow-y: auto`) inside `.os-tbodywrap`; the card's
 * own padding box is BELOW that and forgiving by tens of pixels. Measured against the card, a
 * ghost that ends 87px above the scrollport's foot reads as a 0px overflow and passes — which is
 * the vacuous shape, arriving as a bound that is simply in the wrong place.
 *
 * ⚠️ AND IT READS THE COLUMN COUNT AND THE TILE HEIGHT ON BOTH SIDES BECAUSE BOTH HAD DRIFTED.
 * `auto-fill` resolves against the container's width, and the ghost's grid was 36px wider than the
 * real one (the scroller's two 18px insets, which the ghost did not have), so it laid out FOUR
 * columns at 1920 and SIX at 2520 against the real card's THREE and FIVE. The tile was 82px
 * against a real 75.8. Neither had a gate; both are cheap to state and each is one row's worth of
 * error at some width.
 */
function readTickets() {
  const ghost = document.querySelector(".os-skelpage");
  const card = ghost
    ? ghost.querySelector('[data-sk="todo-card"]')
    : document.querySelector('[data-probe="todo-card"]');
  const grid = card && card.querySelector(".os-tkgrid");
  if (!card || !grid) return { present: false, ghost: !!ghost };
  const port = grid.parentElement;
  const gs = getComputedStyle(grid), ps = getComputedStyle(port);
  const r1 = (n) => Math.round(n * 10) / 10;
  const kids = [...grid.children];
  const rowGap = parseFloat(gs.rowGap) || 0;
  const portRect = port.getBoundingClientRect();
  /* the last y a block may occupy and still be wholly on screen */
  const portFoot = portRect.bottom - parseFloat(ps.paddingBottom) - parseFloat(ps.borderBottomWidth);
  const last = kids.length ? kids[kids.length - 1].getBoundingClientRect() : null;
  return {
    present: true, ghost: !!ghost,
    scroller: port.className || "(none)",
    count: kids.length,
    cols: gs.gridTemplateColumns.split(" ").filter(Boolean).length,
    tileH: kids[0] ? r1(kids[0].getBoundingClientRect().height) : null,
    gridW: r1(grid.getBoundingClientRect().width),
    rowGap,
    portFoot: r1(portFoot),
    lastBottom: last ? r1(last.bottom) : null,
    /* positive = spills past the scrollport; negative = stops short of it */
    overflow: last ? r1(last.bottom - portFoot) : null,
    wholeVisible: kids.filter((k) => k.getBoundingClientRect().bottom <= portFoot + 0.5).length,
  };
}

function settleSlot() {
  let s = document.getElementById("sa-skel-settle");
  if (!s) {
    s = document.createElement("style");
    s.id = "sa-skel-settle";
    s.textContent = ".ws-work > *, .os-root { animation: none !important; transition: none !important; }";
    document.head.appendChild(s);
  }
  void document.body.offsetHeight;
  const slot = document.querySelector(".ws-work > :not(.ws-mobilebar)");
  return {
    suppressed: !!document.getElementById("sa-skel-settle"),
    slotClass: slot ? String(slot.className).trim().slice(0, 40) : null,
    stillRunning: slot && slot.getAnimations
      ? slot.getAnimations().filter((a) => a.playState === "running").length : 0,
  };
}

const OUT = join(ROOT, "run-artifacts", "skeleton-v33");
mkdirSync(OUT, { recursive: true });
const rows = [];
let verdictRM = null;
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
  let settleDuring = null;
  let ticketsDuring = null;
  for (let i = 0; i < 160; i++) {
    const up = await page.evaluate(() => !!document.querySelector(".os-skelpage"));
    if (up) {
      settleDuring = await page.evaluate(settleSlot);
      during = await page.evaluate(readRegions, REGIONS);
      ticketsDuring = await page.evaluate(readTickets);
      break;
    }
    await page.waitForTimeout(25);
  }
  /**
   * ⚠️ THE LOADED READING SETTLES THE ENTRANCE FIRST, AND WITHOUT THAT THE GATE FLICKERS.
   *
   * The reveal staggers the cards in with `os-rise`, which TRANSLATES them — and
   * `getBoundingClientRect` returns the transformed box. Caught mid-flight, every region below the
   * nav row reads a few pixels off its resting place, uniformly, with all four heights correct.
   * Measured: an intermittent +4 on grid, toprow, todo-card, activity-card AND community-tile at
   * one width, on roughly one run in three — exactly the shape of one animation still running
   * rather than a layout fault. It sat the gate ON its 4px threshold.
   *
   * ⚠️ AND WAITING FOR `getAnimations()` TO DRAIN DOES NOT WORK HERE, WHICH IS WORTH THE LINE.
   * That was tried first and reported `settled: false` on every run: this page carries INFINITE
   * decorative animations — the attention chip's 2s pulse, the urgent ticket's — so the drain can
   * never complete and a gate written that way is red forever on a correct page.
   *
   * Suppression is the house idiom (`.sa-settled`, `src/styles/motion.css`): `animation: none`
   * returns an element running a `fill-mode: both` keyframe to its UNTRANSFORMED box, which is its
   * resting place. Everything is suppressed before anything is measured, because adding a rule can
   * itself reflow.
   */
  await page.waitForTimeout(3200);
  const settle = await page.evaluate(settleSlot);
  const after = await page.evaluate(readRegions, REGIONS);
  const ticketsAfter = await page.evaluate(readTickets);

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
  console.log("   WORST region delta: " + Math.round(worst * 10) / 10 + "px   (gate: <= " + TOL + ")");
  console.log("   slot settled       : during " + JSON.stringify(settleDuring) + " · after " + JSON.stringify(settle));
  const E = { during: during.edges, after: after.edges };
  console.log("   column head/foot   : ghost " + (E.during && E.during.colFirst ? E.during.colFirst.cls + " " + E.during.colFirst.top : "?")
    + " → " + (E.during && E.during.colLast ? E.during.colLast.bottom : "?")
    + "  ·  loaded " + (E.after && E.after.colFirst ? E.after.colFirst.cls + " " + E.after.colFirst.top : "?")
    + " → " + (E.after && E.after.colLast ? E.after.colLast.bottom : "?"));
  console.log("   page body head/foot: ghost " + (E.during ? E.during.bodyTop + " → " + E.during.bodyBottom : "?")
    + "  ·  loaded " + (E.after ? E.after.bodyTop + " → " + E.after.bodyBottom : "?"));
  console.log("   clipped off        : " + (during.clip ? during.clip.worstCut + "px  " + JSON.stringify(during.clip.clippers.filter((c) => c.cutTop || c.cutBottom)) : "not read"));
  console.log("   live in the column : " + (during.live ? during.live.controls + " controls · " + during.live.inked + " inked  " + JSON.stringify(during.live.controlNames) + " " + JSON.stringify(during.live.inkedText) : "not read"));
  rows.push({
    width: W, caught: true, worst: Math.round(worst * 10) / 10,
    settle, settleDuring,
    edges: { during: during.edges, after: after.edges },
    clip: during.clip,
    live: during.live,
    removed: !after.skeleton,
    tickets: during.skeleton.tickets, stats: during.skeleton.stats,
    tk: { during: ticketsDuring, after: ticketsAfter },
    animated: during.skeleton.animated, blocks: during.skeleton.blocks,
    missing: REGIONS.filter((n) => !during.boxes[n] || !after.boxes[n]),
  });
  await page.close();
}
/**
 * ⚠️ REDUCED MOTION IS ITS OWN PASS, BECAUSE IT IS ITS OWN PAGE. The preference is a browser
 * context option, not something to toggle mid-run — and the claim covers the NAV ROW's ghosts as
 * well as the page's, which are painted by a different sheet and could easily be given the
 * animation and not the exemption.
 */
{
  const page = await browser.newPage({
    viewport: { width: 1710, height: 1150 }, deviceScaleFactor: 1, reducedMotion: "reduce",
  });
  page.setDefaultTimeout(120000);
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
  await page.goto(APP + "/dashboard", { waitUntil: "domcontentloaded" });
  let rm = null;
  for (let i = 0; i < 200; i++) {
    rm = await page.evaluate(() => {
      const sk = document.querySelector(".os-skelpage");
      if (!sk) return null;
      const bar = document.querySelector('[data-probe="navrow"]');
      const running = (root) => [...root.querySelectorAll("*")]
        .filter((e) => e.getAnimations && e.getAnimations().length > 0).length;
      const named = (root) => [...root.querySelectorAll("*")]
        .filter((e) => getComputedStyle(e).animationName !== "none").length;
      return {
        skeletonBlocks: sk.querySelectorAll("*").length,
        skeletonRunning: running(sk), skeletonNamed: named(sk),
        barBlocks: bar ? bar.querySelectorAll("*").length : 0,
        barRunning: bar ? running(bar) : 0, barNamed: bar ? named(bar) : 0,
        skFill: (() => { const b = sk.querySelector(".os-sk"); if (!b) return null;
          const cs = getComputedStyle(b); return cs.backgroundImage + " | " + cs.backgroundColor; })(),
      };
    });
    if (rm) break;
    await page.waitForTimeout(25);
  }
  verdictRM = rm;
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
verdict.tolerance = TOL;
verdict.reducedMotion = verdictRM;
/* ⚠️ THE POPULATION IS ASSERTED FIRST — "0 running" is also what an empty scan reports. */
verdict.rmStill = !!verdictRM && verdictRM.skeletonBlocks > 20 && verdictRM.barBlocks > 3
  && verdictRM.skeletonNamed === 0 && verdictRM.barNamed === 0;
/* ⚠️ A RUN THAT MEASURED A MOVING PAGE IS NOT A GREEN RUN, IT IS AN UNKNOWN ONE. */
/**
 * ⚠️ THREE CLAIMS ABOUT THE COLUMN'S ENDS (v33.3), each stated over the LOADED reading rather than
 * over a number: the head within 2px, the foot within 4px, and nothing actually cut off.
 */
const near = (a, b, tol) => a !== null && a !== undefined && b !== null && b !== undefined && Math.abs(a - b) <= tol;
verdict.headMatches = rows.every((r) => r.edges && r.edges.during && r.edges.after
  && near(r.edges.during.colFirst && r.edges.during.colFirst.top, r.edges.after.colFirst && r.edges.after.colFirst.top, 2)
  && near(r.edges.during.bodyTop, r.edges.after.bodyTop, 2));
verdict.footMatches = rows.every((r) => r.edges && r.edges.during && r.edges.after
  && near(r.edges.during.colLast && r.edges.during.colLast.bottom, r.edges.after.colLast && r.edges.after.colLast.bottom, 4)
  && near(r.edges.during.bodyBottom, r.edges.after.bodyBottom, 4));
verdict.nothingClipped = rows.every((r) => r.clip && r.clip.worstCut <= 1);
/**
 * ⚠️ FOUR CLAIMS ABOUT THE GHOST'S TICKET GRID (v34, Phase 3), each stated against the LOADED
 * reading taken in the same run at the same width — never against 15 / 15 / 12 / 10 written down.
 * Those numbers are what the fixture happens to yield today; the claim is that the cover draws
 * what the card will show, which survives a change to either.
 */
const tkRows = rows.filter((r) => r.tk && r.tk.during && r.tk.during.present && r.tk.after && r.tk.after.present);
verdict.tkWidths = tkRows.length;
verdict.tkCountMatches = tkRows.length === rows.length
  && tkRows.every((r) => r.tk.during.count === r.tk.after.wholeVisible);
verdict.tkColsMatch = tkRows.every((r) => r.tk.during.cols === r.tk.after.cols);
/* the ghost's block is a declared height standing for a content-driven one — guarded, not shared */
verdict.tkTileMatches = tkRows.every((r) => near(r.tk.during.tileH, r.tk.after.tileH, 1));
/* inside the scrollport, and no void larger than the row it would have held */
verdict.tkContained = tkRows.every((r) => r.tk.during.overflow !== null
  && r.tk.during.overflow <= 0.5
  && -r.tk.during.overflow <= r.tk.during.tileH + r.tk.during.rowGap);
verdict.settled = rows.every((r) => r.settle && r.settleDuring
  && r.settle.suppressed && r.settleDuring.suppressed
  && r.settle.stillRunning === 0 && r.settleDuring.stillRunning === 0);
verdict.noLive = rows.every((r) => r.live && r.live.controls === 0 && r.live.inked === 0 && r.live.scanned > 50);
verdict.pass = verdict.allCaught && verdict.noneMissing && verdict.allRemoved
  && verdict.animated && verdict.noLive && verdict.rmStill && verdict.settled
  && verdict.headMatches && verdict.footMatches && verdict.nothingClipped
  && verdict.tkCountMatches && verdict.tkColsMatch && verdict.tkTileMatches && verdict.tkContained
  && verdict.worst <= TOL;
writeFileSync(join(OUT, "skeleton.json"), JSON.stringify(verdict, null, 2));
console.log("");
console.log("GATE skeletonRegions: " + (verdict.pass ? "pass" : "FAIL")
  + "  worst " + verdict.worst + "px across " + verdict.widths + " widths (tol " + TOL + ")"
  + " · caught " + verdict.allCaught + " · removed " + verdict.allRemoved + " · noLive " + verdict.noLive
  + " · reducedMotionStill " + verdict.rmStill + " · settled " + verdict.settled
  + " · head " + verdict.headMatches + " · foot " + verdict.footMatches + " · unclipped " + verdict.nothingClipped
  + " · shimmer " + verdict.animated);
console.log("GATE ticketFill: " + (verdict.tkCountMatches && verdict.tkColsMatch && verdict.tkTileMatches && verdict.tkContained ? "pass" : "FAIL")
  + "  count==wholeVisible " + verdict.tkCountMatches + " · cols " + verdict.tkColsMatch
  + " · tile " + verdict.tkTileMatches + " · contained " + verdict.tkContained
  + "  [" + tkRows.map((r) => r.width + ": ghost " + r.tk.during.count + "x" + r.tk.during.cols
      + " vs whole " + r.tk.after.wholeVisible + "x" + r.tk.after.cols
      + " gap " + (-r.tk.during.overflow)).join(" · ") + "]");
