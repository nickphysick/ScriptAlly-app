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
    if (MUT === "A1-no-outside") await page.addInitScript(() => { /* no-op: the break is applied below */ });
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
    await page.mouse.click(vp.width / 2, vp.height - 200);
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
        const want = label === "Log a query" ? /^Log a query$/ : label === "Add an agent" ? /^Add an agent$/ : /^Query$/;
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
      const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].filter((e) => e.getBoundingClientRect().height > 0).length);
      const n = k === "with" ? figs.with : k === "closed" ? figs.closed : figs.active;
      L.check("B1", `${tag(vp)} ${k}: the filtered list's count equals the card's`, rows === n, `${rows} rows vs card ${n}`);
    }
  }
  L.done(70);
});
