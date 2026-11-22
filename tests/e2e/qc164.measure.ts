/**
 * Query card v164 — the slide-in card's look: the track and the status name in the strip, the type to the rules, the
 * bubbles, the toast in the layout. design-refs/query-card-v164/query-card-v164.html.
 *
 * Modes (QC164_TAG):
 *   before — the base build: records what Step 0.4 asks for (every text node under 12px on the four tabs, every
 *            JetBrains Mono use) and each material chip's behaviour (what its press shows), for lock 7. Asserts nothing.
 *   after  — (default) the locks, L1–L10.
 *   mutant — the same locks after a NAMED runtime mutation per lock, applied in the page (QC164_MUT lists them, default
 *            all). Every lock must go red. The ledgers are written as mutant-L*.json.
 * Frames (QC164_ONLY=F): 1512 and 1920 wide, every state the brief names.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { liftMotionSuppression, openRoute } from "./measure";

const TAG = (process.env.QC164_TAG ?? "after") as "before" | "after" | "mutant";
const ONLY = process.env.QC164_ONLY ?? "";
const run = (id: string) => (!ONLY && id !== "F") || ONLY.split(",").includes(id);
const MUT = TAG === "mutant" ? (process.env.QC164_MUT ?? "1,2,3,4,5,6,7,8,9,10").split(",") : [];
const DIR = "reports/query-card-v164";
const PAGE = ".qc151.qc153";
const CARD = "[data-qp='panel'] [data-qc152='card']";
const C = (s: string) => `${CARD} ${s}`;
const CP = C("[data-qc1522='composer']");
const SAVE = C("[data-qc1522='composer'] [data-qc1522='save']");
const UNDO = C("[data-qc1522='undo']");
test.setTimeout(900_000); // 11 cards × 4 tabs read in one test
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/frames`, { recursive: true });
const seed = (a = "") => execSync(`node tests/e2e/seedQc152.mjs ${a}`, { encoding: "utf8", stdio: "pipe", timeout: 60_000, killSignal: "SIGKILL" });
test.beforeAll(() => { seed(); });
test.afterAll(() => { seed("--clean"); });

/** the seeded cards (seedQc152.mjs) and what the strip must say: [id, status name, step n of 4 (null: closed)] */
const CARDS: [string, string, number | null][] = [
  ["q152-agent", "Queried", 1], ["q152-quiet", "Queried", 1], ["q152-materials", "Partial requested", 2], ["q152-undated", "Partial sent", 2],
  ["q152-fullreq", "Full requested", 3], ["q152-long", "Full sent", 3], ["q152-rr", "Revise & resubmit", 3], ["q152-offer", "Offer", 4],
  ["q152-closed", "Passed", null], ["q152-passed", "Passed", null], ["q152-withdrew", "Withdrawn", null],
];
/** the step a closed card stopped at (its furthest: lib/qc153 slipTrack) */
const CLOSED_AT: Record<string, number> = { "q152-closed": 0, "q152-passed": 2, "q152-withdrew": 0 };
/** lib/stageColours `band`, as the browser writes it */
const BAND: Record<string, string> = { queried: "#efe6d6", partial: "#e4ebf2" };
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${TAG}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    const bad = this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`);
    if (TAG === "mutant") expect(bad.length, `${this.id}: the mutation must turn the lock red`).toBeGreaterThan(0);
    else expect(bad).toEqual([]);
  }
}
const prefs = () => {
  try {
    sessionStorage.removeItem("qh.qc.filters"); sessionStorage.setItem("qh.qc.view150", "list");
    localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: "none", sort: { key: "due", reversed: false }, density: "comfortable" }));
    localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
  } catch { /* private mode */ }
};
async function openQc(page: Page, vp = { width: 1512, height: 900 }) {
  await page.setViewportSize(vp);
  await page.addInitScript(prefs);
  await openRoute(page, "/queries", vp);
  await liftMotionSuppression(page);
  await page.locator(`${PAGE} [data-qc154='card']`).first().waitFor({ timeout: 60_000 });
  const more = page.locator(`${PAGE} [data-qc153='show-all']`);
  for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
async function openCard(page: Page, id: string): Promise<boolean> {
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`).first();
  if (!(await c.count())) return false;
  /* a card already open: its own close button first (the grid is behind the dim) */
  const x = page.locator(C("[data-qc149c='close']"));
  if (await x.count()) { await x.first().click().catch(() => {}); await page.locator(CARD).waitFor({ state: "detached", timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); }
  await c.scrollIntoViewIfNeeded();
  await c.locator("[data-qc154='name']").first().click();
  const ok = await page.locator(`${CARD}[data-id='${id}']`).waitFor({ timeout: 15_000 }).then(() => true, () => false);
  await page.waitForTimeout(900);
  await mutate(page);
  return ok;
}
async function tab(page: Page, t: string) { await page.locator(C(`[data-qc152='tab'][data-tab='${t}']`)).click(); await page.waitForTimeout(350); await mutate(page); }

/* ── the named mutations (mutant mode), each the undoing of one lock's subject, applied in the page ── */
async function mutate(page: Page) {
  if (!MUT.length) return;
  await page.evaluate(({ m, card }) => {
    const root = document.querySelector<HTMLElement>(card);
    if (!root) return;
    const on = (k: string) => m.includes(k);
    const css = (id: string, t: string) => { if (!document.getElementById(id)) { const s = document.createElement("style"); s.id = id; s.textContent = t; document.head.append(s); } };
    /* M1 restore the old word */
    if (on("1")) { const w = root.querySelector("[data-qc152='band-word']"); if (w) w.textContent = "YOUR MOVE"; }
    /* M2 the current step moved one along */
    if (on("2")) { const st = root.querySelector<HTMLElement>("[data-qc164='status']"); if (st && !st.dataset.m2) { st.dataset.m2 = "1"; const l = st.getAttribute("aria-label") ?? ""; st.setAttribute("aria-label", /step \d/.test(l) ? l.replace(/step (\d)/, (_, n) => `step ${+n === 4 ? 3 : +n + 1}`) : `${l}, step 1 of 4`); } }
    /* M3 the label back beside the name, and the day back in the strip */
    if (on("3")) {
      const ag = root.querySelector(".qc152-agent"); if (ag && !ag.querySelector("[data-qc152='pill']")) { const p = document.createElement("span"); p.dataset.qc152 = "pill"; p.textContent = "Queried"; ag.append(p); }
      const b = root.querySelector("[data-qc152='band']"); if (b && !b.querySelector("[data-m3]")) { const d = document.createElement("span"); d.dataset.m3 = "1"; d.textContent = "Day 7"; b.append(d); }
    }
    /* M4 one chip at 10px (and, where a tab has none, its first text at 10px) */
    if (on("4")) css("m4", `${card} [data-qc152='chip'], ${card} [data-qc152='body'] :is(b, span, em, small):first-of-type { font-size: 10px !important; }`);
    /* M5 the agency back in JetBrains Mono */
    if (on("5")) css("m5", `${card} .qc152-ag, ${card} [data-qc152='msg-date'] { font-family: "JetBrains Mono", monospace !important; }`);
    /* M6 the old pill buttons and the pill status box */
    if (on("6")) css("m6", `${card} :is(.qc152-rbtn, .qc1522-btn) { height: 52px !important; min-height: 52px !important; border-radius: 26px !important; } ${card} .qc152-rf { border-radius: 26px !important; }`);
    /* M7 the line rendered as plain text */
    if (on("7")) root.querySelectorAll<HTMLElement>("button[data-qc152='chip']").forEach((b) => { const s = document.createElement("span"); s.className = b.className; s.dataset.qc152 = "chip"; s.textContent = b.textContent; b.replaceWith(s); });
    /* M8 the writer's bubbles back on paper */
    if (on("8")) css("m8", `${card} .qc152-m.me .qc152-bx { background: #f6f3ee !important; }`);
    /* M9 always render: an empty quote in every agent bubble */
    if (on("9")) root.querySelectorAll(".qc152-m.them .qc152-qx").forEach((q) => { if (!q.querySelector("[data-qc152='quote']")) { const e = document.createElement("div"); e.className = "qc152-qt"; e.dataset.qc152 = "quote"; e.textContent = "“”"; q.append(e); } });
    /* M10 the toast back over the thread (absolute, 86px above the foot) */
    if (on("10")) css("m10", `${card} .qc152-in > .qc1522-toast { position: absolute !important; left: 50% !important; bottom: 86px !important; transform: translateX(-50%) !important; order: 0 !important; }`);
  }, { m: MUT, card: CARD });
}

/** every text node in the card's open tab and header: its font size and family, with a path to name it */
async function textScan(page: Page) {
  return page.evaluate((card) => {
    const root = document.querySelector<HTMLElement>(card);
    if (!root) return [];
    const out: { where: string; text: string; px: number; family: string; head: boolean }[] = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const name = (e: Element) => { const parts: string[] = []; let x: Element | null = e; for (let i = 0; i < 3 && x && x !== root; i++, x = x.parentElement) parts.unshift(x.tagName.toLowerCase() + (x.className && typeof x.className === "string" ? "." + x.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + (x.getAttribute("data-qc152") ? `[${x.getAttribute("data-qc152")}]` : "")); return parts.join(" > "); };
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = (n.textContent ?? "").trim();
      const e = n.parentElement;
      if (!t || !e) continue;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (cs.visibility === "hidden" || cs.display === "none" || r.width === 0 || r.height === 0 || e.closest("[aria-hidden='true'].qc152-tsp")) continue;
      if (e.closest("[data-qc152='tip']")) continue;
      const head = !e.closest("[data-qc152='body']") && !e.closest("[data-qc152='reply']");
      out.push({ where: name(e), text: t.slice(0, 40), px: parseFloat(cs.fontSize), family: cs.fontFamily, head });
    }
    return out;
  }, CARD);
}
const mono = (f: string) => /JetBrains Mono/i.test(f);

/** what each material chip in the thread does when pressed: the tip it shows */
async function chipBehaviour(page: Page) {
  const out: { label: string; focusable: boolean; tip: string | null }[] = [];
  const chips = page.locator(C("[data-qc152='thread'] [data-qc152='chip']"));
  const n = await chips.count();
  /* ⚠️ every call bounded, and the tip dismissed by blurring the chip (its own close path) — a click outside lands on
     the dim and closes the card, after which an unbounded nth(i) waits for ever (15 min hang, 22 Nov) */
  for (let i = 0; i < n; i++) {
    const ch = chips.nth(i);
    if (!(await page.locator(CARD).count())) break;
    const label = ((await ch.textContent({ timeout: 3000 }).catch(() => "")) ?? "").trim();
    const focusable = await ch.evaluate((e) => { (e as HTMLElement).focus(); return document.activeElement === e && (e as HTMLElement).tabIndex >= 0; }, null, { timeout: 3000 }).catch(() => false);
    await ch.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150);
    const tip = await page.evaluate(() => { const t = document.querySelector<HTMLElement>("[data-qc152='tip']"); if (!t) return null; const cs = getComputedStyle(t); return cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0" ? null : (t.textContent ?? "").trim(); });
    out.push({ label, focusable, tip });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); await page.waitForTimeout(100);
  }
  return out;
}
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/* ══ before: Step 0.4's lists and the chips' behaviour on the base ══ */
if (TAG === "before" && run("B")) test("QC164 before · the under-12px and mono lists; each chip's behaviour", async ({ page }) => {
  await openQc(page);
  const small: Record<string, string[]> = {}, monos: Record<string, string[]> = {}, chips: Record<string, unknown> = {};
  for (const [id] of CARDS) {
    if (!(await openCard(page, id))) continue;
    for (const t of ["tracking", "agent", "materials", "notes"]) {
      await tab(page, t);
      for (const x of await textScan(page)) {
        const k = `${t}${x.head ? " (header)" : ""}`;
        if (x.px < 12) (small[k] ??= []).includes(`${x.where} · ${x.px}px · "${x.text}"`) || small[k].push(`${x.where} · ${x.px}px · "${x.text}"`);
        if (mono(x.family)) (monos[k] ??= []).includes(`${x.where} · ${x.px}px · "${x.text}"`) || monos[k].push(`${x.where} · ${x.px}px · "${x.text}"`);
      }
    }
    await tab(page, "tracking");
    chips[id] = await chipBehaviour(page);
  }
  writeFileSync(`${DIR}/before-under12.json`, JSON.stringify(small, null, 1));
  writeFileSync(`${DIR}/before-mono.json`, JSON.stringify(monos, null, 1));
  writeFileSync(`${DIR}/before-chips.json`, JSON.stringify(chips, null, 1));
  expect(Object.keys(chips).length).toBeGreaterThan(5);
});

/* ══ L1–L3, L5, L8, L9 — read on every seeded card ══ */
if (TAG !== "before" && run("1")) test("QC164-1/2/3/8/9 · strip name and track, no label, day in the name row, bubble paper, their words", async ({ page }) => {
  const L1 = new Ledger("L1"), L2 = new Ledger("L2"), L3 = new Ledger("L3"), L8 = new Ledger("L8"), L9 = new Ledger("L9");
  await openQc(page);
  for (const [id, name, step] of CARDS) {
    const opened = await openCard(page, id);
    L1.check(`${id}: population — the card opened`, opened, "");
    if (!opened) continue;
    const s = await page.evaluate((card) => {
      const r = document.querySelector<HTMLElement>(card)!;
      const band = r.querySelector<HTMLElement>("[data-qc152='band']")!;
      const st = band.querySelector<HTMLElement>("[data-qc164='status']");
      const nodes = [...band.querySelectorAll<HTMLElement>("[data-qc164='track'] [data-qc153='node']")];
      const cur = nodes.findIndex((n) => n.dataset.state === "cur");
      /* ⚠️ layout sizes, never bounding boxes: the panel leans (~1.6°), so every rect of the frame reads too big */
      const px = (e: Element | null | undefined) => (e ? parseFloat(getComputedStyle(e).width) : 0);
      const curBox = cur >= 0 ? { width: nodes[cur].offsetWidth, height: nodes[cur].offsetHeight } : null;
      const curSvg = cur >= 0 ? { width: px(nodes[cur].querySelector("svg")) } : null;
      const other = { width: px(nodes.find((n, i) => i !== cur)?.querySelector("svg")) };
      return {
        word: band.querySelector("[data-qc152='band-word']")?.textContent ?? null, label: st?.getAttribute("aria-label") ?? null, role: st?.getAttribute("role") ?? null,
        bandText: band.textContent ?? "", nodes: nodes.length, cur, ended: !!band.querySelector(".qc153-trk.is-ended"),
        curDisc: curBox ? `${Math.round(curBox.width)}x${Math.round(curBox.height)}` : "", curSvg: curSvg ? Math.round(curSvg.width) : 0, otherSvg: other ? Math.round(other.width) : 0,
        bandH: band.offsetHeight,
        pill: !!r.querySelector("[data-qc152='pill']"), day: r.querySelector(".qc152-agent [data-qc164='day']")?.textContent ?? null,
        dayInBand: /Day \d/.test(band.textContent ?? ""),
        btns: [...band.querySelectorAll<HTMLElement>(".qc152-x")].map((b) => `${b.offsetWidth}x${b.offsetHeight}`),
      };
    }, CARD);
    L1.check(`${id}: the strip names the status "${name}"`, s.word === name, String(s.word));
    L1.check(`${id}: no "Your move" / "With the agent" in the strip`, !/your move|with the agent/i.test(s.bandText), s.bandText.slice(0, 60));
    L1.check(`${id}: the status's accessible name`, s.role === "img" && s.label === (step == null ? name : `${name}, step ${step} of 4`), `${s.role} "${s.label}"`);
    L1.check(`${id}: strip at least 54px; its buttons 36px`, s.bandH >= 54 && s.btns.every((b) => b === "36x36"), `${s.bandH} · ${s.btns.join(",")}`);
    const want = step == null ? CLOSED_AT[id] : step - 1;
    L2.check(`${id}: four steps, the current at step ${want + 1}`, s.nodes === 4 && s.cur === want && s.label?.includes(step == null ? name : `step ${want + 1} of 4`), `${s.nodes} nodes · cur ${s.cur} · "${s.label}"`);
    L2.check(`${id}: ${step == null ? "closed: the track is ended" : "live: the track is not ended"}`, s.ended === (step == null), String(s.ended));
    L2.check(`${id}: the current mark 22px on a 30px disc; the others 16px`, s.curDisc === "30x30" && s.curSvg === 22 && s.otherSvg === 16, `${s.curDisc} · ${s.curSvg} · ${s.otherSvg}`);
    L3.check(`${id}: no status label in the name row`, !s.pill, "");
    L3.check(`${id}: the day is in the name row, not the strip`, !s.dayInBand && (step == null ? s.day == null : /^Day \d+$/.test(s.day ?? "")), `${s.day} · in band ${s.dayInBand}`);
    /* L8 — the writer's bubbles white; the agent's their stage band (a holding reply white) */
    const bx = await page.evaluate((card) => [...document.querySelectorAll<HTMLElement>(`${card} [data-qc152='thread'] > [data-qc152='msg']`)].map((m) => ({
      side: m.dataset.side, status: m.dataset.status ?? "", kind: m.dataset.kind ?? "", bg: getComputedStyle(m.querySelector<HTMLElement>("[data-qc152='bubble']")!).backgroundColor,
      quote: m.querySelector<HTMLElement>("[data-qc152='quote']") ? (() => { const q = m.querySelector<HTMLElement>("[data-qc152='quote']")!; const cs = getComputedStyle(q); const cl = q.cloneNode(true) as HTMLElement; cl.querySelectorAll(".qc152-tsp").forEach((x) => x.remove()); return { text: cl.textContent ?? "", clamp: cs.webkitLineClamp || (cs as unknown as Record<string, string>).lineClamp, h: q.offsetHeight, lh: parseFloat(cs.lineHeight), rule: cs.borderLeftWidth + " " + cs.borderLeftColor }; })() : null,
    })), CARD);
    for (const [i, b] of bx.entries()) {
      if (b.side === "me") L8.check(`${id} #${i}: the writer's bubble is white`, b.bg === "rgb(255, 255, 255)", b.bg);
      else if (b.kind === "holding") L8.check(`${id} #${i}: a holding reply stays white`, b.bg === "rgb(255, 255, 255)", b.bg);
      else {
        const stg = /Partial/.test(b.status) ? "partial" : b.status === "Queried" ? "queried" : null;
        if (stg) L8.check(`${id} #${i}: the agent's bubble is its stage band (${stg})`, b.bg === rgb(BAND[stg]), b.bg);
        else L8.check(`${id} #${i}: the agent's bubble is tinted, not white`, b.bg !== "rgb(255, 255, 255)" && b.bg !== "rgba(0, 0, 0, 0)", b.bg);
      }
    }
    /* L9 — their words: shown and clamped where stored; no quote element where not */
    const stored = id === "q152-passed" || id === "q152-rr";
    const qs = bx.filter((b) => b.quote);
    if (id === "q152-passed") {
      const q = qs[0]?.quote;
      L9.check(`${id}: the stored words are shown in curly quotes`, !!q && /^“.+”$/.test(q.text.trim()) && /Beautifully written/.test(q.text), q?.text ?? "none");
      L9.check(`${id}: clamped to four lines, with the 2px rule`, !!q && String(q.clamp) === "4" && q.h <= q.lh * 4 + 1 && /^2px/.test(q.rule), q ? `${q.clamp} · ${q.h} / ${q.lh} · ${q.rule}` : "none");
    } else if (!stored) {
      L9.check(`${id}: no words stored, no quote element`, qs.length === 0, String(qs.length));
    }
  }
  for (const L of [L1, L2, L3, L8, L9]) L.done(5);
});

/* ══ L4/L5 — every text node ≥ 12px on the four tabs; no JetBrains Mono on the header or the Tracking tab ══ */
if (TAG !== "before" && run("4")) test("QC164-4/5 · nothing under 12px on four tabs; no mono on the header or Tracking", async ({ page }) => {
  const L4 = new Ledger("L4"), L5 = new Ledger("L5");
  await openQc(page);
  const monoLeft: Record<string, string[]> = {};
  for (const [id] of CARDS) {
    if (!(await openCard(page, id))) continue;
    for (const t of ["tracking", "agent", "materials", "notes"]) {
      await tab(page, t);
      const xs = await textScan(page);
      const small = xs.filter((x) => x.px < 12);
      L4.check(`${id} · ${t}: ${xs.length} text nodes, none under 12px`, xs.length > 0 && small.length === 0, small.slice(0, 3).map((x) => `${x.where} ${x.px}px "${x.text}"`).join(" | "));
      const m = xs.filter((x) => mono(x.family) && (x.head || t === "tracking"));
      L5.check(`${id} · ${t}: no JetBrains Mono on the header${t === "tracking" ? " or the thread" : ""}`, m.length === 0, m.slice(0, 3).map((x) => `${x.where} "${x.text}"`).join(" | "));
      for (const x of xs.filter((x) => mono(x.family) && !x.head && t !== "tracking")) { const k = t; (monoLeft[k] ??= []).includes(`${x.where} "${x.text}"`) || monoLeft[k].push(`${x.where} "${x.text}"`); }
    }
  }
  if (TAG === "after") writeFileSync(`${DIR}/after-mono-left.json`, JSON.stringify(monoLeft, null, 1));
  L4.done(20); L5.done(20);
});

/* ══ L6/L7 — the buttons' shape; each material item a control that does what its chip did ══ */
if (TAG !== "before" && run("6")) test("QC164-6/7 · footer and drawer buttons 40 / radius 10, status box 12; material items still controls", async ({ page }) => {
  const L6 = new Ledger("L6"), L7 = new Ledger("L7");
  await openQc(page);
  const base = existsSync(`${DIR}/before-chips.json`) ? JSON.parse(readFileSync(`${DIR}/before-chips.json`, "utf8")) as Record<string, { label: string; tip: string | null }[]> : {};
  L7.check("population: the base's chip behaviour was recorded (QC164_TAG=before)", Object.keys(base).length > 5, String(Object.keys(base).length));
  for (const [id] of CARDS) {
    if (!(await openCard(page, id))) continue;
    const b = await page.evaluate((card) => {
      const r = document.querySelector<HTMLElement>(card)!;
      const box = (e: Element) => { const cs = getComputedStyle(e); return `${(e as HTMLElement).offsetHeight}/${cs.borderTopLeftRadius}`; };
      return { btn: [...r.querySelectorAll(".qc152-rbtn")].map(box), rf: [...r.querySelectorAll(".qc152-rf")].map((e) => getComputedStyle(e).borderTopLeftRadius) };
    }, CARD);
    L6.check(`${id}: footer buttons 40 high, radius 10`, b.btn.length > 0 && b.btn.every((x) => x === "40/10px"), b.btn.join(","));
    if (b.rf.length) L6.check(`${id}: footer status box radius 12`, b.rf.every((x) => x === "12px"), b.rf.join(","));
    const now = await chipBehaviour(page);
    const was = base[id] ?? [];
    L7.check(`${id}: as many material items as the base had chips (${was.length})`, now.length === was.length, `${now.length}`);
    for (const [i, c] of now.entries()) {
      L7.check(`${id} · "${c.label}": focusable`, c.focusable, "");
      const w = was[i];
      L7.check(`${id} · "${c.label}": the press shows what the chip's did`, !!w && c.tip != null && w.tip != null && norm(c.tip) === norm(w.tip), `${c.tip} | base ${w?.tip}`);
    }
  }
  /* the drawer's buttons: open the composer on a queried card, read them, close it */
  await openCard(page, "q152-agent");
  await page.locator(C("[data-qc152='reply-btn']")).click();
  await page.locator(CP).waitFor({ timeout: 8000 });
  await page.waitForTimeout(500); await mutate(page);
  const db = await page.evaluate((cp) => [...document.querySelectorAll(`${cp} .qc1522-btn`)].map((e) => `${(e as HTMLElement).offsetHeight}/${getComputedStyle(e).borderTopLeftRadius}`), CP);
  L6.check("the drawer's buttons 40 high, radius 10", db.length > 0 && db.every((x) => x === "40/10px"), db.join(","));
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  L6.done(8); L7.done(8);
});

/* ══ L10 — after a save the toast sits above the footer and never over the thread ══ */
if (TAG !== "before" && run("10")) test("QC164-10 · after a save the toast's box does not meet the last bubble's", async ({ page }) => {
  const L = new Ledger("L10");
  await openQc(page);
  await openCard(page, "q152-agent");
  await page.locator(C("[data-qc152='reply-btn']")).click();
  await page.locator(CP).waitFor({ timeout: 8000 });
  await page.locator(C("[data-qc1522='reply-types'] [data-v='req']")).first().click();
  await page.waitForTimeout(500);
  await page.locator(SAVE).click();
  const ok = await page.locator(UNDO).waitFor({ timeout: 30_000 }).then(() => true, () => false);
  L.check("population: the save landed (Undo offered)", ok, "");
  await page.waitForTimeout(1600); await mutate(page); await page.waitForTimeout(100);
  /* ⚠️ in the card's own layout space (offsets within .qc152-in, the thread's scroll taken off), never bounding boxes:
     the panel leans ~1.6°, so a rect of the frame is a rotated box's envelope and overlaps what it does not touch */
  const g = await page.evaluate((card) => {
    const r = document.querySelector<HTMLElement>(card)!;
    const inn = r.querySelector<HTMLElement>(".qc152-in")!;
    const body = inn.querySelector<HTMLElement>(":scope > [data-qc152='body']")!;
    const t = inn.querySelector<HTMLElement>(":scope > [data-qc1522='toast']");
    const foot = inn.querySelector<HTMLElement>(":scope > :is([data-qc152='reply'], .qc152-rb)");
    const msgs = [...r.querySelectorAll<HTMLElement>("[data-qc152='thread'] > [data-qc152='msg']")];
    const last = msgs[msgs.length - 1]?.querySelector<HTMLElement>("[data-qc152='bubble']") ?? null;
    const top = (e: HTMLElement) => { let y = 0; for (let x: HTMLElement | null = e; x && x !== inn; x = x.offsetParent as HTMLElement | null) y += x.offsetTop; return y; };
    const lbTop = last ? top(last) - (body.contains(last) ? body.scrollTop : 0) : null;
    return {
      tb: t && { y: t.offsetTop, h: t.offsetHeight, w: t.offsetWidth }, lb: last && { y: lbTop!, h: last.offsetHeight },
      body: { y: body.offsetTop, b: body.offsetTop + body.offsetHeight }, foot: foot && { y: foot.offsetTop }, cw: inn.offsetWidth, text: t?.textContent ?? "",
    };
  }, CARD);
  L.check("the toast's box does not meet the last bubble's (the bubble ends above the toast)", !!g.tb && !!g.lb && g.lb.y + g.lb.h <= g.tb.y + 0.5, JSON.stringify({ tb: g.tb, lb: g.lb }));
  L.check("the toast sits below the thread's box and above the footer", !!g.tb && g.tb.y >= g.body.b - 0.5 && (!g.foot || g.tb.y + g.tb.h <= g.foot.y + 0.5), JSON.stringify({ tb: g.tb, body: g.body, foot: g.foot }));
  L.check("the toast is full width (within the card's inner frame)", !!g.tb && g.tb.w >= g.cw - 40, `${g.tb?.w} of ${g.cw}`);
  await page.screenshot({ path: `${DIR}/frames/${TAG}-1512-after-save.png` });
  /* restore: Undo */
  await page.locator(UNDO).click().catch(() => {});
  await page.waitForTimeout(1500);
  L.check("restore: the card is back at Queried", (await page.locator(C("[data-qc152='band-word']")).textContent()) === "Queried" || TAG !== "after", String(await page.locator(C("[data-qc152='band-word']")).textContent().catch(() => "")));
  L.done(4);
});

/* ══ Frames — 1512 and 1920 wide ══ */
if (run("F")) test("QC164 frames · reading view per state, long thread, quoted words, after a save", async ({ page }) => {
  for (const w of [1512, 1920]) {
    await page.goto("about:blank");
    await openQc(page, { width: w, height: w === 1512 ? 900 : 1080 });
    const shots: [string, string][] = [["queried", "q152-agent"], ["partial-requested", "q152-materials"], ["full-requested", "q152-fullreq"], ["offer", "q152-offer"],
      ["closed-passed", "q152-closed"], ["closed-passed-words", "q152-passed"], ["closed-withdrawn", "q152-withdrew"], ["gone-quiet", "q152-quiet"], ["long-thread", "q152-seven"], ["rr-words", "q152-rr"]];
    for (const [k, id] of shots) {
      if (!(await openCard(page, id))) continue;
      const card = page.locator(CARD).first();
      await card.screenshot({ path: `${DIR}/frames/${TAG}-${w}-${k}.png` }).catch(() => page.screenshot({ path: `${DIR}/frames/${TAG}-${w}-${k}.png` }));
    }
  }
});
