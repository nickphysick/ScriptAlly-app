/**
 * Plumage colours v3 — the rendered locks (PC3-1 … PC3-12) and the frames, on the emulator harness, in Chromium and
 * WebKit. Every colour, box and pixel is read from the page (getComputedStyle, getBoundingClientRect, elementFromPoint,
 * a screenshot); a source test is not a measurement. Each lock first proves its population is non-zero, then asserts.
 * Supersedes pc2.measure.ts (v2's stripes on the offer, its label on the band's bottom left and the paperclip are
 * retired; its outline, v1-hex, "With you", card height and rim readings are carried here).
 *
 *   PC3-1  no gradient on any offer surface: the grid band, the slide-in strip, its bubbles, the Stage filter, the Offers
 *          heading's count, Birds-eye and Responses all compute flat duck egg #c5e0d8, words and marks in ink
 *   PC3-2  the Revise & resubmit stripes on its grid band and its slide-in strip, and on nothing else on the page
 *   PC3-3  the band per status: grid band, slide-in strip, Birds-eye bar (R&R flat #d3deea off the card bands;
 *          Resubmitted #b9c9da; Full requested #d3deea); no outline; no v1/v2-gone hex
 *   PC3-4  the label: one per grid card, the card's status name, its centre on the frame's top edge, 14px in from the
 *          band's right edge, the JSON's look; drawn outside the frame; the frame clips (overflow hidden); no ancestor
 *          clips the label and its top edge line is on screen in pixels
 *   PC3-5  the label clear of the track, the seal, the name, the facts and the group heading above the card, at 1280,
 *          1512 and 1920; every grid card one height; the facts' 18px top room recorded, and the card without it
 *   PC3-6  no paperclip on any grid card (no wire clip over the edge, no .qc1533-clip, no .qc154-clipw); and v2's PC2-8:
 *          no "With you" text, chevron or new arrow on any card
 *   PC3-7  the tile: 44 × 50, radius 10, 12px in from the Sent box's right edge, vertically centred, the JSON's fill,
 *          glyph 18px over the count in Special Elite 16px, 4px apart; named "N material(s)"; takes keyboard focus
 *   PC3-8  the hover inside the viewport for a card in the last row and one in the last column; upwards when there is no
 *          room below; above the neighbouring cards (hit test); never cut by an ancestor
 *   PC3-9  the agency line rgba(28,19,15,.66), and ≥ 4.5:1 on every band it sits on
 *   PC3-10 the agent tile in search #96aca9, edge #7c9793, ink glyph; the other three kinds unchanged (v1's)
 *   PC3-11 the hover: opens on hover and on focus; closes on leave, blur and Escape (focus back on the tile); its title
 *          the tile's name; its chips the JSON's; an asked chip dashed; a Full manuscript the Full mark from StatusDot
 *   PC3-12 nothing in the tile or the hover under 12px
 *   PC3-F  the frames (reports/plumage-colours-v3/frames/)
 *
 * The harness has one Revise & resubmit query and no live Resubmitted or Signed one, so beforeAll gives a Full sent query
 * each of Revise & Resubmit and Resubmitted, and an Offer Signed, and afterAll puts all three back (the emulator exports
 * nothing either way). SA_PHASE=mutant<X> writes its ledgers beside the green ones and is expected red. PC3_ONLY=1,8 runs
 * only those locks (F for the frames, W for WebKit).
 */
import { test, expect, webkit, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { liftMotionSuppression, openRoute } from "./measure";
import { devDb } from "./devWrite";

/* ⚠️ THE EXPECTATIONS COME FROM THE PACKS, NOT FROM src/. Queried, Partial and Closed and the other three kinds are v1's
   JSON; the offer is v2's; Full, the R&R stripes, the label, the tile, the hover, the agency line and the agent tile are
   v3's. A lock that imported lib/stageColours would move with a mutation of the table. */
const V1 = JSON.parse(readFileSync("design-refs/plumage-colours-v1/plumage-colours-v1.json", "utf8")) as {
  statusBand: Record<string, string>; kinds: Record<string, { tile: string; glyph: string; edge?: string }>; stages: Record<string, { edge: string }>;
};
const V2 = JSON.parse(readFileSync("design-refs/plumage-colours-v2/plumage-colours-v2.json", "utf8")) as {
  stages: { offer: Record<string, string> }; offerStripes: string;
};
const V3 = JSON.parse(readFileSync("design-refs/plumage-colours-v3/plumage-colours-v3.json", "utf8")) as {
  ink: string; stages: { full: Record<string, string> }; reviseResubmit: { stripes: string };
  statusLabel: Record<string, string>; agencyLine: string;
  attachmentsTile: Record<string, string>; materialsHover: Record<string, unknown> & { chip: Record<string, string>; chipAskedNotSent: Record<string, string> };
  kinds: { agent: { tile: string; glyph: string; edge: string } };
};
const INK = V3.ink;
const DUCK = V2.stages.offer.band;
const FULL = V3.stages.full;
const RR = V3.reviseResubmit.stripes;
const RR_COLS = [...RR.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase());
const AGENCY = V3.agencyLine;
const NAME: Record<string, string> = {
  Queried: "Queried", "Partial Requested": "Partial requested", "Partial Sent": "Partial sent", Rejected: "Rejected", "No Response": "No response", Withdrawn: "Withdrawn",
};
const STAGE_OF = (s: string): string => (["Partial Requested", "Partial Sent"].includes(s) ? "partial" : ["Rejected", "No Response", "Withdrawn"].includes(s) ? "closed" : "queried");
const FULL_STATUS = new Set(["Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted"]);
const OFFER_STATUS = new Set(["Offer", "Signed"]);
/** a status's flat band off the two card bands */
const statusBand = (s: string): string =>
  OFFER_STATUS.has(s) ? DUCK : s === "Full Requested" || s === "Revise & Resubmit" ? FULL.bandRequested : FULL_STATUS.has(s) ? FULL.band : V1.statusBand[NAME[s] ?? "Queried"];
const edgeOf = (s: string): string => (OFFER_STATUS.has(s) ? V2.stages.offer.edge : FULL_STATUS.has(s) ? FULL.edge : V1.stages[STAGE_OF(s)].edge);
const WORD: Record<string, string> = {
  Queried: "Queried", "Partial Requested": "Partial requested", "Partial Sent": "Partial sent", "Full Requested": "Full requested",
  "Full Sent": "Full sent", "Revise & Resubmit": "Revise & resubmit", Resubmitted: "Resubmitted", Offer: "Offer", Signed: "Signed",
  Rejected: "Passed", "No Response": "No reply", Withdrawn: "Withdrawn",
};
/** hexes that may not appear on a stage surface: v1's Full and navy offer, v2's Full requested and stripe paper */
const GONE = ["#b5b6c0", "#d4d4da", "#ededef", "#a0a0ae", "#65667c", "#d9dce0", "#243247", "#aab0ba", "#dbe4ee", "#f6f0e5"];
const NAVY = "#2a3a52";
type Kind = "query" | "agent" | "material" | "task";

const PAGE = ".qc151.qc153";
const ONLY = process.env.PC3_ONLY ?? "";
const run = (id: string) => (!ONLY && id !== "F" && id !== "W") || ONLY.split(",").includes(id);
const PHASE = /^mutant[A-Z0-9]*$/.test(process.env.SA_PHASE ?? "") ? process.env.SA_PHASE! : "after";
const DIR = "reports/plumage-colours-v3";
const DESK = { width: 1512, height: 982 };
const CARD = "[data-qp='panel'] [data-qc152='card']";
test.setTimeout(480_000);
mkdirSync(`${DIR}/ledger`, { recursive: true });
mkdirSync(`${DIR}/frames`, { recursive: true });

const rgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
const parse = (c: string): [number, number, number, number] => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 0];
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
};
const hexArr = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c: number[]) => { const v = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const contrast = (fg: string, ground: string) => {
  const [r, g, b, a] = parse(fg); const G = hexArr(ground);
  const F = [r, g, b].map((v, i) => v * a + G[i] * (1 - a));
  const x = lum(F), y = lum(G);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const isInk = (c: string) => { const [r, g, b, a] = parse(c); const I = hexArr(INK); return a > 0 && r === I[0] && g === I[1] && b === I[2]; };
/** the computed R&R stripes: a repeating gradient at 118deg, the JSON's two colours in order, 22px and 44px stops */
const isRR = (img: string) => {
  if (!/^repeating-linear-gradient\(118deg,/.test(img)) return false;
  const seq = [...img.matchAll(/rgb\([^)]+\)/g)].map((m) => m[0]);
  const uniq = seq.filter((c, i) => i === 0 || c !== seq[i - 1]);
  return JSON.stringify(uniq) === JSON.stringify(RR_COLS.map(rgb)) && /22px/.test(img) && /44px/.test(img);
};
/** the JSON's agency rgba as computed */
const AGENCY_RGB = (() => { const m = AGENCY.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([.0-9]+)\)/)!; return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${Number(m[4])})`; })();

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  note(name: string, got: string) { console.log(`${this.id} · ${name} — ${got}`); this.rows.push({ name: `(recorded) ${name}`, ok: true, got }); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect.soft(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect.soft(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`), `${this.id}: red rows`).toEqual([]);
  }
}

/** a card by id: the visible one (a folded group keeps a 0 × 0 copy of a card in the DOM) */
const cardAt = (page: Page, id: string) => page.locator(`${PAGE} [data-qc154='card'][data-id='${id}'] >> visible=true`).first();

/** a measurement's click, as the DOM's own (desktop WebKit never finds the harness's buttons actionable, 23 Nov) */
const press = (l: Locator) => l.evaluate((e) => (e as HTMLElement).click());

/* ── the three seeded statuses ─────────────────────────────────────────────────────────────────────────────────── */
const seeded: { id: string; was: string; now: string }[] = [];
test.beforeAll(async () => {
  const { db, uid } = await devDb();
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const of = (s: string) => qs.docs.filter((d) => (d.data() as { status?: string }).status === s);
  const fs = of("Full Sent"), off = of("Offer");
  const plan: [string | undefined, string, string][] = [[fs[0]?.id, "Full Sent", "Revise & Resubmit"], [fs[1]?.id, "Full Sent", "Resubmitted"], [off[0]?.id, "Offer", "Signed"]];
  for (const [id, was, now] of plan) {
    if (!id) continue;
    await updateDoc(doc(db, "users", uid, "queries", id), { status: now });
    seeded.push({ id, was, now });
  }
  console.log("seeded:", JSON.stringify(seeded));
});
test.afterAll(async () => {
  const { db, uid } = await devDb();
  for (const s of seeded) await updateDoc(doc(db, "users", uid, "queries", s.id), { status: s.was });
  console.log("restored:", JSON.stringify(seeded.map((s) => [s.id, s.was])));
});

async function openQc(page: Page, view: "list" | "birds" = "list", vp = DESK) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511");
    } catch { /* private */ }
  });
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="${view}"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await press(b);
  await page.waitForTimeout(900);
  if (view === "list") {
    await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
    const more = page.locator(`${PAGE} [data-qc153='show-all']`);
    for (let i = 0; i < 6 && (await more.count()) > 0; i++) { await press(more.first()); await page.waitForTimeout(300); }
  }
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(700);
  await page.mouse.move(2, 2);
}

interface Box { x: number; y: number; w: number; h: number }
interface CardReading {
  id: string; status: string; quiet: boolean; bg: string; img: string; shadow: string; h: number; band: Box; frame: Box; frameOverflow: string;
  labels: { text: string; box: Box; edge: string; font: string; size: string; color: string; bg: string; radius: string; inFrame: boolean; shadow: string }[];
  seal: Box | null; name: Box | null; track: Box | null; facts: Box[]; factsPadTop: string;
  agency: { color: string } | null; inks: { what: string; color: string }[]; text: string; arrows: number; chips: number; chev: number;
  clip: { wire: number; qc1533: number; clipw: number };
  tile: null | { box: Box; sent: Box; radius: string; bg: string; label: string; count: string; glyph: Box; countBox: Box; countFont: string; countSize: string; tabIndex: number; tag: string };
}
const readCards = (page: Page): Promise<CardReading[]> => page.evaluate((root) => {
  const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; };
  return [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((c) => c.getBoundingClientRect().width > 0).map((c) => {
    const hdEl = c.querySelector<HTMLElement>('[data-qc154="band"]')!;
    const hd = getComputedStyle(hdEl);
    const frame = c.querySelector<HTMLElement>(".qc154-in")!;
    const ag = c.querySelector<HTMLElement>('[data-qc154="agency"]');
    const inks = [
      ...[...c.querySelectorAll<HTMLElement>('[data-qc154="name"], [data-qc154="agency"]')].map((e) => ({ what: e.dataset.qc154 ?? "", color: getComputedStyle(e).color })),
      ...[...hdEl.querySelectorAll<HTMLElement>(".qc153-nd")].map((e) => ({ what: `step ${e.dataset.state}`, color: getComputedStyle(e).color })),
    ];
    const sent = c.querySelector<HTMLElement>('[data-qc154="fact"][data-k="sent"]');
    const tl = c.querySelector<HTMLElement>('[data-pc3="tile"]');
    const tcs = tl ? getComputedStyle(tl) : null;
    const cnt = tl?.querySelector("i") ?? null;
    return {
      id: c.dataset.id ?? "", status: c.dataset.status ?? "", quiet: c.hasAttribute("data-quiet"),
      bg: hd.backgroundColor, img: hd.backgroundImage, shadow: hd.boxShadow, h: c.getBoundingClientRect().height,
      band: box(hdEl)!, frame: box(frame)!, frameOverflow: `${getComputedStyle(frame).overflowX}/${getComputedStyle(frame).overflowY}`,
      labels: [...c.querySelectorAll<HTMLElement>("[data-pc2='label'], [data-pc3='label'], .pc2-lbl, .pc3-lbl")].filter((e, i, a) => a.indexOf(e) === i).map((e) => {
        const cs = getComputedStyle(e);
        return { text: e.textContent ?? "", box: box(e)!, edge: cs.boxShadow, font: cs.fontFamily, size: cs.fontSize, color: cs.color, bg: cs.backgroundColor, radius: cs.borderRadius, inFrame: frame.contains(e), shadow: cs.boxShadow };
      }),
      seal: box(c.querySelector(".qc154-seal")), name: box(c.querySelector('[data-qc154="name"]')), track: box(c.querySelector('[data-qc154="track"]')),
      facts: [...c.querySelectorAll('[data-qc154="fact"]')].map((f) => box(f)!),
      factsPadTop: getComputedStyle(c.querySelector<HTMLElement>('[data-qc154="facts"]')!).paddingTop,
      agency: ag ? { color: getComputedStyle(ag).color } : null,
      inks, text: c.innerText,
      arrows: c.querySelectorAll('[data-qc153="arrow"]').length, chips: c.querySelectorAll(".qc1561-arr").length,
      chev: c.querySelectorAll('[class*="chev" i], [data-chev], [class*="wyt"]').length,
      clip: { wire: c.querySelectorAll("[data-qc154='clip']").length, qc1533: c.querySelectorAll(".qc1533-clip, .qc1533-tw").length, clipw: c.querySelectorAll(".qc154-clipw").length },
      tile: tl && tcs && sent ? {
        box: box(tl)!, sent: box(sent)!, radius: tcs.borderRadius, bg: tcs.backgroundColor, label: tl.getAttribute("aria-label") ?? "",
        count: cnt?.textContent ?? "", glyph: box(tl.querySelector("svg"))!, countBox: box(cnt)!, countFont: cnt ? getComputedStyle(cnt).fontFamily : "",
        countSize: cnt ? getComputedStyle(cnt).fontSize : "", tabIndex: tl.tabIndex, tag: tl.tagName,
      } : null,
    };
  });
}, PAGE);
const byStatus = (cards: CardReading[]) => { const m = new Map<string, CardReading[]>(); for (const c of cards) m.set(c.status, [...(m.get(c.status) ?? []), c]); return m; };
const meets = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function openSlide(page: Page, id: string) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
  const c = cardAt(page, id);
  await c.scrollIntoViewIfNeeded();
  await press(c.locator("[data-qc154='name']").first());
  await page.locator(`${CARD}[data-id='${id}']`).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  return page.evaluate((sel) => {
    const root = document.querySelector<HTMLElement>(sel)!;
    const band = root.querySelector<HTMLElement>("[data-qc152='band']")!;
    const st = getComputedStyle(band);
    const inks = [...band.querySelectorAll<HTMLElement>("[data-qc152='band-word'], .qc153-nd")].map((e) => ({ what: e.dataset.qc152 ?? `step ${e.dataset.state}`, color: getComputedStyle(e).color }));
    const bubbles = [...root.querySelectorAll<HTMLElement>(".qc152-m.them[data-status]:not(.qc1522-draft)")].map((m) => {
      const bx = m.querySelector<HTMLElement>(".qc152-bx"); const cs = bx ? getComputedStyle(bx) : null;
      return { status: m.dataset.status ?? "", bg: cs?.backgroundColor ?? "", img: cs?.backgroundImage ?? "", shadow: cs?.boxShadow ?? "", color: cs?.color ?? "" };
    });
    return { bg: st.backgroundColor, img: st.backgroundImage, shadow: st.boxShadow, color: st.color, inks, bubbles, labels: root.querySelectorAll(".pc2-lbl, .pc3-lbl").length };
  }, CARD);
}

/* ── the hover ─────────────────────────────────────────────────────────────────────────────────────────────────── */
interface HoverReading {
  open: boolean; up: boolean; box: Box | null; tile: Box; vw: number; vh: number; title: string; tileName: string; inBody: boolean;
  hits: boolean[]; cut: string[]; sizes: { what: string; px: number }[];
  w: number; radius: string; bg: string; shadow: string; padding: string;
  chips: { text: string; h: number; radius: string; bg: string; shadow: string; border: string; color: string; font: string; weight: string; size: string; icon: string; asked: boolean; full: boolean }[];
  groups: { head: string; pkg: string | null }[];
}
/** open a card's hover with the mouse over its tile (the card scrolled, never the tile or the hover), and read it */
async function readHover(page: Page, id: string, block: "start" | "end" | "center"): Promise<HoverReading> {
  await page.mouse.move(2, 2);
  await page.waitForTimeout(200);
  await cardAt(page, id).evaluate((e, b) => e.scrollIntoView({ block: b as ScrollLogicalPosition }), block);
  await page.waitForTimeout(400);
  const t = (await cardAt(page, id).locator("[data-pc3='tile']").boundingBox())!;
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 4 });
  await page.waitForTimeout(500);
  return page.evaluate(({ root, id }) => {
    const card = [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"][data-id="${id}"]`)].find((c) => c.getBoundingClientRect().width > 0)!;
    const tile = card.querySelector<HTMLElement>('[data-pc3="tile"]')!;
    const h = document.getElementById(tile.getAttribute("aria-controls") ?? "") as HTMLElement | null;
    const box = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const tb = box(tile);
    if (!h) return { open: false, up: false, box: null, tile: tb, vw: innerWidth, vh: innerHeight, title: "", tileName: tile.getAttribute("aria-label") ?? "", inBody: false, hits: [], cut: [], sizes: [], w: 0, radius: "", bg: "", shadow: "", padding: "", chips: [], groups: [] };
    const r = h.getBoundingClientRect();
    /* above the neighbours: a hit test at five points inside it (its pointer-events lifted for the reading only) */
    const was = h.style.pointerEvents; h.style.pointerEvents = "auto";
    const pts = [[r.left + 14, r.top + 14], [r.right - 14, r.top + 14], [r.left + 14, r.bottom - 10], [r.right - 14, r.bottom - 10], [r.left + r.width / 2, r.top + r.height / 2]];
    const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === h || h.contains(e)); });
    h.style.pointerEvents = was;
    const cut: string[] = [];
    for (let a = h.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === "visible" && cs.overflowY === "visible" && (cs.maskImage ?? "none") === "none" && ((cs as unknown as Record<string, string>).webkitMaskImage ?? "none") === "none") continue;
      const b = a.getBoundingClientRect();
      if (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5 || r.left < b.left - 0.5 || r.right > b.right + 0.5) cut.push(`${a.tagName.toLowerCase()}.${a.className.toString().split(" ")[0]} (${cs.overflowX}/${cs.overflowY})`);
    }
    const cs = getComputedStyle(h);
    const sizes = [h, ...h.querySelectorAll<HTMLElement>("*"), tile, ...tile.querySelectorAll<HTMLElement>("*")]
      .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim()))
      .map((e) => ({ what: (e.className.toString() || e.tagName).slice(0, 30), px: parseFloat(getComputedStyle(e).fontSize) }));
    return {
      open: true, up: h.hasAttribute("data-up"), box: { x: r.left, y: r.top, w: r.width, h: r.height }, tile: tb, vw: innerWidth, vh: innerHeight,
      title: h.querySelector('[data-pc3="title"]')?.textContent ?? "", tileName: tile.getAttribute("aria-label") ?? "", inBody: h.parentElement === document.body,
      hits, cut, sizes, w: r.width, radius: cs.borderRadius, bg: cs.backgroundColor, shadow: cs.boxShadow, padding: cs.padding,
      chips: [...h.querySelectorAll<HTMLElement>('[data-pc3="chip"]')].map((c) => {
        const k = getComputedStyle(c); const icon = c.querySelector("svg, [role='img'], span[aria-hidden]");
        return { text: c.textContent ?? "", h: c.getBoundingClientRect().height, radius: k.borderRadius, bg: k.backgroundColor, shadow: k.boxShadow, border: `${k.borderTopWidth} ${k.borderTopStyle} ${k.borderTopColor}`,
          color: k.color, font: k.fontFamily, weight: k.fontWeight, size: k.fontSize, icon: icon ? `${icon.tagName}:${Math.round(icon.getBoundingClientRect().width)}` : "",
          asked: c.hasAttribute("data-asked"), full: /manuscript/i.test(c.textContent ?? "") };
      }),
      groups: [...h.querySelectorAll<HTMLElement>('[data-qc1533="group"]')].map((g) => ({ head: g.querySelector(".pc3-hov-gh > span")?.textContent ?? "", pkg: g.querySelector('[data-qc1533="pkg"]')?.textContent ?? null })),
    };
  }, { root: PAGE, id });
}

/* ═══ the locks ═══════════════════════════════════════════════════════════════════════════════════════════════ */
async function gridLocks(page: Page, engine: string) {
  await openQc(page);
  const cards = await readCards(page);
  const by = byStatus(cards);
  console.log(`${engine} population:`, JSON.stringify([...by].map(([s, l]) => [s, l.length, l.filter((c) => c.quiet).length])));
  const E = engine === "chromium" ? "" : "W";
  const L1 = new Ledger(`PC3-1${E}`), L2 = new Ledger(`PC3-2${E}`), L3 = new Ledger(`PC3-3${E}`), L4 = new Ledger(`PC3-4${E}`), L6 = new Ledger(`PC3-6${E}`), L9 = new Ledger(`PC3-9${E}`);

  /* PC3-1 · the offer's grid band: flat duck egg, ink */
  const offers = cards.filter((c) => OFFER_STATUS.has(c.status));
  L1.check("Offer and Signed grid cards: both on the page", ["Offer", "Signed"].every((s) => (by.get(s)?.length ?? 0) > 0), `${by.get("Offer")?.length ?? 0} / ${by.get("Signed")?.length ?? 0}`);
  for (const c of offers) {
    L1.check(`${c.status} ${c.id}: grid band flat ${DUCK}, no gradient`, c.bg === rgb(DUCK) && c.img === "none", `${c.bg} / ${c.img.slice(0, 60)}`);
    for (const k of c.inks) L1.check(`${c.status} ${c.id} ${k.what}: ink`, isInk(k.color), k.color);
  }
  /* PC3-2 · the R&R stripes on its grid band, and on no other grid band */
  const rr = cards.filter((c) => c.status === "Revise & Resubmit" && !c.quiet);
  L2.check("live Revise & resubmit grid cards: population", rr.length > 0, `${rr.length}`);
  for (const c of rr) L2.check(`R&R ${c.id}: grid band computes the stripes`, isRR(c.img), c.img);
  for (const c of cards.filter((x) => x.status !== "Revise & Resubmit")) L2.check(`${c.status} ${c.id}: no stripes on its grid band`, !/repeating-linear-gradient/.test(c.img), c.img.slice(0, 50));
  /* PC3-3 · the grid band per status, flat (quiet cards fade from it), never outlined */
  for (const s of ["Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Resubmitted"]) L3.check(`${s}: population non-zero`, (by.get(s)?.length ?? 0) > 0, `${by.get(s)?.length ?? 0}`);
  for (const c of cards) {
    L3.check(`${c.status} ${c.id}: no outline (no inset 3px)`, !/3px inset|inset[^,]*3px/.test(c.shadow), c.shadow);
    if (OFFER_STATUS.has(c.status) || (c.status === "Revise & Resubmit" && !c.quiet)) continue;
    if (c.quiet) L3.check(`${c.status} ${c.id} (quiet): fades from ${statusBand(c.status)}`, c.img.includes(rgb(statusBand(c.status))) && c.img.startsWith("linear-gradient"), c.img);
    else L3.check(`${c.status} ${c.id}: grid band ${statusBand(c.status)}, flat`, c.bg === rgb(statusBand(c.status)) && c.img === "none", `${c.bg} / ${c.img}`);
  }
  /* PC3-4 · the label */
  L4.check("quiet cards on the page (they carry it too)", cards.some((c) => c.quiet), `${cards.filter((c) => c.quiet).length}`);
  for (const c of cards) {
    L4.check(`${c.status} ${c.id}: the frame clips (overflow hidden)`, c.frameOverflow === "hidden/hidden", c.frameOverflow);
    L4.check(`${c.status} ${c.id}: exactly one label`, c.labels.length === 1, `${c.labels.length}`);
    const l = c.labels[0]; if (!l) continue;
    L4.check(`${c.status} ${c.id}: its text "${WORD[c.status]}"`, l.text === WORD[c.status], l.text);
    L4.check(`${c.status} ${c.id}: drawn outside the frame`, !l.inFrame, `${l.inFrame}`);
    const mid = l.box.y + l.box.h / 2;
    /* the frame's top edge and the band's top are 1px apart (the frame's border); the centre sits on that line */
    L4.check(`${c.status} ${c.id}: its centre on the frame's top edge (within 1px of the band's top)`, mid >= c.frame.y - 0.5 && mid <= c.band.y + 1, `${(mid - c.band.y).toFixed(2)}px from the band's top`);
    L4.check(`${c.status} ${c.id}: 14px in from the band's right edge, 22px high, radius 11`, Math.abs(c.band.x + c.band.w - (l.box.x + l.box.w) - 14) <= 0.5 && Math.abs(l.box.h - 22) <= 0.5 && l.radius === "11px", `${(c.band.x + c.band.w - l.box.x - l.box.w).toFixed(1)} / ${l.box.h} / ${l.radius}`);
    L4.check(`${c.status} ${c.id}: Special Elite 13px in ink on white, 1px inset stage edge ${edgeOf(c.status)}, the JSON's shadow`,
      /Special Elite/.test(l.font) && l.size === "13px" && l.color === rgb(INK) && l.bg === "rgb(255, 255, 255)" && l.edge.includes(`${rgb(edgeOf(c.status))} 0px 0px 0px 1px inset`) && l.edge.includes("rgba(28, 19, 15, 0.08) 0px 1px 2px"),
      `${l.font.split(",")[0]} ${l.size} ${l.color} ${l.bg} ${l.edge}`);
  }
  /* not clipped: geometry (no clipping ancestor holds less than the whole label) and a hit test inside its ends */
  const clip = await page.evaluate((root) => {
    const out: { id: string; ok: boolean; got: string }[] = [];
    for (const c of [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((x) => x.getBoundingClientRect().width > 0)) {
      const l = c.querySelector<HTMLElement>("[data-pc3='label']"); if (!l) { out.push({ id: c.dataset.id ?? "", ok: false, got: "no label" }); continue; }
      /* ⚠️ SCROLL THE CARD, NEVER THE LABEL (v2's PC2-6): scrolling a clipped element into view scrolls its clipper */
      c.scrollIntoView({ block: "center" });
      const was = l.style.pointerEvents; l.style.pointerEvents = "auto";
      const r = l.getBoundingClientRect();
      const pts = [[r.left + 12, r.top + 2], [r.right - 12, r.top + 2], [r.left + r.width / 2, r.top + 1.5], [r.left + 12, r.bottom - 2]];
      const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === l || l.contains(e)); });
      l.style.pointerEvents = was;
      const cut: string[] = [];
      for (let a = l.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const b = a.getBoundingClientRect();
        if (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5 || r.left < b.left - 0.5 || r.right > b.right + 0.5) cut.push(`${a.className.toString().split(" ")[0]} (${cs.overflowX}/${cs.overflowY}) cuts ${Math.max(0, b.top - r.top).toFixed(1)}px off the top`);
      }
      out.push({ id: c.dataset.id ?? "", ok: hits.every(Boolean) && cut.length === 0, got: `${hits.join(",")}${cut.length ? ` · ${cut.join("; ")}` : ""}` });
    }
    return out;
  }, PAGE);
  L4.check("hit test: population", clip.length === cards.length, `${clip.length}`);
  for (const h of clip) L4.check(`${h.id}: no ancestor clips the label, and it is hit (not covered)`, h.ok, h.got);
  /* in pixels: the label's TOP edge line (the stage edge, inset 1px) is drawn across its middle — the half outside the
     frame is the half a restored clip would cut, and the white above the card passes for the label's white */
  const shown = new Set<string>();
  for (const c of cards) {
    if (shown.has(c.status) || !c.labels[0]) continue;
    shown.add(c.status);
    await cardAt(page, c.id).evaluate((e) => e.scrollIntoView({ block: "center" }));
    const r = (await cardAt(page, c.id).locator("[data-pc3='label']").boundingBox())!;
    const shot = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.width, height: 4 } });
    const px = await edgeRow(page, shot.toString("base64"), hexArr(edgeOf(c.status)));
    L4.check(`${c.status} ${c.id}: pixels — the label's top edge line (${edgeOf(c.status)}) is on screen across its middle`, px >= 0.6, `${(px * 100).toFixed(0)}%`);
  }
  /* PC3-6 · no paperclip */
  L6.check("cards read", cards.length >= 20, `${cards.length}`);
  for (const c of cards) L6.check(`${c.status} ${c.id}: no paperclip (wire clip, .qc1533-clip, .qc154-clipw)`, c.clip.wire + c.clip.qc1533 + c.clip.clipw === 0, JSON.stringify(c.clip));
  /* v2's PC2-8, carried: no "With you", no chevron, no new arrow (one track arrow, one action arrow at most) */
  for (const c of cards) L6.check(`${c.id}: no "With you", chevron or new arrow`, !/with you/i.test(c.text) && c.chev === 0 && c.arrows <= 1 && c.chips <= 1 && !/[›»❯〉⟩▶►]/.test(c.text), `chev ${c.chev}, track ${c.arrows}, chip ${c.chips}`);
  L6.check("cards with materials carry the tile instead", cards.filter((c) => c.tile).length >= 10, `${cards.filter((c) => c.tile).length}`);
  /* PC3-9 · the agency line */
  const withAg = cards.filter((c) => c.agency);
  L9.check("agency lines: population", withAg.length >= 20, `${withAg.length}`);
  for (const c of withAg) {
    L9.check(`${c.status} ${c.id}: agency ${AGENCY}`, c.agency!.color === AGENCY_RGB, c.agency!.color);
    const ground = c.quiet ? statusBand(c.status) : OFFER_STATUS.has(c.status) ? DUCK : c.status === "Revise & Resubmit" ? FULL.band : statusBand(c.status);
    /* on R&R the stripes' deeper colour is the worse ground; on a quiet card the band's own colour at its left */
    const grounds = c.status === "Revise & Resubmit" && !c.quiet ? RR_COLS : [ground];
    const worst = Math.min(...grounds.map((g) => contrast(c.agency!.color, g)));
    L9.check(`${c.status} ${c.id}: agency ≥ 4.5:1 on ${grounds.join(" / ")}`, worst >= 4.5, worst.toFixed(2));
  }
  L1.done(4); L2.done(20); L3.done(40); L4.done(80); L6.done(20); L9.done(40);
  return cards;
}

test.describe("Plumage colours v3 — the rendered locks", () => {
  if (run("1") || run("2") || run("3") || run("4") || run("6") || run("9")) test("PC3-1 … 4, 6, 9 · the grid, the slide-in, Birds-eye, the filter and Responses (Chromium)", async ({ page }) => {
    const cards = await gridLocks(page, "chromium");
    const by = byStatus(cards);
    const L1 = new Ledger("PC3-1s"), L2 = new Ledger("PC3-2s"), L3 = new Ledger("PC3-3s");

    /* the slide-in: strip per status, its bubbles, no label */
    const want = ["Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted", "Offer", "Signed"];
    const opened: string[] = [];
    const bubbles = new Map<string, { bg: string; img: string; shadow: string; color: string }>();
    for (const s of want) {
      /* a live card where there is one; Resubmitted's only card may be gone quiet (its strip then fades from its band) */
      const c = (by.get(s) ?? []).find((x) => !x.quiet) ?? (s === "Resubmitted" ? (by.get(s) ?? [])[0] : undefined);
      if (!c) { L3.check(`${s}: a live card to open`, false, "none"); continue; }
      const r = await openSlide(page, c.id);
      opened.push(s);
      L3.check(`slide-in ${s} ${c.id}: no outline`, !/3px inset/.test(r.shadow), r.shadow);
      L3.check(`slide-in ${s} ${c.id}: carries no band label`, r.labels === 0, `${r.labels}`);
      if (OFFER_STATUS.has(s)) {
        L1.check(`slide-in ${s} ${c.id}: strip flat ${DUCK}, no gradient`, r.bg === rgb(DUCK) && r.img === "none", `${r.bg} / ${r.img.slice(0, 60)}`);
        L1.check(`slide-in ${s} ${c.id}: strip words in ink`, r.color === rgb(INK), r.color);
        for (const k of r.inks) L1.check(`slide-in ${s} ${k.what}: ink`, isInk(k.color), k.color);
      } else if (s === "Revise & Resubmit") {
        L2.check(`slide-in R&R ${c.id}: strip computes the stripes`, isRR(r.img), r.img);
      } else {
        L2.check(`slide-in ${s} ${c.id}: no stripes`, !/repeating-linear-gradient/.test(r.img), r.img.slice(0, 50));
        if (c.quiet) L3.check(`slide-in ${s} ${c.id} (quiet): strip fades from ${statusBand(s)}`, r.img.startsWith("linear-gradient") && r.img.includes(rgb(statusBand(s))), r.img);
        else L3.check(`slide-in ${s} ${c.id}: strip ${statusBand(s)}, flat`, r.bg === rgb(statusBand(s)) && r.img === "none", `${r.bg} / ${r.img}`);
      }
      for (const b of r.bubbles) if (!bubbles.has(b.status)) bubbles.set(b.status, b);
    }
    await page.keyboard.press("Escape").catch(() => {});
    L3.check("slide-in: every one of the eight opened", want.every((s) => opened.includes(s)), opened.join(", "));
    for (const [s, b] of bubbles) {
      L2.check(`bubble ${s}: no stripes (bubbles are not card bands)`, !/repeating-linear-gradient/.test(b.img), b.img.slice(0, 50));
      if (OFFER_STATUS.has(s)) { L1.check(`bubble ${s}: flat duck egg`, b.bg === rgb(DUCK) && b.img === "none", `${b.bg} / ${b.img}`); L1.check(`bubble ${s}: ink`, b.color === rgb(INK), b.color); }
      if (s === "Revise & Resubmit") L3.check(`bubble R&R: flat ${FULL.bandRequested}`, b.bg === rgb(FULL.bandRequested) && b.img === "none", `${b.bg} / ${b.img}`);
    }

    /* the Stage filter's Offer pill and segment, and the Offers heading's count */
    const sf = await page.locator(`${PAGE} [data-qc156='panel'] >> visible=true`).first().evaluate((p) => [...p.querySelectorAll<HTMLElement>(".sf-lab[data-stage='offer'], .sf-seg[data-stage='offer']")].map((e) => {
      const cs = getComputedStyle(e); const nm = e.querySelector<HTMLElement>(".sf-nm");
      return { kind: e.classList.contains("sf-seg") ? "segment" : "pill", bg: cs.backgroundColor, img: cs.backgroundImage, color: nm ? getComputedStyle(nm).color : cs.color };
    })).catch(() => []);
    L1.check("the Stage filter's Offer pill: population", sf.some((x) => x.kind === "pill"), JSON.stringify(sf.map((x) => x.kind)));
    for (const x of sf) L1.check(`Stage filter ${x.kind} (offer): flat duck egg`, x.bg === rgb(DUCK) && x.img === "none", `${x.bg} / ${x.img}`);
    const sec = await page.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc153='heading'][data-offer] small`)].map((e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, img: cs.backgroundImage }; }), PAGE);
    if (sec.length) for (const x of sec) L1.check("the Offers heading's count: flat duck egg", x.bg === rgb(DUCK) && x.img === "none", `${x.bg} / ${x.img}`);
    else L1.note("the Offers heading", "not grouped by attention on this page");

    /* nothing else on the page computes the R&R stripes, and no gone hex */
    const sweep = await page.evaluate(({ gone, rrA, rrB }) => {
      const want = gone.map((h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`);
      const els = [...document.querySelectorAll<HTMLElement>(".qc151.qc153 *, [data-qp='panel'] *")];
      const hits: string[] = []; const rrOn: string[] = [];
      for (const e of els) {
        if (!e.getClientRects().length) continue;
        const cs = getComputedStyle(e);
        for (const p of [cs.backgroundColor, cs.color, cs.borderTopColor, cs.boxShadow, cs.backgroundImage]) if (want.some((w) => p.includes(w))) { hits.push(`${e.className.toString().slice(0, 40)}: ${p.slice(0, 60)}`); break; }
        if (/repeating-linear-gradient/.test(cs.backgroundImage) && cs.backgroundImage.includes(rrA) && cs.backgroundImage.includes(rrB)) rrOn.push(e.getAttribute("data-qc154") ?? e.getAttribute("data-qc152") ?? e.className.toString().slice(0, 30));
      }
      return { n: els.length, hits, rrOn };
    }, { gone: GONE, rrA: rgb(RR_COLS[0]), rrB: rgb(RR_COLS[1]) });
    L3.check("elements read on the Query Centre and the slide-in", sweep.n > 500, `${sweep.n}`);
    L3.check("none computes a gone hex (v1's Full and navy offer, v2's Full requested and stripe paper)", sweep.hits.length === 0, sweep.hits.slice(0, 6).join(" | ") || "none");
    L2.check("the stripes are drawn only on R&R grid bands and its slide-in strip", sweep.rrOn.every((w) => w === "band"), sweep.rrOn.join(", ") || "none");

    /* Birds-eye: each bar flat in its status's band; R&R flat #d3deea; never striped */
    const statusById = new Map(cards.map((c) => [c.id, c.status]));
    await openQc(page, "birds");
    await page.locator(`${PAGE} [data-qc150="be-bar"]`).first().waitFor({ timeout: 30_000 });
    const bars = await page.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc150="be-row"]`)].flatMap((r) => {
      const b = r.querySelector<HTMLElement>('[data-qc150="be-bar"]'); if (!b) return [];
      const cs = getComputedStyle(b); return [{ id: r.dataset.id ?? "", bg: cs.backgroundColor, img: cs.backgroundImage, shadow: cs.boxShadow }];
    }), PAGE);
    const known = bars.filter((b) => statusById.has(b.id));
    L3.check("Birds-eye bars with a known status: population", known.length >= 10, `${known.length} of ${bars.length}`);
    L3.check("Birds-eye: an R&R bar among them", known.some((b) => statusById.get(b.id) === "Revise & Resubmit"), "");
    for (const b of known) {
      const s = statusById.get(b.id)!;
      L3.check(`Birds-eye ${s} ${b.id}: bar ${statusBand(s)}, flat, no outline`, b.bg === rgb(statusBand(s)) && b.img === "none" && !/3px inset/.test(b.shadow), `${b.bg} / ${b.img} / ${b.shadow}`);
      if (OFFER_STATUS.has(s)) L1.check(`Birds-eye ${s} ${b.id}: flat duck egg`, b.bg === rgb(DUCK) && b.img === "none", `${b.bg} / ${b.img}`);
    }

    /* Responses: the strip per answer; an offer's flat duck egg; the grid cards there carry the label and the tile */
    await openRoute(page, "/queries/responses", DESK);
    await page.waitForTimeout(1500);
    const rc = page.locator("[data-qc154='card'] >> visible=true");
    L3.check("Responses: grid cards on show", (await rc.count()) > 0, `${await rc.count()}`);
    const rcl = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc154='card']")].filter((c) => c.getBoundingClientRect().width > 0)
      .map((c) => ({ id: c.dataset.id, labels: c.querySelectorAll("[data-pc3='label']").length, clip: c.querySelectorAll(".qc1533-clip").length })));
    for (const c of rcl) L3.check(`Responses card ${c.id}: one label, no paperclip`, c.labels === 1 && c.clip === 0, JSON.stringify(c));
    if (await rc.count()) { await press(rc.first().locator("[data-qc154='name']").first()); await page.waitForTimeout(1200); }
    const rsp = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-rsn='status']")].filter((e) => e.getClientRects().length).map((e) => {
      const cs = getComputedStyle(e); return { status: e.dataset.tone ?? "", bg: cs.backgroundColor, img: cs.backgroundImage };
    }));
    if (rsp.length) for (const r of rsp) {
      L2.check(`Responses strip (${r.status}): no stripes`, !/repeating-linear-gradient/.test(r.img), r.img.slice(0, 50));
      if (r.status === "offer") L1.check("Responses strip (offer): flat duck egg", r.bg === rgb(DUCK) && r.img === "none", `${r.bg} / ${r.img}`);
    } else L3.note("Responses strip", "no response open to read");
    L1.done(4); L2.done(4); L3.done(30);
  });

  if (run("5")) test("PC3-5 · the label clears the track, seal, name, facts and the heading above, at 1280, 1512 and 1920; one card height", async ({ page }) => {
    const L = new Ledger("PC3-5");
    for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1512, height: 982 }, { width: 1920, height: 1080 }]) {
      await openQc(page, "list", vp);
      const cards = await readCards(page);
      /* recorded, not asserted: the Sent box's words that the tile's room cuts short (an ellipsis), for Nick's ruling */
      const cut = await page.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((c) => c.getBoundingClientRect().width > 0 && c.querySelector('[data-pc3="tile"]'))
        .flatMap((c) => [...c.querySelectorAll<HTMLElement>('[data-k="sent"] > b, [data-k="sent"] > em')].filter((e) => e.scrollWidth > e.clientWidth + 0.5).map((e) => `${c.dataset.id}:${e.textContent}`)), PAGE);
      const withTile = cards.filter((c) => c.tile).length;
      L.note(`${vp.width}: Sent words cut short by the tile's room (card ${cards[0]?.band.w.toFixed(0)}px wide)`, `${cut.length} on ${withTile} cards with a tile${cut.length ? ` — ${cut.slice(0, 6).join(" | ")}` : ""}`);
      const heads = await page.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc153='heading']`)].filter((h) => h.getBoundingClientRect().width > 0)
        .map((h) => { const r = h.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; }), PAGE);
      const longest = Math.max(...cards.map((c) => c.labels[0]?.text.length ?? 0));
      L.check(`${vp.width}: cards, headings and the longest status name`, cards.length >= 20 && heads.length >= 1 && longest >= 17, `${cards.length} cards; ${heads.length} headings; longest ${longest}`);
      let firstRow = 0;
      for (const c of cards) {
        const l = c.labels[0]?.box; if (!l) { L.check(`${vp.width} ${c.id}: a label`, false, "none"); continue; }
        const bad = [c.track && meets(l, c.track) ? "track" : "", c.seal && meets(l, c.seal) ? "seal" : "", c.name && meets(l, c.name) ? "name" : "",
          ...c.facts.map((f, i) => (meets(l, f) ? `fact ${i + 1}` : "")), ...heads.map((h, i) => (meets(l, h) ? `heading ${i + 1}` : ""))].filter(Boolean);
        const above = heads.filter((h) => h.y + h.h <= l.y + 0.5).sort((a, b) => b.y + b.h - (a.y + a.h))[0];
        const gapHead = above ? l.y - (above.y + above.h) : NaN;
        if (above && gapHead < 40) firstRow++;
        L.check(`${vp.width} ${c.status} ${c.id}: the label meets nothing`, bad.length === 0,
          bad.join(",") || `track ${c.track ? (c.track.x - (l.x + l.w)).toFixed(1) : "?"}px left / ${c.track ? (c.track.y - (l.y + l.h)).toFixed(1) : "?"}px below; heading ${Number.isNaN(gapHead) ? "-" : gapHead.toFixed(1)}px above`);
      }
      L.check(`${vp.width}: first-row cards read against their heading`, firstRow >= 1, `${firstRow}`);
      const hs = cards.map((c) => c.h);
      L.check(`${vp.width}: every grid card the same height`, Math.max(...hs) - Math.min(...hs) <= 0.5, `${Math.min(...hs).toFixed(1)}–${Math.max(...hs).toFixed(1)}px`);
      L.note(`${vp.width}: the facts' top padding`, cards[0]?.factsPadTop ?? "");
      /* what the card would measure without the 18px (the label is no longer there to clear): set and put back */
      const without = await page.evaluate((root) => {
        const c = [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].find((x) => x.getBoundingClientRect().width > 0)!;
        const fx = c.querySelector<HTMLElement>('[data-qc154="facts"]')!;
        const was = fx.style.paddingTop; const h0 = c.getBoundingClientRect().height;
        fx.style.paddingTop = "10px"; const h1 = c.getBoundingClientRect().height; fx.style.paddingTop = was;
        return { h0, h1, back: c.getBoundingClientRect().height };
      }, PAGE);
      L.note(`${vp.width}: card height with 18px / with v1's 10px (restored)`, `${without.h0} / ${without.h1} (back to ${without.back})`);
      /* last, because it scrolls (the group headings are sticky): a frame of a card whose Sent words are cut */
      if (cut.length) {
        const id = cut[0].split(":")[0];
        await cardAt(page, id).evaluate((e) => e.scrollIntoView({ block: "center" }));
        const b = (await cardAt(page, id).boundingBox())!;
        await page.screenshot({ path: `${DIR}/frames/chromium-sent-cut-${vp.width}.png`, clip: { x: b.x - 8, y: b.y - 14, width: b.width + 16, height: b.height + 22 } });
      }
    }
    L.done(60);
  });

  if (run("7") || run("8") || run("11") || run("12")) test("PC3-7, 8, 11, 12 · the tile and the hover (Chromium)", async ({ page }) => {
    await openQc(page);
    await tileLocks(page, "chromium");
  });

  if (run("10")) test("PC3-10 · the slide-in rim, and the four search tiles", async ({ page }) => {
    await openQc(page);
    const cards = await readCards(page);
    const L = new Ledger("PC3-10");
    /* the Full rim (v2's, unchanged) still breathes: carried from PC2-9 */
    const c = cards.find((x) => FULL_STATUS.has(x.status) && !x.quiet);
    L.check("full: a card to open", !!c, c ? `${c.status} ${c.id}` : "none");
    if (c) {
      await liftMotionSuppression(page);
      await openSlide(page, c.id);
      const reply = page.locator(`${CARD} [data-qc152='reply-btn'], ${CARD} [data-qc152='reply'] button`).first();
      await reply.click().catch(() => {});
      await page.locator(`${CARD} [data-qc1522='composer']`).first().waitFor({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2600);
      const tint = await page.evaluate((sel) => {
        const sp = document.querySelector<HTMLElement>(sel)?.closest(".spanel");
        const t = sp?.querySelector<HTMLElement>(":scope > .qc163-rim [data-qc163='tint'], :scope > .qc163-rim > b");
        return t ? getComputedStyle(t).backgroundColor : "";
      }, CARD);
      L.check(`full: the rim's tint ${FULL.rim}`, tint === rgb(FULL.rim), tint);
      for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(300); }
    }
    await openRoute(page, "/queries", DESK);
    await page.locator('[data-probe="search"]').click();
    const INPUT = '.sp-pal--ink [role="combobox"]';
    await expect(page.locator(INPUT)).toBeFocused();
    const want: Kind[] = ["query", "agent", "material", "task"];
    const got = new Map<Kind, { bg: string; color: string; shadow: string; big: boolean }[]>();
    for (const term of ["a", "e", "synopsis", "send", "letter", "package", "o"]) {
      await page.locator(INPUT).fill(term);
      await page.waitForTimeout(400);
      const tiles = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".sv1-tile[data-tile]")].filter((t) => t.getBoundingClientRect().width > 0).map((t) => {
        const cs = getComputedStyle(t);
        return { kind: t.dataset.tile ?? "", bg: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow, big: t.classList.contains("sv1-tile--big") };
      }));
      for (const t of tiles) if ((want as string[]).includes(t.kind)) got.set(t.kind as Kind, [...(got.get(t.kind as Kind) ?? []), t]);
      if (want.every((k) => got.has(k))) break;
    }
    for (const k of want) {
      const list = got.get(k) ?? []; const c = k === "agent" ? V3.kinds.agent : V1.kinds[k];
      L.check(`tile ${k}: population non-zero`, list.length > 0, `${list.length}`);
      for (const t of list.slice(0, 4)) {
        L.check(`tile ${k}${t.big ? " (44px)" : ""}: ${c.tile}, glyph ${c.glyph}`, t.bg === rgb(c.tile) && t.color === rgb(c.glyph), `${t.bg} / ${t.color}`);
        if (c.edge) L.check(`tile ${k}${t.big ? " (44px)" : ""}: 1px edge ${c.edge}`, t.shadow === `${rgb(c.edge)} 0px 0px 0px 1px inset`, t.shadow);
      }
    }
    L.done(12);
  });

  /* PC3-F — the frames, and the locks again in WebKit */
  const frames = async (p: Page, engine: string) => {
    await openQc(p);
    const cards = await readCards(p);
    await p.screenshot({ path: `${DIR}/frames/${engine}-list-1512.png`, fullPage: true });
    const pick: [string, (c: CardReading) => boolean][] = [
      ["queried", (c) => c.status === "Queried" && !c.quiet], ["partial-requested", (c) => c.status === "Partial Requested" && !c.quiet],
      ["partial-sent", (c) => c.status === "Partial Sent" && !c.quiet], ["full-requested", (c) => c.status === "Full Requested" && !c.quiet],
      ["full-sent", (c) => c.status === "Full Sent" && !c.quiet], ["revise-resubmit", (c) => c.status === "Revise & Resubmit" && !c.quiet],
      ["resubmitted", (c) => c.status === "Resubmitted"], ["offer", (c) => c.status === "Offer"], ["signed", (c) => c.status === "Signed"],
      ["rejected", (c) => c.status === "Rejected"], ["no-response", (c) => c.status === "No Response"], ["withdrawn", (c) => c.status === "Withdrawn"], ["gone-quiet", (c) => c.quiet],
    ];
    for (const [name, f] of pick) {
      const c = cards.find(f); if (!c) continue;
      const el = cardAt(p, c.id);
      await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
      const b = (await el.boundingBox())!;
      await p.screenshot({ path: `${DIR}/frames/${engine}-card-${name}.png`, clip: { x: b.x - 8, y: b.y - 14, width: b.width + 16, height: b.height + 22 } });
    }
    /* the hover open on a first-row and on a last-row card */
    const withTile = cards.filter((c) => c.tile);
    const first = withTile.reduce((a, c) => (c.band.y < a.band.y ? c : a), withTile[0]);
    const last = withTile.reduce((a, c) => (c.band.y > a.band.y ? c : a), withTile[0]);
    for (const [name, c, block] of [["first-row", first, "start"], ["last-row", last, "end"]] as const) {
      if (!c) continue;
      const h = await readHover(p, c.id, block);
      const t = h.tile; const hb = h.box ?? t;
      const x0 = Math.max(0, Math.min(t.x, hb.x) - 30), y0 = Math.max(0, Math.min(t.y, hb.y) - 140);
      const x1 = Math.min(h.vw, Math.max(t.x + t.w, hb.x + hb.w) + 200), y1 = Math.min(h.vh, Math.max(t.y + t.h, hb.y + hb.h) + 30);
      await p.screenshot({ path: `${DIR}/frames/${engine}-hover-${name}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
      await p.mouse.move(2, 2);
    }
    await openQc(p, "birds");
    await p.screenshot({ path: `${DIR}/frames/${engine}-birds-eye-1512.png` });
    await openRoute(p, "/queries/responses", DESK);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${DIR}/frames/${engine}-responses-1512.png` });
    /* PC3-8R — the hover on Responses' carousel (it scrolls sideways under a mask: an in-card hover would be cut) */
    const LR = new Ledger(`PC3-8R${engine === "chromium" ? "" : "W"}`);
    const rid = await p.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].find((c) => c.getBoundingClientRect().width > 0 && c.querySelector('[data-pc3="tile"]'))?.dataset.id ?? null, PAGE);
    LR.check("a Responses card with a tile", !!rid, rid ?? "none");
    if (rid) {
      const h = await readHover(p, rid, "center");
      LR.check(`${rid}: the hover opens on Responses`, h.open && !!h.box, `${h.open}`);
      if (h.box) {
        const b = h.box;
        LR.check(`${rid}: fully inside the viewport`, b.x >= 0 && b.y >= 0 && b.x + b.w <= h.vw && b.y + b.h <= h.vh, `${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}×${b.h.toFixed(0)}`);
        LR.check(`${rid}: no ancestor cuts or masks it (drawn on <body>)`, h.cut.length === 0 && h.inBody, `${h.cut.join("; ") || "none"} · on body ${h.inBody}`);
        LR.check(`${rid}: every hit point is the hover`, h.hits.every(Boolean), h.hits.join(","));
      }
      await p.screenshot({ path: `${DIR}/frames/${engine}-responses-hover-1512.png` });
      await p.mouse.move(2, 2);
    }
    LR.done(4);
  };

  if (run("F")) test("PC3-F · frames in Chromium (1512)", async ({ page }) => {
    test.setTimeout(600_000);
    await frames(page, "chromium");
    /* search with an agent who has an offer */
    await openQc(page);
    const offer = (await readCards(page)).find((c) => c.status === "Offer");
    const agent = offer ? await cardAt(page, offer.id).locator("[data-qc154='name']").textContent() : null;
    await page.locator('[data-probe="search"]').click();
    await page.locator('.sp-pal--ink [role="combobox"]').fill((agent ?? "a").split(" ")[0]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/frames/chromium-search-offer-agent-1512.png` });
  });

  if (run("W")) test("PC3-W · the grid, tile and hover locks in WebKit (1512), and its frames", async ({ baseURL }) => {
    test.setTimeout(1_200_000);
    const b = await webkit.launch();
    try {
      const ctx = await b.newContext({ baseURL: baseURL ?? process.env.SA_E2E_BASE_URL, viewport: DESK });
      /* ⚠️ A LAUNCHED CONTEXT HAS NO ACTION TIMEOUT, and desktop WebKit cannot click the harness's Sign in (23 Nov) */
      ctx.setDefaultTimeout(45_000);
      const p = await ctx.newPage();
      await p.goto("/#/signin");
      await p.locator("#au-email").fill(process.env.SA_E2E_EMAIL ?? "harness@scriptally.test");
      await p.locator("#au-pw").fill(process.env.SA_E2E_PASSWORD ?? envLocal("SA_E2E_PASSWORD") ?? "");
      await p.locator("#au-pw").press("Enter");
      await p.locator("#ws-sidebar, .ws-work, #app-stage-scroll").first().waitFor({ state: "attached", timeout: 60_000 });
      await gridLocks(p, "webkit");
      await openQc(p);
      await tileLocks(p, "webkit");
      await frames(p, "webkit");
      /* Log a query's preview card is framed by laqV2.measure.ts (Log a query's own); this run frames the grid's */
    } finally { await b.close(); }
  });
});

/** PC3-7, 8, 11, 12 — the tile, the hover's place, its behaviour and its type */
async function tileLocks(page: Page, engine: string) {
  const E = engine === "chromium" ? "" : "W";
  const L7 = new Ledger(`PC3-7${E}`), L8 = new Ledger(`PC3-8${E}`), L11 = new Ledger(`PC3-11${E}`), L12 = new Ledger(`PC3-12${E}`);
  const T = V3.attachmentsTile;
  const cards = (await readCards(page)).filter((c) => c.tile);
  L7.check("cards with a tile: population", cards.length >= 10, `${cards.length}`);
  for (const c of cards) {
    const t = c.tile!;
    L7.check(`${c.id}: 44 × 50, radius 10`, Math.abs(t.box.w - 44) <= 0.5 && Math.abs(t.box.h - 50) <= 0.5 && t.radius === "10px", `${t.box.w} × ${t.box.h} r ${t.radius}`);
    L7.check(`${c.id}: 12px in from the Sent box's right edge, vertically centred`, Math.abs(t.sent.x + t.sent.w - (t.box.x + t.box.w) - 12) <= 0.5 && Math.abs(t.sent.y + t.sent.h / 2 - (t.box.y + t.box.h / 2)) <= 0.5,
      `${(t.sent.x + t.sent.w - t.box.x - t.box.w).toFixed(1)} / ${(t.sent.y + t.sent.h / 2 - t.box.y - t.box.h / 2).toFixed(1)}`);
    L7.check(`${c.id}: fill ${T.fill}`, t.bg === "rgba(28, 19, 15, 0.055)", t.bg);
    L7.check(`${c.id}: glyph 18px above the count, 4px apart`, Math.abs(t.glyph.w - 18) <= 0.5 && Math.abs(t.countBox.y - (t.glyph.y + t.glyph.h) - 4) <= 1, `${t.glyph.w} / ${(t.countBox.y - t.glyph.y - t.glyph.h).toFixed(1)}`);
    L7.check(`${c.id}: count Special Elite 16px`, /Special Elite/.test(t.countFont) && t.countSize === "16px", `${t.countFont.split(",")[0]} ${t.countSize}`);
    L7.check(`${c.id}: named "${t.count} material${t.count === "1" ? "" : "s"}", a button that takes focus`, t.label === `${t.count} material${t.count === "1" ? "" : "s"}` && t.tag === "BUTTON" && t.tabIndex >= 0, `${t.label} ${t.tag} ${t.tabIndex}`);
  }
  /* the Sent box's words never run under the tile */
  const under = await page.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((c) => c.getBoundingClientRect().width > 0 && c.querySelector('[data-pc3="tile"]')).map((c) => {
    const t = c.querySelector<HTMLElement>('[data-pc3="tile"]')!.getBoundingClientRect();
    const words = [...c.querySelectorAll<HTMLElement>('[data-k="sent"] > span:not(.pc3-tw), [data-k="sent"] > b, [data-k="sent"] > em')].map((e) => e.getBoundingClientRect().right);
    return { id: c.dataset.id ?? "", over: Math.max(...words) - t.left };
  }), PAGE);
  for (const u of under) L7.check(`${u.id}: the Sent box's words end before the tile`, u.over <= 0.5, `${u.over.toFixed(1)}px`);

  /* PC3-8 · the hover's place: last row, last column, and a first-row card */
  const lastRow = cards.reduce((a, c) => (c.band.y > a.band.y ? c : a), cards[0]);
  const lastCol = cards.reduce((a, c) => (c.band.x > a.band.x ? c : a), cards[0]);
  const firstCol = cards.reduce((a, c) => (c.band.x < a.band.x ? c : a), cards[0]);
  const firstRow = cards.reduce((a, c) => (c.band.y < a.band.y ? c : a), cards[0]);
  for (const [name, c, block] of [["last row (scrolled to the bottom)", lastRow, "end"], ["last column", lastCol, "center"], ["first column", firstCol, "center"], ["first row", firstRow, "start"]] as const) {
    const h = await readHover(page, c.id, block);
    L8.check(`${name} ${c.id}: the hover opens on hover`, h.open && !!h.box, `${h.open}`);
    if (!h.box) continue;
    const b = h.box;
    L8.check(`${name} ${c.id}: fully inside the viewport`, b.x >= 0 && b.y >= 0 && b.x + b.w <= h.vw && b.y + b.h <= h.vh, `${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}×${b.h.toFixed(0)} in ${h.vw}×${h.vh}`);
    L8.check(`${name} ${c.id}: above the neighbouring cards (every hit point is the hover)`, h.hits.every(Boolean), h.hits.join(","));
    L8.check(`${name} ${c.id}: no ancestor cuts it`, h.cut.length === 0, h.cut.join("; ") || "none");
    const room = h.vh - (h.tile.y + h.tile.h);
    if (room < b.h + 12) L8.check(`${name} ${c.id}: no room below (${room.toFixed(0)}px), so it opens upwards, 12px above the tile`, h.up && Math.abs(h.tile.y - (b.y + b.h) - 12) <= 1, `${h.up} / ${(h.tile.y - b.y - b.h).toFixed(1)}`);
    else L8.check(`${name} ${c.id}: room below, so it opens 12px below the tile`, !h.up && Math.abs(b.y - (h.tile.y + h.tile.h) - 12) <= 1, `${h.up} / ${(b.y - h.tile.y - h.tile.h).toFixed(1)}`);
    const over = b.x + b.w - (h.tile.x + h.tile.w);
    L8.check(`${name} ${c.id}: its right edge 10px past the tile's, or slid to stay in view`, Math.abs(over - 10) <= 0.5 || b.x + b.w >= h.vw - 8.5 || b.x <= 8.5, `${over.toFixed(1)}px`);
    L8.check(`${name} ${c.id}: 284 wide, radius 14, white, the JSON's edge and shadow, padding 14 16 12`,
      Math.abs(h.w - 284) <= 0.5 && h.radius === "14px" && h.bg === "rgb(255, 255, 255)" && h.shadow.includes("rgb(227, 213, 201) 0px 0px 0px 1px") && h.shadow.includes("rgba(28, 19, 15, 0.42) 0px 20px 36px -16px") && h.padding === "14px 16px 12px",
      `${h.w} ${h.radius} ${h.bg} ${h.shadow} ${h.padding}`);
    /* PC3-11 · title, chips */
    L11.check(`${c.id}: the title is the tile's name ("${h.tileName}")`, h.title === h.tileName && h.title !== "", h.title);
    /* lib/qc1533 materialGroups' count is the chips, or 1 for a package with none listed (the paperclip's own rule) */
    const want = h.chips.length || (h.groups.some((g) => g.pkg) ? 1 : 0);
    L11.check(`${c.id}: the count is its chips (or 1 for a package alone)`, String(want) === c.tile!.count, `${h.chips.length} chips, ${h.groups.filter((g) => g.pkg).length} package / ${c.tile!.count}`);
    for (const k of h.chips) {
      L11.check(`${c.id} chip "${k.text}": 28 high, radius 14, Source Serif 600 14px, an icon at 16px`, Math.abs(k.h - 28) <= 0.5 && k.radius === "14px" && /Source Serif/.test(k.font) && k.weight === "600" && k.size === "14px" && /:16$/.test(k.icon), `${k.h} ${k.radius} ${k.font.split(",")[0]} ${k.weight} ${k.size} ${k.icon}`);
      if (k.asked) L11.check(`${c.id} chip "${k.text}" (asked): white, 1px dashed navy at 60%, navy words`, k.bg === "rgb(255, 255, 255)" && /1px dashed rgba\(42, 58, 82, 0\.6\)/.test(k.border) && k.color === rgb(NAVY), `${k.bg} ${k.border} ${k.color}`);
      else L11.check(`${c.id} chip "${k.text}": #f8f4ed, 1px inset #e8dfd2, ink`, k.bg === rgb("#f8f4ed") && k.shadow.includes(`${rgb("#e8dfd2")} 0px 0px 0px 1px inset`) && k.color === rgb(INK), `${k.bg} ${k.shadow} ${k.color}`);
    }
    for (const s of h.sizes) L12.check(`${c.id} ${s.what}: ≥ 12px`, s.px >= 12, `${s.px}px`);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(300);
    const after = await page.evaluate((id) => !!document.querySelector(`[data-pc3="hover"][id="pc3-hov-${id}"]`), c.id);
    L11.check(`${c.id}: closes on leave`, !after, `${after}`);
  }
  /* a Full manuscript chip takes StatusDot's Full mark (its role-less svg inside StatusDot's span) */
  const fullCard = cards.find((c) => ["Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted"].includes(c.status));
  if (fullCard) {
    await readHover(page, fullCard.id, "center");
    const full = await page.evaluate((id) => {
      const h = document.getElementById(`pc3-hov-${id}`); if (!h) return null;
      const chip = [...h.querySelectorAll<HTMLElement>('[data-pc3="chip"]')].find((c) => /manuscript/i.test(c.textContent ?? ""));
      return chip ? { text: chip.textContent, statusDot: !!chip.querySelector("[data-sd], .pc3-chip-i"), asked: chip.hasAttribute("data-asked") } : null;
    }, fullCard.id);
    L11.check(`${fullCard.status} ${fullCard.id}: a manuscript chip with StatusDot's Full mark`, !!full && full.statusDot, JSON.stringify(full));
    await page.mouse.move(2, 2);
  } else L11.check("a Full card with a tile", false, "none");
  /* keyboard: focus opens, Escape closes and leaves focus on the tile, blur closes */
  const k = cards[0];
  await cardAt(page, k.id).evaluate((e) => e.scrollIntoView({ block: "center" }));
  await cardAt(page, k.id).locator("[data-pc3='tile']").focus();
  await page.waitForTimeout(300);
  const onFocus = await page.evaluate((id) => !!document.getElementById(`pc3-hov-${id}`), k.id);
  L11.check(`${k.id}: opens on keyboard focus`, onFocus, `${onFocus}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const esc = await page.evaluate((id) => ({ open: !!document.getElementById(`pc3-hov-${id}`), focus: (document.activeElement as HTMLElement | null)?.dataset.pc3 ?? "" }), k.id);
  L11.check(`${k.id}: Escape closes it, focus stays on the tile`, !esc.open && esc.focus === "tile", JSON.stringify(esc));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const reopened = await page.evaluate((id) => !!document.getElementById(`pc3-hov-${id}`), k.id);
  L11.check(`${k.id}: Enter opens it again`, reopened, `${reopened}`);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(300);
  const blurred = await page.evaluate((id) => !!document.getElementById(`pc3-hov-${id}`), k.id);
  L11.check(`${k.id}: closes on blur`, !blurred, `${blurred}`);
  L7.done(40); L8.done(16); L11.done(10); L12.done(10);
}

function envLocal(k: string): string | null {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = new RegExp(`^\\s*${k}\\s*=\\s*(.*)$`).exec(line);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "") || null;
    }
  } catch { /* none */ }
  return null;
}

/** the share of the middle 60% of a strip's columns in which some row is within 24 of the edge colour (each channel) */
async function edgeRow(page: Page, b64: string, edge: number[]): Promise<number> {
  return page.evaluate(async ({ d, edge }) => {
    const img = new Image(); img.src = `data:image/png;base64,${d}`; await img.decode();
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
    const x0 = Math.round(c.width * 0.2), x1 = Math.round(c.width * 0.8);
    const px = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let x = x0; x < x1; x++) {
      let near = false;
      for (let y = 0; y < c.height && !near; y++) { const i = (y * c.width + x) * 4; near = Math.abs(px[i] - edge[0]) <= 24 && Math.abs(px[i + 1] - edge[1]) <= 24 && Math.abs(px[i + 2] - edge[2]) <= 24; }
      if (near) n++;
    }
    return n / ((x1 - x0) || 1);
  }, { d: b64, edge });
}
