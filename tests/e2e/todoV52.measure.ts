/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.2 — locks TD52, on the rendered page at 1512 × 900 and 1280 × 800 with the shell, real fonts loaded.
 *
 * ⚠️ To-do list v7 RETIRED A1–A5, D1, G1 and G2's drag half, and re-pointed C1, E1, F1, F2 and F3: see
 *    tests/e2e/RETIRED-todo-list-v7.md. v7's own locks are todoV7.measure.ts.
 * ⚠️ EVERY READING STARTS FROM THE ONE VISIBLE v5 ROOT (`window.__td5()`, td5Lib), never `document`.
 */
import { expect, test } from "@playwright/test";
import { doc, setDoc } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { rawSet, restoreSet, type Raw } from "./journeyGuard";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DIR, LIB as LIB_TD5, Ledger, SIZES, canon as canonOf, diffSets, flagId, fontsReady, leaveDesk, mutate, near, openTodo, readBadge, readSet, restoreDocs, snapDocs, type Snap } from "./td52Lib";

test.setTimeout(480_000);
/* ⚠️ a measurement that writes puts the account back in the same run, whatever happened (the house rule) */
const dGuards: Snap[] = [];
test.afterEach(async () => {
  if (dGuards.length) await new Promise((r) => setTimeout(r, 2500));
  while (dGuards.length) { const f = await restoreDocs(dGuards.pop()!); if (f.length) console.log(`[guard] restored docs: ${f.join(", ")}`); }
});
const guardDocs = async (paths: string[]) => { const s = await snapDocs(paths); dGuards.push(s); return s; };



/* ───────────────────────── A1 · the header does not get taller ───────────────────────── */

/* ───────────────────────── shared in-page readers for the calendar card ───────────────────────── */
type W = { __td5: () => { r: HTMLElement; sc: HTMLElement; q: (s: string) => HTMLElement | null; qa: (s: string) => HTMLElement[] } };
/** press a day of today's month (the grid moves when a day of another month is picked, so start from today's) */
const pickDay = async (page: import("@playwright/test").Page, ymd: string) => {
  await goToday(page);
  await page.evaluate((ymd) => {
    const { q } = (window as unknown as W).__td5();
    const c = q(`[data-td52="day-cell"][data-ymd="${ymd}"]`) as HTMLButtonElement | null;
    if (!c) throw new Error(`no cell for ${ymd} in today's month`);
    c.click();
  }, ymd);
};
/** back to today AND today's month (the TODAY pill when the month has moved, else the foot) */
const goToday = async (page: import("@playwright/test").Page) => {
  await page.evaluate(() => {
    const { q } = (window as unknown as W).__td5();
    const pill = q('[data-td52="today"]:not(.hide)') as HTMLButtonElement | null;
    (pill ?? (q('[data-td52="back-today"]') as HTMLButtonElement | null))?.click();
  });
  await page.waitForTimeout(250);
};
/** the cells of the visible month, read off the page */
const readCells = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const { qa } = (window as unknown as W).__td5();
  return qa('[data-td52="day-cell"]').map((c) => ({
    ymd: c.dataset.ymd!, cls: c.className, label: c.getAttribute("aria-label") ?? "",
    dots: [...c.querySelectorAll<HTMLElement>('[data-td52="dot"]')].map((d) => ({ kind: d.dataset.kind!, cls: d.className, op: Number(getComputedStyle(d).opacity), bg: getComputedStyle(d).backgroundColor, sh: getComputedStyle(d).boxShadow })),
    numColour: getComputedStyle(c.querySelector(".td52-cn")!).color,
  }));
});
const todayYmd = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
/** kind → count from a cell's aria-label ("Friday 23 October: 1 own task, 2 nudges due") */
const labelKinds = (label: string) => {
  const out: Record<string, number> = {};
  const words = label.split(": ")[1] ?? "";
  if (/nothing dated/.test(words)) return out;
  for (const part of words.split(", ")) {
    const m = part.match(/^(\d+) (.*)$/);
    if (!m) continue;
    const t = m[2];
    const k = /back from Set aside/.test(t) ? null : /own task/.test(t) ? "mine" : /nudge/i.test(t) ? "nudge" : /clos/i.test(t) ? "close" : /material/i.test(t) ? "send" : "?";
    if (k) out[k] = Number(m[1]);
  }
  return out;
};

/* ───────────────────────── A2 · nothing in the card clips ───────────────────────── */

/* ───────────────────────── A3 · the today panel ───────────────────────── */

/* ───────────────────────── A4 · another day ───────────────────────── */

/* ───────────────────────── A5 · dots ───────────────────────── */

/* ───────────────────────── C1 · the slide-out calendar ───────────────────────── */
test("TD52 C1 — Open the calendar opens the drawer; kind filters hide chips; Month and Week agree; Open on the desk selects and starts nothing; no writes", async ({ page }) => {
  const L = new Ledger("C1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    const writes: string[] = [];
    const onReq = (r: import("@playwright/test").Request) => { if (/google\.firestore\.v1\.Firestore\/(Write|Commit)/.test(r.url()) || (r.method() === "POST" && /:commit|:batchWrite/.test(r.url()))) writes.push(r.url()); };
    page.on("request", onReq);
    await page.evaluate(() => ((window as unknown as W).__td5().q('[data-td7="open-calendar"]') as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    const dr = page.locator('[data-td52="drawer"]');
    const box = await dr.evaluate((e) => { const b = e.getBoundingClientRect(); return { on: e.classList.contains("on"), top: b.top, right: innerWidth - b.right, bottom: innerHeight - b.bottom, w: b.width, r: getComputedStyle(e).borderTopLeftRadius }; });
    L.check(`${w} Open the calendar opens the drawer (re-pointed from the retired ⤢, v7)`, box.on, "");
    L.check(`${w} the drawer sits 8 from the top, right and bottom`, near(box.top, 8, 1) && near(box.right, 8, 1) && near(box.bottom, 8, 1), JSON.stringify(box));
    L.check(`${w} width min(1180, 100vw − 110)`, near(box.w, Math.min(1180, vp.width - 110), 1), `${box.w}`);
    /* move to a month holding chips of several kinds (today's, or the one before) */
    const chips = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-td52="drawer"] [data-td52="dr-chip"]')].map((c) => ({ key: c.dataset.key!, kind: c.dataset.kind!, ymd: (c.closest("[data-ymd]") as HTMLElement).dataset.ymd! })));
    let all = await chips();
    if (new Set(all.map((c) => c.kind)).size < 2) { await page.locator('[data-td52="drawer"] [aria-label="Previous month"]').click(); await page.waitForTimeout(300); all = await chips(); }
    const kinds = [...new Set(all.map((c) => c.kind))];
    L.check(`${w} chips of two or more kinds to filter`, kinds.length >= 2, kinds.join(","));
    const k0 = kinds[0];
    await page.locator(`[data-td52="drawer"] [data-td52="dr-kind"][data-kind="${k0}"]`).click();
    await page.waitForTimeout(250);
    const after = await chips();
    L.check(`${w} pressing ${k0} hides its chips`, !after.some((c) => c.kind === k0), `${after.filter((c) => c.kind === k0).length} left`);
    L.check(`${w} …and keeps every other chip`, after.length === all.filter((c) => c.kind !== k0).length, `${after.length} vs ${all.filter((c) => c.kind !== k0).length}`);
    await page.locator(`[data-td52="drawer"] [data-td52="dr-kind"][data-kind="${k0}"]`).click();
    await page.waitForTimeout(250);
    /* Month and Week: select a day with chips, then compare that week's chips in both views */
    const day = all[0];
    await page.locator(`[data-td52="drawer"] [data-td52="dr-day"][data-ymd="${day.ymd}"]`).click({ position: { x: 6, y: 6 } });
    await page.waitForTimeout(250);
    const monthWeek = await page.evaluate((ymd) => {
      const dr = document.querySelector('[data-td52="drawer"]')!;
      const cells = [...dr.querySelectorAll<HTMLElement>('[data-td52="dr-day"]')];
      const i = cells.findIndex((c) => c.dataset.ymd === ymd);
      const row = cells.slice(i - (i % 7), i - (i % 7) + 7);
      return row.map((c) => ({ ymd: c.dataset.ymd!, more: !!c.querySelector(".td52-more"), keys: [...c.querySelectorAll<HTMLElement>('[data-td52="dr-chip"]')].map((x) => x.dataset.key).sort() }));
    }, day.ymd);
    await page.locator('[data-td52="drawer"] [data-td52="dr-week"]').click();
    await page.waitForTimeout(250);
    const week = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-td52="drawer"] [data-td52="dr-day"]')].map((c) => ({ ymd: c.dataset.ymd!, keys: [...c.querySelectorAll<HTMLElement>('[data-td52="dr-chip"]')].map((x) => x.dataset.key).sort() })));
    L.check(`${w} Week shows the selected day's week`, JSON.stringify(week.map((x) => x.ymd)) === JSON.stringify(monthWeek.map((x) => x.ymd)), `${week.map((x) => x.ymd)} vs ${monthWeek.map((x) => x.ymd)}`);
    const agree = monthWeek.filter((m) => !m.more).every((m) => JSON.stringify(m.keys) === JSON.stringify(week.find((x) => x.ymd === m.ymd)?.keys));
    L.check(`${w} Month and Week show the same items`, agree && monthWeek.some((m) => m.keys.length), JSON.stringify(monthWeek.map((m) => m.keys.length)));
    await page.locator('[data-td52="drawer"] [data-td52="dr-month"]').click();
    await page.waitForTimeout(250);
    /* Open on the desk: a tray task's agenda item */
    const target = all.find((c) => !c.key.startsWith("task:") && !c.key.startsWith("flag:"));
    L.check(`${w} a tray task on the calendar`, !!target, "");
    if (!target) continue;
    await page.locator(`[data-td52="drawer"] [data-td52="dr-day"][data-ymd="${target.ymd}"]`).click({ position: { x: 6, y: 6 } });
    await page.waitForTimeout(250);
    await page.locator(`[data-td52="drawer"] [data-td52="ag-item"][data-key="${target.key}"] [data-td52="ag-go"]`).click();
    await page.waitForTimeout(900);
    const res = await page.evaluate((key) => {
      const { q, sc } = (window as unknown as W).__td5();
      const row = q(`[data-td5-row="${CSS.escape(key)}"]`);
      const rb = row?.getBoundingClientRect(), sb = sc.getBoundingClientRect();
      return {
        open: document.querySelector('[data-td52="drawer"]')!.classList.contains("on"),
        current: row?.getAttribute("aria-current") ?? null,
        inView: !!rb && rb.top >= sb.top - 1 && rb.bottom <= sb.bottom + 1,
        journey: [...document.querySelectorAll("[data-td5-slot] [data-qad-drawer]")].filter((e) => (e as HTMLElement).offsetParent !== null).length + document.querySelectorAll(".qad-root.is-open").length,
        desk: q('[data-td5="desk-card"]')?.getAttribute("data-key") ?? null,
      };
    }, target.key);
    L.check(`${w} Open on the desk closes the drawer`, !res.open, "");
    L.check(`${w} …selects that row`, res.current === "true" && res.desk === target.key, JSON.stringify(res));
    L.check(`${w} …and scrolls it into view`, res.inView, "");
    L.check(`${w} …and starts no journey`, res.journey === 0, String(res.journey));
    page.off("request", onReq);
    L.check(`${w} the drawer wrote nothing`, writes.length === 0, writes.slice(0, 2).join(" "));
  }
  L.done(2 * 14);
});

/* ───────────────────────── D1 · one drawing per group ───────────────────────── */
const ART_W: Record<string, number> = { you: 42, chase: 49, quiet: 50, tidy: 53, mine: 44 };

/* ───────────────────────── E1 · the pin ───────────────────────── */
const pinState = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const { q, sc } = (window as unknown as W).__td5();
  const sheet = q(".td5-sheet")!.getBoundingClientRect(), port = sc.getBoundingClientRect();
  const panel = document.querySelector<HTMLElement>(".ws-panel");
  const day = q('[data-td52="pin-day"]'), find = q('[data-td52="pin-find"]');
  const nav = q('[data-td5="nav"]');
  return {
    pressed: q('[data-td52="pin"]')?.getAttribute("aria-pressed") ?? null,
    panel: panel ? panel.getBoundingClientRect().width : -1,
    header: q('[data-td5="header"]') ? getComputedStyle(q('[data-td5="header"]')!).display : "absent",
    top: sheet.top - port.top, h: sheet.height, port: sc.clientHeight, scroll: sc.scrollTop,
    findInNav: !!find && !!nav && nav.contains(find), findRightOfDay: !!find && !!day && find.getBoundingClientRect().left > day.getBoundingClientRect().right,
    value: (q('[data-td5="find"] input') as HTMLInputElement | null)?.value ?? null,
    sbKey: localStorage.getItem("sa.sidebarCollapsed"),
  };
});
test("TD52 E1 — the pin: F, the held rail, the sheet the window, Find in the navy row; restored with no transition; F stands down", async ({ page }) => {
  const L = new Ledger("E1");
  await page.addInitScript(() => {
    const w: number[] = [], hd: boolean[] = [];
    (window as unknown as { __w: number[]; __hd: boolean[] }).__w = w; (window as unknown as { __hd: boolean[] }).__hd = hd;
    const tick = () => {
      const p = document.querySelector<HTMLElement>(".ws-panel");
      const root = [...document.querySelectorAll<HTMLElement>("[data-todo-v5]")].find((e) => e.getBoundingClientRect().height > 0);
      if (p && root) { w.push(Math.round(p.getBoundingClientRect().width)); const h = root.querySelector<HTMLElement>('[data-td5="header"]'); hd.push(!!h && h.getBoundingClientRect().height > 0); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await openTodo(page, vp);
      await fontsReady(page);
      const sb0 = await page.evaluate(() => localStorage.getItem("sa.sidebarCollapsed"));
      const panel0 = (await pinState(page)).panel;
      /* a value in Find, and a scroll position to come back to */
      await page.locator('[data-todo-v5] [data-td5="find"] input').first().fill("Re");
      await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); const { sc } = (window as unknown as W).__td5(); sc.scrollTop = 140; });
      await page.waitForTimeout(300);
      const y0 = (await pinState(page)).scroll;
      await page.locator('[data-todo-v5] [data-td52="pin"]').first().click();
      await page.waitForTimeout(900);
      const a = await pinState(page);
      L.check(`${w} pinned (aria-pressed)`, a.pressed === "true", String(a.pressed));
      L.check(`${w} the sidebar is the 68 rail`, near(a.panel, 68, 1), String(a.panel));
      L.check(`${w} the header is hidden`, a.header === "none", a.header);
      L.check(`${w} the sheet is 12 from the top (±1)`, near(a.top, 12, 1), a.top.toFixed(1));
      L.check(`${w} the sheet is the scroller less 26 (±2)`, near(a.h, a.port - 26, 2), `${a.h} vs ${a.port}`);
      L.check(`${w} Find is in the navy row, right of the day chip`, a.findInNav && a.findRightOfDay, JSON.stringify(a));
      L.check(`${w} Find keeps its value`, a.value === "Re", String(a.value));
      L.check(`${w} pinning leaves sa.sidebarCollapsed alone`, a.sbKey === sb0, `${a.sbKey} vs ${sb0}`);
      /* Esc: Find's text first, then the pin */
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      const e1 = await pinState(page);
      L.check(`${w} Esc clears Find first, still pinned`, e1.value === "" && e1.pressed === "true", JSON.stringify({ v: e1.value, p: e1.pressed }));
      await page.keyboard.press("Escape"); await page.waitForTimeout(1200);
      await page.mouse.move(5, 5);
      const b = await pinState(page);
      L.check(`${w} the second Esc unpins`, b.pressed === "false", String(b.pressed));
      L.check(`${w} the sidebar comes back as it was`, near(b.panel, panel0, 1), `${b.panel} vs ${panel0}`);
      L.check(`${w} the scroll position comes back (±2)`, near(b.scroll, y0, 2), `${b.scroll} vs ${y0}`);
      /* RE-POINTED (To-do list v7 S2): Find lives in the navy row pinned or not; unpinned it leaves its pinned form */
      L.check(`${w} Find leaves its pinned form; the header is back`, !b.findInNav && b.header !== "none", JSON.stringify({ nav: b.findInNav, hd: b.header }));
      /* F stands down while typing, and while the compose card, the set-aside popover or the calendar drawer is open */
      const input = page.locator('[data-todo-v5] [data-td5="find"] input').first();
      await input.click(); await page.keyboard.type("f"); await page.waitForTimeout(400);
      L.check(`${w} F in Find types, and does not pin`, (await pinState(page)).pressed === "false" && (await input.inputValue()) === "f", await input.inputValue());
      await input.fill(""); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      for (const [name, open, shut] of [
        ["the compose card", async () => { await page.keyboard.press("n"); }, async () => { await page.keyboard.press("Escape"); }],
        ["the set-aside popover", async () => { await page.keyboard.press("s"); }, async () => { await page.keyboard.press("Escape"); }],
        ["the calendar drawer", async () => { await page.evaluate(() => ((window as unknown as W).__td5().q('[data-td7="open-calendar"]') as HTMLButtonElement).click()); }, async () => { await page.keyboard.press("Escape"); }],
      ] as const) {
        await open(); await page.waitForTimeout(600);
        await page.keyboard.press("f"); await page.waitForTimeout(500);
        L.check(`${w} F does nothing with ${name} open`, (await pinState(page)).pressed === "false", String((await pinState(page)).pressed));
        await shut(); await page.waitForTimeout(500);
      }
      /* F pins; reload: pinned from the first frame, no sidebar transition, no header flash */
      await page.keyboard.press("f"); await page.waitForTimeout(900);
      L.check(`${w} F pins`, (await pinState(page)).pressed === "true", "");
      await page.reload();
      await page.waitForSelector('[data-todo-v5][data-state="list"]', { timeout: 45_000 });
      await page.evaluate(LIB_TD5);
      await page.waitForTimeout(2000);
      const fr = await page.evaluate(() => ({ w: (window as unknown as { __w: number[] }).__w, hd: (window as unknown as { __hd: boolean[] }).__hd }));
      L.check(`${w} reload: pinned`, (await pinState(page)).pressed === "true", "");
      L.check(`${w} reload: the rail on every frame (no transition)`, fr.w.length > 10 && fr.w.every((x) => near(x, 68, 1)), `${[...new Set(fr.w)].join(",")} over ${fr.w.length}`);
      L.check(`${w} reload: no header flash`, fr.hd.every((x) => !x), `${fr.hd.filter(Boolean).length} frames`);
      await page.keyboard.press("f"); await page.waitForTimeout(1200);
      const c = await pinState(page);
      L.check(`${w} after a reload, unpinning lands on the sheet`, c.pressed === "false" && c.scroll > 0, JSON.stringify({ p: c.pressed, y: c.scroll }));
      L.check(`${w} sa.sidebarCollapsed never changed`, c.sbKey === sb0, `${c.sbKey} vs ${sb0}`);
    }
  } finally {
    await page.evaluate(() => { try { localStorage.removeItem("sa.pinList.todo"); } catch { /* */ } }).catch(() => {});
  }
  L.done(2 * 22);
});

/* ───────────────────────── E2 · "Just the desk" is retired ───────────────────────── */
test("TD52 E2 — no Just the desk control, state or class on /todo", async ({ page }) => {
  const L = new Ledger("E2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await mutate(page, "E2");
    const r = await page.evaluate(() => {
      const { r: root } = (window as unknown as W).__td5();
      return { text: /Just the desk/i.test(root.textContent ?? ""), btn: root.querySelectorAll('[data-td5="focus"], .td5-focusbtn').length, attr: root.querySelectorAll(".td5-sheet[data-focus]").length };
    });
    L.check(`${w} no "Just the desk" words`, !r.text, "");
    L.check(`${w} no focus control`, r.btn === 0, String(r.btn));
    L.check(`${w} no desk-only layout`, r.attr === 0, String(r.attr));
  }
  const fs = await import("node:fs");
  const src = fs.readFileSync("src/components/todo/v5/TodoTray.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const css = [fs.readFileSync("src/components/todo/v5/todoV5.css", "utf8"), fs.readFileSync("src/components/todo/v5/todoV52.css", "utf8")].join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  L.check("source: no focusMode state", !/focusMode|setFocusMode/.test(src), "");
  L.check("CSS: no td5-focusbtn or [data-focus] rule", !/\.td5-focusbtn|\[data-focus\]/.test(css), "");
  L.done(8);
});

/* ───────────────────────── F · presentation ───────────────────────── */
/* RE-POINTED (To-do list v7): the urgent words moved from the h1 to the "Your tray" line (`[data-td7="headline"]`); the
   h1 is "To-do list" on the shared card (TD7 L1). The long-title fit half is RETIRED with the title it fitted. */
test("TD52 F1 — the Your tray line reads Part B's overdue and today counts, the overdue part rust; the page titles", async ({ page }) => {
  const L = new Ledger("F1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    const r = await page.evaluate(() => {
      const { q } = (window as unknown as W).__td5();
      const line = q('[data-td7="headline"]')!;
      const num = (f: string) => Number(q(`[data-td52="cal-row"][data-f="${f}"] b`)?.textContent ?? NaN);
      const od = q('[data-td52="title-od"]');
      return { text: (line.textContent ?? "").trim(), label: line.getAttribute("aria-label"), o: num("overdue"), t: num("today"), rust: od ? getComputedStyle(od).color : null };
    });
    const want = r.o || r.t ? [r.o ? `${r.o} overdue` : "", r.t ? `${r.t} due today` : ""].filter(Boolean).join(" · ") : "Nothing due today";
    L.check(`${w} the line reads "${want}"`, r.text === want, `"${r.text}"`);
    L.check(`${w} its accessible name says the same`, r.label === want, String(r.label));
    if (r.o) L.check(`${w} the overdue part is rust`, r.rust === "rgb(162, 69, 42)", String(r.rust));
  }
  for (const [st, want] of [["caught", "To-do list"], ["nothing", "Your next move,always on top"]] as const) {
    await openTodo(page, SIZES[0], { state: st });
    const t = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-todo-v5] [data-page-title]")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => (e.textContent ?? "").trim()));
    L.check(`${st}: the page title`, t.length === 1 && t[0] === want, JSON.stringify(t));
  }
  await openTodo(page, SIZES[0], { state: "caught" });
  L.check("caught: the line reads All caught up", await page.evaluate(() => (window as unknown as W).__td5().q('[data-td7="headline"]')?.textContent === "All caught up"), "");
  L.done(9);
});

test("TD52 F2 — rows lead with the agent; chase and close say so; overdue dials carry the right tag and a spoken label", async ({ page }) => {
  const L = new Ledger("F2");
  const DAY = 86_400_000;
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    const today = todayYmd();
    const rows = await page.evaluate(() => {
      const { qa } = (window as unknown as W).__td5();
      return qa('[data-td5="row"]').map((r) => {
        const d = r.querySelector<HTMLElement>('[data-td5="dial"]')!;
        return {
          key: r.dataset.td5Row!, bucket: r.dataset.bucket!, type: r.dataset.taskType ?? "", sweep: r.hasAttribute("data-sweep"),
          bold: (r.querySelector('[data-td52="row-bold"]')?.childNodes[0]?.textContent ?? "").trim(),
          italic: (r.querySelector('[data-td52="row-italic"]')?.textContent ?? "").trim(),
          disc: (r.querySelector(".td5-disc")?.textContent ?? "").trim(),
          late: d.dataset.kind === "late", title: d.getAttribute("title") ?? "", role: d.getAttribute("role"), aria: d.getAttribute("aria-label"),
          tag: d.querySelector('[data-td52="age"]')?.textContent ?? null,
        };
      });
    });
    /* one agent's rows: not own tasks, not sweeps, and not a several-agents card (its disc is a count, "5S") */
    const agentRows = rows.filter((r) => r.type !== "own" && !r.sweep && r.disc && r.disc !== "··" && !/^\d/.test(r.disc));
    L.check(`${w} query and agent rows to read`, agentRows.length > 10, String(agentRows.length));
    /* the bold line is the agent: its initials are the disc's (the disc is the agent's, v5.1) */
    const initials = (s: string) => s.split(/\s+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
    const notAgent = agentRows.filter((r) => initials(r.bold) !== r.disc.slice(0, 2).toUpperCase());
    L.check(`${w} every query/agent row's bold line is the agent's name`, notAgent.length === 0, notAgent.slice(0, 3).map((r) => `${r.bold}/${r.disc}`).join(" · "));
    const chase = agentRows.filter((r) => r.bucket === "chase"), close = agentRows.filter((r) => r.bucket === "close");
    L.check(`${w} chase rows read "Nudge · …"`, chase.length > 0 && chase.every((r) => r.italic.startsWith("Nudge · ")), chase.slice(0, 2).map((r) => r.italic).join(" | "));
    L.check(`${w} close rows read "Consider closing · …"`, close.length > 0 && close.every((r) => r.italic.startsWith("Consider closing · ")), close.slice(0, 2).map((r) => r.italic).join(" | "));
    /* every overdue dial: the tag's unit from the dial's own date, and the spoken label */
    const late = rows.filter((r) => r.late);
    L.check(`${w} overdue dials to read`, late.length > 5, String(late.length));
    const units = new Set<string>();
    let wrong = 0, mute = 0;
    for (const r of late) {
      const m = r.aria?.match(/^Overdue since (\d+) (\w+)(?: (\d{4}))?$/);
      if (!m || r.role !== "img") { mute++; continue; }
      const y = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
      const mi = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(m[2]);
      const days = Math.round((Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)) - Date.UTC(y, mi, +m[1])) / DAY);
      /* RE-POINTED (To-do list v7 S5): the age reads in words — "5 days overdue", "3 wk overdue", "4 mo overdue" —
         with the same figure and unit the tag had (lib/trayRows.lateWords) */
      const want = days < 14 ? `${days} ${days === 1 ? "day" : "days"} overdue` : days < 60 ? `${Math.round(days / 7)} wk overdue` : `${Math.round(days / 30.4)} mo overdue`;
      if (r.tag !== want) wrong++;
      units.add((r.tag ?? "").split(" ")[1] ?? "?");
    }
    L.check(`${w} every overdue dial is spoken ("Overdue since {date}", role img)`, mute === 0, String(mute));
    L.check(`${w} every overdue dial's tag has the right unit and figure`, wrong === 0, `${wrong} of ${late.length}`);
    L.check(`${w} the tags exercised: ${[...units].join(", ")}`, units.size >= 2, [...units].join(","));
    const desk = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td5="desk-card"] [data-td5="dial"] [data-td52="age"]'));
    L.check(`${w} the desk's dial carries no tag`, !desk, "");
  }
  L.done(2 * 9);
});

test("TD52 F3 — every visible text on /todo meets 4.5:1 (3:1 large) against its computed background", async ({ page }) => {
  const L = new Ledger("F3");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    await mutate(page, "F3");
    for (const where of ["top", "sheet"] as const) {
      if (where === "sheet") await page.evaluate(() => { const { sc, q } = (window as unknown as W).__td5(); sc.scrollTop += q(".td5-sheet")!.getBoundingClientRect().top - sc.getBoundingClientRect().top; });
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const { r: root, sc } = (window as unknown as W).__td5();
        /* RE-POINTED (To-do list v7): text the page's scroller has clipped is not painted. v7's "Your tray" heading sits
           20px above the sheet with no ground of its own, so with the sheet scrolled to the top it lies above the
           scrollport, over the shell's ink in the viewport, and was read as ink-on-ink though nobody can see it. */
        const port = sc.getBoundingClientRect();
        const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const over = (f: { r: number; g: number; b: number; a: number }, b: { r: number; g: number; b: number }) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a) });
        const lum = (c: { r: number; g: number; b: number }) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        /* the ground under the text: an ancestor's background counts only where the text actually sits inside its box
           (a label positioned outside its parent — the desk's "Today" beside its rust tick — is on the card, not the tick) */
        const bgOf = (el: Element, x: number, y: number) => {
          const chain: Element[] = [];
          for (let e: Element | null = el; e; e = e.parentElement) chain.push(e);
          let bg = { r: 255, g: 255, b: 255 };
          for (const e of chain.reverse()) {
            const b = e.getBoundingClientRect();
            if (x < b.left || x > b.right || y < b.top || y > b.bottom) continue;
            const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) bg = over(c, bg);
          }
          return bg;
        };
        const opacityOf = (el: Element) => { let o = 1; for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
        const bad: string[] = [];
        let n = 0;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {
          const s = (t.textContent ?? "").trim();
          if (!s) continue;
          const el = t.parentElement!;
          const rg = document.createRange(); rg.selectNodeContents(t);
          const rc = [...rg.getClientRects()].find((x) => x.width > 0 && x.height > 0);
          if (!rc || rc.bottom < 0 || rc.top > innerHeight || rc.right < 0 || rc.left > innerWidth) continue;
          if (sc.contains(el) && (rc.bottom <= port.top || rc.top >= port.bottom)) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || el.closest("button:disabled, [disabled], .td52-rw.z, [inert]")) continue;
          /* text over a picture is the picture's, not a ground's */
          let pic = false; for (let e: Element | null = el; e; e = e.parentElement) if (getComputedStyle(e).backgroundImage !== "none") { pic = true; break; }
          if (pic) continue;
          const fg0 = parse(cs.color)!; const op = opacityOf(el);
          if (op < 0.05) continue; /* not painted (a tooltip at rest) */
          const bg = bgOf(el, rc.left + rc.width / 2, rc.top + rc.height / 2);
          const fg = over({ ...fg0, a: fg0.a * op }, bg);
          const L1 = lum(fg), L2 = lum(bg);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const px = parseFloat(cs.fontSize), wt = Number(cs.fontWeight);
          const large = px >= 24 || (px >= 18.66 && wt >= 700);
          n++;
          if (ratio < (large ? 3 : 4.5)) bad.push(`"${s.slice(0, 22)}" ${ratio.toFixed(2)} (${px}px ${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}) ${el.className || el.tagName})`);
        }
        return { n, bad };
      });
      /* RE-POINTED (To-do list v7): the top screen is the header card and Today now — 16 texts at 1280, 26 at 1512 —
         where v5.2's header carried the count card, the ring and the filter row; the sheet keeps its floor */
      L.check(`${w} ${where}: texts read`, r.n > (where === "top" ? 12 : 40), String(r.n));
      L.check(`${w} ${where}: every text meets its ratio`, r.bad.length === 0, `${r.bad.length}: ${r.bad.slice(0, 12).join(" · ")}`);
    }
  }
  L.done(2 * 4);
});

/* ───────────────────────── G · dates and groups ───────────────────────── */

/* RE-POINTED (To-do list v7 S7): the slips fold away under the desk; "Done today · n cleared" carries the count */
const doneN = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const t = [...document.querySelectorAll<HTMLElement>('[data-todo-v5] [data-td5="desk"] [data-td5="done-n"]')].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "";
  const m = t.match(/(\d+) cleared/); return m ? Number(m[1]) : 0;
});
const rowLoc = (page: import("@playwright/test").Page, key: string) => page.locator(`[data-todo-v5] [data-td5-row="${key}"]`).first();
const toastText = (page: import("@playwright/test").Page) => page.locator(".tdb-toast").first().textContent({ timeout: 4000 }).catch(() => null);
const pressUndo = async (page: import("@playwright/test").Page) => {
  const b = page.locator(".tdb-toast .tdb-toast-act").first();
  if (!(await b.isVisible().catch(() => false))) return false;
  await b.click(); return true;
};

/* G3 — close several Gone quiet at once: the bulk save IS three single close-journey saves, and one Undo is exact */
const qGuards: { before: Raw; ids: string[] }[] = [];
test.afterEach(async () => {
  if (qGuards.length) await new Promise((r) => setTimeout(r, 2500));
  while (qGuards.length) { const g = qGuards.pop()!; const f = await restoreSet(g.before, g.ids); if (f.length) console.log(`[guard] restored:\n  ${f.join("\n  ")}`); }
});
/** what a save wrote, comparable across two saves of one query: changed documents only, with generated ids and
 *  times written DURING this run masked (a historical date still compares — only "now" is allowed to differ) */
const RUN_START = Date.now() - 60_000;
const maskNow = (v: string) => v
  .replace(/"(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z)"/g, (m, iso: string) => (Date.parse(iso) >= RUN_START ? '"<now>"' : m))
  .replace(/ts:(\d{12,})/g, (m, ms: string) => (Number(ms) >= RUN_START ? "ts:<now>" : m))
  .replace(/"(act|evt|entry|log)-[a-z0-9-]+"/g, '"<id>"')
  .replace(/"[A-Za-z0-9]{20}"/g, '"<autoid>"');
const written = (before: Map<string, string>, after: Map<string, string>) => [...after.entries()]
  .filter(([k, v]) => before.get(k) !== v)
  .map(([k, v]) => `${/[A-Za-z0-9]{20}$/.test(k) || !before.has(k) ? k.replace(/\/[^/]*$/, "/*") : k}=${maskNow(v)}`)
  .concat([...before.keys()].filter((k) => !after.has(k)).map((k) => `removed ${k}`))
  .sort();
test("TD52 G3 — select three Gone quiet, close: each query written exactly as a single close-journey save; three slips; one Undo restores all", async ({ page }) => {
  const L = new Ledger("G3");
  const vp = SIZES[0];
  await openTodo(page, vp);
  await mutate(page, "G3");
  const rows = await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]').filter((r) => r.querySelector('[data-td52="bulk-check"]')).map((r) => ({ key: r.dataset.td5Row!, q: r.dataset.query! })));
  L.check("three Gone quiet rows to close", rows.length >= 3, String(rows.length));
  if (rows.length < 3) { L.done(1); return; }
  const pick = rows.slice(0, 3);
  const ids = pick.map((r) => r.q);
  qGuards.push({ before: await rawSet(ids), ids });
  const before = await readSet(ids);
  const beforeOf = new Map<string, Map<string, string>>();
  for (const q of ids) beforeOf.set(q, await readSet([q]));
  /* the SINGLE saves, one at a time through the desk's close journey (its noreply door), each undone after */
  const single = new Map<string, string[]>();
  for (const r of pick) {
    await openTodo(page, vp);
    await rowLoc(page, r.key).click(); await page.waitForTimeout(400);
    await page.locator('[data-todo-v5] [data-td5="act"]').click();
    await page.locator('[data-td5-slot] [data-qad-drawer="close"]').waitFor({ timeout: 10_000 });
    const skip = page.locator("[data-td5-slot] .qad-skip");
    if (await skip.count()) await skip.first().click();
    await page.waitForTimeout(500);
    await page.locator("[data-td5-slot] [data-qad-primary]").first().click();
    await expect.poll(async () => written(beforeOf.get(r.q)!, await readSet([r.q])).length > 0, { timeout: 15_000 }).toBe(true);
    await page.waitForTimeout(1200);
    single.set(r.q, written(beforeOf.get(r.q)!, await readSet([r.q])));
    /* the single save's own Undo (the toast) */
    const u = page.locator(".tdb-toast .tdb-toast-act").first();
    const had = await u.isVisible().catch(() => false);
    if (had) await u.click();
    const mineBefore = beforeOf.get(r.q)!;
    const undone = await expect.poll(async () => diffSets(mineBefore, await readSet([r.q])).length, { timeout: 20_000 }).toBe(0).then(() => true).catch(() => false);
    L.check(`single close of ${r.q}: written, and its Undo put it back`, had && undone && (single.get(r.q)?.length ?? 0) > 0, `${single.get(r.q)?.length} documents${undone ? "" : " · left: " + diffSets(mineBefore, await readSet([r.q])).slice(0, 4).join(" · ").slice(0, 600)}`);
    if (!undone) { L.done(10); return; }
  }
  /* the BULK save: the same three, selected and closed together */
  await openTodo(page, vp);
  const slips0 = await doneN(page);
  for (const r of pick) await page.locator(`[data-todo-v5] [data-td5-row="${r.key}"] [data-td52="bulk-check"]`).click();
  const bar = await page.evaluate(() => ((window as unknown as W).__td5().q('[data-td52="bulk"]') as HTMLElement | null)?.innerText?.replace(/\s+/g, " ").trim() ?? null);
  L.check("the bar: '3 selected · Cancel · Close 3 queries'", bar === "3 selected Cancel Close 3 queries", String(bar));
  const checked = await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td52="bulk-check"][aria-checked="true"]').length);
  L.check("three rows checked (role checkbox)", checked === 3, String(checked));
  await page.locator('[data-todo-v5] [data-td52="bulk-close"]').click();
  await expect.poll(async () => page.locator(".tdb-toast").first().textContent().catch(() => ""), { timeout: 30_000 }).toMatch(/Closed 3 queries · Moved to Closed/);
  await page.waitForTimeout(1500);
  for (const r of pick) {
    const mine = written(beforeOf.get(r.q)!, await readSet([r.q]));
    const want = single.get(r.q) ?? [];
    const same = JSON.stringify(mine) === JSON.stringify(want);
    L.check(`${r.q}: the bulk wrote what a single close writes, field by field`, same && mine.length > 0, same ? `${mine.length} documents` : `bulk ${JSON.stringify(mine).slice(0, 400)} · single ${JSON.stringify(want).slice(0, 400)}`);
  }
  const slips1 = await doneN(page);
  L.check("three land in Done today", slips1 === slips0 + 3, `${slips0} → ${slips1}`);
  await page.locator(".tdb-toast .tdb-toast-act").first().click();
  const back = await expect.poll(async () => diffSets(before, await readSet(ids)).length, { timeout: 30_000 }).toBe(0).then(() => true).catch(() => false);
  L.check("one Undo restores the account byte for byte", back, back ? "" : diffSets(before, await readSet(ids)).slice(0, 4).join(" · "));
  if (back) qGuards.pop();
  L.done(10);
});

/* ───────────────────────── H · feel and guidance ───────────────────────── */
test("TD52 H1 — rows glide (none under reduced motion); a helpful empty filter; the explainer once; one save per double E; PINNED", async ({ page, browser }) => {
  const L = new Ledger("H1");
  const vp = SIZES[0];
  await openTodo(page, vp, { motion: true });
  /* (a) filtering animates the rows that stay or arrive */
  const anim = async () => { await page.locator('[data-todo-v5] [data-td5="find"] input').first().fill("Send"); await page.waitForTimeout(60);
    const n = await page.evaluate(() => (window as unknown as W).__td5().qa("[data-td5-row]").reduce((s, r) => s + r.getAnimations().length, 0));
    await page.locator('[data-todo-v5] [data-td5="find"] input').first().fill(""); await page.waitForTimeout(400); return n; };
  const moving = await anim();
  L.check("filtering animates rows (Web Animations present)", moving > 0, String(moving));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const still = await anim();
  L.check("reduced motion: no row animation", still === 0, String(still));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  /* (b) an all-hiding search: the empty line, and its button restores the rows */
  const all = await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]').length);
  await page.locator('[data-todo-v5] [data-td5="find"] input').first().fill("zzqqxx-nothing");
  await page.waitForTimeout(400);
  const e = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); const b = q('[data-td52="empty-filter"]'); return b ? { text: (b.textContent ?? "").replace(/\s+/g, " ").trim(), btn: q('[data-td52="empty-clear"]')?.textContent } : null; });
  const hid = Number(e?.text.match(/ (\d+) tasks? (?:is|are) hidden by it\./)?.[1] ?? NaN);
  L.check("the empty line names the search and how many it hides", !!e && e.text.startsWith("Nothing matches “zzqqxx-nothing”.") && Number.isFinite(hid), JSON.stringify(e));
  L.check("…with Clear the search", e?.btn === "Clear the search", String(e?.btn));
  await page.locator('[data-todo-v5] [data-td52="empty-clear"]').click();
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]').length);
  /* the account is shared, so the figure is read off the same moment as the rows it counts (not one read earlier) */
  L.check("the button restores the rows, as many as it said it hid", back === hid && back > 0, `${back} vs ${hid} (earlier ${all})`);
  /* (c) the explainer: once, and never after GOT IT (stored on the user, so a reload and a second browser agree) */
  const { db, uid } = await harnessDb();
  const ub = await guardDocs([""]);
  const prefs = (ub.get("") as { todoPrefs?: Record<string, unknown> } | null)?.todoPrefs ?? {};
  await setDoc(doc(db, "users", uid), { todoPrefs: { ...prefs, tray: {} } }, { merge: true });
  const openAside = async (p: import("@playwright/test").Page) => {
    await p.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"]').find((r) => r.dataset.taskType && r.dataset.taskType !== "own")?.click());
    await p.waitForTimeout(400);
    await p.locator('[data-todo-v5] [data-td5="desk-aside"]').first().click();
    await p.waitForTimeout(400);
    return p.locator('[data-td5="aside-pop"] [data-td52="explain"]').count();
  };
  await openTodo(page, vp);
  L.check("the explainer shows on the first Set aside", (await openAside(page)) === 1, "");
  await page.locator('[data-td5="aside-pop"] [data-td52="got-it"]').click();
  await page.waitForTimeout(300);
  L.check("GOT IT takes it away", (await page.locator('[data-td5="aside-pop"] [data-td52="explain"]').count()) === 0, "");
  await expect.poll(async () => ((await snapDocs([""])).get("") as { todoPrefs?: { tray?: { explainedSetAside?: boolean } } })?.todoPrefs?.tray?.explainedSetAside, { timeout: 10_000 }).toBe(true);
  L.check("…stored on the user", true, "");
  await page.keyboard.press("Escape");
  await openTodo(page, vp);
  L.check("after a reload it never shows", (await openAside(page)) === 0, "");
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await openTodo(p2, vp);
  L.check("…nor in a second browser", (await openAside(p2)) === 0, "");
  await ctx2.close();
  await page.keyboard.press("Escape");
  /* (d) one save per double E, released when the save SETTLES (never on a timer): offline, the tick's write cannot
     settle, so the desk must still say Saving… after 2s and a second E must start nothing; online, one slip lands */
  const id = `zz-td52-save-${Date.now().toString(36)}`;
  await guardDocs([`tasks/${id}`]);
  await setDoc(doc(db, "users", uid, "tasks", id), { id, userId: uid, text: "Zz td52 save probe", done: false, dueDate: todayYmd(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await openTodo(page, vp);
  const key = await page.evaluate((id) => (window as unknown as W).__td5().qa('[data-td5="row"]').find((r) => r.dataset.td5Row?.includes(id))?.dataset.td5Row ?? null, id);
  L.check("the probe task is in the tray", !!key, String(key));
  if (key) {
    await rowLoc(page, key).click();
    await page.waitForTimeout(400);
    const slips0 = await doneN(page);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.context().setOffline(true);
    try {
      await page.keyboard.press("e");
      await page.waitForTimeout(2000);
      const mid = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); return { saving: !!q('[data-td52="saving"]'), off: (q('[data-td5="act"]') as HTMLButtonElement | null)?.disabled ?? null }; });
      L.check("2s into a save that has not settled: still Saving…, the buttons disabled", mid.saving && mid.off === true, JSON.stringify(mid));
      await page.keyboard.press("e");
      await page.waitForTimeout(400);
    } finally {
      await page.context().setOffline(false);
    }
    await expect.poll(() => page.locator('[data-todo-v5] [data-td52="saving"]').count(), { timeout: 20_000 }).toBe(0);
    await page.waitForTimeout(1500);
    const slips1 = await doneN(page);
    L.check("released once it settled", true, "");
    L.check("a double E started one save (one cleared)", slips1 === slips0 + 1, `${slips0} → ${slips1}`);
  }
  /* (e) PINNED shows only while pinned */
  await openTodo(page, vp);
  L.check("unpinned: no PINNED", (await page.locator('[data-todo-v5] [data-td52="pinned-label"]').count()) === 0, "");
  await page.keyboard.press("f"); await page.waitForTimeout(800);
  const pl = await page.evaluate(() => { const e = (window as unknown as W).__td5().q('[data-td52="pinned-label"]'); const b = (window as unknown as W).__td5().q('[data-td52="pin"]'); return e && b ? { t: e.textContent, before: e.getBoundingClientRect().right <= b.getBoundingClientRect().left } : null; });
  L.check("pinned: PINNED, just before the pin", !!pl && pl.t === "PINNED" && pl.before, JSON.stringify(pl));
  await page.keyboard.press("f"); await page.waitForTimeout(600);
  await page.evaluate(() => { try { localStorage.removeItem("sa.pinList.todo"); } catch { /* */ } });
  L.done(15);
});

test("TD52 H2 — one Esc order: the dial menu, the bulk selection, the drawer, Find's text (v5.1's layer), the pin — one each", async ({ page }) => {
  const L = new Ledger("H2");
  await openTodo(page, SIZES[0]);
  await mutate(page, "H2");
  try {
    await page.keyboard.press("f"); await page.waitForTimeout(800);
    await page.locator('[data-todo-v5] [data-td52="pin-find"] input').fill("a");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    /* a bulk selection: one Gone quiet row ticked */
    await page.evaluate(() => (window as unknown as W).__td5().q('[data-td52="bulk-check"]')?.click()); await page.waitForTimeout(300);
    await page.locator('[data-todo-v5] [data-td52="pin-day"]').click(); await page.waitForTimeout(600);
    /* the dial menu over the drawer: a click dispatched on a movable dial (the scrim takes pointer presses) */
    await page.evaluate(() => (window as unknown as W).__td5().qa('[data-td5="row"] .td52-press')[0]?.click());
    await page.waitForTimeout(400);
    const st = () => page.evaluate(() => ({
      menu: !!document.querySelector('[data-td52="dial-menu"]'), bulk: (window as unknown as W).__td5().qa('[data-td52="bulk-check"][aria-checked="true"]').length > 0, drawer: !!document.querySelector('[data-td52="drawer"].on'),
      find: ((window as unknown as W).__td5().q('[data-td5="find"] input') as HTMLInputElement | null)?.value ?? "",
      pin: (window as unknown as W).__td5().q('[data-td52="pin"]')?.getAttribute("aria-pressed"),
    }));
    const s0 = await st();
    L.check("all five open (menu, bulk, drawer, Find's text, pin)", s0.menu && s0.bulk && s0.drawer && s0.find === "a" && s0.pin === "true", JSON.stringify(s0));
    const want = [
      { menu: false, bulk: true, drawer: true, find: "a", pin: "true" },
      { menu: false, bulk: false, drawer: true, find: "a", pin: "true" },
      { menu: false, bulk: false, drawer: false, find: "a", pin: "true" },
      { menu: false, bulk: false, drawer: false, find: "", pin: "true" },
      { menu: false, bulk: false, drawer: false, find: "", pin: "false" },
    ];
    for (let i = 0; i < want.length; i++) {
      await page.keyboard.press("Escape"); await page.waitForTimeout(700);
      const s = await st();
      L.check(`Esc ${i + 1} closes one thing`, JSON.stringify(s) === JSON.stringify(want[i]), JSON.stringify(s));
    }
  } finally {
    await page.evaluate(() => { try { localStorage.removeItem("sa.pinList.todo"); } catch { /* */ } });
  }
  L.done(6);
});

/* ───────────────────────── J · mid-task signals ───────────────────────── */
const startOn = async (page: import("@playwright/test").Page, type: string) => {
  const k = await page.evaluate((t) => (window as unknown as W).__td5().qa(`[data-td5="row"][data-task-type="${t}"]`)[0]?.dataset.td5Row ?? null, type);
  if (!k) return null;
  await rowLoc(page, k).click(); await page.waitForTimeout(400);
  await page.locator('[data-todo-v5] [data-td5="act"]').click();
  await page.locator("[data-td5-slot] [data-qad-drawer]").first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  return k;
};
const jRead = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const { q, qa } = (window as unknown as W).__td5();
  const d = q("[data-td5-slot] [data-qad-drawer]");
  const steps = d ? [...d.querySelectorAll<HTMLElement>("[data-qad-stepper] [data-qad-step]")] : [];
  const nav = q('[data-td52="in-progress-row"]');
  return {
    jn: steps.length, jk: steps.findIndex((s) => s.getAttribute("aria-current") === "step") + 1,
    navLab: nav?.querySelector(".td52-wlab")?.textContent ?? null, dot: !!nav?.querySelector(".td52-wdot"),
    navDashes: nav ? nav.querySelectorAll(".td52-wdash u").length : -1, navDone: nav ? nav.querySelectorAll(".td52-wdash u.d").length : -1,
    navSt: q('[data-td52="nav-steps"]')?.textContent?.trim() ?? null,
    bandSt: q('[data-td52="band-steps"]')?.textContent?.trim() ?? null, bandDashes: q('[data-td52="band-steps"]')?.querySelectorAll("u").length ?? -1,
    say: q('[data-td5="say"]')?.textContent ?? null, cn: q('[data-td5="desk-card"] .td5-cn')?.textContent ?? null, status: !!q('[data-td5="desk-status"]'),
    band: q('[data-td52="band"]')?.getAttribute("aria-label") ?? null, rows: qa('[data-td5="row"]').length,
  };
});
test("TD52 J1 — the navy row and the band count the journey's own steps; Next, Review and a switch move them; leaving restores", async ({ page }) => {
  const L = new Ledger("J1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    const k = await startOn(page, "partial_requested") ?? await startOn(page, "full_requested");
    L.check(`${w} a send to start`, !!k, "");
    if (!k) continue;
    const a = await jRead(page);
    L.check(`${w} the dot and TASK IN PROGRESS`, a.dot && a.navLab === "TASK IN PROGRESS", JSON.stringify(a));
    L.check(`${w} n dashes, n = the journey's steps + its review`, a.jn > 1 && a.navDashes === a.jn, `${a.navDashes} vs ${a.jn}`);
    L.check(`${w} STEP 1 OF n in the row and the band`, a.navSt === `· STEP 1 OF ${a.jn}` && a.bandSt === `STEP 1 OF ${a.jn}` && a.navDone === 1, `${a.navSt} | ${a.bandSt}`);
    await page.locator("[data-td5-slot] [data-qad-primary]").first().click(); await page.waitForTimeout(700);
    const b = await jRead(page);
    L.check(`${w} Next: both counters at 2`, b.jk === 2 && b.navSt === `· STEP 2 OF ${b.jn}` && b.bandSt === `STEP 2 OF ${b.jn}` && b.navDone === 2, `${b.navSt} | ${b.bandSt}`);
    const rv = page.locator("[data-td5-slot] .qad-skip");
    if (await rv.count()) { await rv.first().click(); await page.waitForTimeout(700); }
    const c = await jRead(page);
    L.check(`${w} the review reads n of n`, c.jk === c.jn && c.navSt === `· STEP ${c.jn} OF ${c.jn}` && c.bandSt === `STEP ${c.jn} OF ${c.jn}`, `${c.navSt} | ${c.bandSt}`);
    await leaveDesk(page); await page.waitForTimeout(900);
    const d = await jRead(page);
    L.check(`${w} leaving restores "Working through"`, !!d.say && /Working through/.test(d.say) && d.navLab === null, String(d.say));
    L.check(`${w} …and the band's group name and StatusDot`, !!d.cn && d.status && d.band === null, JSON.stringify({ cn: d.cn, st: d.status }));
  }
  /* a switch recounts: Close → "They said no" → a response */
  await openTodo(page, SIZES[0]);
  const k = await startOn(page, "no_response_close");
  L.check("a close to switch", !!k, "");
  if (k) {
    const a = await jRead(page);
    await page.locator("[data-td5-slot]").getByText("They said no", { exact: true }).first().click();
    await page.waitForTimeout(1200);
    const b = await jRead(page);
    L.check("the switch recounts from the new journey", b.navDashes === b.jn && b.bandSt === `STEP ${b.jk} OF ${b.jn}` && b.band?.startsWith("Logging their reply"), `${a.jn} → ${b.jn}; ${b.bandSt}; ${b.band}`);
    await leaveDesk(page);
  }
  L.done(2 * 8 + 2);
});

test("TD52 J2 — the band's title: '{doing} · {agent}' at 1512; at 1280 the agent goes, one line, inside the band, no ellipsis", async ({ page }) => {
  const L = new Ledger("J2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    await mutate(page, "J2");
    const k = await startOn(page, "partial_requested") ?? await startOn(page, "full_requested");
    if (!k) { L.check(`${w} a send to start`, false, ""); continue; }
    await page.waitForTimeout(2600);
    const r = await page.evaluate(() => {
      const { q } = (window as unknown as W).__td5();
      const band = q('[data-td52="band"]')!, tt = q('[data-td52="band-title"]')!, ag = q('[data-td52="band-agent"]');
      const bb = band.getBoundingClientRect();
      const rg = document.createRange(); rg.selectNodeContents(tt);
      const rs = [...rg.getClientRects()].filter((x) => x.width > 0);
      const lines = new Set(rs.map((x) => Math.round(x.top))).size;
      const right = Math.max(...rs.map((x) => x.right));
      const cs = getComputedStyle(tt);
      return { label: band.getAttribute("aria-label"), bandW: bb.width, agentShown: !!ag && getComputedStyle(ag).display !== "none" && ag.getBoundingClientRect().width > 0,
        doing: q('[data-td52="band-doing"]')?.textContent, lines, inside: right <= bb.right + 0.5 && Math.min(...rs.map((x) => x.left)) >= bb.left - 0.5,
        clipped: tt.scrollWidth > tt.clientWidth + 0.5 || cs.textOverflow === "ellipsis", eyebrow: q('[data-td52="band-eyebrow"]')?.textContent };
    });
    L.check(`${w} the accessible name is the full title`, !!r.label && /^Sending your (partial|full) · .+/.test(r.label), String(r.label));
    L.check(`${w} the eyebrow is the group`, r.eyebrow === "Your move", String(r.eyebrow));
    if (r.bandW >= 640) L.check(`${w} the agent shows (band ${r.bandW.toFixed(0)})`, r.agentShown, "");
    else L.check(`${w} under 640 the agent goes (band ${r.bandW.toFixed(0)})`, !r.agentShown, "");
    L.check(`${w} one line`, r.lines === 1, String(r.lines));
    L.check(`${w} inside the band`, r.inside, "");
    L.check(`${w} no ellipsis, nothing clipped`, !r.clipped, "");
    await leaveDesk(page);
  }
  L.done(2 * 6);
});

test("TD52 J3 — the tray goes quiet, never blocked: 42% and full on hover; the live row; the tip only with answers", async ({ page }) => {
  const L = new Ledger("J3");
  const vp = SIZES[0];
  await openTodo(page, vp);
  const k = await startOn(page, "partial_requested") ?? await startOn(page, "full_requested");
  L.check("a send to start", !!k, "");
  if (!k) { L.done(1); return; }
  await mutate(page, "J3");
  const r = await page.evaluate((k) => {
    const { qa, q } = (window as unknown as W).__td5();
    const others = qa('[data-td5="row"]').filter((x) => x.dataset.td5Row !== k);
    const ops = others.flatMap((x) => [".td5-tx", ".td5-disc", '[data-td5="dial"]'].map((s) => Number(getComputedStyle(x.querySelector(s)!).opacity)));
    const live = q(`[data-td5-row="${CSS.escape(k)}"]`)!;
    return { ops, liveTag: live.querySelector('[data-td52="in-progress"]')?.textContent ?? null, edge: getComputedStyle(live).boxShadow, band: Number(getComputedStyle(q('[data-td5="band"]')!).opacity) };
  }, k);
  L.check("every other row's disc, text and dial at 0.42", r.ops.length > 6 && r.ops.every((o) => near(o, 0.42, 0.02)), `${Math.min(...r.ops)}–${Math.max(...r.ops)}`);
  L.check("bands at 0.6", near(r.band, 0.6, 0.02), String(r.band));
  L.check("the live row says IN PROGRESS", r.liveTag === "IN PROGRESS", String(r.liveTag));
  L.check("…with a 4px rust edge", /rgb\(162, 69, 42\) 4px 0px 0px 0px inset/.test(r.edge), r.edge);
  const other = await page.evaluate((k) => (window as unknown as W).__td5().qa('[data-td5="row"]').find((x) => x.dataset.td5Row !== k && x.getBoundingClientRect().height > 0)!.dataset.td5Row!, k);
  await rowLoc(page, other).hover({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300);
  const hov = await page.evaluate((o) => { const r = (window as unknown as W).__td5().q(`[data-td5-row="${CSS.escape(o)}"]`)!; return [".td5-tx", ".td5-disc", '[data-td5="dial"]'].map((s) => Number(getComputedStyle(r.querySelector(s)!).opacity)); }, other);
  L.check("full on hover", hov.every((o) => near(o, 1, 0.02)), hov.join(","));
  L.check("no answers yet: no tip", (await page.locator('[data-td52="tip"]').count()) === 0, "");
  /* answer something: Next marks the journey touched in most sends; a field typed is the sure way */
  /* an answer: step 2's quantity, one up */
  await page.locator("[data-td5-slot] [data-qad-primary]").first().click(); await page.waitForTimeout(600);
  await page.locator("[data-td5-slot] .qad-body button", { hasText: /^\+$/ }).first().click();
  await page.waitForTimeout(600);
  const dirty = (await page.locator("[data-td5-slot] [data-qad-later]").count()) > 0;
  await page.mouse.move(5, 5); await rowLoc(page, other).hover({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400);
  const tip = await page.evaluate(() => { const t = document.querySelector('[data-td52="tip"]'); return t ? t.textContent : null; });
  L.check("with answers: the tip on hover", dirty && !!tip && tip.startsWith("YOUR ANSWERS ARE KEPT"), `${dirty} ${tip}`);
  await rowLoc(page, k).hover({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300);
  L.check("never on the live row", (await page.locator('[data-td52="tip"]').count()) === 0, "");
  /* still pressable: a row click selects it (and parks the journey with answers) */
  /* bounded: a row something covers cannot be pressed, and that is the reading, not a crash */
  await rowLoc(page, other).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(900);
  const desk = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td5="desk-card"]')?.dataset.key);
  L.check("a row click still selects", desk === other, `${desk} vs ${other}`);
  /* clean up: discard the parked journey */
  await page.evaluate(() => sessionStorage.removeItem("qh.parkedJourney"));
  await rowLoc(page, k).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400);
  await leaveDesk(page);
  L.done(10);
});

test("TD52 J4 — the typewriter once per start; the fill at k/n; sheen and breathing only while working; reduced motion: nothing moves", async ({ page }) => {
  const L = new Ledger("J4");
  const vp = SIZES[0];
  await openTodo(page, vp, { motion: true });
  const k = await startOn(page, "partial_requested") ?? await startOn(page, "full_requested");
  L.check("a send to start", !!k, "");
  if (!k) { L.done(1); return; }
  const early = await page.evaluate(() => ({ t: (window as unknown as W).__td5().q('[data-td52="band-doing"]')?.textContent ?? "", typing: !!(window as unknown as W).__td5().q(".td52-wtw.typing") }));
  await page.waitForTimeout(2400);
  const late = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td52="band-doing"]')?.textContent ?? "");
  L.check("the title types in on a start", early.t.length < late.length || early.typing, `${early.t.length} → ${late.length}`);
  await page.locator("[data-td5-slot] [data-qad-primary]").first().click();
  const afterNext = await page.evaluate(() => ({ t: (window as unknown as W).__td5().q('[data-td52="band-doing"]')?.textContent ?? "", typing: !!(window as unknown as W).__td5().q(".td52-wtw.typing") }));
  L.check("not retyped on Next", afterNext.t === late && !afterNext.typing, JSON.stringify(afterNext));
  await page.waitForTimeout(900);
  const f = await page.evaluate(() => {
    const { q } = (window as unknown as W).__td5();
    const band = q('[data-td52="band"]')!, fill = q('[data-td52="fill"]')!;
    const st = (q('[data-td52="band-steps"]')?.textContent ?? "").match(/STEP (\d+) OF (\d+)/);
    return { w: fill.getBoundingClientRect().width, bw: band.getBoundingClientRect().width, k: Number(st?.[1]), n: Number(st?.[2]),
      sheen: getComputedStyle(band, "::after").animationName, breathe: getComputedStyle(q('[data-td5="row"][data-live]')!).animationName };
  });
  L.check("the fill line is k/n of the band (±1px)", near(f.w, (f.bw * f.k) / f.n, 1), `${f.w.toFixed(1)} vs ${((f.bw * f.k) / f.n).toFixed(1)}`);
  L.check("sheen and breathing run while working", f.sheen === "td52Sheen" && f.breathe === "td52Breathe", `${f.sheen} ${f.breathe}`);
  await leaveDesk(page); await page.waitForTimeout(800);
  const rest = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); return { band: !!q('[data-td52="band"]'), live: !!q('[data-td5="row"][data-live]') }; });
  L.check("they stop when the journey goes", !rest.band && !rest.live, JSON.stringify(rest));
  /* reduced motion: no element under the sheet runs an animation or a transition; the same end state */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTodo(page, vp, { motion: true });
  const k2 = await startOn(page, "partial_requested") ?? await startOn(page, "full_requested");
  await page.locator("[data-td5-slot] [data-qad-primary]").first().click();
  await page.waitForTimeout(150);
  const rm = await page.evaluate(() => {
    const { q } = (window as unknown as W).__td5();
    const sheet = q(".td5-sheet")!;
    const running = document.getAnimations().filter((a) => { const t = (a.effect as KeyframeEffect | null)?.target as Element | null; return !!t && sheet.contains(t) && !t.closest("[data-td5-slot]") && a.playState === "running"; });
    const band = q('[data-td52="band"]')!, fill = q('[data-td52="fill"]')!;
    const st = (q('[data-td52="band-steps"]')?.textContent ?? "").match(/STEP (\d+) OF (\d+)/);
    return { running: running.map((a) => `${(a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? "waapi"}@${((a.effect as KeyframeEffect).target as Element).className}`), full: q('[data-td52="band-doing"]')?.textContent,
      w: fill.getBoundingClientRect().width, want: (band.getBoundingClientRect().width * Number(st?.[1])) / Number(st?.[2]) };
  });
  L.check("reduced motion: nothing under the sheet animates", rm.running.length === 0, rm.running.slice(0, 5).join(" · "));
  L.check("…the title in full at once, the fill at k/n", !!rm.full && /^Sending/.test(rm.full) && near(rm.w, rm.want, 1), JSON.stringify(rm));
  if (k2) await leaveDesk(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  L.done(8);
});

/* ───────────────────────── L1 · no overflow ───────────────────────── */
test("TD52 L1 — no horizontal overflow at five widths, pinned and not, at rest and mid-journey; the navy row never wraps at 1280", async ({ page }) => {
  const L = new Ledger("L1");
  for (const width of [1920, 1512, 1280, 1180, 1024]) {
    for (const pin of [false, true]) for (const mid of [false, true]) {
      const w = `@${width}${pin ? " pinned" : ""}${mid ? " mid-journey" : ""}`;
      await openTodo(page, { width, height: width >= 1512 ? 900 : 800 });
      await mutate(page, "L1");
      if (pin) { await page.keyboard.press("f"); await page.waitForTimeout(800); }
      if (mid) { const k = await startOn(page, "partial_requested") ?? await startOn(page, "full_requested"); if (!k) { L.check(`${w} a journey`, false, ""); continue; } }
      const r = await page.evaluate(() => {
        const { q, sc } = (window as unknown as W).__td5();
        const de = document.documentElement, app = document.querySelector<HTMLElement>(".ws-app");
        const nav = q('[data-td5="nav"]')!;
        const kids = [...nav.children].filter((c) => (c as HTMLElement).getBoundingClientRect().width > 0).map((c) => Math.round((c as HTMLElement).getBoundingClientRect().top + (c as HTMLElement).getBoundingClientRect().height / 2));
        return { doc: [de.scrollWidth, de.clientWidth], sc: [sc.scrollWidth, sc.clientWidth], app: app ? [app.scrollWidth, app.clientWidth] : [0, 0],
          navRows: new Set(kids).size > 1 ? Math.max(...kids) - Math.min(...kids) : 0, navOver: nav.scrollWidth > nav.clientWidth + 0.5,
          chip: (q('[data-td52="pin-day"]') as HTMLElement | null)?.innerText.replace(/\s+/g, " ").trim() ?? null };
      });
      L.check(`${w} the document`, r.doc[0] <= r.doc[1], r.doc.join(" vs "));
      L.check(`${w} the sheet's scroller`, r.sc[0] <= r.sc[1], r.sc.join(" vs "));
      L.check(`${w} the app frame`, r.app[0] <= r.app[1], r.app.join(" vs "));
      L.check(`${w} the navy row on one line`, r.navRows <= 6 && !r.navOver, `${r.navRows}px apart, over ${r.navOver}`);
      /* H.7 — below 1360 the pinned chip is the short form: no weekday, no trailing "due today" beside an overdue figure */
      if (pin && width < 1360) L.check(`${w} the compact day chip ("15 Oct · …")`, !!r.chip && /^\d{1,2} [A-Z][a-z]{2}\b/.test(r.chip), String(r.chip));
      if (mid) await leaveDesk(page);
      if (pin) await page.evaluate(() => { try { localStorage.removeItem("sa.pinList.todo"); } catch { /* */ } });
    }
  }
  L.done(5 * 4 * 4 + 3 * 2);
});
