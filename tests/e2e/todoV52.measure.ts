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
import { DIR, LIB as LIB_TD5, Ledger, SIZES, flagId, fontsReady, mutate, near, openTodo, readBadge, restoreDocs, snapDocs, type Snap } from "./td52Lib";

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

/* ───────────────────────── C1 · the slide-out calendar ───────────────────────── */
test("TD52 C1 — ⤢ opens the drawer; kind filters hide chips; Month and Week agree; Open on the desk selects and starts nothing; no writes", async ({ page }) => {
  const L = new Ledger("C1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    const writes: string[] = [];
    const onReq = (r: import("@playwright/test").Request) => { if (/google\.firestore\.v1\.Firestore\/(Write|Commit)/.test(r.url()) || (r.method() === "POST" && /:commit|:batchWrite/.test(r.url()))) writes.push(r.url()); };
    page.on("request", onReq);
    await page.evaluate(() => ((window as unknown as W).__td5().q('[data-td52="open-drawer"]') as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    const dr = page.locator('[data-td52="drawer"]');
    const box = await dr.evaluate((e) => { const b = e.getBoundingClientRect(); return { on: e.classList.contains("on"), top: b.top, right: innerWidth - b.right, bottom: innerHeight - b.bottom, w: b.width, r: getComputedStyle(e).borderTopLeftRadius }; });
    L.check(`${w} ⤢ opens the drawer`, box.on, "");
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
test("TD52 D1 — one drawing per group; none in the desk head; each stands 3px above its band's floor, centred at 31; the strip never paints over one", async ({ page }) => {
  const L = new Ledger("D1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await openTodo(page, vp);
    await fontsReady(page);
    await mutate(page, "D1");
    await mutate(page, "D1b");
    const r = await page.evaluate(() => {
      const { r: root, qa, q } = (window as unknown as W).__td5();
      const wide = !!document.querySelector(".ws-app.sheet-wide");
      const bandH = q('[data-td5="band"]')!.getBoundingClientRect().height;
      /* rendered on the page (a band below the fold still counts: its copy is on the page, not on the screen yet) */
      const vis = (e: Element) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const imgs = [...root.querySelectorAll("img")].filter(vis).map((i) => i.getAttribute("src"));
      const head = q('[data-td5="desk-head"]');
      const bands = qa('[data-td5="group-block"]').map((g) => {
        const band = g.querySelector('[data-td5="band"]')!, img = band.querySelector("img")!;
        const bb = band.getBoundingClientRect(), ib = img.getBoundingClientRect();
        img.style.pointerEvents = "auto";
        const hit = ib.top >= 0 ? document.elementFromPoint(ib.left + ib.width / 2, ib.top + 2) : null;
        img.style.pointerEvents = "";
        return { g: g.dataset.g!, src: img.getAttribute("src"), w: ib.width, cx: ib.left + ib.width / 2 - bb.left, foot: bb.bottom - ib.bottom, top: ib.top - bb.top, hitImg: hit === img, onScreen: ib.top >= 0 && ib.bottom <= innerHeight, hit: hit ? (hit.className || hit.tagName) : null };
      });
      return { wide, bandH, imgs, headImgs: head ? head.querySelectorAll("img").length : -1, bands };
    });
    const k = r.wide ? 1 : 44 / 50;
    L.check(`${w} the desk head has no drawing`, r.headImgs === 0, String(r.headImgs));
    L.check(`${w} groups to read`, r.bands.length >= 3, String(r.bands.length));
    for (const b of r.bands) {
      L.check(`${w} ${b.g}: one copy of its drawing on the page`, r.imgs.filter((x) => x === b.src).length === 1, String(r.imgs.filter((x) => x === b.src).length));
      L.check(`${w} ${b.g}: width ${ART_W[b.g]} × ${k.toFixed(2)} (±1)`, near(b.w, ART_W[b.g] * k, 1), b.w.toFixed(1));
      L.check(`${w} ${b.g}: centred at 31 (±1)`, near(b.cx, 31, 1), b.cx.toFixed(1));
      L.check(`${w} ${b.g}: foot 3 above the floor (±1)`, near(b.foot, 3, 1), `${b.foot.toFixed(1)} (top ${b.top.toFixed(1)}, band ${r.bandH})`);
      if (b.onScreen) L.check(`${w} ${b.g}: nothing paints over its top edge`, b.hitImg, String(b.hit));
    }
    /* stuck: scroll until a band sits under the strip, so its drawing crosses the strip's lower edge */
    const stuck = await page.evaluate(async () => {
      const { q, qa } = (window as unknown as W).__td5();
      const strip = q(".td5-strip")!;
      /* the tray scrolls itself (its strip and bands stick inside `.td5-tray`), not the page */
      const tray = q(".td5-tray")!;
      const bands = qa('[data-td5="band"]');
      const second = bands[1] ?? bands[0];
      tray.scrollTop += second.getBoundingClientRect().top - strip.getBoundingClientRect().bottom + 40;
      await new Promise((r) => setTimeout(r, 300));
      const sb = strip.getBoundingClientRect();
      const band = qa('[data-td5="band"]').find((b) => Math.abs(b.getBoundingClientRect().top - sb.bottom) < 2);
      if (!band) return { found: false, crosses: false, hit: null as string | null, hitImg: false };
      const img = band.querySelector("img")!, ib = img.getBoundingClientRect();
      img.style.pointerEvents = "auto";
      const y = Math.max(ib.top + 2, sb.top + 1);
      const hit = document.elementFromPoint(ib.left + ib.width / 2, y);
      img.style.pointerEvents = "";
      return { found: true, crosses: ib.top < sb.bottom - 1, hit: hit ? (hit.className || hit.tagName) : null, hitImg: hit === img };
    });
    L.check(`${w} a band stuck under the strip`, stuck.found && stuck.crosses, JSON.stringify(stuck));
    L.check(`${w} its drawing crosses the strip cleanly (on top of it)`, stuck.hitImg, String(stuck.hit));
  }
  L.done(2 * 14);
});

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
      L.check(`${w} Find is back in the filter row`, !b.findInNav && b.header !== "none", JSON.stringify({ nav: b.findInNav, hd: b.header }));
      /* F stands down while typing, and while the compose card, the set-aside popover or the calendar drawer is open */
      const input = page.locator('[data-todo-v5] [data-td5="find"] input').first();
      await input.click(); await page.keyboard.type("f"); await page.waitForTimeout(400);
      L.check(`${w} F in Find types, and does not pin`, (await pinState(page)).pressed === "false" && (await input.inputValue()) === "f", await input.inputValue());
      await input.fill(""); await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      for (const [name, open, shut] of [
        ["the compose card", async () => { await page.keyboard.press("n"); }, async () => { await page.keyboard.press("Escape"); }],
        ["the set-aside popover", async () => { await page.keyboard.press("s"); }, async () => { await page.keyboard.press("Escape"); }],
        ["the calendar drawer", async () => { await page.evaluate(() => ((window as unknown as W).__td5().q('[data-td52="open-drawer"]') as HTMLButtonElement).click()); }, async () => { await page.keyboard.press("Escape"); }],
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
