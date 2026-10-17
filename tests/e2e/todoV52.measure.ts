/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.2 — locks TD52, on the rendered page at 1512 × 900 and 1280 × 800 with the shell, real fonts loaded.
 *
 * ⚠️ A1 COMPARES WITH THE HEADER'S HEIGHT ON THE BUILD BEFORE THIS PACK, captured from that build into
 *    `reports/todo-list-v5-2/header-baseline.json` (`TD52_CAPTURE=1`).
 * ⚠️ EVERY READING STARTS FROM THE ONE VISIBLE v5 ROOT (`window.__td5()`, td5Lib), never `document`.
 */
import { expect, test } from "@playwright/test";
import { doc, setDoc } from "firebase/firestore";
import { harnessDb } from "./harnessDocs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DIR, Ledger, SIZES, flagId, fontsReady, mutate, near, openTodo, readBadge, restoreDocs, snapDocs, type Snap } from "./td52Lib";

test.setTimeout(480_000);
/* ⚠️ a measurement that writes puts the account back in the same run, whatever happened (the house rule) */
const dGuards: Snap[] = [];
test.afterEach(async () => {
  if (dGuards.length) await new Promise((r) => setTimeout(r, 2500));
  while (dGuards.length) { const f = await restoreDocs(dGuards.pop()!); if (f.length) console.log(`[guard] restored docs: ${f.join(", ")}`); }
});
const guardDocs = async (paths: string[]) => { const s = await snapDocs(paths); dGuards.push(s); return s; };

const CAPTURE = process.env.TD52_CAPTURE === "1";
const headerHeight = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const { q } = (window as unknown as { __td5: () => { q: (s: string) => HTMLElement | null } }).__td5();
  const h = q('[data-td5="header"]');
  const row = q('[data-td5="header-row"]');
  const card = q('[data-td5="card"]');
  const b = (e: HTMLElement | null) => (e ? e.getBoundingClientRect().height : null);
  return { header: b(h), row: b(row), card: b(card) };
});

/* ───────────────────────── §0.1 · the header's height before this pack (TD52_CAPTURE=1, base build only) ───────────────────────── */
test("A1 capture · the populated header's height on the base build", async ({ page }) => {
  test.skip(!CAPTURE, "TD52_CAPTURE=1 captures from the base build");
  const out: Record<string, unknown> = { at: new Date().toISOString() };
  for (const vp of SIZES) {
    await openTodo(page, vp);
    const f = await fontsReady(page);
    expect(f.ok, `fonts: ${f.missing.join(", ")}`).toBe(true);
    out[String(vp.width)] = await headerHeight(page);
  }
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/header-baseline.json`, JSON.stringify(out, null, 1));
});

/* ───────────────────────── A1 · the header does not get taller ───────────────────────── */
test("TD52 A1 — the populated header's height equals the base's; the card takes the row's height", async ({ page }) => {
  const L = new Ledger("A1");
  const path = `${DIR}/header-baseline.json`;
  L.check("a baseline from the base build exists", existsSync(path), path);
  const base = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as Record<string, { header: number; row: number }> : {};
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    const f = await fontsReady(page);
    L.check(`${w} real fonts loaded`, f.ok, f.missing.join(", ") || "all");
    await mutate(page, "A1");
    await page.waitForTimeout(300);
    const h = await headerHeight(page);
    const b = base[String(vp.width)];
    L.check(`${w} the header is the base's height (±1)`, !!b && near(h.header, b.header, 1), `${h.header?.toFixed(1)} vs ${b?.header?.toFixed(1)}`);
    L.check(`${w} the card is the calendar`, await page.evaluate(() => !!(window as unknown as { __td5: () => { q: (s: string) => HTMLElement | null } }).__td5().q('[data-td5="card"][data-td52="cal"]')), "");
    L.check(`${w} the card's box is the header row's height (±1)`, near(h.card, h.row ?? -1, 1), `${h.card?.toFixed(1)} vs ${h.row?.toFixed(1)}`);
  }
  L.done(7);
});

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
test("TD52 A2 — nothing inside the calendar card clips, at five widths, on three days", async ({ page }) => {
  const L = new Ledger("A2");
  const widths = [1600, 1512, 1440, 1366, 1280];
  for (const width of widths) {
    await openTodo(page, { width, height: width === 1280 ? 800 : 900 });
    const f = await fontsReady(page);
    L.check(`@${width} real fonts loaded`, f.ok, f.missing.join(", ") || "all");
    await mutate(page, "A2");
    const cells = await readCells(page);
    const t = todayYmd();
    const past = cells.find((c) => c.ymd < t && /\bopen\b/.test(c.cls));
    const fut = cells.find((c) => c.ymd > t && c.dots.some((d) => !/faint/.test(d.cls)));
    const days = [t, past?.ymd, fut?.ymd].filter(Boolean) as string[];
    L.check(`@${width} three days to read (today, a past open day, a future day)`, days.length === 3, days.join(" "));
    for (const ymd of days) {
      if (ymd !== t) await pickDay(page, ymd); else await goToday(page);
      await page.waitForTimeout(350);
      const r = await page.evaluate(() => {
        const { q } = (window as unknown as W).__td5();
        const card = q('[data-td52="cal"]')!;
        const cb = card.getBoundingClientRect();
        const bad: string[] = [];
        let texts = 0;
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent?.trim()) continue;
          const el = n.parentElement!;
          if (getComputedStyle(el).visibility === "hidden" || el.closest('[aria-hidden="true"]') && el.getBoundingClientRect().width === 0) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          const rs = [...rg.getClientRects()].filter((x) => x.width > 0);
          if (!rs.length) continue;
          texts++;
          const cell = (el.closest('button, [role="gridcell"]') as HTMLElement) ?? card;
          const xb = cell.getBoundingClientRect();
          for (const x of rs) {
            for (const [nm, b] of [["card", cb], ["cell", xb]] as const) {
              if (x.left < b.left - 0.5 || x.right > b.right + 0.5 || x.top < b.top - 0.5 || x.bottom > b.bottom + 0.5) bad.push(`"${n.textContent.trim().slice(0, 24)}" outside its ${nm} (${x.left.toFixed(1)}–${x.right.toFixed(1)} × ${x.top.toFixed(1)}–${x.bottom.toFixed(1)} vs ${b.left.toFixed(1)}–${b.right.toFixed(1)} × ${b.top.toFixed(1)}–${b.bottom.toFixed(1)})`);
            }
          }
        }
        const els = [card, ...card.querySelectorAll<HTMLElement>("*")];
        for (const e of els) {
          const cs = getComputedStyle(e);
          if (cs.display === "inline" || cs.display === "none" || e.clientHeight === 0) continue;
          if (e.scrollWidth > e.clientWidth + 0.5) bad.push(`${e.className || e.tagName} scrollWidth ${e.scrollWidth} > ${e.clientWidth}`);
          if (e.scrollHeight > e.clientHeight + 0.5) bad.push(`${e.className || e.tagName} scrollHeight ${e.scrollHeight} > ${e.clientHeight}`);
          if (cs.textOverflow === "ellipsis" && cs.overflow !== "visible") bad.push(`${e.className} has text-overflow: ellipsis`);
        }
        return { texts, bad };
      });
      L.check(`@${width} ${ymd}: text nodes read`, r.texts > 20, String(r.texts));
      L.check(`@${width} ${ymd}: nothing clips`, r.bad.length === 0, r.bad.slice(0, 4).join(" · "));
    }
  }
  L.done(5 * 8);
});

/* ───────────────────────── A3 · the today panel ───────────────────────── */
test("TD52 A3 — the four parts are the tray; the bar is in proportion; Overdue filters without scrolling", async ({ page }) => {
  const L = new Ledger("A3");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    const badge = await readBadge(page);
    const r = await page.evaluate(() => {
      const { q, qa } = (window as unknown as W).__td5();
      const num = (f: string) => Number(q(`[data-td52="cal-row"][data-f="${f}"] b`)?.textContent ?? NaN);
      const u = Number((q('[data-td52="mix"] .td52-tx')?.textContent ?? "").match(/\+(\d+)/)?.[1] ?? NaN);
      const bar = q(".td52-bar")!;
      const segs = qa('[data-td52="mix-seg"]').map((s) => ({ k: s.dataset.k!, w: s.getBoundingClientRect().width }));
      const gaps = parseFloat(getComputedStyle(bar).columnGap || "0") * Math.max(0, segs.length - 1);
      return { o: num("overdue"), t: num("today"), l: num("later"), u, rows: qa('[data-td5="row"]').length, barW: bar.getBoundingClientRect().width - gaps, segs,
        title: q('[data-td52="mix"]')?.getAttribute("title") };
    });
    const sum = r.o + r.t + r.l + r.u;
    L.check(`${w} overdue + today + later + no date = the tray`, sum === r.rows, `${r.o}+${r.t}+${r.l}+${r.u} = ${sum} vs ${r.rows} rows`);
    L.check(`${w} … = the sidebar badge`, sum === badge, `${sum} vs ${badge}`);
    L.check(`${w} the bar's title`, r.title === "Your whole tray: overdue, due today, coming up, no date", String(r.title));
    const want: Record<string, number> = { o: r.o, t: r.t, l: r.l, u: r.u };
    for (const s of r.segs) L.check(`${w} segment ${s.k} ∝ its count (±2px)`, near(s.w, (r.barW * want[s.k]) / sum, 2), `${s.w.toFixed(1)} vs ${((r.barW * want[s.k]) / sum).toFixed(1)}`);
    L.check(`${w} there are overdue items to press`, r.o > 0, String(r.o));
    const top0 = await page.evaluate(() => (window as unknown as W).__td5().sc.scrollTop);
    await page.evaluate(() => ((window as unknown as W).__td5().q('[data-td52="cal-row"][data-f="overdue"]') as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    const p = await page.evaluate((today) => {
      const { q, qa, sc } = (window as unknown as W).__td5();
      const rows = qa('[data-td5="row"]').filter((e) => e.getBoundingClientRect().height > 0 && !e.hasAttribute("data-out"));
      const others = qa('[data-td52="cal-row"]:not(.z), [data-td52="mix"]').filter((e) => e.dataset.f !== "overdue");
      return {
        n: rows.length, allOverdue: rows.every((e) => !!e.dataset.calYmd && e.dataset.calYmd < today),
        pressed: q('[data-td52="cal-row"][data-f="overdue"]')?.getAttribute("aria-pressed"),
        fades: others.map((e) => Number(getComputedStyle(e).opacity)),
        chip: q('[data-td52="due-chip"]')?.textContent?.trim() ?? null, top: sc.scrollTop,
      };
    }, todayYmd());
    L.check(`${w} Overdue leaves only overdue rows`, p.allOverdue && p.n === r.o, `${p.n} rows, all overdue ${p.allOverdue}`);
    L.check(`${w} Overdue is pressed`, p.pressed === "true", String(p.pressed));
    L.check(`${w} the other rows fade to 0.32 (±0.02)`, p.fades.length > 0 && p.fades.every((o) => near(o, 0.32, 0.02)), p.fades.join(","));
    L.check(`${w} the Due pill shows the chip`, p.chip === "Overdue", String(p.chip));
    L.check(`${w} nothing scrolled`, near(p.top, top0, 0.5), `${p.top} vs ${top0}`);
    await page.evaluate(() => ((window as unknown as W).__td5().q('[data-td52="due-chip"] .td5-fpx') as HTMLButtonElement).click());
    await page.waitForTimeout(400);
    const c = await page.evaluate(() => { const { q, qa } = (window as unknown as W).__td5(); return { n: qa('[data-td5="row"]').length, chip: !!q('[data-td52="due-chip"]'), pressed: q('[data-td52="cal-row"][data-f="overdue"]')?.getAttribute("aria-pressed") }; });
    L.check(`${w} × clears it`, c.n === r.rows && !c.chip && c.pressed === "false", JSON.stringify(c));
  }
  L.done(2 * 12);
});

/* ───────────────────────── A4 · another day ───────────────────────── */
test("TD52 A4 — a future day lists its kinds; a past open day reads STILL OPEN in rust; a clear day; the foot returns", async ({ page }) => {
  const L = new Ledger("A4");
  const RUST = "rgb(162, 69, 42)";
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    const t = todayYmd();
    const cells = await readCells(page);
    const fut = cells.filter((c) => c.ymd > t && c.dots.some((d) => !/faint/.test(d.cls)));
    const past = cells.find((c) => c.ymd < t && /\bopen\b/.test(c.cls));
    const clear = cells.find((c) => c.ymd > t && !c.dots.length);
    L.check(`${w} the harness has future days with items`, fut.length > 0, String(fut.length));
    for (const day of fut) {
      await pickDay(page, day.ymd);
      await page.waitForTimeout(300);
      const want = labelKinds(day.label);
      const d = await page.evaluate(() => {
        const { q, qa } = (window as unknown as W).__td5();
        return { lab: q('[data-td52="day-lab"]')?.textContent, rows: qa('[data-td52="cal-row"]').filter((e) => e.dataset.f?.startsWith("day:")).map((e) => ({ k: e.dataset.f!.slice(4), n: Number(e.querySelector("b")!.textContent), sw: e.querySelector(".td52-sw")!.className })) };
      });
      L.check(`${w} ${day.ymd} reads DUE THIS DAY`, d.lab === "DUE THIS DAY", String(d.lab));
      L.check(`${w} ${day.ymd} one row per kind, each with that day's count`, JSON.stringify(Object.fromEntries(d.rows.map((x) => [x.k, x.n]))) === JSON.stringify(want), `${JSON.stringify(d.rows.map((x) => [x.k, x.n]))} vs ${JSON.stringify(want)}`);
      const dotCls = Object.fromEntries(day.dots.map((x) => [x.kind, x.cls.split(" ")[0]]));
      L.check(`${w} ${day.ymd} swatches match the month's dots`, d.rows.every((x) => x.sw.split(" ").includes(dotCls[x.k])), JSON.stringify(d.rows.map((x) => x.sw)));
    }
    L.check(`${w} the harness has a past day still open`, !!past, "");
    if (past) {
      await pickDay(page, past.ymd);
      await page.waitForTimeout(300);
      const d = await page.evaluate(() => { const { q } = (window as unknown as W).__td5(); return { lab: q('[data-td52="day-lab"]')?.textContent, ey: q('[data-td52="day-ey"]')?.textContent }; });
      L.check(`${w} ${past.ymd} reads STILL OPEN · d DAYS LATE`, /^STILL OPEN( · \d+ DAYS LATE)?$/.test(d.lab ?? ""), String(d.lab));
      L.check(`${w} ${past.ymd} eyebrow "d DAYS AGO"`, /^— \d+ DAYS? AGO —$/.test(d.ey ?? ""), String(d.ey));
      const again = (await readCells(page)).find((c) => c.ymd === past.ymd)!;
      L.check(`${w} its number is rust on the grid`, /\bsel\b/.test(again.cls) || again.numColour === RUST, again.numColour);
      L.check(`${w} its number is rust before it is selected`, past.numColour === RUST, past.numColour);
    }
    L.check(`${w} the harness has a clear future day`, !!clear, "");
    if (clear) {
      await pickDay(page, clear.ymd);
      await page.waitForTimeout(300);
      const note = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td52="day-note"]')?.textContent);
      L.check(`${w} a clear day reads "A clear day."`, note === "A clear day.", String(note));
    }
    await goToday(page);
    await page.waitForTimeout(300);
    const ey = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td52="day-ey"]')?.textContent);
    L.check(`${w} the foot returns to today`, ey === "— TODAY —", String(ey));
  }
  L.done(2 * 10);
});

/* ───────────────────────── A5 · dots ───────────────────────── */
test("TD52 A5 — one dot per kind present, in its colour; a snooze faint; nothing for housekeeping or the offer", async ({ page }) => {
  const L = new Ledger("A5");
  const COL: Record<string, string> = { send: "rgb(162, 69, 42)", nudge: "rgb(28, 19, 15)", close: "rgba(28, 19, 15, 0.38)" };
  /* the harness holds no live snooze of a calendar kind, so one nudge is set aside until three days from now, and put
     back after (the guard) */
  await openTodo(page, SIZES[0]);
  const qid = await page.evaluate(() => (window as unknown as W).__td5().q('[data-td5="row"][data-task-type="nudge_overdue"]')?.dataset.query ?? null);
  L.check("a nudge to set aside", !!qid, String(qid));
  const { db, uid } = await harnessDb();
  const fp = `taskFlags/${flagId("nudge_overdue", qid ?? "")}`;
  await guardDocs([fp]);
  const until = new Date(Date.now() + 3 * 86_400_000); until.setUTCHours(9, 0, 0, 0);
  const snzYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(until);
  await setDoc(doc(db, "users", uid, "taskFlags", flagId("nudge_overdue", qid ?? "")), { id: flagId("nudge_overdue", qid ?? ""), userId: uid, taskType: "nudge_overdue", queryId: qid, snoozedUntil: until.toISOString(), snoozeCount: 1 });
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    await goToday(page);
    await page.evaluate(() => { const { qa } = (window as unknown as W).__td5(); const sel = qa('[data-td52="day-cell"].sel'); void sel; });
    const cells = (await readCells(page)).filter((c) => !/\bsel\b/.test(c.cls));
    const withDots = cells.filter((c) => c.dots.length);
    L.check(`${w} days with dots to read`, withDots.length >= 3, String(withDots.length));
    let faint = 0;
    for (const c of withDots) {
      const kinds = c.dots.map((d) => d.kind);
      const label = labelKinds(c.label);
      const back = (c.label.match(/(\d+) ([^,]*?) back from Set aside/g) ?? []).map((s) => /own task/.test(s) ? "mine" : /nudge/i.test(s) ? "nudge" : /clos/i.test(s) ? "close" : "send");
      const want = [...new Set([...Object.keys(label), ...back])].sort();
      L.check(`${w} ${c.ymd} dots = kinds present`, kinds.length === new Set(kinds).size && JSON.stringify([...kinds].sort()) === JSON.stringify(want), `${kinds} vs ${want}`);
      for (const d of c.dots) {
        L.check(`${w} ${c.ymd} ${d.kind} is a calendar kind`, ["send", "nudge", "close", "mine"].includes(d.kind), d.kind);
        if (d.kind === "mine") L.check(`${w} ${c.ymd} own task is a ring`, /inset/.test(d.sh) && d.bg === "rgba(0, 0, 0, 0)", `${d.bg} ${d.sh}`);
        else L.check(`${w} ${c.ymd} ${d.kind} in its colour`, d.bg === COL[d.kind], d.bg);
        if (/faint/.test(d.cls)) { faint++; L.check(`${w} ${c.ymd} snoozed ${d.kind} at 0.45`, near(d.op, 0.45, 0.02), String(d.op)); }
        else L.check(`${w} ${c.ymd} ${d.kind} full strength`, near(d.op, 1, 0.01), String(d.op));
      }
    }
    L.check(`${w} a snoozed dot was read`, faint > 0, String(faint));
    L.check(`${w} the seeded snooze is faint on ${snzYmd}`, cells.find((c) => c.ymd === snzYmd)?.dots.some((d) => d.kind === "nudge" && /faint/.test(d.cls)) ?? false, JSON.stringify(cells.find((c) => c.ymd === snzYmd)?.dots));
  }
  L.done(2 * 7);
});
