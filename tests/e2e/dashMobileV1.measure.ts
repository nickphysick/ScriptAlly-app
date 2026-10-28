/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD ON THE PHONE v1 — the DM1 locks. Phones at 390×844 and 375×667; the desktop checks at 1512×900 and
 * 1280×800. Every lock is a rendered reading, written to a ledger with a floor so a run that measured nothing fails.
 *
 * Named breaks: `DM1_MUTATE=<name>` (dm1Lib's CSS_MUTATIONS, or the in-test ones below).
 */
import { test, type Page } from "@playwright/test";
import { DESKTOPS, Ledger, MUT, PHONES, openDash, tag, type VP } from "./dm1Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(420_000);

/** The visible dashboard root's box, or null. */
const rectOf = (page: Page, sel: string) => page.evaluate((s) => {
  const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
}, sel);

/** What is open over the page: the query drawer, the agent panel, the response picker, any visible dialog. */
const openedState = (page: Page) => page.evaluate(() => {
  const vis = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e as HTMLElement).visibility !== "hidden"; };
  const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(vis).map((e) => (e.getAttribute("aria-label") || e.className || "").toString().slice(0, 60));
  return {
    path: location.pathname + location.search,
    drawer: [...document.querySelectorAll(".qad-root.is-open, [data-qad-drawer]")].some(vis),
    agentPanel: [...document.querySelectorAll('[data-ac="overlay"], [data-acp], .acp-root, [data-ac="panel"]')].some(vis),
    dialogs,
  };
});

const closeEverything = async (page: Page) => {
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); }
};

test("DM1-A1 · the phone top bar", async ({ page }) => {
  const L = new Ledger("A1");
  for (const vp of PHONES) {
    await openDash(page, vp);
    const where = tag(vp);
    const top = await rectOf(page, '[data-dm1="top"]');
    L.check("A1", `${where} population: the top bar`, !!top, JSON.stringify(top));
    if (!top) continue;
    if (MUT === "A1-overlap") await page.addStyleTag({ content: `.dm1-tools { margin-left: -120px !important; }` });
    if (MUT === "A1-no-rotate") await page.addStyleTag({ content: `.dm1-plus.is-open .dm1-plusdisc > svg { transform: none !important; }` });
    /* the four controls: the name, Search, Feedback, Add — each visible, inside the bar and the window */
    const ctl = await page.evaluate(() => {
      const bar = [...document.querySelectorAll<HTMLElement>('[data-dm1="top"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const name = bar.querySelector(".sv2-scopet");
      /* the name's INK: a range over its text, clipped by its own box (it ellipsises) */
      let ink: ReturnType<typeof box> = null;
      if (name) { const nb = name.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(name); const rr = rg.getBoundingClientRect(); ink = { l: rr.left, t: rr.top, r: Math.min(rr.right, nb.right), b: rr.bottom, w: Math.min(rr.right, nb.right) - rr.left, h: rr.height }; }
      return {
        bar: box(bar), name: box(name), ink, text: name?.textContent ?? "",
        search: box(bar.querySelector('[aria-label="Search"]')),
        feedback: box(bar.querySelector('[aria-label="Feedback"]')),
        add: box(bar.querySelector('[aria-label="Add"]')),
        mark: box(bar.querySelector(".dm1-mark")),
      };
    });
    const vw = vp.width;
    for (const k of ["name", "search", "feedback", "add"] as const) {
      const b = ctl[k];
      L.check("A1", `${where} ${k} visible and inside the window`, !!b && b.w > 0 && b.h > 0 && b.l >= 0 && b.r <= vw + 0.5, JSON.stringify(b));
    }
    for (const k of ["search", "feedback", "add"] as const) {
      const b = ctl[k]!;
      L.check("A1", `${where} ${k} hit area ≥ 40`, !!b && b.w >= 40 && b.h >= 40, `${b?.w}×${b?.h}`);
      const ink = ctl.ink;
      const hit = !!ink && !!b && ink.r > b.l + 0.5 && ink.l < b.r - 0.5 && ink.b > b.t && ink.t < b.b;
      L.check("A1", `${where} the name never runs under ${k}`, !hit, `ink ${JSON.stringify(ink)} vs ${JSON.stringify(b)}`);
    }
    L.check("A1", `${where} the controls in order: Search, Feedback, Add`, !!ctl.search && !!ctl.feedback && !!ctl.add && ctl.search.l < ctl.feedback.l && ctl.feedback.l < ctl.add.l, "");
    L.check("A1", `${where} the bar is 50 tall`, Math.abs((ctl.bar?.h ?? 0) - 50) <= 1, String(ctl.bar?.h));
    L.check("A1", `${where} the mark is a 30px circle`, Math.abs((ctl.mark?.w ?? 0) - 30) <= 0.5, String(ctl.mark?.w));
    /* a long title ellipsises and never pushes the icons off */
    const long = await page.evaluate(() => {
      const bar = [...document.querySelectorAll<HTMLElement>('[data-dm1="top"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const n = bar.querySelector<HTMLElement>(".sv2-scopet")!;
      const was = n.textContent;
      n.textContent = "The Extraordinarily Long and Winding Title of a Very Ambitious Debut Novel";
      const nb = n.getBoundingClientRect(), s = bar.querySelector('[aria-label="Search"]')!.getBoundingClientRect(), a = bar.querySelector('[aria-label="Add"]')!.getBoundingClientRect();
      const out = { nameR: nb.right, searchL: s.left, addR: a.right, ell: getComputedStyle(n).textOverflow, clipped: n.scrollWidth > n.clientWidth };
      n.textContent = was;
      return out;
    });
    L.check("A1", `${where} a long title ellipsises before Search`, long.nameR <= long.searchL + 0.5 && long.ell === "ellipsis" && long.clipped, JSON.stringify(long));
    L.check("A1", `${where} a long title leaves + inside the window`, long.addR <= vw + 0.5, JSON.stringify(long));
    L.check("A1", `${where} the shell's generic phone bar is gone on Home`, (await rectOf(page, ".ws-mobilebar")) === null, "");

    /* the + menu: click opens, outside tap closes, Esc closes and focus returns, an item opens its flow */
    const plus = page.locator('[data-dm1="top"] [aria-label="Add"]').first();
    await plus.click();
    const menu = await page.evaluate(() => {
      const m = document.querySelector<HTMLElement>('[data-dm1="menu"]');
      const svg = document.querySelector<SVGElement>('[data-dm1="plus"] .dm1-plusdisc > svg');
      const r = m?.getBoundingClientRect();
      return {
        open: !!m, role: m?.getAttribute("role"), items: [...(m?.querySelectorAll('[role="menuitem"]') ?? [])].map((e) => e.textContent?.trim()),
        w: r?.width ?? 0, right: r?.right ?? 0, rot: svg ? getComputedStyle(svg).transform : "none",
        expanded: document.querySelector('[data-dm1="plus"]')?.getAttribute("aria-expanded"),
      };
    });
    L.check("A1", `${where} + opens a role=menu`, menu.open && menu.role === "menu", JSON.stringify(menu));
    L.check("A1", `${where} the menu's three items`, JSON.stringify(menu.items) === JSON.stringify(["Log a query", "Record a response", "Add an agent"]), JSON.stringify(menu.items));
    L.check("A1", `${where} the menu is 230 wide, inside the window`, Math.abs(menu.w - 230) <= 1 && menu.right <= vw, `${menu.w} → ${menu.right}`);
    L.check("A1", `${where} + reads × while open (rotated 45°)`, /matrix\(0\.7071/.test(menu.rot), menu.rot);
    L.check("A1", `${where} aria-expanded true while open`, menu.expanded === "true", String(menu.expanded));
    /* outside tap */
    /* on the bar's mark: outside the menu and the +, and inert, so the tap closes the menu and opens nothing */
    await page.mouse.click(ctl.mark!.l + 15, ctl.mark!.t + 15);
    await page.waitForTimeout(200);
    const afterOutside = await page.locator('[data-dm1="menu"]').count();
    L.check("A1", `${where} an outside tap closes the menu`, afterOutside === 0, String(afterOutside));
    /* Esc, and focus back on + */
    await plus.click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const esc = await page.evaluate(() => ({ menu: !!document.querySelector('[data-dm1="menu"]'), focus: document.activeElement?.getAttribute("aria-label") }));
    L.check("A1", `${where} Esc closes the menu and returns focus to +`, !esc.menu && esc.focus === "Add", JSON.stringify(esc));

    if (vp.width === 390) {
      for (const [label, expect] of [["Log a query", "drawer"], ["Record a response", "drawer"], ["Add an agent", "agentPanel"]] as const) {
        await openDash(page, vp);
        const before = await openedState(page);
        await page.locator('[data-dm1="top"] [aria-label="Add"]').first().click();
        await page.getByRole("menuitem", { name: label }).click();
        await page.waitForTimeout(1500);
        const after = await openedState(page);
        /* the flow's own dialog, by its accessible name: the log journey, the response picker (the drawer's "Query"), the new-agent panel */
        /* ⚠️ RE-POINTED 28 OCT (Queries on a phone v1): "Record a response" opened the Query Centre's own side-panel picker
           ("Query") only because the old phone Query Centre drew that panel; the phone page does not, so it now opens the
           drawer's response journey ("Record a response"), the app's fallback wherever no panel is hosted. Either is the flow. */
        const want = label === "Log a query" ? /^Log a query$/ : label === "Add an agent" ? /^Add an agent$/ : /^(Query|Record a response)$/;
        void expect;
        const opened = before.dialogs.length === 0 && after.dialogs.some((d) => want.test(d));
        L.check("A1", `${where} "${label}" opens its flow`, opened, JSON.stringify({ before, after }));
        L.check("A1", `${where} "${label}" closes the menu`, (await page.locator('[data-dm1="menu"]').count()) === 0, "");
        await closeEverything(page);
      }
    }
  }
  /* absent at 768 and wider */
  for (const vp of [...DESKTOPS, { width: 768, height: 900 }] as VP[]) {
    await openDash(page, vp);
    const n = await page.locator('[data-dm1="top"]').count();
    const d58 = await rectOf(page, '[data-d58="page"]');
    L.check("A1", `${tag(vp)} no phone top bar`, n === 0, String(n));
    L.check("A1", `${tag(vp)} the desktop page renders`, !!d58, JSON.stringify(d58));
  }
  L.done(60);
});

/** The phone cards' figures, read off the page. */
const phoneFigs = (page: Page) => page.evaluate(() => {
  const vis = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().height > 0;
  const card = (k: string) => [...document.querySelectorAll<HTMLElement>(`[data-dm1="card-${k}"]`)].find(vis) ?? null;
  const num = (el: HTMLElement | null, sel = '[data-dm1="num"]') => {
    const t = el?.querySelector(sel)?.firstChild?.textContent ?? "";
    return t.trim() === "" ? null : Number(t);
  };
  const segs = (el: HTMLElement | null) => [...(el?.querySelectorAll<HTMLElement>('[data-dm1="bar"] i') ?? [])].map((i) => ({ k: i.dataset.k, g: Number(i.style.flexGrow) }));
  const box = (el: HTMLElement | null) => { const r = el?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; };
  const a = card("active"), w = card("with"), c = card("closed"), g = card("agents");
  return {
    active: num(a, '[data-dm1="active-num"]'),
    line: a?.querySelector('[data-dm1="active-line"]')?.textContent ?? "",
    chip: a?.querySelector('[data-dm1="chip"]')?.textContent ?? null,
    with: num(w), withLine: w?.querySelector(".dm1-sline")?.textContent ?? "", withSegs: segs(w),
    closed: num(c), closedLine: c?.querySelector(".dm1-sline")?.textContent ?? "", closedSegs: segs(c),
    agents: num(g), agentsTotal: Number((g?.querySelector('[data-dm1="num"] small')?.textContent ?? "").replace("/", "")), agentsLine: g?.querySelector(".dm1-sline")?.textContent ?? "", agentsSegs: segs(g),
    boxes: { active: box(a), with: box(w), closed: box(c), agents: box(g) },
    weeks: document.querySelectorAll('[data-dm1="chart"]').length,
  };
});

/** The desktop page's own figures for the same account and manuscript. */
const desktopFigs = (page: Page) => page.evaluate(() => {
  const t = document.querySelector('[data-probe-text="chart-title"]')?.textContent ?? "";
  const closed = document.querySelector<HTMLElement>('[data-d60="closed-hoop"]')?.dataset.counts;
  const cov = document.querySelector<HTMLElement>('[data-d60="agents-hoop"]')?.dataset.cov;
  return { title: t, active: Number((t.match(/^([0-9,]+) active/) ?? [])[1]?.replace(/,/g, "") ?? NaN), closed: closed ? JSON.parse(closed) : null, cov: cov ? JSON.parse(cov) : null };
});

test("DM1-B1 · stat cards first", async ({ page }) => {
  const L = new Ledger("B1");
  await openDash(page, DESKTOPS[0]);
  const desk = await desktopFigs(page);
  L.check("B1", "population: the desktop's figures", Number.isFinite(desk.active) && !!desk.closed && !!desk.cov, JSON.stringify(desk));
  for (const vp of PHONES) {
    await openDash(page, vp);
    const where = tag(vp);
    if (MUT === "B1-order") await page.addStyleTag({ content: `.dm1-stats { flex-direction: column-reverse !important; }` });
    const f = await phoneFigs(page);
    L.check("B1", `${where} population: four cards`, !!f.boxes.active && !!f.boxes.with && !!f.boxes.closed && !!f.boxes.agents, JSON.stringify(f.boxes));
    if (!f.boxes.active || !f.boxes.with || !f.boxes.closed || !f.boxes.agents) continue;
    const top = await rectOf(page, '[data-dm1="top"]');
    L.check("B1", `${where} the page opens on the Active card, under the bar`, !!top && f.boxes.active.y >= top.b && f.boxes.active.y - top.b <= 16, `${top?.b} → ${f.boxes.active.y}`);
    L.check("B1", `${where} order: Active above With agents / Closed / Agents`, f.boxes.active.y + f.boxes.active.h <= f.boxes.with.y && f.boxes.with.x < f.boxes.closed.x && f.boxes.closed.x < f.boxes.agents.x, JSON.stringify(f.boxes));
    L.check("B1", `${where} the three are equal thirds`, Math.abs(f.boxes.with.w - f.boxes.closed.w) < 1 && Math.abs(f.boxes.closed.w - f.boxes.agents.w) < 1, `${f.boxes.with.w} ${f.boxes.closed.w} ${f.boxes.agents.w}`);
    L.check("B1", `${where} gutters 16`, Math.abs(f.boxes.active.x - 16) < 1 && Math.abs(vp.width - (f.boxes.active.x + f.boxes.active.w) - 16) < 1, JSON.stringify(f.boxes.active));
    /* the numbers, against the desktop's own */
    L.check("B1", `${where} Active = the desktop chart's headline`, f.active === desk.active, `${f.active} vs ${desk.title}`);
    const closedTotal = Object.values(desk.closed as Record<string, number>).reduce((n, v) => n + v, 0);
    L.check("B1", `${where} Closed = the desktop hoop's total`, f.closed === closedTotal, `${f.closed} vs ${closedTotal}`);
    L.check("B1", `${where} Closed's bar = the hoop's buckets`, JSON.stringify(f.closedSegs.map((s) => [s.k, s.g])) === JSON.stringify(Object.entries(desk.closed as Record<string, number>).filter(([, v]) => v > 0)), JSON.stringify(f.closedSegs));
    const cov = desk.cov as { querying: number; closed: number; none: number; total: number };
    L.check("B1", `${where} Agents = queried / total of the desktop's coverage`, f.agents === cov.querying + cov.closed && f.agentsTotal === cov.total, `${f.agents}/${f.agentsTotal} vs ${JSON.stringify(cov)}`);
    L.check("B1", `${where} Agents' line = the not-yet-queried`, cov.none > 0 ? f.agentsLine === `${cov.none} to query` : f.agentsLine === "All queried", f.agentsLine);
    const needYou = Number((f.line.match(/^(\d+) need you/) ?? [])[1] ?? 0);
    L.check("B1", `${where} need you + With agents = Active`, needYou + (f.with ?? NaN) === f.active, `${needYou} + ${f.with} vs ${f.active}`);
    L.check("B1", `${where} With agents' bar sums to its number`, f.withSegs.reduce((n, s) => n + s.g, 0) === f.with, JSON.stringify(f.withSegs));
    L.check("B1", `${where} the chip is a rise or absent`, f.chip === null || /^↑ [1-9][0-9]* this month$/.test(f.chip), String(f.chip));

    /* the scrub, at three positions: the number becomes that week's, and it all comes back */
    const chart = await rectOf(page, '[data-dm1="chart"]');
    L.check("B1", `${where} population: the chart`, !!chart, JSON.stringify(chart));
    if (chart) {
      const series = await page.evaluate(() => {
        const svg = [...document.querySelectorAll<SVGPathElement>('[data-dm1="line"]')].find((e) => e.getBoundingClientRect().width > 0);
        return svg?.getAttribute("d") ?? "";
      });
      const pts = [...series.matchAll(/[ML](-?[0-9.]+),(-?[0-9.]+)/g)].map((m) => Number(m[1]));
      L.check("B1", `${where} the line draws twelve weeks`, pts.length === 12, String(pts.length));
      for (const frac of [0.08, 0.5, 0.9]) {
        const x = chart.x + (chart.w - 48) * frac;
        const y = chart.y + 40;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.waitForTimeout(80);
        const s = await page.evaluate(() => {
          const rule = document.querySelector<SVGLineElement>('[data-dm1="rule"]');
          const a = [...document.querySelectorAll<HTMLElement>('[data-dm1="card-active"]')].find((e) => e.getBoundingClientRect().height > 0);
          return { week: rule ? Number(rule.dataset.week) : null, num: a?.querySelector('[data-dm1="active-num"]')?.textContent, line: a?.querySelector('[data-dm1="active-line"]')?.textContent, chip: !!a?.querySelector('[data-dm1="chip"]'), path: location.pathname };
        });
        const expectWeek = Math.round(frac * 11);
        L.check("B1", `${where} scrub at ${frac}: the rule snaps to week ${expectWeek}`, s.week === expectWeek, JSON.stringify(s));
        L.check("B1", `${where} scrub at ${frac}: the line names the week`, /^active in the week of \d{1,2} [A-Z][a-z]{2}$/.test(s.line ?? ""), String(s.line));
        L.check("B1", `${where} scrub at ${frac}: the chip hides`, !s.chip, "");
        await page.mouse.up();
        await page.waitForTimeout(150);
        const held = await page.evaluate(() => document.querySelector('[data-dm1="active-line"]')?.textContent);
        L.check("B1", `${where} scrub at ${frac}: held just after release`, /^active in the week of/.test(held ?? ""), String(held));
        await page.waitForTimeout(900);
        const back = await phoneFigs(page);
        L.check("B1", `${where} scrub at ${frac}: restores after 0.8s, and never navigates`, back.active === f.active && back.line === f.line && s.path === "/dashboard", `${back.active} ${back.line} ${s.path}`);
      }
      const ta = await page.evaluate(() => getComputedStyle(document.querySelector('[data-dm1="chart"]')!).touchAction);
      L.check("B1", `${where} the chart leaves vertical scroll to the page`, ta === "pan-y", ta);
    }
  }
  /* each card lands on its list */
  const vp = PHONES[0];
  for (const [k, want] of [["active", /^\/queries\?ids=/], ["with", /^\/queries\?ids=/], ["closed", /^\/queries\?ids=/], ["agents", /^\/agents$/]] as const) {
    await openDash(page, vp);
    const figs = await phoneFigs(page);
    /* a missing card is a failed reading, never a click that waits out the test */
    if ((await page.locator(`[data-dm1="card-${k}"]`).count()) === 0) { L.check("B1", `${tag(vp)} ${k} card opens ${want}`, false, "no card"); continue; }
    await page.locator(`[data-dm1="card-${k}"]`).first().click({ position: { x: 20, y: 14 } });
    await page.waitForTimeout(2500);
    const path = await page.evaluate(() => location.pathname + location.search);
    L.check("B1", `${tag(vp)} ${k} card opens ${want}`, want.test(path), path);
    if (k !== "agents") {
      /* ⚠️ RE-POINTED 28 OCT (Queries on a phone v1): at 390 the Query Centre is the phone page, whose rows are
         `[data-qm1="row"]`; the claim is unchanged — the list a card opens holds exactly the card's queries. */
      const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qm1="row"]')].filter((e) => e.getBoundingClientRect().height > 0).length);
      const n = k === "with" ? figs.with : k === "closed" ? figs.closed : figs.active;
      L.check("B1", `${tag(vp)} ${k}: the filtered list's count equals the card's`, rows === n, `${rows} rows vs card ${n}`);
    }
  }
  L.done(70);
});

import { PHONE_KIND } from "../../src/lib/dashPhone";

const hexToRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; };

/** The desktop task card's first four keys, stepped with its own "next". */
const desktopKeys = async (page: Page): Promise<string[]> => {
  const keys: string[] = [];
  for (let i = 0; i < 4; i++) {
    const k = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-d71="task"][data-key]')].find((e) => e.getBoundingClientRect().height > 0)?.dataset.key ?? null);
    if (!k || keys.includes(k)) break;
    keys.push(k);
    const next = page.locator('[data-d71="next"]').first();
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
    await page.waitForTimeout(250);
  }
  return keys;
};

test("DM1-C1 · Up next", async ({ page }) => {
  const L = new Ledger("C1");
  const kinds = new Set<string>();
  for (const drop of [[], ["req"], ["req", "nudge"], ["req", "nudge", "quiet"]] as string[][]) {
    const label = drop.length ? `drop ${drop.join("+")}` : "as found";
    await openDash(page, DESKTOPS[0], { __SA_DASH_DROP: drop });
    const desk = await desktopKeys(page);
    L.check("C1", `${label}: population, the desktop's list`, desk.length > 0, JSON.stringify(desk));
    await openDash(page, PHONES[0], { __SA_DASH_DROP: drop });
    if (MUT === "C1-one-tint") await page.addStyleTag({ content: `.dm1-hero { background: #f5e2da !important; }` });
    const ph = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>('[data-dm1="hero"]');
      const rows = [...document.querySelectorAll<HTMLElement>('[data-dm1="row"]')].map((r) => ({ key: r.dataset.key, kind: r.dataset.kind, disc: getComputedStyle(r.querySelector(".dm1-rdisc")!).backgroundColor }));
      return { key: hero?.dataset.key, kind: hero?.dataset.kind, bg: hero ? getComputedStyle(hero).backgroundColor : null, of: hero?.querySelector('[data-dm1="of"]')?.textContent, rows };
    });
    L.check("C1", `${label}: the hero is task 1`, !!ph.key && ph.key === desk[0], `${ph.key} vs ${desk[0]}`);
    L.check("C1", `${label}: the rows are tasks 2–4, in order`, JSON.stringify(ph.rows.map((r) => r.key)) === JSON.stringify(desk.slice(1, 4)), `${JSON.stringify(ph.rows.map((r) => r.key))} vs ${JSON.stringify(desk.slice(1, 4))}`);
    L.check("C1", `${label}: at most three rows`, ph.rows.length <= 3, String(ph.rows.length));
    const k = ph.kind as keyof typeof PHONE_KIND;
    if (k && PHONE_KIND[k]) {
      kinds.add(k);
      L.check("C1", `${label}: the hero's tint is ${k}'s`, ph.bg === hexToRgb(PHONE_KIND[k].tint), `${ph.bg} vs ${PHONE_KIND[k].tint}`);
    } else L.check("C1", `${label}: the hero has a kind`, false, String(ph.kind));
    for (const r of ph.rows) {
      const rk = r.kind as keyof typeof PHONE_KIND;
      L.check("C1", `${label}: row ${r.key} disc is ${rk}'s`, !!PHONE_KIND[rk] && r.disc === hexToRgb(PHONE_KIND[rk].disc), `${r.disc}`);
    }
    /* each drawing once: the courier in the hero, the Mentor on the chart */
    const art = await page.evaluate(() => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
      const imgs = [...document.querySelectorAll<HTMLImageElement>('[data-dm1="page"] img')].filter(vis);
      const c = imgs.filter((i) => i.src.includes("/courier.png")), m = imgs.filter((i) => i.src.includes("/mentor-leaning"));
      return { courier: c.length, mentor: m.length, courierInHero: c.every((i) => !!i.closest('[data-dm1="hero"]')), mentorInChart: m.every((i) => !!i.closest('[data-dm1="chart"]')) };
    });
    L.check("C1", `${label}: the courier once, in the hero`, art.courier === 1 && art.courierInHero, JSON.stringify(art));
    L.check("C1", `${label}: the Mentor once, on the chart`, art.mentor === 1 && art.mentorInChart, JSON.stringify(art));
    /* the title clears the courier */
    const clear = await page.evaluate(() => {
      const t = document.querySelector('[data-dm1="hero-title"]')?.getBoundingClientRect();
      const c = document.querySelector('[data-dm1="courier"]')?.getBoundingClientRect();
      return t && c ? { tr: t.right, cl: c.left } : null;
    });
    L.check("C1", `${label}: the title stops short of the courier`, !!clear && clear.tr <= clear.cl + 1, JSON.stringify(clear));
  }
  L.check("C1", "all four kinds were the hero", ["move", "nudge", "close", "house"].every((k) => kinds.has(k)), JSON.stringify([...kinds]));
  /* View task opens the place the task is done, and completes nothing: a query's task opens its query card (the query
     panel, a dialog named "Query", holding the agent); housekeeping opens the agent's editor. Each case on the drop that
     makes it the hero, so both are exercised whatever the account holds first. */
  const VIEW: [string[], string, RegExp][] = [[["req"], "query", /^Query$/], [["req", "nudge", "quiet"], "agent", /^Edit agent$/]];
  for (const [drop, action, dialog] of VIEW) {
    await openDash(page, PHONES[0], { __SA_DASH_DROP: drop });
    const hero = await page.evaluate(() => { const h = document.querySelector<HTMLElement>('[data-dm1="hero"]'); return { key: h?.dataset.key, who: h?.dataset.who, action: h?.dataset.action }; });
    L.check("C1", `View task (${action}): population, the hero's action`, hero.action === action, JSON.stringify(hero));
    if (MUT === "C1-view-dead") await page.addStyleTag({ content: `[data-dm1="view-task"] { pointer-events: none !important; }` });
    await page.locator('[data-dm1="view-task"]').first().click({ force: MUT === "C1-view-dead", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const opened = await page.evaluate(([who, re]) => {
      const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().height > 0;
      const d = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter(vis);
      const rx = new RegExp(re);
      return { names: d.map((x) => x.getAttribute("aria-label")), ok: d.some((x) => rx.test(x.getAttribute("aria-label") ?? "") && (!who || x.innerText.includes(who))), path: location.pathname };
    }, [hero.action === "query" ? hero.who ?? "" : "", dialog.source] as const);
    L.check("C1", `View task (${action}) opens its place`, opened.ok && opened.path === "/dashboard", JSON.stringify({ ...opened, who: hero.who }));
    await closeEverything(page);
    await openDash(page, PHONES[0], { __SA_DASH_DROP: drop });
    const after = await page.evaluate(() => document.querySelector<HTMLElement>('[data-dm1="hero"]')?.dataset.key);
    L.check("C1", `View task (${action}) did not complete the task`, hero.key === after, `${hero.key} → ${after}`);
  }
  L.done(30);
});

/* v105's own stat fixtures (db105Lib.STATS), seeded through the dev-only `__SA_FOUNDING_STATS` aid */
const FW: Record<string, { contributions: number; waiting: number; tier: string | null; nextTier: string | null; toNext: number | null; topPct: number | null; foundingNo: number | null }> = {
  egg: { contributions: 0, waiting: 0, tier: null, nextTier: "fledgling", toNext: 1, topPct: null, foundingNo: 23 },
  fledgling: { contributions: 1, waiting: 0, tier: "fledgling", nextTier: "archivist", toNext: 2, topPct: null, foundingNo: 23 },
  mentor: { contributions: 16, waiting: 0, tier: "mentor", nextTier: "queryhawk", toNext: 9, topPct: 10, foundingNo: 23 },
  queryhawk: { contributions: 25, waiting: 0, tier: "queryhawk", nextTier: null, toNext: null, topPct: 5, foundingNo: 23 },
};
const RANK: Record<string, string> = { egg: "Egg", fledgling: "Fledgling", mentor: "Mentor", queryhawk: "QueryHawk" };
const NEXT: Record<string, string> = { fledgling: "hatch", archivist: "Archivist", scout: "Scout", mentor: "Mentor", queryhawk: "QueryHawk" };

test("DM1-D1 · the founding writer row and Recent", async ({ page }) => {
  const L = new Ledger("D1");
  for (const [k, st] of Object.entries(FW)) {
    await openDash(page, DESKTOPS[0], { __SA_FOUNDING_STATS: st });
    const swap = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-d105="swap"]')].find((e) => e.getBoundingClientRect().width > 0 || e.textContent)?.textContent ?? null);
    await openDash(page, PHONES[0], { __SA_FOUNDING_STATS: st });
    const row = await page.evaluate(() => {
      const r = document.querySelector<HTMLElement>('[data-dm1="founding"]');
      return r ? { title: r.querySelector('[data-dm1="founding-title"]')?.textContent, line: r.querySelector('[data-dm1="founding-line"]')?.textContent } : null;
    });
    L.check("D1", `${k}: population, the row`, !!row, JSON.stringify(row));
    if (!row) continue;
    const want = st.nextTier && st.toNext != null
      ? `${st.contributions} sent · ${st.toNext} more to ${NEXT[st.nextTier]}. Tell us something.`
      : `${st.contributions} sent · top rank. Tell us something.`;
    L.check("D1", `${k}: the title names the rank`, row.title === `Founding writer · ${RANK[k]}`, String(row.title));
    L.check("D1", `${k}: the line is v105's figures`, row.line === want, `${row.line} vs ${want}`);
    /* and the desktop card's own header swap says the same count */
    const deskN = swap && /^(\d+) CONTRIBUTION/.test(swap) ? Number(swap.match(/^(\d+)/)![1]) : swap === "NO CONTRIBUTIONS YET" ? 0 : NaN;
    L.check("D1", `${k}: the count agrees with the desktop card`, deskN === st.contributions && (row.line ?? "").startsWith(`${deskN} sent`), `desktop "${swap}" vs phone "${row.line}"`);
  }
  /* the row opens the FeedbackDock as a bottom sheet */
  await openDash(page, PHONES[0]);
  await page.locator('[data-dm1="founding"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  const fb = await page.evaluate(() => {
    const p = document.querySelector<HTMLElement>('[data-fb="panel"]');
    const r = p?.getBoundingClientRect();
    const scrim = document.querySelector<HTMLElement>('[data-dm1="scrim"]');
    return r ? { top: r.top, bottom: r.bottom, left: r.left, w: r.width, vh: innerHeight, vw: innerWidth, scrim: scrim ? getComputedStyle(scrim).display : null } : null;
  });
  L.check("D1", "the founding row opens the feedback sheet", !!fb && Math.abs(fb.bottom - fb.vh) < 1 && fb.left === 0 && Math.abs(fb.w - fb.vw) < 1 && fb.top > 0, JSON.stringify(fb));
  L.check("D1", "the sheet sits over a scrim", fb?.scrim === "block", String(fb?.scrim));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  L.check("D1", "Esc closes the sheet and the scrim", (await page.locator('[data-fb="panel"]').count()) === 0 && (await page.evaluate(() => { const sc = document.querySelector('[data-dm1="scrim"]'); return sc ? getComputedStyle(sc).display : "absent"; })) === "none", "");

  /* Recent: the feed's two newest, in the feed's own words */
  await openDash(page, PHONES[0]);
  const recent = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-dm1="recent-row"]')].map((r) => ({ t: r.querySelector(".dm1-rttl")?.textContent ?? "", d: r.querySelector("time")?.textContent ?? "" })));
  L.check("D1", "Recent: population, two rows", recent.length === 2, JSON.stringify(recent));
  if (MUT === "D1-no-feed") await page.addStyleTag({ content: `[data-dm1="feed-link"] { pointer-events: none !important; }` });
  await page.locator('[data-dm1="feed-link"]').first().click({ force: MUT === "D1-no-feed", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const feed = await page.evaluate(() => {
    const d = [...document.querySelectorAll<HTMLElement>('[data-d58="drawer"]')].find((e) => e.getBoundingClientRect().height > 0);
    const r = d?.getBoundingClientRect();
    const evs = d ? [...d.querySelectorAll<HTMLElement>('[data-d58="ev"]')].slice(0, 2).map((e) => e.querySelector('[data-d58="ev-tag"]')?.textContent ?? e.querySelector('[data-d58="ev-say"]')?.textContent ?? "") : [];
    return d && r ? { label: d.getAttribute("aria-label"), top: r.top, bottom: r.bottom, w: r.width, vh: innerHeight, vw: innerWidth, evs } : null;
  });
  L.check("D1", "Activity feed opens the feed", feed?.label === "Activity feed", JSON.stringify(feed));
  L.check("D1", "…as a bottom sheet", !!feed && Math.abs(feed.bottom - feed.vh) < 1 && feed.top > 0 && Math.abs(feed.w - feed.vw) < 1, JSON.stringify(feed));
  L.check("D1", "Recent's rows are the feed's first two", !!feed && recent.length === 2 && recent.every((r, i) => !!feed.evs[i] && r.t.startsWith(feed.evs[i])), JSON.stringify({ recent, feed: feed?.evs }));
  await page.keyboard.press("Escape");

  /* page order and rhythm: stats → Up next → founding → Recent, 22 apart */
  await openDash(page, PHONES[0]);
  if (MUT === "D1-gap") await page.addStyleTag({ content: `.dm1-body { gap: 30px !important; }` });
  const order = await page.evaluate(() => {
    const y = (s: string) => { const e = document.querySelector<HTMLElement>(s); if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom }; };
    return { stats: y('[data-dm1="stats"]'), up: y('[data-dm1="upnext"]'), found: y('[data-dm1="founding"]'), recent: y('[data-dm1="recent"]') };
  });
  const seq = [order.stats, order.up, order.found, order.recent];
  L.check("D1", "order: stats, Up next, founding, Recent", seq.every(Boolean) && seq.every((s, i) => i === 0 || s!.t > seq[i - 1]!.t), JSON.stringify(order));
  const gaps = seq.slice(1).map((s, i) => (s && seq[i] ? Math.round((s.t - seq[i]!.b) * 10) / 10 : NaN));
  L.check("D1", "22px between sections", gaps.every((g) => Math.abs(g - 22) <= 0.5), JSON.stringify(gaps));
  L.done(24);
});

test("DM1-E1 · the desktop furniture is gone on phones, and stays on the desktop", async ({ page }) => {
  const L = new Ledger("E1");
  const FURNITURE: [string, string][] = [
    ["the desktop page", '[data-d58="page"]'],
    ["the header's Log a query / Record a response", '[data-d58="buttons"]'],
    ["the Closed ring card", '[data-d60="closed-hoop"]'],
    ["the Agents ring card", '[data-d60="agents-hoop"]'],
    ["the task pager card", '[data-d71="task"]'],
    ["the v37 desk line", ".sa-mdeskline"],
    ["the v37 To-do doorway", ".sa-mtodo"],
  ];
  const count = (sel: string) => page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0).length, sel);
  for (const vp of PHONES) {
    await openDash(page, vp);
    L.check("E1", `${tag(vp)} population: the phone page`, (await count('[data-dm1="page"]')) === 1, "");
    for (const [name, sel] of FURNITURE) L.check("E1", `${tag(vp)} no ${name}`, (await count(sel)) === 0, sel);
  }
  for (const vp of DESKTOPS) {
    await openDash(page, vp);
    L.check("E1", `${tag(vp)} no phone page`, (await count('[data-dm1="page"]')) === 0, "");
    for (const [name, sel] of FURNITURE.slice(0, 5)) L.check("E1", `${tag(vp)} ${name} still renders`, (await count(sel)) >= 1, sel);
  }
  L.done(28);
});

test("DM1-F1 · no sideways scroll, and every tap target is at least 40px", async ({ page }) => {
  const L = new Ledger("F1");
  for (const vp of PHONES) {
    await openDash(page, vp);
    if (MUT === "F1-wide") await page.addStyleTag({ content: `.dm1-hero { width: 420px !important; }` });
    if (MUT === "F1-small") await page.addStyleTag({ content: `.dm1-ic { width: 30px !important; height: 30px !important; }` });
    const r = await page.evaluate(() => {
      const port = [...document.querySelectorAll<HTMLElement>(".ws-wbody")].find((e) => e.getBoundingClientRect().height > 0);
      const doc = document.documentElement;
      const root = document.querySelector<HTMLElement>('[data-dm1="page"]');
      const vis = (e: Element) => { const b = (e as HTMLElement).getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const targets = [...(root?.querySelectorAll<HTMLElement>('button, a, [role="link"], [role="menuitem"], input') ?? [])].filter(vis)
        .map((e) => { const b = e.getBoundingClientRect(); return { name: (e.getAttribute("aria-label") || e.textContent || e.className || "").toString().trim().slice(0, 40), w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; });
      return {
        doc: doc.scrollWidth - doc.clientWidth,
        port: port ? port.scrollWidth - port.clientWidth : null,
        root: root ? root.getBoundingClientRect().width : null,
        targets,
      };
    });
    L.check("F1", `${tag(vp)} population: tap targets`, r.targets.length >= 10, String(r.targets.length));
    L.check("F1", `${tag(vp)} no sideways scroll (document)`, r.doc <= 0, String(r.doc));
    L.check("F1", `${tag(vp)} no sideways scroll (the page's scroller)`, r.port !== null && r.port <= 0, String(r.port));
    L.check("F1", `${tag(vp)} the page is the window's width`, r.root === vp.width, String(r.root));
    const small = r.targets.filter((t) => t.w < 40 || t.h < 40);
    L.check("F1", `${tag(vp)} every tap target ≥ 40px`, small.length === 0, JSON.stringify(small));
  }
  L.done(10);
});

test("DM1-A2 · the search sheet", async ({ page }) => {
  const L = new Ledger("A2");
  for (const vp of PHONES) {
    await openDash(page, vp);
    const where = tag(vp);
    if (MUT === "A2-short") await page.addStyleTag({ content: `.dm1-search { right: 12px !important; }` });
    await page.locator('[data-dm1="top"] [aria-label="Search"]').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    const cover = await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('[data-dm1="search"]');
      const pts = [[2, 200], [innerWidth - 2, 200], [innerWidth - 2, innerHeight - 140], [innerWidth / 2, innerHeight / 2]];
      return { open: !!s, top: pts.map(([x, y]) => !!s && s.contains(document.elementFromPoint(x, y))), focus: document.activeElement?.getAttribute("data-dm1"), recent: document.querySelectorAll('[data-dm1="search-rows"] li').length };
    });
    L.check("A2", `${where} the search sheet opens with the field focused`, cover.open && cover.focus === "search-input", JSON.stringify(cover));
    L.check("A2", `${where} it is on top everywhere, right edge included`, cover.top.every(Boolean), JSON.stringify(cover.top));
    L.check("A2", `${where} Recent rows with nothing typed`, cover.recent >= 1, String(cover.recent));
    const first = await page.evaluate(() => document.querySelector('[data-dm1="search-rows"] li b')?.textContent ?? "");
    const word = first.split(" ").slice(-1)[0] ?? "";
    await page.keyboard.type(word.slice(0, 5));
    await page.waitForTimeout(200);
    const found = await page.evaluate(() => [...document.querySelectorAll('[data-dm1="search-rows"] li b')].map((b) => b.textContent ?? ""));
    L.check("A2", `${where} typing ranks the palette's corpus`, found.length >= 1 && found.some((n) => n.toLowerCase().includes(word.slice(0, 5).toLowerCase())), `${word.slice(0, 5)} → ${JSON.stringify(found.slice(0, 4))}`);
    await page.locator('[data-dm1="search-cancel"]').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ open: !!document.querySelector('[data-dm1="search"]'), focus: document.activeElement?.getAttribute("aria-label") }));
    L.check("A2", `${where} Cancel closes it and returns focus to Search`, !after.open && after.focus === "Search", JSON.stringify(after));
  }
  L.done(10);
});
