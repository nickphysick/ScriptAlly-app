/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 (design-refs/contact-list-v26/) — the CL26 locks, on the rendered page at 1512 × 900 and 1280 × 800.
 * Helpers: cl26Lib.ts. Mutations: `CL26_MUTATE=<lock>` applies that lock's named break in the page after it loads; a lock
 * that stays green under its own mutation is unproved. H7's fixture (`seedCl26Months.mjs`) is written and removed in the
 * same run. Every lock proves its population is non-zero first.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { Ledger, MUT, SIZES, cssBreak, openCl26, shotDir, type Open26, type VP } from "./cl26Lib";

test.describe.configure({ mode: "serial" });
const T = { timeout: 8000 };

/** the visible page (every workspace page stays mounted) */
const VIS = ".aglist";
const near = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol;

/** what the list draws: its sections and its index entries */
const listState = (page: Page) => page.evaluate(() => {
  const card = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].find((e) => e.getBoundingClientRect().height > 0)!;
  const secs = [...card.querySelectorAll<HTMLElement>("[data-cl26='section']")].map((s) => ({
    k: s.dataset.k ?? "", kind: s.dataset.kind ?? "", n: Number(s.dataset.n),
    rows: s.querySelectorAll("[data-cl26='row']").length,
    label: (s.querySelector("[data-cl26='margin-label']")?.textContent ?? "").trim(),
    big: s.querySelector<HTMLElement>("[data-cl26='margin-label']")?.dataset.big ?? "",
    head: !!s.querySelector("[data-cl26='group-head']"),
    mgW: s.querySelector<HTMLElement>("[data-cl26='margin']")?.offsetWidth ?? -1,
  }));
  const ix = card.querySelector<HTMLElement>("[data-cl26='index']");
  const entries = ix ? [...ix.querySelectorAll<HTMLButtonElement>("[data-cl26='ix']")].map((b) => ({
    k: b.dataset.k ?? "", n: Number(b.dataset.n), off: b.disabled, cur: b.getAttribute("aria-current") === "true",
  })) : null;
  const rows = card.querySelectorAll("[data-cl26='row']").length;
  const count = Number(card.querySelector<HTMLElement>("[data-cl26='count']")?.dataset.n ?? "-1");
  return { secs, entries, rows, count };
});

async function mut(page: Page, lock: string) {
  if (MUT !== lock) return;
  switch (lock) {
    case "H1": await cssBreak(page, ".cl26-panel{grid-template-columns:1fr !important}"); break;
    case "H2": await cssBreak(page, ".cl26-ring{background:#fff !important;border-radius:50% !important}"); break;
    case "H3": await page.evaluate(() => {
      document.addEventListener("click", (e) => {
        if (!(e.target as HTMLElement).closest("[data-cl26='open']")) return;
        e.stopImmediatePropagation(); e.preventDefault();
        (document.querySelector(".aglist [data-cl26='who']") as HTMLElement | null)?.click();
      }, true);
    }); break;
    case "H4": await page.evaluate(() => {
      const band = document.querySelector(".aglist [data-cl26='band']");
      const sw = document.createElement("div"); sw.className = "qc150-vsw"; sw.setAttribute("data-cl25", "vsw"); sw.textContent = "List Cards";
      band?.insertBefore(sw, band.children[2] ?? null);
    }); break;
    case "H5": await page.evaluate(() => { const b = document.querySelector<HTMLElement>(".aglist [data-cl26='ix']:not(:disabled)"); if (b) b.dataset.k = "l:Q"; }); break;
    case "H6": await page.evaluate(() => {
      const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
      const orig = sc.scrollTo.bind(sc);
      sc.scrollTo = ((o: ScrollToOptions) => orig({ ...o, top: (o.top ?? 0) + 42 })) as typeof sc.scrollTo;
    }); break;
    case "H7": await cssBreak(page, ".cl26-ixs{flex-wrap:wrap !important}"); break;
    case "H8": await page.evaluate(() => {
      const r = document.querySelector(".aglist [data-cl26='row']");
      const c = document.createElement("span"); c.setAttribute("role", "cell"); c.setAttribute("data-cl251", "rating"); c.textContent = "★★★";
      r?.appendChild(c);
    }); break;
    case "H9": await page.evaluate(() => { const l = document.querySelector<HTMLElement>(".aglist [data-cl26='margin-label']"); if (l) { l.dataset.big = "4–8"; const b = l.querySelector("b"); if (b) b.textContent = "4–8"; } }); break;
    case "H10": await page.evaluate(() => {
      new MutationObserver(() => { document.querySelector("[data-cl24='group-opt'][data-v='letter']")?.remove(); }).observe(document.body, { childList: true, subtree: true });
    }); break;
    case "H11": await page.evaluate(() => {
      document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("[data-cl26='applied-clear']")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    }); break;
  }
}

/* ═════════ H1 · the header ═════════ */
test("CL26-H1 · the navy panel: title, sentence, two buttons, the ring; no At a glance, no title card; its height is its left column's", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("H1");
  for (const vp of SIZES) {
    await openCl26(page, vp);
    await mut(page, "H1");
    const r = await page.evaluate(() => {
      const panel = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='panel']")].find((e) => e.getBoundingClientRect().height > 0);
      if (!panel) return null;
      const left = panel.querySelector<HTMLElement>("[data-cl26='left']")!;
      const ring = panel.querySelector<HTMLElement>("[data-cl26='ring']")!;
      const cs = getComputedStyle(panel);
      const lr = left.getBoundingClientRect(), rr = ring.getBoundingClientRect();
      return {
        bg: cs.backgroundColor, h: panel.getBoundingClientRect().height,
        leftH: lr.height + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
        title: panel.querySelector("[data-cl26='title']")?.textContent?.trim(), line: panel.querySelector("[data-cl26='line']")?.textContent?.trim() ?? "",
        btns: [...panel.querySelectorAll("[data-cl26='add'], [data-cl26='discover']")].map((b) => b.textContent?.trim()),
        ringRightOfText: rr.left >= lr.right - 1 && rr.top < lr.bottom,
        glance: document.querySelectorAll(".aglist [data-cl251='cell'], .aglist [data-cl251='glance']").length,
        titleCard: document.querySelectorAll(".aglist .cl25-hd, .aglist .phc").length,
      };
    });
    L.check(`${vp.width} panel found`, !!r, "no panel");
    if (!r) continue;
    L.check(`${vp.width} navy`, r.bg === "rgb(42, 58, 82)", r.bg);
    L.check(`${vp.width} title`, r.title === "Contact list", String(r.title));
    L.check(`${vp.width} sentence`, /^\d+ agents? on file\. You’ve queried \d+(, and \d+ (is|are) waiting on you)?\.$/.test(r.line), r.line);
    L.check(`${vp.width} two buttons`, JSON.stringify(r.btns) === JSON.stringify(["+ Add an agent", "Discover agents"]), JSON.stringify(r.btns));
    L.check(`${vp.width} ring beside the text`, r.ringRightOfText, "the ring is under the left column");
    L.check(`${vp.width} height = left column ±2`, near(r.h, r.leftH), `${r.h} vs ${r.leftH}`);
    L.check(`${vp.width} no At a glance`, r.glance === 0, String(r.glance));
    L.check(`${vp.width} no title card`, r.titleCard === 0, String(r.titleCard));
  }
  L.done(16);
});

/* ═════════ H2 · the ring ═════════ */
test("CL26-H2 · the ring's colour is healthTone's on navy, its arc the score; the pill; the archivist with no disc", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("H2");
  const ARC: Record<number, string> = { 93: "rgb(159, 208, 173)", 72: "rgb(224, 161, 136)", 44: "rgb(240, 96, 63)" };
  for (const pct of [93, 72, 44]) {
    await openCl26(page, SIZES[0], { health: pct });
    await mut(page, "H2");
    const r = await page.evaluate(() => {
      const ring = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='ring']")].find((e) => e.getBoundingClientRect().height > 0)!;
      const arc = ring.querySelector<SVGCircleElement>("[data-cl26='arc']")!;
      const pill = ring.querySelector<HTMLElement>("[data-cl26='pct']")!;
      const arch = ring.querySelector<HTMLImageElement>("[data-cl26='archivist']")!;
      const rr = ring.getBoundingClientRect(), ar = arch.getBoundingClientRect();
      const r0 = Number(arc.getAttribute("r"));
      const dash = parseFloat((arc.getAttribute("stroke-dasharray") ?? "0").split(/[ ,]/)[0]);
      return {
        stroke: getComputedStyle(arc).stroke, share: dash / (2 * Math.PI * r0),
        pill: pill.textContent?.trim(), pillInk: getComputedStyle(pill).color, pillBg: getComputedStyle(pill).backgroundColor,
        ringBg: getComputedStyle(ring).backgroundColor, archBg: getComputedStyle(arch).backgroundColor,
        archW: ar.width, archMid: ar.left + ar.width / 2, ringMid: rr.left + rr.width / 2, archBottomGap: rr.bottom - ar.bottom,
        archTop: ar.top, strokeInner: rr.top + rr.height * (4 / 46), ringH: rr.height,
      };
    });
    L.check(`${pct} arc colour`, r.stroke === ARC[pct], r.stroke);
    L.check(`${pct} arc length ∝ score (±1%)`, Math.abs(r.share - pct / 100) <= 0.01, String(r.share));
    L.check(`${pct} pill`, r.pill === `${pct}%`, String(r.pill));
    L.check(`${pct} pill ink on cream`, r.pillInk === "rgb(28, 19, 15)" && r.pillBg === "rgb(244, 238, 229)", `${r.pillInk} on ${r.pillBg}`);
    L.check(`${pct} ring 124`, near(r.ringH, 124, 0.5), String(r.ringH));
    L.check(`${pct} no disc behind the archivist`, r.ringBg === "rgba(0, 0, 0, 0)" && r.archBg === "rgba(0, 0, 0, 0)", `${r.ringBg} / ${r.archBg}`);
    L.check(`${pct} archivist 100 wide, centred`, near(r.archW, 100, 0.6) && near(r.archMid, r.ringMid, 1), `${r.archW} at ${r.archMid} vs ${r.ringMid}`);
    L.check(`${pct} archivist's foot 24 above the ring's`, near(r.archBottomGap, 24, 1), String(r.archBottomGap));
    /* ⚠️ FALSE PREMISE (report): at 100px wide and 24px up this artwork's head reaches the stroke's inner edge, not above the
       ring's top — the mock renders the same. The lock holds what the stated values give: he reaches the ring. */
    L.check(`${pct} archivist reaches the ring (top within 2px of the stroke's inner edge)`, r.archTop <= r.strokeInner + 2, `${r.archTop} vs ${r.strokeInner}`);
  }
  L.done(27);
});

/* ═════════ H3 · the ring's actions ═════════ */
async function hkAgentsWithGaps(page: Page) {
  await page.locator(`${VIS} [data-cl26='open']`).first().click(T);
  await page.waitForTimeout(1200);
  await page.locator("[data-hkv='view'][data-v='agent']").first().click(T).catch(() => {});
  await page.waitForTimeout(800);
  const n = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-hk8='agent-row']")].filter((r) => r.querySelectorAll("[data-hk8='gap-chip']").length > 0).length);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  return n;
}
const hkOpen = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-hkv='view'], [data-hk8='agent-row']")].some((e) => e.getBoundingClientRect().height > 0));
test("CL26-H3 · the ring and Open open Housekeeping; Show me who applies Missing details, Housekeeping's count", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("H3");
  await openCl26(page, SIZES[0]);
  await mut(page, "H3");
  await page.locator(`${VIS} [data-cl26='ring']`).first().click(T);
  await page.waitForTimeout(1200);
  L.check("the ring opens Housekeeping", await hkOpen(page), "no drawer");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await page.locator(`${VIS} [data-cl26='open']`).first().click(T);
  await page.waitForTimeout(1200);
  L.check("Open opens Housekeeping", await hkOpen(page), "no drawer");
  L.check("Open does not filter", (await page.locator(`${VIS} [data-cl26='applied']`).count()) === 0, "the applied row is up");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  const hk = await hkAgentsWithGaps(page);
  L.check("Housekeeping has agents with gaps (population)", hk > 0, String(hk));
  await page.locator(`${VIS} [data-cl26='who']`).first().click(T);
  await page.waitForTimeout(1200);
  const s = await listState(page);
  const chip = await page.locator(`${VIS} [data-cl26='applied-chip'][data-k='missing']`).count();
  L.check("Show me who applies Missing details", chip === 1, String(chip));
  L.check("shown = Housekeeping's agents with gaps", s.rows === hk && s.count === hk, `${s.rows} rows, count ${s.count}, Housekeeping ${hk}`);
  const cardTop = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect().top);
  L.check("the list card is brought into view", cardTop < 300, String(cardTop));
  L.done(7);
});

/* ═════════ H4 · the band ═════════ */
test("CL26-H4 · the band: count, Find, Filters, Group, Sort; no List / Cards, no Full screen; the count is the rows drawn", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("H4");
  for (const vp of SIZES) {
    await openCl26(page, vp);
    await mut(page, "H4");
    const r = await page.evaluate(() => {
      const band = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='band']")].find((e) => e.getBoundingClientRect().height > 0)!;
      const order = [...band.children].map((c) => (c as HTMLElement).dataset.cl26 ?? (c.querySelector("[data-cl26]") as HTMLElement | null)?.dataset.cl26 ?? (c.className || "?")).filter((k) => k !== "cl26-sp");
      return {
        order, bg: getComputedStyle(band).backgroundColor,
        sw: document.querySelectorAll(".aglist .qc150-vsw, .aglist [data-cl25='vsw']").length,
        full: document.querySelectorAll(".aglist [data-cl24='full'], .aglist [data-pin-list], .aglist [data-cl24='book']").length,
      };
    });
    const s = await listState(page);
    L.check(`${vp.width} rows (population)`, s.rows > 0, String(s.rows));
    L.check(`${vp.width} order`, JSON.stringify(r.order) === JSON.stringify(["count", "find", "filters", "group", "sort"]), JSON.stringify(r.order));
    L.check(`${vp.width} navy`, r.bg === "rgb(42, 58, 82)", r.bg);
    L.check(`${vp.width} no List / Cards switch`, r.sw === 0, String(r.sw));
    L.check(`${vp.width} no Full screen`, r.full === 0, String(r.full));
    L.check(`${vp.width} count = rows drawn`, s.count === s.rows, `${s.count} vs ${s.rows}`);
  }
  L.done(12);
});

/* ═════════ H5 · the index follows ═════════ */
const STATES5: [string, Open26][] = [["letter+surname", {}], ["letter+reply", { sort: "reply" }], ["letter+added", { sort: "added" }], ["letter+status", { sort: "status" }], ["status", { group: "status" }]];
test("CL26-H5 · the index names exactly the sections drawn, in order, with their counts; No grouping draws none", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("H5");
  for (const [name, o] of STATES5) {
    await openCl26(page, SIZES[0], o);
    await mut(page, "H5");
    const s = await listState(page);
    L.check(`${name} sections (population)`, s.secs.length > 0, String(s.secs.length));
    const live = (s.entries ?? []).filter((e) => !e.off);
    L.check(`${name} entries = sections, in order`, JSON.stringify(live.map((e) => [e.k, e.n])) === JSON.stringify(s.secs.map((x) => [x.k, x.n])),
      `${JSON.stringify(live.map((e) => e.k).slice(0, 8))} vs ${JSON.stringify(s.secs.map((x) => x.k).slice(0, 8))}`);
    L.check(`${name} counts are the rows`, s.secs.every((x) => x.n === x.rows), "a section's count is not its rows");
    if (name === "letter+surname") L.check("A–Z: all 26, the empty ones disabled", (s.entries ?? []).filter((e) => /^l:[A-Z]$/.test(e.k)).length === 26 && (s.entries ?? []).filter((e) => e.off).every((e) => e.n === 0), JSON.stringify((s.entries ?? []).map((e) => e.k)));
  }
  await openCl26(page, SIZES[0], { group: "none" });
  const s = await listState(page);
  L.check("No grouping: rows (population)", s.rows > 0, String(s.rows));
  L.check("No grouping: no index", s.entries === null, "an index is drawn");
  L.done(18);
});

/* ═════════ H6 · the index jumps ═════════ */
test("CL26-H6 · every third entry lands its section's first row under the pinned headings (±2); the current entry is white", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("H6");
  await openCl26(page, SIZES[0]);
  await mut(page, "H6");
  const s = await listState(page);
  const live = (s.entries ?? []).filter((e) => !e.off);
  L.check("entries (population)", live.length >= 6, String(live.length));
  let tested = 0;
  for (let i = 0; i < live.length; i += 3) {
    const k = live[i].k;
    /* a section the scroller cannot bring up to the headings (too near the end) cannot land there: skipped, and counted */
    const can = await page.evaluate((key) => {
      const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!;
      const sec = document.querySelector<HTMLElement>(`.aglist [data-cl26='section'][data-k="${key}"]`)!;
      const pin = document.querySelector<HTMLElement>(".aglist [data-cl26='pin']")!;
      const need = sec.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12 - pin.offsetHeight;
      return need <= sc.scrollHeight - sc.clientHeight - 2;
    }, k);
    if (!can) continue;
    await page.locator(`${VIS} [data-cl26='ix'][data-k="${k}"]`).first().click(T);
    await page.waitForTimeout(1400);
    const r = await page.evaluate((key) => {
      const sec = document.querySelector<HTMLElement>(`.aglist [data-cl26='section'][data-k="${key}"]`)!;
      const row = sec.querySelector<HTMLElement>("[data-cl26='row']")!;
      const pin = document.querySelector<HTMLElement>(".aglist [data-cl26='pin']")!;
      const e = document.querySelector<HTMLElement>(`.aglist [data-cl26='ix'][data-k="${key}"]`)!;
      return { gap: row.getBoundingClientRect().top - pin.getBoundingClientRect().bottom, cur: e.getAttribute("aria-current") === "true", bg: getComputedStyle(e).backgroundColor };
    }, k);
    tested += 1;
    L.check(`${k} lands under the headings`, Math.abs(r.gap) <= 2, String(r.gap));
    L.check(`${k} is current, white`, r.cur && r.bg === "rgb(255, 255, 255)", `${r.cur} ${r.bg}`);
  }
  L.check("three or more jumps measured", tested >= 3, String(tested));
  L.done(8);
});

/* ═════════ H7 · the index overflows ═════════ */
test("CL26-H7 · twenty months: the strip scrolls, arrows drawn, the last entry reachable; four entries: no arrows", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("H7");
  execFileSync("node", ["tests/e2e/seedCl26Months.mjs"], { stdio: "inherit" });
  try {
    await openCl26(page, SIZES[0], { sort: "added" });
    await mut(page, "H7");
    const s = await listState(page);
    L.check("twenty or more months (population)", (s.entries ?? []).length >= 20, String((s.entries ?? []).length));
    const r0 = await page.evaluate(() => {
      const st = document.querySelector<HTMLElement>(".aglist [data-cl26='ix-strip']")!;
      return { over: st.scrollWidth > st.clientWidth + 1, next: !!document.querySelector(".aglist [data-cl26='ix-next']"), prev: !!document.querySelector(".aglist [data-cl26='ix-prev']"), h: st.offsetHeight };
    });
    L.check("the strip overflows", r0.over, "fits");
    L.check("the arrows are drawn", r0.next && r0.prev, JSON.stringify(r0));
    L.check("one line (no wrap)", r0.h <= 34, String(r0.h));
    for (let i = 0; i < 12; i++) {
      const b = page.locator(`${VIS} [data-cl26='ix-next']`).first();
      if (!(await b.count()) || (await b.isDisabled())) break;
      await b.click(T); await page.waitForTimeout(450);
    }
    const end = await page.evaluate(() => {
      const st = document.querySelector<HTMLElement>(".aglist [data-cl26='ix-strip']")!;
      const all = st.querySelectorAll<HTMLElement>("[data-cl26='ix']");
      const last = all[all.length - 1].getBoundingClientRect(), box = st.getBoundingClientRect();
      return { inView: last.right <= box.right + 1 && last.left >= box.left - 1 };
    });
    L.check("the last entry is reachable", end.inView, "still out of view");
    await openCl26(page, SIZES[0], { group: "status" });
    const r1 = await page.evaluate(() => ({ n: document.querySelectorAll(".aglist [data-cl26='ix']").length, arrows: document.querySelectorAll(".aglist [data-cl26='ix-next'], .aglist [data-cl26='ix-prev']").length }));
    L.check("Status: a handful of entries (population)", r1.n > 0 && r1.n <= 5, String(r1.n));
    L.check("Status: no arrows", r1.arrows === 0, String(r1.arrows));
  } finally {
    execFileSync("node", ["tests/e2e/seedCl26Months.mjs", "--clean"], { stdio: "inherit" });
  }
  L.done(7);
});

/* ═════════ H8 · rows ═════════ */
test("CL26-H8 · three content columns; no rating, replies or wishlist; the disc follows who it's with; matches are powder", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("H8");
  for (const vp of SIZES) {
    await openCl26(page, vp);
    await mut(page, "H8");
    const r = await page.evaluate(() => {
      const card = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='card']")].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...card.querySelectorAll<HTMLElement>("[data-cl26='row']")];
      const bad: string[] = [];
      for (const row of rows) {
        const cells = [...row.querySelectorAll(":scope > [role='cell']")].map((c) => (c as HTMLElement).dataset.cl26 ?? "");
        if (cells.join(",") !== "agent,want,query,") bad.push(`${row.dataset.id} cells ${cells.join(",")}`);
        const k = row.dataset.k, disc = row.querySelector<HTMLElement>("[data-cl26='disc']")!;
        const q = row.querySelector<HTMLElement>("[data-cl26='query']")!.dataset.status ?? "";
        if (!disc.classList.contains(`cl26-dsc--${k}`)) bad.push(`${row.dataset.id} disc ${disc.className} for ${k}`);
        const bang = !!disc.querySelector(".cl26-bang");
        if (bang !== (k === "you")) bad.push(`${row.dataset.id} "!" ${bang} for ${k}`);
        /* who it's with, against the stage the row states: a not-queried agent says so; a queried one names a stage */
        if (k === "none" && !(q === "nq" || q === "shut")) bad.push(`${row.dataset.id} not queried but ${q}`);
        if ((k === "you" || k === "agent") && (q === "nq" || q === "shut")) bad.push(`${row.dataset.id} ${k} but ${q}`);
        if (k === "closed" && !["Rejected", "No Response", "Withdrawn"].includes(q)) bad.push(`${row.dataset.id} closed but ${q}`);
        const bg = getComputedStyle(disc).backgroundColor;
        const want = k === "closed" ? "rgb(228, 225, 219)" : k === "none" ? "rgb(255, 255, 255)" : "rgb(42, 58, 82)";
        if (bg !== want) bad.push(`${row.dataset.id} disc ${bg} for ${k}`);
      }
      const hits = [...card.querySelectorAll<HTMLElement>(".cl252-pill.hit")].map((p) => getComputedStyle(p).backgroundColor);
      const others = [...card.querySelectorAll<HTMLElement>(".cl252-pill:not(.hit)")].map((p) => getComputedStyle(p).backgroundColor);
      return {
        n: rows.length, kinds: [...new Set(rows.map((x) => x.dataset.k))], bad,
        retired: card.querySelectorAll("[data-cl251='rating'], [data-cl252='replies'], [data-cl252='wishlist'], [data-cl254='profile-link']").length,
        hits: hits.length, hitsOk: hits.every((b) => b === "rgb(227, 232, 239)"), othersOk: others.every((b) => b === "rgb(244, 240, 235)"),
      };
    });
    L.check(`${vp.width} rows (population)`, r.n > 0, String(r.n));
    L.check(`${vp.width} three or more disc kinds (population)`, r.kinds.length >= 3, JSON.stringify(r.kinds));
    L.check(`${vp.width} rows correct`, r.bad.length === 0, r.bad.slice(0, 4).join(" | "));
    L.check(`${vp.width} no rating, replies, wishlist or profile link`, r.retired === 0, String(r.retired));
    L.check(`${vp.width} matched pills (population)`, r.hits > 0, String(r.hits));
    L.check(`${vp.width} matched pills powder, others paper`, r.hitsOk && r.othersOk, `${r.hitsOk} ${r.othersOk}`);
  }
  L.done(12);
});

/* ═════════ H9 · the margin ═════════ */
test("CL26-H9 · the margin follows the sort: letters; weeks to 12, then 12+ and ?; Status: ruled heads and no margin", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("H9");
  await openCl26(page, SIZES[0]);
  await mut(page, "H9");
  let s = await listState(page);
  L.check("letters (population)", s.secs.length > 2, String(s.secs.length));
  L.check("each margin is its letter", s.secs.every((x) => x.big === x.k.slice(2) && /^[A-Z#]$/.test(x.big)), JSON.stringify(s.secs.map((x) => x.big).slice(0, 8)));
  L.check("margin 84 wide", s.secs.every((x) => near(x.mgW, 84, 1)), String(s.secs[0]?.mgW));
  await openCl26(page, SIZES[0], { sort: "reply" });
  await mut(page, "H9");
  s = await listState(page);
  const ok = (b: string) => b === "12+" || b === "?" || (/^\d+$/.test(b) && Number(b) >= 1 && Number(b) <= 12);
  L.check("reply sections (population)", s.secs.length > 1, String(s.secs.length));
  L.check("week labels ≤ 12, then 12+ and ?", s.secs.every((x) => ok(x.big)), JSON.stringify(s.secs.map((x) => x.big)));
  const order = s.secs.map((x) => (x.big === "?" ? 99 : x.big === "12+" ? 13 : Number(x.big)));
  L.check("in order, not known last", order.every((v, i) => i === 0 || v > order[i - 1]), JSON.stringify(order));
  await openCl26(page, SIZES[0], { group: "status" });
  s = await listState(page);
  L.check("status groups (population)", s.secs.length > 1, String(s.secs.length));
  L.check("each group has a ruled head", s.secs.every((x) => x.head), "a group with no head");
  L.check("an empty margin", s.secs.every((x) => x.label === "" && x.mgW <= 22.5), JSON.stringify(s.secs.map((x) => [x.label, x.mgW])));
  L.done(9);
});

/* ═════════ H10 · the menus ═════════ */
test("CL26-H10 · Group is Letter, Status, No grouping; Sort the four; Filters' four quick picks; every word the typewriter, upright", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("H10");
  await openCl26(page, SIZES[0]);
  await mut(page, "H10");
  const fonts = (sel: string) => page.evaluate((s) => {
    const m = document.querySelector(s);
    if (!m) return { n: 0, bad: ["no menu"] };
    const bad: string[] = [];
    let n = 0;
    const w = document.createTreeWalker(m, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const t = w.currentNode as Text;
      if (!t.textContent?.trim()) continue;
      n += 1;
      const cs = getComputedStyle(t.parentElement!);
      if (!/Special Elite/.test(cs.fontFamily) || cs.fontStyle !== "normal") bad.push(`${t.textContent.trim().slice(0, 20)}: ${cs.fontFamily.slice(0, 24)} ${cs.fontStyle}`);
    }
    return { n, bad };
  }, sel);
  const shut = async () => { await page.keyboard.press("Escape"); await page.mouse.click(5, 5); await page.waitForTimeout(300); };
  await page.locator(`${VIS} [data-cl26='group']`).first().click(T); await page.waitForTimeout(400);
  const g = await page.evaluate(() => [...document.querySelectorAll("[data-cl24='group-opt'] b")].map((b) => b.textContent?.trim()));
  L.check("Group: exactly Letter, Status, No grouping", JSON.stringify(g) === JSON.stringify(["Letter", "Status", "No grouping"]), JSON.stringify(g));
  let f = await fonts("[data-cl24='group-menu']");
  L.check("Group: text (population)", f.n > 3, String(f.n));
  L.check("Group: typewriter, upright", f.bad.length === 0, f.bad.slice(0, 3).join(" | "));
  await shut();
  await page.locator(`${VIS} [data-cl26='sort']`).first().click(T); await page.waitForTimeout(400);
  const so = await page.evaluate(() => [...document.querySelectorAll("[data-cl26='sort-menu'] [data-sc='opt'] b")].map((b) => b.textContent?.trim()));
  L.check("Sort: exactly the four", JSON.stringify(so) === JSON.stringify(["Surname", "Date added", "Reply time", "Query status"]), JSON.stringify(so));
  f = await fonts("[data-cl26='sort-menu']");
  L.check("Sort: text (population)", f.n > 4, String(f.n));
  L.check("Sort: typewriter, upright", f.bad.length === 0, f.bad.slice(0, 3).join(" | "));
  await shut();
  await page.locator(`${VIS} [data-cl26='filters']`).first().click(T); await page.waitForTimeout(400);
  const qp = await page.evaluate(() => [...document.querySelectorAll("[data-nb1='pick'] b")].map((b) => b.textContent?.trim()));
  L.check("Filters: the four quick picks, Missing details among them", JSON.stringify(qp) === JSON.stringify(["Your move", "Ready to query", "Waiting to hear back", "Missing details"]), JSON.stringify(qp));
  f = await fonts("[data-nb1='filter-menu']");
  L.check("Filters: text (population)", f.n > 8, String(f.n));
  L.check("Filters: typewriter, upright", f.bad.length === 0, f.bad.slice(0, 3).join(" | "));
  L.done(9);
});

/* ═════════ H11 · the applied row ═════════ */
test("CL26-H11 · Missing details + a genre: two chips and Clear; every row says what it is missing; dropping a chip updates the count", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("H11");
  await openCl26(page, SIZES[0]);
  await mut(page, "H11");
  await page.locator(`${VIS} [data-cl26='filters']`).first().click(T); await page.waitForTimeout(400);
  await page.locator("[data-nb1='pick'][data-k='missing']").first().click(T); await page.waitForTimeout(400);
  await page.locator("[data-nb1='genre']").first().click(T); await page.waitForTimeout(400);
  await page.keyboard.press("Escape"); await page.mouse.click(5, 5); await page.waitForTimeout(600);
  const a = await page.evaluate(() => ({
    chips: [...document.querySelectorAll<HTMLElement>(".aglist [data-cl26='applied-chip']")].map((c) => c.dataset.k),
    clear: document.querySelectorAll(".aglist [data-cl26='applied-clear']").length,
    rows: document.querySelectorAll(".aglist [data-cl26='row']").length,
    lines: document.querySelectorAll(".aglist [data-cl26='row'] [data-cl26='missing-line']").length,
    fill: document.querySelectorAll(".aglist [data-cl26='row'] [data-cl26='fill']").length,
  }));
  L.check("rows (population)", a.rows > 0, String(a.rows));
  L.check("two chips: Missing details and the genre", JSON.stringify(a.chips) === JSON.stringify(["missing", "genres"]), JSON.stringify(a.chips));
  L.check("Clear filters", a.clear === 1, String(a.clear));
  L.check("every row says what it is missing", a.lines === a.rows && a.fill === a.rows, `${a.lines}/${a.fill} of ${a.rows}`);
  await page.locator(`${VIS} [data-cl26='applied-chip'][data-k='genres']`).first().click(T); await page.waitForTimeout(600);
  const b = await listState(page);
  L.check("dropping the genre widens the list", b.rows >= a.rows && b.count === b.rows, `${a.rows} → ${b.rows} (count ${b.count})`);
  await page.locator(`${VIS} [data-cl26='applied-clear']`).first().click(T); await page.waitForTimeout(600);
  const c = await listState(page);
  L.check("Clear filters takes the row away", (await page.locator(`${VIS} [data-cl26='applied']`).count()) === 0, "the applied row is still up");
  L.check("…and the list is whole again", c.rows >= b.rows && c.count === c.rows, `${c.rows}`);
  L.done(7);
});

/* ═════════ the report's screens ═════════ */
const STATES: [string, Open26][] = [
  ["01-page", {}], ["03-health-48", { health: 48 }], ["04-grouped-status", { group: "status" }], ["05-sorted-reply", { sort: "reply" }],
  ["06-sorted-added", { sort: "added" }], ["07-no-grouping", { group: "none" }], ["xx-sorted-status", { sort: "status" }],
];
test("CL26 shots — the page in each state", async ({ page }) => {
  test.skip(!!MUT, "screens are for an unmutated run");
  test.setTimeout(400_000);
  for (const [name, o] of STATES) {
    await openCl26(page, SIZES[0], o);
    await page.screenshot({ path: `${shotDir()}/${name}-1512.png` });
  }
  await openCl26(page, SIZES[1] as VP);
  await page.screenshot({ path: `${shotDir()}/02-page-1280.png` });
  /* the pinned band, index and headings over scrolled rows (the mask has no pixel lock: this is the look) */
  await openCl26(page, SIZES[0]);
  await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!; sc.scrollTop = 900; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shotDir()}/xx-pinned-1512.png` });
  for (const [name, sel] of [["08-group-menu", "[data-cl26='group']"], ["09-sort-menu", "[data-cl26='sort']"], ["10-filters-menu", "[data-cl26='filters']"]] as const) {
    await openCl26(page, SIZES[0]);
    await page.locator(`${VIS} ${sel}`).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${shotDir()}/${name}-1512.png` });
  }
  await openCl26(page, SIZES[0]);
  await page.locator(`${VIS} [data-cl26='who']`).first().click();
  await page.waitForTimeout(900);
  await page.locator(`${VIS} [data-cl26='filters']`).first().click();
  await page.locator("[data-nb1='genre']").first().click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shotDir()}/11-missing-details-1512.png` });
});
