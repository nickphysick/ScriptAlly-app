/**
 * Query card v158.1 — the footer on two rows when there is more than one action (design-refs/query-card-v158-1/), and
 * the last note's actions above the writing box. Measured on the emulator harness at 1512 × 982 and 1280 × 800.
 *
 *   SA_PHASE=before  Step 0.5/0.6: the footer's boxes for a one-, two- and three-action query, to
 *                    reports/query-card-v158-1/baseline-*.json, and the spill reproduced. The locks run too, and are red.
 *   SA_PHASE=mutant  the mutation build: every lock must read red (its shots and ledgers are its own).
 *   (default)        QC1581-1 … QC1581-10, each a ledger in reports/query-card-v158-1/ledger/.
 *
 * ⚠️ THE CARD LEANS: every box is a layout box (offsetLeft/Top/Width/Height against the footer's own), never a bounding
 *    rect, which a rotation skews.
 * ⚠️ THE TWO-ACTION FIXTURE IS SEEDED: the harness has no offer in its deciding phase; `seedQc158.mjs --deciding` sets
 *    `tellLater` on seed-query-12's offer step and `--undeciding` removes it, in the same run.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";

const PAGE = ".qc151.qc153";
const PHASE = process.env.SA_PHASE === "before" ? "before" : process.env.SA_PHASE === "mutant" ? "mutant" : "after";
const DIR = "reports/query-card-v158-1";
const SHOTS = "design-refs/query-card-v158-1/screens";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
const TABS = ["tracking", "agent", "materials", "notes"] as const;
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
const ONE = ["qc150l9-q", "seed-query-7"], THREE = ["seed-cal-near-q", "seed-query-2", "seed-query-10"], TWO = "seed-query-12";
const LONG = "Reply was due 11 Apr 2024 · quiet for 135 weeks";
test.setTimeout(600_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });
const seed = (a: string) => execSync(`node tests/e2e/seedQc158.mjs ${a}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").pop()!;

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}

async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => {
    try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); } catch { /* private */ }
  });
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await b.click();
  await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.mouse.move(2, 2);
}
async function openCard(page: Page, id: string): Promise<boolean> {
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`);
  if (!(await c.count())) return false;
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  await page.locator(`${CARD}[data-id='${id}']`).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  return true;
}
async function closeCard(page: Page) {
  const x = page.locator(C("[data-qc149c='close']")).filter({ visible: true }).first();
  if (await x.count()) await x.click({ timeout: 8_000 }); else await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}
async function tab(page: Page, t: (typeof TABS)[number]) { await page.locator(C(`[data-qc152='tab'][data-tab='${t}']`)).first().click(); await page.waitForTimeout(450); }
async function shotFoot(page: Page, path: string) {
  const b = await page.locator(CARD).first().boundingBox();
  if (b) await page.screenshot({ path, clip: { x: Math.max(0, b.x - 8), y: Math.max(0, b.y + b.height - 260), width: b.width + 16, height: 268 }, animations: "disabled", timeout: 20_000 });
}

type Box = [number, number, number, number];
interface Part { role: string; act: string; label: string; box: Box; cut: boolean }
interface Foot { n: number; rows: string; outer: Box; pill: Box | null; text: Box; lead: Box; sub: Box; subLines: number; parts: Part[]; lines: { box: Box; in: Box; clipped: boolean }[]; cardH: number }
/** the footer, in layout boxes relative to the footer's own (the card leans) */
const readFoot = (page: Page, longSub = false): Promise<Foot> => page.evaluate(([sel, long, LONGS]) => {
  const card = document.querySelector<HTMLElement>(sel as string)!;
  const f = card.querySelector<HTMLElement>("[data-qc152='reply']")!;
  if (long) { const s = f.querySelector<HTMLElement>("[data-qc152='reply-sub']"); if (s) s.textContent = LONGS as string; }
  /* the offset of `e` inside `f`, walking offsetParents (both are inside the card) */
  const off = (e: HTMLElement): [number, number] => {
    let x = 0, y = 0, n: HTMLElement | null = e;
    while (n && n !== f) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; if (n && !f.contains(n) && n !== f) break; }
    if (n !== f) { const fo = ((): [number, number] => { let a = 0, b = 0, m: HTMLElement | null = f; while (m && m !== n) { a += m.offsetLeft; b += m.offsetTop; m = m.offsetParent as HTMLElement | null; } return [a, b]; })(); x -= fo[0]; y -= fo[1]; }
    return [x, y];
  };
  const bx = (e: HTMLElement | null): [number, number, number, number] | null => { if (!e) return null; const [x, y] = off(e); return [+x.toFixed(1), +y.toFixed(1), e.offsetWidth, e.offsetHeight]; };
  const pill = f.querySelector<HTMLElement>(".qc152-rf");
  const text = f.querySelector<HTMLElement>(".qc152-rft")!;
  const lead = f.querySelector<HTMLElement>("[data-qc152='reply-lead']")!, sub = f.querySelector<HTMLElement>("[data-qc152='reply-sub']")!;
  const lh = parseFloat(getComputedStyle(sub).lineHeight) || 18;
  const parts = [...f.querySelectorAll<HTMLElement>("[data-qc152='reply-btn'], [data-qc152='reply-second'], [data-qc1522='foot-link'], [data-qc1522='foot-replied']")].map((e) => ({
    role: e.dataset.qc152 ?? e.dataset.qc1522 ?? "", act: e.dataset.act ?? "", label: (e.textContent ?? "").trim(), box: bx(e)!, cut: e.scrollWidth > e.clientWidth + 1,
  }));
  /* every text line, and the box it must lie inside */
  const container = pill ?? f;
  const lines = [lead, sub, ...parts.map((p) => f.querySelector<HTMLElement>(`[data-act='${p.act}']`)!)].filter(Boolean).map((e) => {
    const c = e === lead || e === sub ? container : f;
    const cs = getComputedStyle(e);
    return { box: bx(e)!, in: bx(c)!, clipped: (cs.overflow === "hidden" || cs.textOverflow === "ellipsis") && e.scrollWidth > e.clientWidth + 1 };
  });
  return { n: parts.length, rows: f.dataset.rows ?? "1", outer: bx(f)!, pill: bx(pill), text: bx(text)!, lead: bx(lead)!, sub: bx(sub)!, subLines: Math.round(sub.offsetHeight / lh),
    parts, lines, cardH: card.closest<HTMLElement>(".spanel")!.offsetHeight };
}, [CARD, longSub, LONG] as const);
const inside = (a: Box, b: Box) => a[0] >= b[0] - 0.5 && a[1] >= b[1] - 0.5 && a[0] + a[2] <= b[0] + b[2] + 0.5 && a[1] + a[3] <= b[1] + b[3] + 0.5;

/** the fixture's queries by footer action count (proved, not assumed) */
async function byCount(page: Page): Promise<Record<1 | 2 | 3, string | null>> {
  const out: Record<1 | 2 | 3, string | null> = { 1: null, 2: null, 3: null };
  for (const id of [...ONE, ...THREE, TWO]) {
    if (!(await openCard(page, id))) continue;
    const n = (await readFoot(page)).n as 1 | 2 | 3;
    if (n >= 1 && n <= 3 && !out[n]) out[n] = id;
    await closeCard(page);
  }
  return out;
}

test.describe("Query card v158.1", () => {
  test.beforeAll(() => { seed("--clean"); seed(`--deciding ${TWO}`); });
  test.afterAll(() => { seed(`--undeciding ${TWO}`); seed("--clean"); });

  for (const vp of SIZES) {
    const w = `${vp.width}`;

    test(`Step 0.5/0.6 — the footer's boxes for one, two and three actions; the spill — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const ids = await byCount(page);
      const L = new Ledger(`fixture-${w}`);
      for (const n of [1, 2, 3] as const) L.check(`a query whose footer has ${n} action${n > 1 ? "s" : ""}`, !!ids[n], ids[n] ?? "none");
      const out: Record<string, Foot> = {};
      for (const n of [1, 2, 3] as const) {
        if (!ids[n]) continue;
        await openCard(page, ids[n]!);
        out[n] = await readFoot(page);
        await shotFoot(page, `${SHOTS}/${PHASE}-${w}-${n}-tracking.png`);
        await tab(page, "notes");
        await shotFoot(page, `${SHOTS}/${PHASE}-${w}-${n}-notes.png`);
        if (n === 3) {
          const long = await readFoot(page, true);
          out.long = long;
          await shotFoot(page, `${SHOTS}/${PHASE}-${w}-3-long.png`);
          L.check(`Step 0.6 · the spill: with "${LONG}" the text block is ${long.text[3]}px against the pill's ${long.pill?.[3] ?? "—"}px`, true, JSON.stringify({ text: long.text, pill: long.pill }));
        }
        await closeCard(page);
      }
      writeFileSync(`${DIR}/${PHASE}-foot-${w}.json`, JSON.stringify({ ids, out }, null, 1));
      if (PHASE === "before") writeFileSync(`${DIR}/baseline-${w}.json`, JSON.stringify({ ids, out }, null, 1));
      L.done(3);
    });

    test(`QC1581-1 nothing spills · -2 rows · -3 places · -5 status width · -9 one row unchanged — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const ids = await byCount(page);
      const L1 = new Ledger(`QC1581-1-${w}`), L2 = new Ledger(`QC1581-2-${w}`), L3 = new Ledger(`QC1581-3-${w}`), L5 = new Ledger(`QC1581-5-${w}`), L9 = new Ledger(`QC1581-9-${w}`);
      const base = existsSync(`${DIR}/baseline-${w}.json`) ? JSON.parse(readFileSync(`${DIR}/baseline-${w}.json`, "utf8")) as { out: Record<string, Foot> } : null;
      const seen = new Set<number>();
      for (const n of [1, 2, 3] as const) {
        if (!ids[n]) { L1.check(`a ${n}-action footer in the fixture`, false, "none"); continue; }
        await openCard(page, ids[n]!);
        for (const long of [false, true]) {
          const f = await readFoot(page, long);
          seen.add(f.n);
          const tag = `${n} action${n > 1 ? "s" : ""}${long ? " (long sub)" : ""}`;
          L1.check(`${tag}: every text line lies inside its box, nothing clipped`, f.lines.every((l) => inside(l.box, l.in) && !l.clipped), JSON.stringify(f.lines.filter((l) => !inside(l.box, l.in) || l.clipped)));
          if (long) continue;
          /* rows: one row → every part's vertical centre within the status's span; two rows → status above all actions, actions on one line */
          if (n === 1) {
            const mid = (b: Box) => b[1] + b[3] / 2, st = f.pill ?? f.text;
            L2.check(`${tag}: all on one line`, f.parts.every((p) => Math.abs(mid(p.box) - mid(st)) <= 2), JSON.stringify(f.parts.map((p) => p.box)));
            if (base?.out[1]) {
              const b = base.out[1];
              const eq = (a: Box | null, z: Box | null) => !!a && !!z && a.every((v, i) => Math.abs(v - z[i]) <= 1);
              L9.check(`one action, text that fits: footer, pill, text and button equal the baseline`, eq(f.outer, b.outer) && eq(f.pill, b.pill) && eq(f.text, b.text) && f.parts.every((p, i) => eq(p.box, b.parts[i]?.box ?? null)), JSON.stringify({ f: [f.outer, f.pill, f.text], b: [b.outer, b.pill, b.text] }));
            }
          } else {
            const statusBottom = f.text[1] + f.text[3];
            L2.check(`${tag}: the status is above every action`, f.parts.every((p) => p.box[1] >= statusBottom - 0.5), JSON.stringify({ statusBottom, parts: f.parts.map((p) => p.box) }));
            const mids = f.parts.map((p) => p.box[1] + p.box[3] / 2);
            L2.check(`${tag}: the actions share one line`, Math.max(...mids) - Math.min(...mids) <= 2, mids.join(","));
            const order = [...f.parts].sort((a, b) => a.box[0] - b.box[0]).map((p) => p.role);
            const want = n === 3 ? ["foot-replied", "foot-link", "reply-btn"] : null;
            if (want) L3.check(`${tag}: left to right — the replied link, the outlined link action, the navy primary`, order.join(",") === want.join(","), order.join(","));
            if (n === 2) L3.check(`${tag}: the outlined button then the primary, and no link`, order.length === 2 && order[order.length - 1] === "reply-btn" && !order.includes("foot-replied"), order.join(","));
            const prim = f.parts.find((p) => p.role === "reply-btn")!;
            L3.check(`${tag}: the primary's right edge is 14px from the footer's`, Math.abs(f.outer[2] - (prim.box[0] + prim.box[2]) - 14) <= 1, String(f.outer[2] - (prim.box[0] + prim.box[2])));
            const sec = f.parts.find((p) => p.role === "foot-link" || p.role === "reply-second");
            if (sec) L3.check(`${tag}: the secondary is an outlined button, 46px`, sec.box[3] === 46, String(sec.box[3]));
          }
        }
        if (n === 3) {
          const f = await readFoot(page, true);
          L5.check(`three actions: the status text block is at least ${vp.width === 1512 ? 400 : 360}px wide`, f.text[2] >= (vp.width === 1512 ? 400 : 360), String(f.text[2]));
          L5.check(`three actions: "${LONG}" is one line`, f.subLines === 1, String(f.subLines));
        }
        await closeCard(page);
      }
      L1.check("checked one-, two- and three-action footers", [1, 2, 3].every((n) => seen.has(n)), [...seen].join(","));
      L1.done(7); L2.done(5); L3.done(6); L5.done(2); if (base) L9.done(1);
    });

    test(`QC1581-4 no wrap at 504 · QC1581-6 card holds · QC1581-7 actions work — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const ids = await byCount(page);
      const L4 = new Ledger(`QC1581-4-${w}`), L6 = new Ledger(`QC1581-6-${w}`), L7 = new Ledger(`QC1581-7-${w}`);
      L4.check("a three-action query in the fixture", !!ids[3], ids[3] ?? "none");
      if (ids[3]) {
        await openCard(page, ids[3]);
        await page.evaluate((sel) => { document.querySelector<HTMLElement>(sel)!.closest<HTMLElement>(".spanel")!.style.width = "504px"; }, CARD);
        await page.waitForTimeout(200);
        const f = await readFoot(page);
        const mids = f.parts.map((p) => p.box[1] + p.box[3] / 2);
        L4.check("at 504px the three actions are one line", Math.max(...mids) - Math.min(...mids) <= 2, mids.join(","));
        L4.check("no label is cut", f.parts.every((p) => !p.cut), JSON.stringify(f.parts.filter((p) => p.cut).map((p) => p.label)));
        L4.check("the row stays inside the footer (nothing pushed past its edge)", f.parts.every((p) => p.box[0] >= 0 && p.box[0] + p.box[2] <= f.outer[2] + 0.5), JSON.stringify(f.parts.map((p) => p.box)));
        await page.evaluate((sel) => { document.querySelector<HTMLElement>(sel)!.closest<HTMLElement>(".spanel")!.style.width = ""; }, CARD);
        await closeCard(page);
      }
      /* the card holds: one- and three-action cards one height on every tab; the footer one height across one card's tabs */
      const hs: number[] = [];
      for (const n of [1, 3] as const) {
        if (!ids[n]) continue;
        await openCard(page, ids[n]!);
        const fh: number[] = [];
        for (const t of TABS) { await tab(page, t); const f = await readFoot(page); hs.push(f.cardH); fh.push(f.outer[3]); }
        L6.check(`${n} action${n > 1 ? "s" : ""}: the footer is one height across the tabs`, Math.max(...fh) - Math.min(...fh) <= 1, fh.join(" / "));
        await closeCard(page);
      }
      L6.check("one- and three-action cards are one height on every tab", hs.length === 8 && Math.max(...hs) - Math.min(...hs) <= 1, hs.join(" / "));
      /* the actions work: a real mouse click at each action's centre fires its handler (the panel opens that journey) */
      if (ids[3]) {
        for (const role of ["foot-replied", "foot-link", "reply-btn"]) {
          await openCard(page, ids[3]);
          const sel = role === "reply-btn" ? "[data-qc152='reply-btn']" : `[data-qc1522='${role}']`;
          const el = page.locator(C(sel)).first();
          const act = await el.getAttribute("data-act");
          const b = await el.boundingBox();
          const before = await page.evaluate(() => ({ url: location.href, j: document.querySelectorAll("[data-qc152='card'][data-j], .qad-root, [data-qc1522='composer'], [data-step]").length }));
          if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
          await page.waitForTimeout(900);
          const after = await page.evaluate(() => ({ url: location.href, j: document.querySelectorAll("[data-qc152='card'][data-j], .qad-root, [data-qc1522='composer'], [data-step]").length }));
          L7.check(`${role} (${act}): a real click opens its journey`, !!act && (after.j > before.j || after.url !== before.url), `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
          await page.keyboard.press("Escape"); await page.waitForTimeout(400); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
          await page.goto("about:blank"); await openQc(page, vp);
        }
      }
      L4.done(4); L6.done(3); L7.done(3);
    });

    test(`QC1581-8 the last note's actions — ${w}`, async ({ page }) => {
      const L = new Ledger(`QC1581-8-${w}`);
      try {
        seed("--clean"); seed(`--notes seed-query-10 8`);
        await openQc(page, vp);
        await openCard(page, "seed-query-10"); await tab(page, "notes"); await page.waitForTimeout(800);
        await page.evaluate((sel) => { const b = document.querySelector<HTMLElement>(sel)!.querySelector<HTMLElement>("[data-qc152='body']")!; b.scrollTop = b.scrollHeight; }, CARD);
        await page.waitForTimeout(300);
        const last = page.locator(C("[data-qc158='note']")).last();
        const id = await last.getAttribute("data-id");
        L.check("the list holds notes and is scrolled to its end", !!id, id ?? "none");
        await last.hover(); await page.waitForTimeout(250);
        /* Query card v168 — re-pointed: Pin is in the last note's ⋯ menu (which opens above it, clear of the writing box) */
        await last.locator("[data-qc168='more']").click(); await page.waitForTimeout(250);
        const pin = page.locator(C("[data-qc168='note-menu'] [data-act='pin']"));
        const g = await pin.evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { hit: hit === el || el.contains(hit), box: [r.x, r.y, r.width, r.height].map(Math.round) }; });
        L.check("the open Pin link is on top at its centre (not under the writing box)", g.hit, JSON.stringify(g));
        const b = await pin.boundingBox();
        if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(1200);
        const c = JSON.parse(seed("--count")) as { notes: { id: string; pinned: boolean }[] };
        L.check("a real click at its centre pinned the last note", c.notes.some((x) => x.id === id && x.pinned), JSON.stringify(c.notes.filter((x) => x.pinned)));
        await closeCard(page);
      } finally { seed("--clean"); }
      L.done(3);
    });
  }

  test("QC1581-10 hosts — on the To-do desk the card it opens shows the two-row footer; its preview hides the footer", async ({ page }) => {
    const L = new Ledger("QC1581-10");
    await openRoute(page, "/todo", SIZES[0]);
    const PG = '[data-tws="page"]:visible';
    const rows = page.locator(`${PG} [data-tws-row]`);
    let done = false;
    for (let i = 0; i < Math.min(30, await rows.count()) && !done; i++) {
      await rows.nth(i).click(); await page.waitForTimeout(600);
      const pv = page.locator(`${PG} [data-tws="preview"][data-kind="query"]`);
      if (!(await pv.count())) continue;
      /* the preview is a read-only picture: its footer is hidden (todoWs.css), as before v158.1 */
      const hidden = await page.evaluate(() => {
        const card = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)?.querySelector<HTMLElement>('[data-tws="preview-card"] [data-qc152="reply"]');
        return card ? getComputedStyle(card).display === "none" : null;
      });
      await pv.first().click(); await page.waitForTimeout(1200);
      const f = await page.evaluate((sel) => {
        const card = document.querySelector<HTMLElement>(sel); const ft = card?.querySelector<HTMLElement>("[data-qc152='reply']");
        if (!ft) return null;
        const parts = [...ft.querySelectorAll<HTMLElement>("[data-qc152='reply-btn'], [data-qc1522='foot-link'], [data-qc1522='foot-replied']")];
        return { rows: ft.dataset.rows ?? "1", n: parts.length, order: parts.sort((a, b) => a.offsetLeft - b.offsetLeft).map((p) => p.dataset.qc152 ?? p.dataset.qc1522).join(",") };
      }, CARD);
      if (f && f.n === 3) {
        L.check("the To-do desk's preview hides its footer (a read-only picture)", hidden === true, String(hidden));
        L.check("the card the To-do desk opens has a three-action footer", true, JSON.stringify(f));
        L.check("its footer is two rows", f.rows === "2", f.rows);
        L.check("its actions are in place: the replied link, the outlined link action, the navy primary", f.order === "foot-replied,foot-link,reply-btn", f.order);
        done = true;
      }
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      if (!done) { await page.goto("about:blank"); await openRoute(page, "/todo", SIZES[0]); }
    }
    L.check("a To-do task whose card has three actions was found", done, "");
    L.done(5);
  });
});
