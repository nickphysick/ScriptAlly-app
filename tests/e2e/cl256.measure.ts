/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.6 (design-refs/contact-list-v25-6/) — the CL256 locks, at 1512 × 900 and 1280 × 800 with the shell.
 *
 *   H1 pin     the bar pins 12 (±1) below the sheet's top, its corner shows the page colour, the 12px above it is page
 *              colour, the headings sit directly under it, and nothing jumps at the moment of pinning (List and Cards)
 *   H2 cells   four equal cells; each non-health foot's number equals its independent count; a zero foot is absent
 *   H3 navy    List health is rgb(42, 58, 82); a click opens Housekeeping and changes no filter
 *   H4 tone    at 93, 72 and 44 (the dev-only `__SA_CL_HEALTH` stub) the cell's ring and Housekeeping's ring both take
 *              healthTone's on-navy arc and track
 *   H5 clear   the navy bar holds no list health element and its first child is the search well — List, Cards and
 *              pinned — and it is one line at both sizes
 *   H6 menus   every word in the Filters, group and sort menus is Special Elite and upright; headings are mono
 *
 * Every lock proves its population before its claim. `CL256_MUTATE=<lock>` applies that lock's named break in the page;
 * `CL256_BASE=1` marks a run against the base build (the ledger files are kept apart).
 */
import { test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { BASE, Ledger, MUT, SIZES, mutate, mutateJs, openCl24, scrollTo, type VP } from "./cl256Lib";
import { ringColours } from "../../src/lib/contactV256";

test.describe.configure({ mode: "serial" });
test.setTimeout(420_000);

const vis = (s: string) => `${s}:visible`;
/** the page colour, resolved: a probe element painting var(--ws-page) inside the window */
const pageColour = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const host = [...document.querySelectorAll<HTMLElement>(".ws-main")].find((e) => e.getBoundingClientRect().height > 0) ?? document.body;
  const d = document.createElement("div"); d.style.background = "var(--ws-page)"; host.appendChild(d);
  const c = getComputedStyle(d).backgroundColor; d.remove(); return c;
});
const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const near = (a: number[], b: number[], tol = 6) => a.length === 3 && b.length === 3 && a.every((v, i) => Math.abs(v - b[i]) <= tol);
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const colourOf = (s: string) => (s.startsWith("#") ? hexRgb(s) : rgb(s));

/** the pixels at the given CSS points of the current viewport */
async function pixels(page: import("@playwright/test").Page, pts: [number, number][]): Promise<number[][]> {
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(async ({ png, pts }) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    return pts.map(([x, y]) => [...g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data].slice(0, 3));
  }, { png, pts });
}

const geo = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
  const r = (e?: Element | null) => (e ? e.getBoundingClientRect() : null);
  const sc = r(v(".wpg-scroll")), bar = r(v("[data-cl24='bar']"));
  const th = r(v("[data-cl24='heads']"));
  /* in Cards, the group head that has pinned: the one whose top is nearest the bar's bottom */
  const rhs = [...document.querySelectorAll<HTMLElement>("[data-cl24='card-head']")].map((e) => e.getBoundingClientRect()).filter((b) => b.height > 0);
  const rh = bar ? rhs.reduce<DOMRect | null>((m, b) => (!m || Math.abs(b.top - bar.bottom) < Math.abs(m.top - bar.bottom) ? b : m), null) : null;
  return { sc: sc && { t: sc.top }, bar: bar && { t: bar.top, b: bar.bottom, l: bar.left, r: bar.right }, th: th && { t: th.top }, rh: rh && { t: rh.top } };
});

/* ══ H1 · pinning with a gap ══════════════════════════════════════════════════════════════════════════════════════ */
test("H1 pin", async ({ page }) => {
  const L = new Ledger("H1");
  for (const vp of SIZES) for (const view of ["list", "cards"] as const) {
    const at = `${vp.width} ${view}`;
    await openCl24(page, vp, { grouped: true, view });
    await mutate(page, "H1", ".cl24-sheet > .cl256-pin { top: -12px !important; }");
    const rest = await geo(page);
    L.check(`${at} population: the bar and the scroller`, rest.bar && rest.sc, JSON.stringify(rest));
    if (!rest.bar || !rest.sc) continue;
    /* no jump: across the pinning moment the bar sits at max(sheet top + 12, where it would be) */
    const pinAt = rest.bar.t - rest.sc.t - 12;
    let jumps = 0, steps = 0;
    for (let s = Math.max(0, pinAt - 24); s <= pinAt + 24; s += 4) {
      await scrollTo(page, s);
      const g = await geo(page);
      const want = Math.max(rest.sc.t + 12, rest.bar.t - s);
      steps += 1;
      if (!g.bar || Math.abs(g.bar.t - want) > 1) jumps += 1;
    }
    L.check(`${at} no jump at the moment of pinning (${steps} steps)`, steps >= 10 && jumps === 0, `${jumps} of ${steps} off`);
    await scrollTo(page, pinAt + 700);
    const g = await geo(page);
    if (!g.bar || !g.sc) { L.check(`${at} pinned`, false, "no bar"); continue; }
    L.check(`${at} the bar's top is 12 below the sheet's top`, Math.abs(g.bar.t - g.sc.t - 12) <= 1, `${(g.bar.t - g.sc.t).toFixed(1)}`);
    const pc = rgb(await pageColour(page));
    const top = g.sc.t;
    const band: [number, number][] = [];
    for (let x = g.bar.l + 2; x < g.bar.r - 2; x += 40) for (const dy of [2, 6, 10]) band.push([x, top + dy]);
    const corner: [number, number] = [g.bar.l + 3, g.bar.t + 3];
    const px = await pixels(page, [corner, ...band]);
    L.check(`${at} the corner pixel (3px in) is page colour`, near(px[0], pc), `${px[0]} vs ${pc}`);
    const off = px.slice(1).filter((p) => !near(p, pc));
    L.check(`${at} no row pixel in the 12px above the bar (${band.length} samples)`, band.length > 10 && off.length === 0, `${off.length} off, first ${off[0]}`);
    if (view === "list") L.check(`${at} the headings sit directly under the bar`, g.th && Math.abs(g.th.t - g.bar.b) <= 1, `${g.th?.t} vs ${g.bar.b}`);
    else L.check(`${at} the group head sits directly under the bar`, g.rh && Math.abs(g.rh.t - g.bar.b) <= 1, `${g.rh?.t} vs ${g.bar.b}`);
  }
  L.done(20);
});

/* ══ H2 · four equal cells, each with its foot ═══════════════════════════════════════════════════════════════════ */
type Data = { manuscripts: { id: string; genre: string | null }[]; agents: { id: string; genres: string[] }[]; queries: { agentId: string; manuscriptId: string; status: string; last: number | null }[] };
const CLOSED = new Set(["Rejected", "No Response", "Withdrawn"]);
function independent(d: Data, msId: string) {
  const ms = d.manuscripts.find((m) => m.id === msId);
  const g0 = (ms?.genre ?? "").trim().toLowerCase();
  const mine = d.queries.filter((q) => q.manuscriptId === msId);
  const byAgent = new Map<string, typeof mine>();
  for (const q of mine) byAgent.set(q.agentId, [...(byAgent.get(q.agentId) ?? []), q]);
  const nq = d.agents.filter((a) => !byAgent.has(a.id));
  const want = nq.filter((a) => a.genres.some((x) => x.trim().toLowerCase() === g0)).length;
  let passed = 0;
  for (const [, qs] of byAgent) {
    if (!qs.every((q) => CLOSED.has(q.status))) continue;
    const last = qs.reduce((m, q) => ((q.last ?? 0) > (m.last ?? 0) ? q : m), qs[0]);
    if (last.status === "Rejected") passed += 1;
  }
  return { want, passed };
}

test("H2 cells", async ({ page }) => {
  const L = new Ledger("H2");
  const d = JSON.parse(execFileSync("node", ["tests/e2e/cl256Data.mjs"], { encoding: "utf8" })) as Data;
  await openCl24(page, SIZES[0], { grouped: true });
  const stored = await page.evaluate(() => { try { return localStorage.getItem("scriptally_active_manuscript_id"); } catch { return null; } });
  for (const vp of SIZES) for (const book of ["cv25-ms", "cv25-ms-empty"]) {
    await page.evaluate((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, book);
    await openCl24(page, vp, { grouped: true });
    const msId = await page.evaluate(() => { try { return localStorage.getItem("scriptally_active_manuscript_id"); } catch { return null; } });
    const at = `${vp.width} ${book}`;
    await mutateJs(page, "H2", () => {
      const c = [...document.querySelectorAll<HTMLElement>("[data-cl251='cell'][data-k='closed']")].find((e) => e.getBoundingClientRect().width > 0);
      if (c && !c.querySelector("[data-cl256='foot']")) c.insertAdjacentHTML("beforeend", `<span class="cl256-ft" data-cl256="foot" data-k="closed" data-n="0"><b>0</b> passed</span>`);
    });
    const r = await page.evaluate(() => {
      const cells = [...document.querySelectorAll<HTMLElement>("[data-cl251='cell']")].filter((c) => c.getBoundingClientRect().width > 0);
      const groups = [...document.querySelectorAll<HTMLElement>("[data-cl24='group-head']")].filter((g) => g.getBoundingClientRect().height > 0);
      const you = groups.find((g) => g.dataset.k === "you");
      return {
        cells: cells.map((c) => ({ k: c.dataset.k!, w: c.getBoundingClientRect().width, foot: c.querySelector<HTMLElement>("[data-cl256='foot']")?.textContent?.trim() ?? null, n: c.querySelector<HTMLElement>("[data-cl256='foot']")?.dataset.n ?? null })),
        youRows: you ? (you.parentElement?.querySelectorAll("[data-cl24='row']").length ?? 0) : 0,
      };
    });
    L.check(`${at} population: four cells, a book id`, r.cells.length === 4 && !!msId, `${r.cells.length} cells, ${msId}`);
    const ws = r.cells.map((c) => c.w);
    L.check(`${at} the four cells are equal (±1)`, Math.max(...ws) - Math.min(...ws) <= 1, ws.join(" "));
    const ind = msId ? independent(d, msId) : { want: -1, passed: -1 };
    const expect: Record<string, number> = { none: ind.want, querying: r.youRows, closed: ind.passed };
    for (const k of ["none", "querying", "closed"]) {
      const c = r.cells.find((x) => x.k === k);
      const want = expect[k];
      const words = k === "none" ? /^\d+ wants? thrillers$/ : k === "querying" ? /^\d+ waiting on you$/ : /^\d+ passed$/;
      if (want === 0) L.check(`${at} ${k}: a zero foot is absent`, c && c.foot === null, `${c?.foot}`);
      else L.check(`${at} ${k}: the foot says ${want}`, c && c.n === String(want) && words.test(c.foot ?? ""), `${c?.foot} (want ${want})`);
    }
    L.check(`${at} the zero case is exercised on the empty book`, book === "cv25-ms" || expect.querying === 0, `querying ${expect.querying}`);
  }
  /* put the account's stored book back as it was */
  await page.evaluate((v) => { try { if (v === null) localStorage.removeItem("scriptally_active_manuscript_id"); else localStorage.setItem("scriptally_active_manuscript_id", v); } catch { /* */ } }, stored);
  L.done(24);
});

/* ══ H3 · List health in navy, opening Housekeeping without filtering ════════════════════════════════════════════ */
test("H3 navy", async ({ page }) => {
  const L = new Ledger("H3");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp, { grouped: true });
    await mutateJs(page, "H3", () => {
      const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().width > 0);
      v("[data-cl251='cell'][data-k='health']")?.addEventListener("click", () => v("[data-cl251='cell'][data-k='querying']")?.click());
    });
    const before = await page.evaluate(() => ({
      rows: [...document.querySelectorAll<HTMLElement>("[data-cl24='row']")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.k).join(","),
      bg: getComputedStyle([...document.querySelectorAll<HTMLElement>("[data-cl251='cell'][data-k='health']")].find((e) => e.getBoundingClientRect().width > 0)!).backgroundColor,
    }));
    L.check(`${at} population: rows on the list`, before.rows.length > 0, `${before.rows.split(",").length}`);
    L.check(`${at} the List health cell is navy`, before.bg === "rgb(42, 58, 82)", before.bg);
    await page.locator(vis("[data-cl251='cell'][data-k='health']")).first().click();
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({
      hk: [...document.querySelectorAll<HTMLElement>("[data-hk8='ring']")].some((e) => e.getBoundingClientRect().width > 0),
      rows: [...document.querySelectorAll<HTMLElement>("[data-cl24='row']")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.dataset.k).join(","),
      pressed: [...document.querySelectorAll<HTMLElement>("[data-cl251='cell']")].filter((e) => e.getAttribute("aria-pressed") === "true" || e.hasAttribute("data-on")).length,
      healthPressed: [...document.querySelectorAll<HTMLElement>("[data-cl251='cell'][data-k='health']")].some((e) => e.hasAttribute("aria-pressed")),
    }));
    L.check(`${at} a click opens Housekeeping`, after.hk, String(after.hk));
    L.check(`${at} no list filter changes`, after.rows === before.rows && after.pressed === 0, `rows same: ${after.rows === before.rows}, pressed ${after.pressed}`);
    L.check(`${at} List health never shows as pressed`, !after.healthPressed, String(after.healthPressed));
  }
  L.done(10);
});

/* ══ H4 · the ring follows the score ═════════════════════════════════════════════════════════════════════════════
   The two mounted rings sit on navy: the At a glance cell and Housekeeping's ink header. The light treatment has no
   mounted ring today (ContactSummaryCard is mounted nowhere); it is held by the unit lock on ringColours. */
test("H4 tone", async ({ page }) => {
  const L = new Ledger("H4");
  const vp: VP = SIZES[0];
  for (const pct of [93, 72, 44]) {
    await page.addInitScript((p) => { (window as unknown as { __SA_CL_HEALTH: number }).__SA_CL_HEALTH = p; }, pct);
    await openCl24(page, vp, { grouped: true });
    await mutate(page, "H4", "[data-cl17='ring-ink'], [data-hk8='ring-arc'] { stroke: #2a3a52 !important; }");
    const want = ringColours(pct, "navy");
    const read = () => page.evaluate(() => {
      const v = (s: string) => [...document.querySelectorAll<SVGElement>(s)].find((e) => e.getBoundingClientRect().width > 0);
      const st = (e?: SVGElement) => (e ? { stroke: getComputedStyle(e).stroke, op: getComputedStyle(e).strokeOpacity } : null);
      return {
        cellArc: st(v("[data-cl251='ring'] [data-cl17='ring-ink']")), cellTrack: st(v("[data-cl251='ring'] [data-cl17='ring-gaps']")),
        hkArc: st(v("[data-hk8='ring-arc']")), hkTrack: st(v("[data-hk8='ring-track']")),
        cellPct: [...document.querySelectorAll<HTMLElement>("[data-cl251='cell'][data-k='health'] [data-cl251='count']")].find((e) => e.getBoundingClientRect().width > 0)?.textContent,
      };
    });
    const a = await read();
    L.check(`${pct} population: the stub reached the page`, a.cellPct === `${pct}%`, `${a.cellPct}`);
    L.check(`${pct} cell arc is ${want.arc}`, a.cellArc && near(rgb(a.cellArc.stroke), colourOf(want.arc), 1), `${a.cellArc?.stroke}`);
    L.check(`${pct} cell track is ${want.track}`, a.cellTrack && a.cellTrack.stroke.replace(/\s/g, "") === want.track.replace(/\s/g, ""), `${a.cellTrack?.stroke}`);
    await page.locator(vis("[data-cl251='cell'][data-k='health']")).first().click();
    await page.waitForTimeout(1200);
    const h = await read();
    L.check(`${pct} Housekeeping's arc is ${want.arc}`, h.hkArc && near(rgb(h.hkArc.stroke), colourOf(want.arc), 1), `${h.hkArc?.stroke}`);
    L.check(`${pct} Housekeeping's track is ${want.track}`, h.hkTrack && h.hkTrack.stroke.replace(/\s/g, "") === want.track.replace(/\s/g, ""), `${h.hkTrack?.stroke}`);
    L.check(`${pct} the cell and Housekeeping agree`, h.hkArc && a.cellArc && near(rgb(h.hkArc.stroke), rgb(a.cellArc.stroke), 1), `${h.hkArc?.stroke} / ${a.cellArc?.stroke}`);
    await page.keyboard.press("Escape");
  }
  L.done(18);
});

/* ══ H5 · the bar is clear of List health ════════════════════════════════════════════════════════════════════════ */
test("H5 bar clear", async ({ page }) => {
  const L = new Ledger("H5");
  for (const vp of SIZES) for (const state of ["list", "cards", "pinned"] as const) {
    const at = `${vp.width} ${state}`;
    await openCl24(page, vp, { grouped: true, view: state === "cards" ? "cards" : "list" });
    await mutateJs(page, "H5", () => {
      const bar = [...document.querySelectorAll<HTMLElement>("[data-cl24='bar']")].find((e) => e.getBoundingClientRect().height > 0);
      bar?.insertAdjacentHTML("afterbegin", `<button data-cl256="bar-ring"><span class="cl17-rg"></span>69% list health</button>`);
    });
    if (state === "pinned") await scrollTo(page, 900);
    const r = await page.evaluate(() => {
      const bar = [...document.querySelectorAll<HTMLElement>("[data-cl24='bar']")].find((e) => e.getBoundingClientRect().height > 0);
      if (!bar) return null;
      const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0);
      const kids = [...bar.children].filter((k) => (k as HTMLElement).getBoundingClientRect().width > 0) as HTMLElement[];
      return {
        n: kids.length, first: kids[0]?.dataset.cl24 ?? kids[0]?.className,
        health: bar.querySelectorAll("[data-cl256='bar-ring'], .cl17-rg, [data-hk8], [data-cl251]").length + (/list health/i.test(bar.textContent ?? "") ? 1 : 0),
        h: bar.getBoundingClientRect().height,
        tops: kids.map((k) => Math.round(k.getBoundingClientRect().top + k.getBoundingClientRect().height / 2)),
        pinned: sc ? Math.abs(bar.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12) <= 1 : false,
      };
    });
    L.check(`${at} population: the bar's children`, r && r.n >= 3, `${r?.n}`);
    if (!r) continue;
    if (state === "pinned") L.check(`${at} population: the bar has pinned`, r.pinned, String(r.pinned));
    L.check(`${at} no list health element in the bar`, r.health === 0, `${r.health}`);
    L.check(`${at} the bar's first child is the search well`, r.first === "find", `${r.first}`);
    L.check(`${at} the bar is one line`, Math.max(...r.tops) - Math.min(...r.tops) <= 2 && r.h <= 53, `${r.tops.join(" ")} · ${r.h}`);
  }
  L.done(26);
});

/* ══ H6 · typewriter menus ═══════════════════════════════════════════════════════════════════════════════════════ */
test("H6 menus", async ({ page }) => {
  const L = new Ledger("H6");
  const vp: VP = SIZES[0];
  for (const full of [false, true]) {
    await openCl24(page, vp, { grouped: true, full });
    await mutate(page, "H6", ".sc-pop .sc-opt b, .lpop.nb1-pop .nb1-ck, .lpop.cl24-gpop .cl24-gopt b { font-family: Georgia, serif !important; }");
    const scope = full ? "" : "[data-cl24='bar'] ";
    const menus = full ? [["filters", "[data-nb1='filter-menu']"], ["sort", ".sc-pop"]] : [["filters", "[data-nb1='filter-menu']"], ["group", "[data-cl24='group-menu']"], ["sort", ".sc-pop"]];
    for (const [btn, menu] of menus) {
      const at = `${full ? "full" : "list"} ${btn}`;
      await page.locator(`${scope}[data-cl24='${btn}']:visible, ${scope}[data-nb1='${btn}']:visible`).first().click();
      await page.waitForTimeout(450);
      const nodes = await page.evaluate((m) => {
        const root = [...document.querySelectorAll<HTMLElement>(m)].find((e) => e.getBoundingClientRect().height > 0);
        if (!root) return [];
        const out: { t: string; fam: string; style: string; head: boolean }[] = [];
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          const el = n.parentElement as HTMLElement;
          if (!n.textContent?.trim() || el.getBoundingClientRect().width === 0) continue;
          const cs = getComputedStyle(el);
          out.push({ t: n.textContent.trim().slice(0, 20), fam: cs.fontFamily, style: cs.fontStyle, head: !!el.closest("h6, .sc-mh") });
        }
        return out;
      }, menu);
      L.check(`${at} population: the menu's words`, nodes.length >= 4, `${nodes.length}`);
      const bad = nodes.filter((n) => (n.head ? !/mono/i.test(n.fam) : !/^"?Special Elite/.test(n.fam) || n.style !== "normal"));
      L.check(`${at} every word is the typewriter, upright; headings mono`, bad.length === 0, bad.slice(0, 3).map((b) => `${b.t}: ${b.fam.split(",")[0]} ${b.style}`).join(" · "));
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
  }
  L.done(10);
});

void BASE; void MUT;
