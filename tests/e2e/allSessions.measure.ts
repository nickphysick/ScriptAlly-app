/**
 * Five sessions, one deploy — is each one's latest work actually on the deployed site?
 *
 * ⚠️ NO BACKTICKS INSIDE ANY page.evaluate TEMPLATE, and `\\s` NEVER `\s` — a template literal eats
 * the backslash, so `/\s+/g` compiles to "every letter s".
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";

const OUT = "run-artifacts/all-sessions-deploy.txt";
rmSync(OUT, { force: true });
mkdirSync("reports/all-sessions", { recursive: true });
const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

const out: string[] = [];
const say = (s: string) => out.push(s);

test("five sessions on dev", async ({ page }) => {
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  /* ── 1 · masthead / pinned chrome ─────────────────────────────────────────────────────────── */
  await page.goto("/todo");
  await page.waitForSelector(".tlc .row", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const chrome = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const slab = all(".wpg-chrome, .wpg-slab")[0];
    const cs = slab ? getComputedStyle(slab) : null;
    return {
      slab: !!slab,
      position: cs ? cs.position : null,
      top: cs ? cs.top : null,
      miniName: all(".wpg-mini-name").length,
      chevron: all(".wpg-foldbadge, .ws-foldbadge, [class*=foldbadge]").length,
    };
  })()`);
  const c = chrome as { slab: boolean; position: string; top: string; miniName: number; chevron: number };
  say("1 · MASTHEAD / pinned chrome");
  say("    one sticky slab: " + c.slab + " · position=" + c.position + " top=" + c.top);
  say("    §4 the folded name bar is dead: .wpg-mini-name count = " + c.miniName + (c.miniName === 0 ? "  PASS" : "  FAIL"));
  say("    the fold chevron exists: " + c.chevron);
  await page.screenshot({ path: "reports/all-sessions/1-masthead-todo.png" });

  /* ── 2 · to-do task pane (the chase deed) ─────────────────────────────────────────────────── */
  const chase = await page.evaluate(`(() => {
    const vis = ${VIS};
    const rows = [...document.querySelectorAll(".tlc .row")].filter(vis)
      .filter((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === "Chase");
    if (!rows.length) return null;
    rows[0].click();
    return true;
  })()`);
  await page.waitForTimeout(2600);
  const deed = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const d = all(".tpn .deed")[0];
    const tl = all(".storycol .tl")[0];
    return {
      deed: d ? (d.textContent || "").replace(/\\s+/g, " ").trim() : null,
      italics: d ? [...d.querySelectorAll("i")].map((i) => (i.textContent || "").trim()) : [],
      rungs: tl ? [...tl.children].filter(vis).map((x) => (x.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 34)) : [],
    };
  })()`);
  const dd = deed as { deed: string | null; italics: string[]; rungs: string[] };
  say("");
  say("2 · TO-DO task pane");
  say("    chase row opened: " + (chase ? "yes" : "NO CHASE ROW"));
  say("    deed: " + dd.deed);
  say("    emphasised: " + JSON.stringify(dd.italics));
  say("    story: " + JSON.stringify(dd.rungs));
  await page.screenshot({ path: "reports/all-sessions/2-todo-chase.png" });

  /* ── 3 · calendar — the flagged 5px overflow, measured on the deployed build ──────────────── */
  await page.goto("/todo/calendar");
  await page.waitForTimeout(6000);
  const cal = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const cells = all(".cal-cell, .cal-day, [class*=cal-cell]");
    const over = [];
    for (const el of cells) {
      if (el.scrollHeight > el.clientHeight + 1) {
        over.push({ t: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 18),
                    s: el.scrollHeight, c: el.clientHeight });
      }
    }
    return { cells: cells.length, over, sample: cells[0] ? Math.round(cells[0].getBoundingClientRect().height * 10) / 10 : null };
  })()`);
  const cl = cal as { cells: number; over: { t: string; s: number; c: number }[]; sample: number | null };
  say("");
  say("3 · CALENDAR — the chassis session's flagged overflow");
  say("    cells found: " + cl.cells + " · first cell height: " + cl.sample);
  say("    OVERFLOWING cells: " + cl.over.length
    + (cl.over.length ? " → " + JSON.stringify(cl.over.slice(0, 4)) : "  none at 1440x900"));
  await page.screenshot({ path: "reports/all-sessions/3-calendar.png" });

  /* ── 4 · submission packages ──────────────────────────────────────────────────────────────── */
  await page.goto("/manuscripts/packages");
  await page.waitForTimeout(6000);
  const pkg = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    return {
      hero: all("[class*=pkgw-hero], [class*=pkg-hero], .pkgw-strip").length,
      bands: all("[class*=band]").length,
      heading: ((all("h1")[0] || {}).textContent || "").trim().slice(0, 40),
    };
  })()`);
  const pk = pkg as { hero: number; bands: number; heading: string };
  say("");
  say("4 · SUBMISSION PACKAGES");
  say("    heading: " + pk.heading + " · hero elements: " + pk.hero + " · bands: " + pk.bands);
  await page.screenshot({ path: "reports/all-sessions/4-packages.png" });

  /* ── 5 · comparable titles v2.1 ───────────────────────────────────────────────────────────── */
  await page.goto("/manuscripts/comps");
  await page.waitForTimeout(6000);
  const comps = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    return {
      heading: ((all("h1")[0] || {}).textContent || "").trim().slice(0, 40),
      cards: all("[class*=ct-card], [class*=ct-row], [class*=comp]").length,
      masthead: all("[class*=wsh-title], .wpg-chrome h1").length,
    };
  })()`);
  const cp = comps as { heading: string; cards: number; masthead: number };
  say("");
  say("5 · COMPARABLE TITLES v2.1");
  say("    heading: " + cp.heading + " · comp elements: " + cp.cards + " · masthead nodes: " + cp.masthead);
  await page.screenshot({ path: "reports/all-sessions/5-comps.png" });

  writeFileSync(OUT, out.join("\n") + "\n");
});
