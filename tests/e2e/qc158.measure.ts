/**
 * Query card v158 — a fixed height, a calmer thread, and the Agent, Materials and Notes tabs
 * (design-refs/query-card-v158/query-card-v158.html), measured on the emulator harness at 1512 × 982 and 1280 × 800.
 *
 *   SA_PHASE=before  Step 0.5: for three fixtures (one event, a request not yet answered, six or more events) and each
 *                    tab: the card's outer box, the strip, header, book block, tab bar, body and footer, to
 *                    reports/query-card-v158/baseline.json; a shot of every tab. The locks run too, and are red.
 *   SA_PHASE=mutant  the mutation build: every lock must read red. Its shots and ledgers never overwrite the after ones.
 *   (default)        QC158-1 … QC158-15, each a ledger in reports/query-card-v158/ledger/; after shots.
 *
 * ⚠️ THE CARD IS THE QUERY PANEL'S, never `document`'s first: the To-do desk keeps its own copy mounted (hidden).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { openRoute } from "./measure";
import { STAGE_COLOURS, statusBand } from "../../src/lib/stageColours";

const PAGE = ".qc151.qc153";
const PHASE = process.env.SA_PHASE === "before" ? "before" : process.env.SA_PHASE === "mutant" ? "mutant" : "after";
const DIR = "reports/query-card-v158";
const SHOTS = "design-refs/query-card-v158/screens";
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
const TABS = ["tracking", "agent", "materials", "notes"] as const;
/** the harness's fixtures (tests/emulator-seed/harness.json): one event; a partial asked for, not sent; eight events */
const FIX = { one: "seed-cal-near-q", pending: "seed-query-7", many: "seed-query-10" } as const;
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
test.setTimeout(600_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });

const rgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

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

/** the harness's queries: id → status, activity count, and the notes stored against each */
const H = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
const STATUS = new Map<string, string>();
for (const [p, d] of Object.entries(H.docs)) if (/\/queries\/[^/]+$/.test(p) && d.status) STATUS.set(String(d.id ?? p.split("/").pop()), String(d.status));

async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511");
    } catch { /* private */ }
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
async function tab(page: Page, t: (typeof TABS)[number]) {
  await page.locator(C(`[data-qc152='tab'][data-tab='${t}']`)).first().click();
  await page.waitForTimeout(450);
}
async function shot(page: Page, path: string) {
  const b = await page.locator(CARD).first().boundingBox();
  if (b) await page.screenshot({ path, clip: { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: b.width + 16, height: Math.min(b.height + 16, 1000) }, animations: "disabled", timeout: 20_000 });
}

type Box = [number, number, number, number];
interface Geo { outer: Box; panel: Box; strip: Box | null; head: Box | null; book: Box | null; tabs: Box | null; body: Box | null; foot: Box | null }
/** boxes relative to the viewport (the card is fixed): the panel, and the card's parts relative to the panel */
const geo = (page: Page): Promise<Geo> => page.evaluate((sel) => {
  const card = document.querySelector<HTMLElement>(sel)!;
  const panel = card.closest<HTMLElement>(".spanel") ?? card;
  const o = panel.getBoundingClientRect();
  const bx = (e: Element | null): [number, number, number, number] | null => { if (!e) return null; const r = e.getBoundingClientRect(); return [+(r.left - o.left).toFixed(2), +(r.top - o.top).toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; };
  const q = (s: string) => card.querySelector(s);
  return {
    outer: bx(card)!, panel: [+o.left.toFixed(2), +o.top.toFixed(2), +o.width.toFixed(2), +o.height.toFixed(2)],
    strip: bx(q("[data-qc152='band']")), head: bx(q(".qc152-agent")), book: bx(q("[data-qc152='book']")),
    tabs: bx(q(".qc152-tabs")), body: bx(q("[data-qc152='body']")), foot: bx(q("[data-qc152='reply']")),
  };
}, CARD);

test.describe("Query card v158", () => {
  for (const vp of SIZES) {
    const w = `${vp.width}×${vp.height}`;

    test(`Step 0.5 — boxes and shots of every tab — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const out: Record<string, Record<string, Geo>> = {};
      for (const [k, id] of Object.entries(FIX)) {
        expect(await openCard(page, id), `${k} fixture ${id} on the grid`).toBe(true);
        out[k] = {};
        for (const t of TABS) {
          await tab(page, t);
          out[k][t] = await geo(page);
          await shot(page, `${SHOTS}/${PHASE}-${vp.width}-${k}-${t}.png`);
        }
        await closeCard(page);
      }
      writeFileSync(`${DIR}/${PHASE}-geo-${vp.width}.json`, JSON.stringify(out, null, 1));
      if (PHASE === "before") writeFileSync(`${DIR}/baseline-${vp.width}.json`, JSON.stringify(out, null, 1));
    });
  }

  /* ── the locks, at both sizes ─────────────────────────────────────────────────────────────────────────────── */
  for (const vp of SIZES) {
    const w = `${vp.width}`;

    test(`QC158-1 one height · QC158-15 nothing else moved — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const L1 = new Ledger(`QC158-1-${w}`), L15 = new Ledger(`QC158-15-${w}`);
      const base = existsSync(`${DIR}/baseline-${w}.json`) ? JSON.parse(readFileSync(`${DIR}/baseline-${w}.json`, "utf8")) as Record<string, Record<string, Geo>> : null;
      const heights: number[] = [];
      for (const k of ["one", "many"] as const) {
        L1.check(`${k} fixture ${FIX[k]} on the grid`, await openCard(page, FIX[k]), FIX[k]);
        const g: Record<string, Geo> = {};
        for (const t of TABS) { await tab(page, t); g[t] = await geo(page); heights.push(g[t].panel[3]); }
        const foot = TABS.map((t) => g[t].foot?.[1] ?? -1);
        L1.check(`${k}: the footer's top is the same on every tab`, Math.max(...foot) - Math.min(...foot) <= 1, foot.join(" / "));
        L1.check(`${k}: the footer sits inside the card`, TABS.every((t) => (g[t].foot![1] + g[t].foot![3]) <= g[t].panel[3] + 1), TABS.map((t) => `${g[t].foot![1] + g[t].foot![3]}≤${g[t].panel[3]}`).join(" "));
        if (base) {
          /* the baseline's full-height card (the Agent tab, the tallest) holds the boxes that must not move */
          const b = base[k].agent;
          for (const part of ["strip", "head", "book", "tabs", "foot"] as const) {
            const a = g.tracking[part], z = b[part];
            L15.check(`${k}: ${part} within 1px of the baseline`, !!a && !!z && a.every((v, n) => Math.abs(v - z[n]) <= 1), `${a} vs ${z}`);
          }
        }
        await closeCard(page);
      }
      L1.check(`the card's height is one value across fixtures and tabs (${heights.length})`, Math.max(...heights) - Math.min(...heights) <= 1, `${Math.min(...heights)}–${Math.max(...heights)}`);
      L1.done(7);
      /* the grid behind the card: the Stage colours v1 after shot is this same grid (nothing on the page changed since) */
      const ref = "design-refs/stage-colours-v1/screens/after-qc-grid.png";
      if (vp.width === 1512 && existsSync(ref)) {
        await page.goto("about:blank");
        await openRoute(page, "/queries", vp);
        await page.locator(`${PAGE} [data-qc154="card"]`).first().waitFor({ timeout: 60_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.mouse.move(2, 2); await page.waitForTimeout(600);
        const now = `${SHOTS}/${PHASE}-grid-1512.png`;
        await page.screenshot({ path: now, fullPage: true, animations: "disabled", timeout: 30_000 });
        /* decoded pixels, not PNG bytes (an encoder may write the same pixels differently): no channel sum off by more than 8 */
        const u = (f: string) => "data:image/png;base64," + readFileSync(f).toString("base64");
        const diff = await page.evaluate(async ([A, B]) => {
          const load = (src: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
          const [x, y] = await Promise.all([load(A), load(B)]);
          if (x.width !== y.width || x.height !== y.height) return -1;
          const get = (img: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d")!; g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
          const da = get(x), db = get(y); let n = 0;
          for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 8) n++;
          return n;
        }, [u(now), u(ref)] as const);
        L15.check("the Query Centre grid is pixel-identical to the last shot before v158", diff === 0, `${diff} pixels differ`);
      }
      L15.done(base ? 10 : 1);
    });

    test(`QC158-2 body scrolls · QC158-3 no pills, no line · QC158-4 waits — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const L2 = new Ledger(`QC158-2-${w}`), L3 = new Ledger(`QC158-3-${w}`), L4 = new Ledger(`QC158-4-${w}`);
      /* the longest thread on the grid of the candidates */
      let best: { id: string; steps: number } | null = null;
      /* every card opened is read for a day pill and a status line — the waiting ones (FIX.one, FIX.many) included, since
         the old status line was drawn only while waiting */
      const seen: string[] = [];
      /* plus the first card of Watch and wait and of Nudge due: the only states the old status line was drawn in */
      const waiting = await page.evaluate((sel) => ["agent", "nudge"].map((k) => document.querySelector<HTMLElement>(`${sel} section.qc153-grp[data-k='${k}'] [data-qc154='card']`)?.dataset.id ?? "").filter(Boolean), PAGE);
      for (const id of [...waiting, FIX.one, FIX.many, "seed-query-20", "seed-pkgq-3", "seed-query-12", "seed-cal-bang-q", "seed-cal-passed20-q"]) {
        if (!(await openCard(page, id))) continue;
        const n = Number(await page.locator(C("[data-qc152='thread']")).first().getAttribute("data-steps"));
        const st = await page.locator(CARD).first().getAttribute("data-state");
        const pl = await page.locator(C("[data-qc152='day-pill'], .qc152-dp")).count(), ln = await page.locator(C("[data-qc153='status-line'], .qc153-sl")).count();
        seen.push(`${id}(${st}) pills ${pl} line ${ln}`);
        L3.check(`${id} (${st}): no day pill and no status line`, pl === 0 && ln === 0, `${pl}/${ln}`);
        if (id !== FIX.one && (!best || n > best.steps)) best = { id, steps: n };
        await closeCard(page);
      }
      L3.check("a card with the agent or nudge due was read (where the old status line was drawn)", seen.some((x) => /\((agent|nudge)\)/.test(x)), seen.join(" · "));
      L2.check("a thread of six or more steps exists", !!best && best.steps >= 6, JSON.stringify(best));
      if (best) {
        await openCard(page, best.id);
        const fold = page.locator(C("[data-qc152='fold']"));
        if (await fold.count()) { await fold.first().click(); await page.waitForTimeout(300); }
        const r = await page.evaluate((sel) => {
          const card = document.querySelector<HTMLElement>(sel)!;
          const body = card.querySelector<HTMLElement>("[data-qc152='body']")!, panel = card.closest<HTMLElement>(".spanel")!;
          const foot = card.querySelector<HTMLElement>("[data-qc152='reply']")!;
          const th = card.querySelector<HTMLElement>("[data-qc152='thread']")!;
          const kids = [...th.children].filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement[];
          const items = kids.map((e) => ({ wait: e.dataset.qc152 === "wait", msg: e.dataset.qc152 === "msg", side: e.dataset.side ?? "", label: e.dataset.label ?? e.textContent ?? "", stamp: e.querySelector("[data-qc152='msg-date']")?.textContent ?? "" }));
          return {
            scroll: body.scrollHeight, client: body.clientHeight, panelH: panel.getBoundingClientRect().height,
            footIn: foot.getBoundingClientRect().bottom <= panel.getBoundingClientRect().bottom + 1,
            pills: card.querySelectorAll("[data-qc152='day-pill'], .qc152-dp").length, line: card.querySelectorAll("[data-qc153='status-line'], .qc153-sl").length,
            /* layout offset (the card leans): the first bubble's top inside the thread */
            items, firstTop: (() => { const m = kids.find((e) => e.dataset.qc152 === "msg"); return m ? m.offsetTop - th.offsetTop : -1; })(),
          };
        }, CARD);
        L2.check("the body scrolls", r.scroll > r.client + 1, `${r.scroll} > ${r.client}`);
        L2.check("the card did not grow", Math.abs(r.panelH - (await page.evaluate(() => Math.min(700, window.innerHeight - 56) + 14))) <= 2, `${r.panelH}`);
        L2.check("the footer stays inside the card", r.footIn, "");
        const msgs = r.items.filter((x) => x.msg);
        L3.check(`a thread with three or more dated messages (${msgs.length})`, msgs.filter((m) => m.stamp).length >= 3, msgs.map((m) => m.stamp).join(", "));
        L3.check("no day pill", r.pills === 0, String(r.pills));
        L3.check("no status line", r.line === 0, String(r.line));
        L3.check("16px above the first bubble", Math.abs(r.firstTop - 16) <= 1, String(r.firstTop));
        const waits = r.items.map((x, i) => ({ ...x, i })).filter((x) => x.wait);
        L4.check(`waits drawn (${waits.length})`, waits.length > 0, waits.map((x) => x.label).join(" | "));
        L4.check("nothing before the first message", !r.items[0]?.wait, r.items[0]?.label ?? "");
        L4.check("no 'Same day'", waits.every((x) => !/Same day/.test(x.label)), "");
        for (const x of waits) {
          const next = r.items.slice(x.i + 1).find((y) => y.msg);
          L4.check(`"${x.label}" sits on the side of the message after it (${next?.side})`, !!next && next.side === x.side && /^\d+ days? later$/.test(x.label), `${x.side}`);
        }
      }
      L2.done(4); L3.done(4); L4.done(4);
    });

    test(`QC158-5 fact boxes · QC158-6 asks · QC158-7 contact row — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const L5 = new Ledger(`QC158-5-${w}`), L6 = new Ledger(`QC158-6-${w}`), L7 = new Ledger(`QC158-7-${w}`);
      const agentOf = (qid: string) => {
        const q = Object.entries(H.docs).find(([p, d]) => /\/queries\/[^/]+$/.test(p) && String(d.id ?? p.split("/").pop()) === qid)?.[1];
        return Object.entries(H.docs).find(([p, d]) => /\/agents\/[^/]+$/.test(p) && String(d.id ?? p.split("/").pop()) === String(q?.agentId))?.[1] ?? null;
      };
      for (const id of [FIX.many, FIX.one]) {
        await openCard(page, id); await tab(page, "agent");
        const ag = agentOf(id);
        /* the prompt's 504px card, and an address longer than its button can hold (the harness's addresses are short) */
        await page.evaluate((sel) => {
          const card = document.querySelector<HTMLElement>(sel)!; const panel = card.closest<HTMLElement>(".spanel")!;
          panel.style.width = "504px";
          const a = card.querySelector<HTMLElement>("[data-qc158='address']"); if (a) a.textContent = "submissions.and.queries@a-very-long-agency-name.example";
        }, CARD);
        await page.waitForTimeout(200);
        const r = await page.evaluate((sel) => {
          const card = document.querySelector<HTMLElement>(sel)!;
          /* layout offsets, not bounding rects: the card leans, and a rotated box's rect is skewed */
          const boxes = [...card.querySelectorAll<HTMLElement>("[data-qc158='box']")].map((b) => {
            const kids = [...b.children].filter((k) => (k as HTMLElement).offsetHeight > 0) as HTMLElement[];
            const t = kids[0].offsetTop - b.offsetTop, z = kids[kids.length - 1].offsetTop - b.offsetTop + kids[kids.length - 1].offsetHeight;
            return { k: b.dataset.k, top: b.offsetTop, h: b.offsetHeight, above: t, below: b.offsetHeight - z, value: b.querySelector("[data-qc158='value']")?.textContent ?? "", link: !!b.querySelector("[data-qc158='value'] button") };
          });
          const asks = [...card.querySelectorAll<HTMLElement>("[data-qc158='ask']")].map((a) => ({ sent: a.hasAttribute("data-sent"), tick: !a.querySelector(".nx-tick")!.classList.contains("no"), r: a.querySelector(".r")?.textContent ?? "" }));
          const sum = card.querySelector("[data-qc158='ask-sum']")?.textContent ?? "";
          const row = card.querySelector<HTMLElement>("[data-qc158='contact']")!;
          const btns = [...row.children].map((c) => ({ top: (c as HTMLElement).offsetTop }));
          const addr = row.querySelector<HTMLElement>("[data-qc158='address']");
          return { boxes, asks, sum, rowH: row.offsetHeight, w504: card.closest<HTMLElement>(".spanel")!.offsetWidth, tops: btns.map((b) => Math.round(b.top)), cardW: card.closest<HTMLElement>(".spanel")!.offsetWidth,
            addr: addr ? { ov: getComputedStyle(addr).textOverflow, ws: getComputedStyle(addr).whiteSpace, cut: addr.scrollWidth > addr.clientWidth } : null };
        }, CARD);
        L5.check(`${id}: three boxes`, r.boxes.length === 3, r.boxes.map((b) => b.k).join(","));
        L5.check(`${id}: equal tops and heights`, r.boxes.every((b) => Math.abs(b.top - r.boxes[0].top) <= 1 && Math.abs(b.h - r.boxes[0].h) <= 1), r.boxes.map((b) => `${b.top.toFixed(1)}/${b.h.toFixed(1)}`).join(" "));
        L5.check(`${id}: each text block centred within 1px`, r.boxes.every((b) => Math.abs(b.above - b.below) <= 1), r.boxes.map((b) => `${b.above.toFixed(1)}:${b.below.toFixed(1)}`).join(" "));
        const wk = typeof ag?.responseTimeWeeks === "number" && (ag.responseTimeWeeks as number) > 0 ? ag.responseTimeWeeks as number : null;
        const reply = r.boxes.find((b) => b.k === "reply")!;
        L5.check(`${id}: Replies in matches the agent (${wk ?? "unrecorded"})`, wk != null ? reply.value === `About ${wk} week${wk === 1 ? "" : "s"}` : reply.link && reply.value === "Add reply time", reply.value);
        L5.check(`${id}: no value is a dash`, r.boxes.every((b) => !/^[—–-]$/.test(b.value.trim())), r.boxes.map((b) => b.value).join(" | "));
        const want = Array.isArray(ag?.materialsWanted) ? (ag!.materialsWanted as string[]).length : 0;
        L6.check(`${id}: one row per item the agent asks for (${want})`, r.asks.length === want, String(r.asks.length));
        for (const a of r.asks) L6.check(`${id}: ${a.sent ? "sent: ticked disc, 'sent with your query'" : "not sent: empty ring, 'not sent'"}`, a.sent ? a.tick && a.r === "sent with your query" : !a.tick && a.r === "not sent", `${a.tick} ${a.r}`);
        if (r.asks.length) L6.check(`${id}: the summary matches`, r.asks.every((a) => a.sent) ? /^You sent everything /.test(r.sum) : /^You didn’t send /.test(r.sum), r.sum);
        L7.check(`${id}: the contact row is one line (${r.cardW.toFixed(0)}px card)`, new Set(r.tops).size === 1 && r.rowH <= 40, `${r.tops} h${r.rowH}`);
        L7.check(`${id}: the card is 504px wide for this read`, r.w504 === 504, String(r.w504));
        if (r.addr) L7.check(`${id}: the address is cut with an ellipsis, not wrapped`, r.addr.ov === "ellipsis" && r.addr.ws === "nowrap" && r.addr.cut, JSON.stringify(r.addr));
        await closeCard(page);
      }
      L5.done(10); L6.done(2); L7.done(4);
    });

    test(`QC158-8 groups · QC158-9 not sent yet — ${w}`, async ({ page }) => {
      await openQc(page, vp);
      const L8 = new Ledger(`QC158-8-${w}`), L9 = new Ledger(`QC158-9-${w}`);
      const read = () => page.evaluate((sel) => [...document.querySelector<HTMLElement>(sel)!.querySelectorAll<HTMLElement>("[data-qc158='group']")].map((g) => ({
        kind: g.dataset.kind!, stage: g.dataset.stage!, pending: g.hasAttribute("data-pending"), head: (g.querySelector("[data-qc158='heading']")?.firstChild?.textContent ?? "").trim(),
        disc: getComputedStyle(g.querySelector("[data-qc158='disc']")!).backgroundColor, box: getComputedStyle(g.querySelector(".nx-items")!).boxShadow,
        items: [...g.querySelectorAll("[data-qc158='item'] .r")].map((x) => x.textContent ?? ""),
      })), CARD);
      await openCard(page, FIX.many); await tab(page, "materials");
      const m = await read();
      L8.check("exactly three groups: query, partial, full, in order", m.map((x) => x.head).join(" | ") === "With the query | With the partial | With the full", m.map((x) => x.head).join(" | "));
      for (const g of m) L8.check(`${g.head}: disc is ${g.stage}'s Band`, g.disc === rgb(STAGE_COLOURS[g.stage as keyof typeof STAGE_COLOURS].band), g.disc);
      await closeCard(page);
      /* the first pending partial on the grid whose request recorded what was asked for */
      let pend: Awaited<ReturnType<typeof read>>[number] | undefined;
      for (const id of [FIX.pending, "cor-move-a", "seed-query-20", "msv12-q-3"]) {
        if (!(await openCard(page, id))) continue;
        await tab(page, "materials");
        const got = (await read()).find((x) => x.kind === "partial" && x.pending);
        await closeCard(page);
        if (got && got.items.length) { pend = got; L9.check(`fixture: ${id} has a pending partial with its items recorded`, true, id); break; }
        if (!pend && got) pend = got;
      }
      L9.check("a partial asked for and not sent: one pending 'With the partial'", !!pend && pend.pending && pend.head === "With the partial", JSON.stringify(pend));
      L9.check("its box is outlined 1.5px navy", !!pend && /rgb\(42, 58, 82\) 0px 0px 0px 1\.5px inset/.test(pend.box), pend?.box ?? "");
      L9.check("each item says 'not sent yet'", !!pend && pend.items.length > 0 && pend.items.every((t) => t === "not sent yet"), pend?.items.join(",") ?? "");
      await openCard(page, "seed-query-9"); await tab(page, "materials");
      const s9 = await read();
      const parts = s9.filter((x) => x.kind === "partial");
      L9.check("once sent: one partial group, no outline", parts.length === 1 && !parts[0].pending && !/1\.5px/.test(parts[0].box), JSON.stringify(parts));
      await closeCard(page);
      L8.done(4); L9.done(4);
    });

    test(`QC158-10 notes list · QC158-12 note actions · QC158-11 writing box · QC158-13 empty — ${w}`, async ({ page }) => {
      const seed = (a: string) => execSync(`node tests/e2e/seedQc158.mjs ${a}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").pop()!;
      const L10 = new Ledger(`QC158-10-${w}`), L11 = new Ledger(`QC158-11-${w}`), L12 = new Ledger(`QC158-12-${w}`), L13 = new Ledger(`QC158-13-${w}`);
      try {
        seed("--clean");
        seed(`--notes ${FIX.many} 3`); seed(`--quotes ${FIX.many}`);
        await openQc(page, vp);
        await openCard(page, FIX.many); await tab(page, "notes");
        await page.waitForTimeout(800);
        const list = () => page.evaluate((sel) => [...document.querySelector<HTMLElement>(sel)!.querySelectorAll<HTMLElement>("[data-qc158='note'], [data-qc158='quote']")].map((e) => ({
          t: e.dataset.qc158!, id: e.dataset.id ?? "", status: e.dataset.status ?? "", pinned: e.hasAttribute("data-pinned"), bg: getComputedStyle(e).backgroundColor,
          acts: [...e.querySelectorAll<HTMLElement>("[data-qc158='act']")].map((a) => a.dataset.act!), text: e.querySelector("p")?.textContent ?? "",
        })), CARD);
        const l = await list();
        const notes = l.filter((x) => x.t === "note"), quotes = l.filter((x) => x.t === "quote");
        L10.check(`the fixture holds notes (${notes.length}) and recorded words (${quotes.length})`, notes.length >= 1 && quotes.length >= 1, "");
        L10.check("one list in date order: the older recorded words before this week's notes", l.findIndex((x) => x.t === "note") > l.map((x) => x.t).lastIndexOf("quote"), l.map((x) => x.t[0]).join(""));
        /* Plumage colours v1 — a quote's background is the band of the status the reply set (lib/stageColours statusBand) */
        for (const q of quotes) L10.check(`${q.status}: background is its status's band; Send to Corkboard only`, q.bg === rgb(statusBand(q.status)) && q.acts.join(",") === "cork", `${q.bg} ${q.acts}`);
        /* QC158-12: task, corkboard, the note unchanged; pin one, then another: only one pinned, first */
        const errs: string[] = [];
        page.on("console", (m) => { if (m.type() === "error" || /pin|journal/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
        page.on("pageerror", (e) => errs.push(`pageerror: ${String(e).slice(0, 200)}`));
        const n0 = notes[0];
        const art = (id: string) => page.locator(C(`[data-qc158='note'][data-id='${id}']`));
        await art(n0.id).hover(); await art(n0.id).locator("[data-act='task']").click(); await page.waitForTimeout(900);
        await art(n0.id).hover(); await art(n0.id).locator("[data-act='cork']").click(); await page.waitForTimeout(900);
        const c1 = JSON.parse(seed("--count")) as { notes: { id: string; text: string; pinned: boolean }[]; tasks: { text: string; dueDate: string | null }[] };
        L12.check("Make it a task made a dated task with the note's text", c1.tasks.some((t) => t.text === n0.text && !!t.dueDate), JSON.stringify(c1.tasks));
        L12.check("Send to Corkboard made an undated note with the note's text", c1.tasks.some((t) => t.text === n0.text && !t.dueDate), "");
        L12.check("the original note is unchanged", c1.notes.length === 3 && c1.notes.some((x) => x.id === n0.id && x.text === n0.text), JSON.stringify(c1.notes.map((x) => x.id)));
        /* the pin links are pressed from the keyboard (focus, Enter): a real way to use them, and steady on the leaning
           card near the sticky writing box, where a synthetic pointer click was not delivered in this harness */
        const press = async (id: string) => { const b = art(id).locator("[data-act='pin']"); await art(id).hover(); await b.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(1200); };
        await press(notes[1].id);
        const afterOne = JSON.parse(seed("--count")) as { notes: { id: string; pinned: boolean }[] };
        L12.check("after one Pin, that note is pinned in the store", afterOne.notes.some((x) => x.id === notes[1].id && x.pinned), `${JSON.stringify(afterOne.notes)} · ${errs.join(" | ") || "no errors"}`);
        await press(notes[2].id);
        const l2 = await list();
        const c2 = JSON.parse(seed("--count")) as { notes: { pinned: boolean }[] };
        L12.check("the pinned note is first", l2[0]?.t === "note" && l2[0].pinned && l2[0].id === notes[2].id, `${l2[0]?.id} ${l2[0]?.pinned}`);
        L12.check("only one note is pinned", c2.notes.filter((x) => x.pinned).length === 1, `${c2.notes.filter((x) => x.pinned).length} · console: ${errs.join(" | ") || "none"}`);
        /* QC158-11: the button, and blur does not save */
        const field = page.locator(C("[data-qc158='field']"));
        L11.check("Add note is disabled while the field is empty", await page.locator(C("[data-qc158='add-note']")).isDisabled(), "");
        await field.fill("q158 typed then left"); await page.locator(C("[data-qc152='tab'][data-tab='notes']")).click(); await page.waitForTimeout(800);
        const c3 = JSON.parse(seed("--count")) as { notes: { text: string }[] };
        L11.check("blur does not save", !c3.notes.some((x) => x.text === "q158 typed then left"), String(c3.notes.length));
        await field.fill("");
        const boxOf = () => page.evaluate((sel) => {
          const card = document.querySelector<HTMLElement>(sel)!; const panel = card.closest<HTMLElement>(".spanel")!.getBoundingClientRect();
          const b = card.querySelector<HTMLElement>("[data-qc158='compose']")!.getBoundingClientRect(); const body = card.querySelector<HTMLElement>("[data-qc152='body']")!.getBoundingClientRect();
          return { bottom: b.bottom - panel.top, visible: b.top >= body.top - 1 && b.bottom <= body.bottom + 1 };
        }, CARD);
        await closeCard(page);
        seed("--clean"); seed(`--notes ${FIX.many} 12`);
        await openCard(page, FIX.many); await tab(page, "notes"); await page.waitForTimeout(800);
        const twelve = await boxOf();
        L11.check("twelve notes: the writing box is visible without scrolling", twelve.visible, JSON.stringify(twelve));
        await closeCard(page);
        await openCard(page, FIX.one); await tab(page, "notes"); await page.waitForTimeout(500);
        const none = await boxOf();
        L11.check("its bottom edge is the same with twelve notes as with none", Math.abs(twelve.bottom - none.bottom) <= 1, `${twelve.bottom.toFixed(1)} vs ${none.bottom.toFixed(1)}`);
        /* QC158-13: empty, centred in the body (the space above the writing box) */
        const e = await page.evaluate((sel) => {
          const card = document.querySelector<HTMLElement>(sel)!; const em = card.querySelector<HTMLElement>("[data-qc158='empty']");
          if (!em) return null;
          /* the space the empty state has: from the notes pane's padding edge to the writing box (layout offsets: the card leans) */
          const pane = card.querySelector<HTMLElement>("[data-qc158='notes']")!, box = card.querySelector<HTMLElement>("[data-qc158='compose']")!;
          const top = pane.offsetTop + parseFloat(getComputedStyle(pane).paddingTop), bottom = box.offsetTop - parseFloat(getComputedStyle(pane).rowGap || "0");
          const mid = em.offsetTop + em.offsetHeight / 2;
          return { text: em.textContent ?? "", off: mid - (top + bottom) / 2 };
        }, CARD);
        L13.check("the empty wording names the agent", !!e && /^Nothing noted yetThis is the place for why you picked [A-Z][\w’'-]*, and what you’d change if this one’s a no\.$/.test(e.text), e?.text ?? "none");
        L13.check("centred in the body within 2px", !!e && Math.abs(e.off) <= 2, String(e?.off));
        await closeCard(page);
      } finally { seed("--clean"); }
      L10.done(3); L11.done(4); L12.done(5); L13.done(2);
    });
  }

  test("QC158-14 hosts — the To-do desk's card shares the component", async ({ page }) => {
    const L = new Ledger("QC158-14");
    await openRoute(page, "/todo", SIZES[0]);
    const PG = '[data-tws="page"]:visible';
    const rows = page.locator(`${PG} [data-tws-row]`);
    L.check(`the desk has tasks (${await rows.count()})`, (await rows.count()) > 0, "");
    const hs: number[] = [];
    for (let i = 0; i < Math.min(2, await rows.count()); i++) {
      await rows.nth(i).click(); await page.waitForTimeout(900);
      const r = await page.evaluate(() => {
        const pv = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)?.querySelector<HTMLElement>('[data-tws="preview-card"]');
        const card = pv?.querySelector<HTMLElement>("[data-qc152='card']");
        if (!card) return null;
        const panel = card.closest<HTMLElement>(".spanel")!;
        return { h: panel.offsetHeight, grow: getComputedStyle(card.querySelector("[data-qc152='body']")!).flexGrow, pills: card.querySelectorAll("[data-qc152='day-pill'], .qc152-dp").length,
          line: card.querySelectorAll("[data-qc153='status-line']").length, waits: [...card.querySelectorAll<HTMLElement>("[data-qc152='wait']")].map((x) => x.textContent ?? "") };
      });
      L.check(`task ${i + 1}: the preview draws the shared card (QcCard152)`, !!r, JSON.stringify(r));
      if (!r) continue;
      hs.push(r.h);
      L.check(`task ${i + 1}: the new Tracking — no day pill, no status line, no 'Same day'`, r.pills === 0 && r.line === 0 && r.waits.every((x) => !/Same day/.test(x)), JSON.stringify(r));
      L.check(`task ${i + 1}: the body takes the room (flex-grow 1)`, r.grow === "1", r.grow);
    }
    if (hs.length === 2) L.check("the fixed height: two tasks' cards are one height", Math.abs(hs[0] - hs[1]) <= 1, hs.join(" / "));
    L.done(4);
  });
});
