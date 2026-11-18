/**
 * Stage colours v1 — one colour scheme for a query's stage, everywhere it is drawn (design-refs/stage-colours-v1/).
 * Measured on the emulator harness at 1512 × 982 (phone surfaces at 390 × 844).
 *
 *   SA_PHASE=before  Step 0.6: every surface's before shot, and the slide-out card's boxes (outer, strip, each bubble,
 *                    the pill, the footer) for one query per stage, to reports/stage-colours-v1/baseline.json.
 *                    The locks run too, and are red.
 *   (default)        SC1-2 … SC1-17, each a ledger in reports/stage-colours-v1/ledger/; after shots.
 *
 * SC1-1 (one source) is a source scan and lives in src/lib/stageColours.test.ts.
 *
 * ⚠️ EVERY LOCK PROVES ITS SUBJECT: a stage it asserts about must be found on the page first (the Ledger's `min`).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { openRoute, ensureSignedIn } from "./measure";
import { STAGE_COLOURS, stageOf, type Stage } from "../../src/lib/stageColours";

const PAGE = ".qc151.qc153";
/** `mutant`: the mutation build (every lock must read red); its shots and ledgers never overwrite the after ones */
const PHASE = process.env.SA_PHASE === "before" ? "before" : process.env.SA_PHASE === "mutant" ? "mutant" : "after";
const DIR = "reports/stage-colours-v1";
const SHOTS = "design-refs/stage-colours-v1/screens";
const DESK = { width: 1512, height: 982 };
const PHONE = { width: 390, height: 844 };
const STAGES: Stage[] = ["queried", "partial", "full", "offer", "closed"];
/** one status per stage that the harness holds (tests/emulator-seed/harness.json) */
const PICK: Record<Stage, string> = { queried: "Queried", partial: "Partial Requested", full: "Full Requested", offer: "Offer", closed: "Rejected" };
const INK = "rgb(28, 19, 15)";
const NAVY = "rgb(42, 58, 82)";
test.setTimeout(420_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });

/** the harness's queries by id → status (Birds-eye rows carry no status of their own) */
const STATUS_BY_ID: Map<string, string> = (() => {
  const h = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
  const m = new Map<string, string>();
  for (const [path, q] of Object.entries(h.docs)) if (/\/queries\/[^/]+$/.test(path) && q.status) m.set(String(q.id ?? path.split("/").pop()), String(q.status));
  return m;
})();
const rgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
const band = (s: Stage) => rgb(STAGE_COLOURS[s].band);
const tint = (s: Stage) => rgb(STAGE_COLOURS[s].tint);
/** the base table had no edge: a missing one reads "no edge", so the before run reads red rather than throwing */
const edge = (s: Stage) => { const e = (STAGE_COLOURS[s] as { edge?: string }).edge; return e ? rgb(e) : "no edge"; };

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

async function guides(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511");
    } catch { /* private */ }
  });
}
async function openQc(page: Page, view: "list" | "birds" = "list") {
  await guides(page);
  await openRoute(page, "/queries", DESK);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="${view}"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await b.click();
  await page.waitForTimeout(900);
  if (view === "list") {
    await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
    const more = page.locator(`${PAGE} [data-qc153='show-all']`);
    for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.mouse.move(2, 2);
}
/** the query panel's card — never `document`'s first: the To-do desk keeps its own (hidden) copy mounted */
const CARD = "[data-qp='panel'] [data-qc152='card']";
/** the phone (< 768): no desktop shell, so wait for the phone dock */
async function openPhone(page: Page, route: string) {
  /* sign in where the desktop shell can prove it, then narrow to the phone */
  await page.setViewportSize(DESK);
  await page.goto(route);
  await ensureSignedIn(page);
  await page.setViewportSize(PHONE);
  await page.goto(route);
  await page.locator('[data-pa5="dock"], [data-pa4="qrow"]').first().waitFor({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}
/** a shot of one element by its box (a locator shot waits for "stable", and the panel never settles) */
async function shotOf(page: Page, sel: string, path: string) {
  const b = await page.locator(sel).first().boundingBox();
  if (b) await page.screenshot({ path, clip: { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: Math.min(b.height, 2000) }, animations: "disabled", timeout: 20_000 });
}
/** open the slide-out for the first grid card in `status` (quiet or not, as asked) */
async function openSlide(page: Page, status: string, quiet: boolean | null = false): Promise<string | null> {
  const q = quiet === null ? "" : quiet ? "[data-quiet]" : ":not([data-quiet])";
  const c = page.locator(`${PAGE} [data-qc154='card'][data-status='${status}']${q}`).first();
  if (!(await c.count())) return null;
  const id = await c.getAttribute("data-id");
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  await page.locator(`${CARD}[data-id='${id}']`).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  return id;
}
async function closeSlide(page: Page) {
  const x = page.locator(`${CARD} [data-qc149c='close']`).filter({ visible: true }).first();
  if (await x.count()) await x.click({ timeout: 8_000 }); else await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

type Box = [number, number, number, number];
interface SlideGeo { id: string; status: string; outer: Box; strip: Box; pill: Box; foot: Box | null; bubbles: Box[] }
const slideGeo = (page: Page): Promise<Omit<SlideGeo, "id" | "status">> => page.evaluate((sel) => {
  const root = document.querySelector<HTMLElement>(sel)!;
  const o = root.getBoundingClientRect();
  const bx = (e: Element | null): [number, number, number, number] | null => { if (!e) return null; const r = e.getBoundingClientRect(); return [+(r.left - o.left).toFixed(2), +(r.top - o.top).toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; };
  return {
    outer: [0, 0, +o.width.toFixed(2), +o.height.toFixed(2)] as [number, number, number, number],
    strip: bx(root.querySelector("[data-qc152='band']"))!,
    pill: bx(root.querySelector("[data-qc152='pill']"))!,
    foot: bx(root.querySelector("[data-qc152='reply']")),
    bubbles: [...root.querySelectorAll("[data-qc152='msg'] [data-qc152='bubble']")].map((b) => bx(b)!),
  };
}, CARD);

/* ── the surfaces (Step 0.6 / Phase 6): each a route, a viewport and an optional step to get there ───────────────── */
interface Surface { key: string; route: string; vp: { width: number; height: number }; ready: string; step?: (p: Page) => Promise<void> }
const SURFACES: Surface[] = [
  { key: "qc-grid", route: "/queries", vp: DESK, ready: `${PAGE} [data-qc154="card"]` },
  { key: "qc-birds", route: "/queries", vp: DESK, ready: `${PAGE} [data-qc153="bar"]`, step: async (p) => { await p.locator(`${PAGE} [data-qc153="bar"] button[data-v="birds"]`).click(); await p.waitForTimeout(1200); } },
  { key: "dashboard", route: "/dashboard", vp: DESK, ready: "body" },
  { key: "responses", route: "/queries/responses", vp: DESK, ready: "body" },
  { key: "analytics", route: "/queries/analytics", vp: DESK, ready: "body" },
  { key: "todo", route: "/todo", vp: DESK, ready: "body" },
  { key: "contacts", route: "/agents", vp: DESK, ready: "body" },
  { key: "phone-queries", route: "/queries", vp: PHONE, ready: "body" },
  { key: "phone-today", route: "/dashboard", vp: PHONE, ready: "body" },
];

test.describe("Stage colours v1", () => {
  test("Step 0.6 / Phase 6 — every surface's shot", async ({ page }) => {
    const missed: string[] = [];
    for (const s of SURFACES) {
      try {
        await guides(page);
        if (s.vp === PHONE) await openPhone(page, s.route); else await openRoute(page, s.route, s.vp);
        await page.locator(s.ready).first().waitFor({ timeout: 60_000 });
        if (s.step) await s.step(page);
        await page.evaluate(() => document.fonts.ready);
        await page.mouse.move(2, 2); await page.waitForTimeout(600);
        await page.screenshot({ path: `${SHOTS}/${PHASE}-${s.key}.png`, fullPage: true, animations: "disabled", timeout: 30_000 });
      } catch (e) { missed.push(`${s.key}: ${String(e).slice(0, 160)}`); }
    }
    expect(missed).toEqual([]);
  });

  test("Step 0.6 — the slide-out card's boxes, one per stage, and its shots", async ({ page }) => {
    await openQc(page);
    const out: SlideGeo[] = [];
    for (const st of STAGES) {
      const status = PICK[st];
      const id = await openSlide(page, status, null);
      expect(id, `a ${status} card on the grid`).not.toBeNull();
      out.push({ id: id!, status, ...(await slideGeo(page)) });
      await shotOf(page, CARD, `${SHOTS}/${PHASE}-slide-${st}.png`);
      await closeSlide(page);
    }
    /* the quiet strip */
    const qid = await openSlide(page, "Queried", true);
    if (qid) { out.push({ id: qid, status: "Queried (quiet)", ...(await slideGeo(page)) }); await shotOf(page, CARD, `${SHOTS}/${PHASE}-slide-quiet.png`); await closeSlide(page); }
    writeFileSync(`${DIR}/${PHASE}-slide.json`, JSON.stringify(out, null, 1));
    if (PHASE === "before") writeFileSync(`${DIR}/baseline.json`, JSON.stringify(out, null, 1));
    expect(out.length).toBeGreaterThanOrEqual(5);
  });

  test("SC1-2 rose — the grid's Offer card", async ({ page }) => {
    await openQc(page);
    const L = new Ledger("SC1-2");
    const read = (sel: string) => page.locator(sel).first().evaluate((c) => { const cs = getComputedStyle(c.querySelector<HTMLElement>("[data-qc154='band']")!); return { image: cs.backgroundImage, size: cs.backgroundSize, color: cs.backgroundColor }; });
    for (const s of ["Offer", "Signed"]) {
      const sel = `${PAGE} [data-qc154='card'][data-status='${s}']`;
      if (!(await page.locator(sel).count())) { if (s === "Offer") L.check("an Offer card exists", false, "none"); continue; }
      const r = await read(sel);
      L.check(`${s}: band rgb(239, 205, 201) under the sheen at 260% 100%`, r.color === "rgb(239, 205, 201)" && /linear-gradient\(112deg/.test(r.image) && r.size.startsWith("260% 100%"), JSON.stringify(r));
    }
    L.done(1);
  });

  test("SC1-3 strip · SC1-8 seal · SC1-9 label · SC1-10 footer — the slide-out in each stage", async ({ page }) => {
    await openQc(page);
    const L3 = new Ledger("SC1-3"), L8 = new Ledger("SC1-8"), L9 = new Ledger("SC1-9"), L10 = new Ledger("SC1-10");
    for (const st of STAGES) {
      const status = PICK[st];
      const id = await openSlide(page, status, false);
      if (!id) { L3.check(`a non-quiet ${status} card exists`, false, "none"); continue; }
      const g = await page.locator(CARD).first().evaluate((c) => {
        const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
        const strip = c.querySelector("[data-qc152='band']")!;
        const pill = c.querySelector("[data-qc152='pill']")!;
        const dot = pill.querySelector("svg");
        const cap = pill.querySelector(".qc152-cap");
        const foot = c.querySelector("[data-qc152='foot-icon']");
        const footSvg = foot?.querySelector("svg");
        return {
          strip: { bg: cs(strip)!.backgroundColor, img: cs(strip)!.backgroundImage, fg: cs(strip)!.color },
          seal: { bg: cs(c.querySelector(".qc152-disc"))!.backgroundColor, fg: cs(c.querySelector(".qc152-disc"))!.color },
          threadSeals: [...c.querySelectorAll(".qc152-av")].map((a) => `${getComputedStyle(a).backgroundColor}|${getComputedStyle(a).color}`),
          pill: { bg: cs(pill)!.backgroundColor, dot: dot ? cs(dot)!.color : "none", cap: cap ? cs(cap)!.backgroundColor : "none", word: (pill.textContent ?? "").trim() },
          foot: foot ? { bg: cs(foot)!.backgroundColor, img: cs(foot)!.backgroundImage, ink: footSvg ? cs(footSvg)!.color : "none", seal: !!foot.querySelector("[data-sd-seal], [data-seal]") || (foot.innerHTML.includes("seal")) } : null,
          footIcon: foot?.getAttribute("class") ?? "",
        };
      });
      L3.check(`${status}: strip is ${band(st)}`, g.strip.bg === band(st) || (st === "offer" && g.strip.bg === band(st) && /112deg/.test(g.strip.img)), JSON.stringify(g.strip));
      L3.check(`${status}: strip text ink, not navy`, g.strip.fg === INK && g.strip.bg !== NAVY, g.strip.fg);
      if (st === "offer") L3.check("Offer strip has the sheen", /linear-gradient\(112deg/.test(g.strip.img), g.strip.img);
      L8.check(`${status}: header seal navy, initials paper`, g.seal.bg === NAVY && g.seal.fg === "rgb(244, 238, 229)", JSON.stringify(g.seal));
      for (const t of g.threadSeals) L8.check(`${status}: thread seal navy`, t === `${NAVY}|rgb(244, 238, 229)`, t);
      L9.check(`${status}: pill is ${tint(st)}`, g.pill.bg === tint(st), g.pill.bg);
      L9.check(`${status}: pill mark ink, no disc behind it`, g.pill.dot === INK && (g.pill.cap === "none" || g.pill.cap === "rgba(0, 0, 0, 0)"), `${g.pill.dot} ${g.pill.cap}`);
      L9.check(`${status}: pill carries the word`, g.pill.word.length > 0, g.pill.word);
      if (g.foot) {
        const clockOrStage = /qc152-f[cg]/.test(g.footIcon);
        if (clockOrStage) L10.check(`${status}: footer disc is ${band(st)}`, g.foot.bg === band(st), JSON.stringify(g.foot));
        if (clockOrStage) L10.check(`${status}: footer mark ink`, g.foot.ink === INK || st === "closed", g.foot.ink);
      }
      await closeSlide(page);
    }
    L3.done(10); L8.done(5); L9.done(15); L10.done(3);
  });

  test("SC1-4 quiet strip", async ({ page }) => {
    await openQc(page);
    const L = new Ledger("SC1-4");
    const qid = await openSlide(page, "Queried", true);
    L.check("a quiet Queried card exists", !!qid, qid ?? "none");
    if (qid) {
      const q = await page.locator(`${CARD} [data-qc152='band']`).first().evaluate((e) => getComputedStyle(e).backgroundImage);
      L.check("quiet strip: a gradient from the band ending in white", /linear-gradient/.test(q) && q.includes(band("queried")) && /rgb\(255, 255, 255\)\s*82%\)$/.test(q), q);
      await closeSlide(page);
    }
    const wid = await openSlide(page, "Queried", false);
    L.check("a waiting Queried card exists", !!wid, wid ?? "none");
    if (wid) {
      const w = await page.locator(`${CARD} [data-qc152='band']`).first().evaluate((e) => ({ img: getComputedStyle(e).backgroundImage, bg: getComputedStyle(e).backgroundColor }));
      L.check("waiting strip is flat", w.img === "none" && w.bg === band("queried"), JSON.stringify(w));
      await closeSlide(page);
    }
    const offerQuiet = await page.locator(`${PAGE} [data-qc154='card'][data-status='Offer'][data-quiet]`).count();
    L.check("no Offer card is quiet", offerQuiet === 0, String(offerQuiet));
    L.done(5);
  });

  test("SC1-5 agent bubbles · SC1-6 writer bubbles · SC1-7 offer bubble", async ({ page }) => {
    await openQc(page);
    const L5 = new Ledger("SC1-5"), L6 = new Ledger("SC1-6"), L7 = new Ledger("SC1-7");
    const MOVE: Record<string, Stage> = { "Partial Requested": "partial", "Full Requested": "full", "Revise & Resubmit": "full", Offer: "offer", Rejected: "closed" };
    const seen = new Set<string>();
    for (const status of ["Partial Requested", "Full Requested", "Revise & Resubmit", "Offer", "Rejected", "Full Sent", "Partial Sent"]) {
      const id = await openSlide(page, status, null);
      if (!id) continue;
      const fold = page.locator(`${CARD} [data-qc152='fold']`);
      if (await fold.count()) { await fold.first().click(); await page.waitForTimeout(300); }
      const msgs = await page.locator(CARD).first().evaluate((c) => [...c.querySelectorAll<HTMLElement>("[data-qc152='msg']:not([data-qc1522='draft'])")].map((m) => {
        const b = m.querySelector<HTMLElement>("[data-qc152='bubble']")!; const cs = getComputedStyle(b);
        return { side: m.dataset.side!, status: m.dataset.status ?? "", kind: m.dataset.kind ?? "", bg: cs.backgroundColor, img: cs.backgroundImage, shadow: cs.boxShadow };
      }));
      for (const m of msgs) {
        if (m.side === "them" && !m.kind && MOVE[m.status]) {
          const st = MOVE[m.status]; const k = `them:${m.status}`;
          L5.check(`${status} card · agent "${m.status}" bubble is ${band(st)} with edge ${edge(st)}`, m.bg === band(st) && m.shadow.includes(edge(st)), `${m.bg} ${m.shadow}`);
          seen.add(k);
          if (m.status === "Offer") L7.check(`${status} card · "made an offer" has the sheen`, /linear-gradient\(112deg/.test(m.img), m.img);
          else L7.check(`${status} card · agent "${m.status}" has no sheen`, m.img === "none", m.img);
        }
        if (m.side === "me") {
          L6.check(`${status} card · writer "${m.status || m.kind}" is paper`, m.bg === "rgb(246, 243, 238)" && m.img === "none", `${m.bg} ${m.img}`);
          if (status === "Offer") L7.check(`Offer card · writer "${m.status || m.kind}" has no sheen`, m.img === "none", m.img);
        }
      }
      await closeSlide(page);
    }
    L5.check("agent bubbles seen for partial, full and closed", ["them:Partial Requested", "them:Full Requested", "them:Rejected"].every((k) => seen.has(k)), [...seen].join(", "));
    L5.done(4); L6.done(4); L7.done(2);
  });

  test("SC1-11 no movement — the slide-out's boxes against the Step 0.6 baseline", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const base = JSON.parse(readFileSync(`${DIR}/baseline.json`, "utf8")) as SlideGeo[];
    await openQc(page);
    const L = new Ledger("SC1-11");
    const near = (a: number[] | null, b: number[] | null) => (!a && !b) || (!!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 1));
    for (const b of base) {
      const quiet = b.status.endsWith("(quiet)");
      const status = b.status.replace(" (quiet)", "");
      const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${b.id}']`);
      if (!(await c.count())) { L.check(`${b.status} ${b.id} still on the grid`, false, "gone"); continue; }
      await c.scrollIntoViewIfNeeded(); await c.locator("[data-qc154='name']").first().click();
      await page.locator(`${CARD}[data-id='${b.id}']`).first().waitFor({ timeout: 15_000 }); await page.waitForTimeout(700);
      const g = await slideGeo(page);
      L.check(`${b.status}: outer`, near(g.outer, b.outer), `${g.outer} vs ${b.outer}`);
      L.check(`${b.status}: strip`, near(g.strip, b.strip), `${g.strip} vs ${b.strip}`);
      /* the pill is the one box the prompt resizes (30px, 14px / 600): it holds its right edge and its centre line */
      const right = (x: number[]) => x[0] + x[2], mid = (x: number[]) => x[1] + x[3] / 2;
      L.check(`${b.status}: pill right edge and centre held (size is the reference's)`, Math.abs(right(g.pill) - right(b.pill)) <= 1 && Math.abs(mid(g.pill) - mid(b.pill)) <= 1, `${g.pill} vs ${b.pill}`);
      L.check(`${b.status}: footer`, near(g.foot, b.foot), `${g.foot} vs ${b.foot}`);
      L.check(`${b.status}: ${b.bubbles.length} bubbles`, g.bubbles.length === b.bubbles.length && g.bubbles.every((x, i) => near(x, b.bubbles[i])), JSON.stringify(g.bubbles));
      void quiet; void status;
      await closeSlide(page);
    }
    L.done(25);
  });

  test("SC1-12 Birds-eye", async ({ page }) => {
    await openQc(page, "birds");
    const L = new Ledger("SC1-12");
    const bars = (await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-bar']")].map((b) => {
      const cs = getComputedStyle(b);
      return { id: b.closest<HTMLElement>("[data-qc150='be-row']")?.dataset.id ?? "", bg: cs.backgroundColor, img: cs.backgroundImage };
    }))).map((b) => ({ ...b, status: STATUS_BY_ID.get(b.id) ?? "" }));
    L.check(`current bars found: ${bars.length}`, bars.length > 0, "");
    const by = new Map<string, string>();
    for (const b of bars) {
      if (!b.status) continue;
      const st = stageOf(b.status);
      if (by.has(b.status)) continue;
      by.set(b.status, b.bg);
      L.check(`${b.status}: current segment ${band(st)}`, b.bg === band(st), b.bg);
      if (st === "offer") L.check(`${b.status}: the sheen`, /linear-gradient\(112deg/.test(b.img), b.img);
    }
    L.check("Partial Requested and Partial Sent segments are equal", !!by.get("Partial Requested") && by.get("Partial Requested") === by.get("Partial Sent"), `${by.get("Partial Requested")} / ${by.get("Partial Sent")}`);
    L.done(6);
  });
  test("SC1-13 marks are ink — Query Centre, Dashboard, Responses", async ({ page }) => {
    const L = new Ledger("SC1-13");
    for (const route of ["/queries", "/dashboard", "/queries/responses"]) {
      await guides(page);
      await openRoute(page, route, DESK);
      await page.waitForTimeout(800);
      const marks = await page.evaluate(() => {
        const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const out: { c: string; closed: boolean }[] = [];
        for (const n of document.querySelectorAll<HTMLElement>("[data-qc153='node'], span > svg[viewBox='0 0 24 24'][style*='display: block']")) {
          if (!vis(n)) continue;
          out.push({ c: getComputedStyle(n).color, closed: !!n.closest(".is-ended, [data-ended], .qc152-fg.grey, .qc152-g0.grey, .grey, [aria-disabled='true']") });
        }
        return out;
      });
      const open = marks.filter((m) => !m.closed);
      L.check(`${route}: marks found (${open.length})`, open.length > 0, String(marks.length));
      const bad = open.filter((m) => m.c !== "rgb(28, 19, 15)" && m.c !== "rgba(28, 19, 15, 0.42)");
      L.check(`${route}: every open mark ink or ink at .42`, bad.length === 0, [...new Set(bad.map((b) => b.c))].join(" ") || "all ink");
    }
    L.done(6);
  });

  test("SC1-14 Responses — the carousel's cards", async ({ page }) => {
    const L = new Ledger("SC1-14");
    await guides(page);
    await openRoute(page, "/queries/responses", DESK);
    await page.waitForTimeout(800);
    const got = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc154='card']")].map((c) => {
      const cs = getComputedStyle(c.querySelector<HTMLElement>("[data-qc154='band']")!);
      return { status: c.dataset.status!, bg: cs.backgroundColor, img: cs.backgroundImage };
    }));
    L.check(`carousel cards found (${got.length})`, got.length > 0, got.map((g) => g.status).join(", "));
    const first = (st: string) => got.find((g) => g.status === st);
    const of = first("Offer"), pr = first("Partial Requested"), rr = first("Revise & Resubmit");
    L.check("the Offer card is rose rgb(239, 205, 201) under the sheen", !!of && of.bg === "rgb(239, 205, 201)" && /linear-gradient\(112deg/.test(of.img), of ? of.bg : "none");
    L.check("a partial card is rgb(228, 235, 242)", !!pr && pr.bg === "rgb(228, 235, 242)", pr ? pr.bg : "none");
    L.check("a Revise and resubmit card is rgb(183, 201, 222)", !!rr && rr.bg === "rgb(183, 201, 222)", rr ? rr.bg : "none");
    const seen = new Set<string>();
    for (const g of got) {
      if (seen.has(g.status)) continue; seen.add(g.status);
      const st = stageOf(g.status);
      L.check(`${g.status}: band ${band(st)}`, g.bg === band(st), g.bg);
      if (st === "offer") L.check(`${g.status}: the sheen`, /linear-gradient\(112deg/.test(g.img), g.img);
    }
    const words = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-rsp15='quote-card'], [data-rsp15='words-note']")].map((e) => ({ tone: e.dataset.tone ?? "", st: getComputedStyle(e.querySelector(".rsp15-pl") ?? e).backgroundColor })));
    for (const w of words.slice(0, 4)) L.check(`In their words tone "${w.tone}" is a stage`, ["queried", "partial", "full", "offer", "closed"].includes(w.tone), w.tone);
    L.done(2);
  });

  test("SC1-15 Dashboard — the week breakdown's stage segments", async ({ page }) => {
    const L = new Ledger("SC1-15");
    await guides(page);
    await openRoute(page, "/dashboard", DESK);
    const wk = page.locator("[data-d2='week']");
    L.check(`week points found (${await wk.count()})`, (await wk.count()) > 0, "");
    let rows: { key: string; bg: string }[] = [];
    for (let i = (await wk.count()) - 1; i >= 0 && !rows.length; i--) {
      await wk.nth(i).hover({ force: true }); await page.waitForTimeout(400);
      rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-d2='wtip-row']")].map((r) => ({ key: r.dataset.key!, bg: getComputedStyle(r.querySelector("i")!).backgroundColor })));
    }
    L.check(`breakdown rows found (${rows.length})`, rows.length > 0, rows.map((r) => r.key).join(", "));
    for (const r of rows) if (r.key !== "undated") L.check(`${r.key}: segment ${band(r.key as Stage)}`, r.bg === band(r.key as Stage), r.bg);
    L.done(3);
  });

  test("SC1-16 phone — statusFill and the query page's strip", async ({ page }) => {
    const L = new Ledger("SC1-16");
    await guides(page);
    await openPhone(page, "/queries");
    const glyphs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pa3='glyph'][data-status]")].filter((g) => g.dataset.status).map((g) => ({ status: g.dataset.status!, bg: getComputedStyle(g).backgroundColor })));
    const seen = new Set<Stage>();
    for (const g of glyphs) { const st = stageOf(g.status); if (seen.has(st)) continue; seen.add(st); L.check(`glyph ${g.status}: ${band(st)}`, g.bg === band(st), g.bg); }
    L.check(`phone glyphs cover ≥ 3 stages (${[...seen].join(", ")})`, seen.size >= 3, String(glyphs.length));
    const row = page.locator("[data-pa4='qrow']").first();
    if (await row.count()) {
      await row.click(); await page.waitForTimeout(900);
      const b = await page.locator("[data-pa4='band']").first().evaluate((e) => ({ status: (e as HTMLElement).dataset.status!, bg: getComputedStyle(e).backgroundColor, img: getComputedStyle(e).backgroundImage, fg: getComputedStyle(e).color })).catch(() => null);
      L.check("phone query page strip found", !!b, JSON.stringify(b));
      if (b) L.check(`phone strip ${b.status}: ${band(stageOf(b.status))}`, b.bg === band(stageOf(b.status)), b.bg);
    } else L.check("a phone query row exists", false, "none");
    L.done(4);
  });

  test("SC1-17 out of scope held — the Contact list is pixel-identical", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const L = new Ledger("SC1-17");
    const a = `${SHOTS}/before-contacts.png`, b = `${SHOTS}/${PHASE}-contacts.png`;
    L.check("both Contact list shots exist", existsSync(a) && existsSync(b), "");
    if (existsSync(a) && existsSync(b)) L.check("Contact list: identical bytes", readFileSync(a).equals(readFileSync(b)), `${readFileSync(a).length} / ${readFileSync(b).length}`);
    L.done(2);
  });
});
