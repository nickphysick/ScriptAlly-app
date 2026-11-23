/**
 * Plumage colours v2 — the rendered locks (PC2-1 … PC2-9) and the frames, on the emulator harness. Every colour, box
 * and pixel is read from the page (getComputedStyle, getBoundingClientRect, elementFromPoint, a screenshot); a source
 * test is not a measurement. Each lock first proves its population is non-zero, then asserts. Supersedes
 * pc1.measure.ts (v1's outline and navy offer are retired; its search-tile lock is carried over as PC2-9b).
 *
 *   PC2-1  no element has the with-you outline: no inset 3px shadow on any grid band, slide-in strip, Responses
 *          strip or Birds-eye bar, for any status
 *   PC2-2  no surface on the Query Centre, the slide-in card or Responses computes a v1 Full or navy-Offer hex
 *   PC2-3  grid band and slide-in strip per status: Partial requested #f1d9cf, Partial sent #e8c0af, Full requested
 *          #dbe4ee, Full sent, R&R and Resubmitted #b9c9da
 *   PC2-4  Offer and Signed: the grid band and the slide-in strip compute the stripes; the Stage pill and segment,
 *          the Offers group heading's count, the Birds-eye bar and the Responses strip compute flat duck egg
 *   PC2-5  no navy Offer surface; every text and mark on an Offer surface is ink; solid ink is ≥ 4.5:1 against duck
 *          egg and each stripe colour (ink at reduced strength is recorded, not asserted: it is every band's)
 *   PC2-6  every grid card has exactly one label, its text the card's status name, its vertical centre within 1px of
 *          the band's bottom edge, none of it clipped (hit test and pixels; Chromium and WebKit)
 *   PC2-7  the label overlaps neither the seal, the agent's name nor a fact box, at 1280, 1512 and 1920, with the
 *          longest status name on the page; every grid card is the same height
 *   PC2-8  no "With you" text, chevron or new arrow on any card
 *   PC2-9  the slide-in card's border breathes in the new rim for Full and Offer; (b) the four search tiles (v1's
 *          PC1-7, unchanged)
 *   PC2-F  the frames, Chromium and WebKit at 1512 (reports/plumage-colours-v2/frames/)
 *
 * SA_PHASE=mutant<X> writes its ledgers beside the green ones (reports/plumage-colours-v2/ledger/mutant<X>-*) and is
 * expected red. PC2_ONLY=1,6 runs only those locks (F for the frames).
 */
import { test, expect, webkit, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { liftMotionSuppression, openRoute } from "./measure";

/* ⚠️ THE EXPECTATIONS COME FROM THE PACKS, NOT FROM src/. Queried, Partial and Closed are v1's JSON; Full and Offer are
   v2's; the stripes are v2's string. A lock that imported lib/stageColours would move with a mutation of the table. */
const V1 = JSON.parse(readFileSync("design-refs/plumage-colours-v1/plumage-colours-v1.json", "utf8")) as {
  statusBand: Record<string, string>; kinds: Record<string, { tile: string; glyph: string; edge?: string }>;
  stages: Record<string, { edge: string }>;
};
const V2 = JSON.parse(readFileSync("design-refs/plumage-colours-v2/plumage-colours-v2.json", "utf8")) as {
  ink: string; offerStripes: string; stages: { full: Record<string, string>; offer: Record<string, string> };
};
const INK = V2.ink;
const DUCK = V2.stages.offer.band;
/** the stripes' three colours, in order, read from the JSON's string */
const STRIPES = [...V2.offerStripes.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase());
/** the pack's status names, by the enum's */
const NAME: Record<string, string> = {
  Queried: "Queried", "Partial Requested": "Partial requested", "Partial Sent": "Partial sent", "Full Requested": "Full requested",
  "Full Sent": "Full sent", "Revise & Resubmit": "Revise and resubmit", Resubmitted: "Resubmitted", Offer: "Offer", Signed: "Signed",
  Rejected: "Rejected", "No Response": "No response", Withdrawn: "Withdrawn",
};
/** the v1 pack's stage of a status (its edges are v1's for Queried, Partial and Closed) */
const STAGE_OF = (s: string): string => (["Partial Requested", "Partial Sent"].includes(s) ? "partial" : ["Rejected", "No Response", "Withdrawn"].includes(s) ? "closed" : "queried");
const FULL_STATUS = new Set(["Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted"]);
const OFFER_STATUS = new Set(["Offer", "Signed"]);
const statusBand = (s: string): string =>
  OFFER_STATUS.has(s) ? DUCK : s === "Full Requested" ? V2.stages.full.bandRequested : FULL_STATUS.has(s) ? V2.stages.full.band : V1.statusBand[NAME[s] ?? "Queried"];
/** the card's status name, as the app words it (lib/qcSummary STAGE_NAME; No Response as lib/qc153's "No reply") */
const WORD: Record<string, string> = {
  Queried: "Queried", "Partial Requested": "Partial requested", "Partial Sent": "Partial sent", "Full Requested": "Full requested",
  "Full Sent": "Full sent", "Revise & Resubmit": "Revise & resubmit", Resubmitted: "Resubmitted", Offer: "Offer", Signed: "Signed",
  Rejected: "Passed", "No Response": "No reply", Withdrawn: "Withdrawn",
};
/** v1's Full and navy-Offer hexes that may not appear on a stage surface any more (the navy itself is the app's chrome) */
const V1_GONE = ["#b5b6c0", "#d4d4da", "#ededef", "#a0a0ae", "#65667c", "#d9dce0", "#243247", "#aab0ba"];
const NAVY = "#2a3a52";
type Kind = "query" | "agent" | "material" | "task";

const PAGE = ".qc151.qc153";
const ONLY = process.env.PC2_ONLY ?? "";
const run = (id: string) => (!ONLY && id !== "F") || ONLY.split(",").includes(id);
const PHASE = /^mutant[A-Z0-9]*$/.test(process.env.SA_PHASE ?? "") ? process.env.SA_PHASE! : "after";
const DIR = "reports/plumage-colours-v2";
const DESK = { width: 1512, height: 982 };
const CARD = "[data-qp='panel'] [data-qc152='card']";
test.setTimeout(420_000);
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
/** contrast of a colour (with its alpha, laid over the ground) against the ground */
const contrast = (fg: string, ground: string) => {
  const [r, g, b, a] = parse(fg); const G = hexArr(ground);
  const F = [r, g, b].map((v, i) => v * a + G[i] * (1 - a));
  const x = lum(F), y = lum(G);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** is this computed colour the ink (at any strength)? */
const isInk = (c: string) => { const [r, g, b, a] = parse(c); const I = hexArr(INK); return a > 0 && r === I[0] && g === I[1] && b === I[2]; };
/** the computed stripes: a repeating gradient at 118deg, the JSON's three colours in order at 0/22, 22/44, 44/66px */
const isStripes = (img: string) => {
  if (!/^repeating-linear-gradient\(118deg,/.test(img)) return false;
  const want = STRIPES.map(rgb);
  const stops = [...img.matchAll(/rgb\([^)]+\)\s*([0-9.]+px)?(?:\s*([0-9.]+px))?/g)].map((m) => [m[0].match(/rgb\([^)]+\)/)![0], m[1] ?? "", m[2] ?? ""]);
  const seq = stops.map((s) => s[0]);
  const uniq = seq.filter((c, i) => i === 0 || c !== seq[i - 1]);
  return JSON.stringify(uniq) === JSON.stringify(want) && /66px/.test(img) && /22px/.test(img) && /44px/.test(img);
};

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: unknown, got: string) { this.rows.push({ name, ok: !!ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  note(name: string, got: string) { console.log(`${this.id} · ${name} — ${got}`); this.rows.push({ name: `(recorded) ${name}`, ok: true, got }); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    /* ⚠️ SOFT, so a red ledger never hides the ones after it in the same test (each still fails the test) */
    expect.soft(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect.soft(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`), `${this.id}: red rows`).toEqual([]);
  }
}

/** a measurement's click, as the DOM's own: these locks read colours, not the press, and desktop WebKit (measured
 *  23 Nov) never finds the harness's buttons actionable, so a Playwright click there waits its whole timeout out */
const press = (l: Locator) => l.evaluate((e) => (e as HTMLElement).click());

async function openQc(page: Page, view: "list" | "birds" = "list", vp = DESK, log: (w: string) => void = () => {}) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511");
    } catch { /* private */ }
  });
  log("openRoute");
  await openRoute(page, "/queries", vp);
  log("the bar");
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="${view}"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await press(b);
  await page.waitForTimeout(900);
  if (view === "list") {
    await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
    log("show all");
    const more = page.locator(`${PAGE} [data-qc153='show-all']`);
    for (let i = 0; i < 6 && (await more.count()) > 0; i++) { await press(more.first()); await page.waitForTimeout(300); }
  }
  log("fonts");
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(700);
  await page.mouse.move(2, 2);
}

interface Box { x: number; y: number; w: number; h: number }
interface CardReading {
  id: string; status: string; quiet: boolean; bg: string; img: string; shadow: string; h: number;
  band: Box; labels: { text: string; box: Box; edge: string; font: string; size: string; color: string; bg: string; radius: string }[];
  seal: Box | null; name: Box | null; facts: Box[]; inks: { what: string; color: string }[]; text: string; arrows: number; chips: number; chev: number;
}
const readCards = (page: Page): Promise<CardReading[]> => page.evaluate((root) => {
  const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; };
  /* the cards on show: a folded group keeps its cards in the DOM at 0 × 0, and they are not read */
  return [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((c) => c.getBoundingClientRect().width > 0).map((c) => {
    const hdEl = c.querySelector<HTMLElement>('[data-qc154="band"]')!;
    const hd = getComputedStyle(hdEl);
    const inks = [
      ...[...c.querySelectorAll<HTMLElement>('[data-qc154="name"], [data-qc154="agency"], .pc2-lbl')].map((e) => ({ what: e.dataset.qc154 ?? "label", color: getComputedStyle(e).color })),
      ...[...hdEl.querySelectorAll<HTMLElement>(".qc153-nd")].map((e) => ({ what: `step ${e.dataset.state}`, color: getComputedStyle(e).color })),
      /* a link is drawn in its background: a colour, or (a skipped one) a dotted gradient whose first stop is the ink */
      ...[...hdEl.querySelectorAll<HTMLElement>(".qc153-ln")].map((e) => { const cs = getComputedStyle(e); const g = cs.backgroundImage.match(/rgba?\([^)]+\)/)?.[0]; return { what: `link ${e.dataset.state}`, color: cs.backgroundColor !== "rgba(0, 0, 0, 0)" || !g ? cs.backgroundColor : g }; }),
    ];
    return {
      id: c.dataset.id ?? "", status: c.dataset.status ?? "", quiet: c.hasAttribute("data-quiet"),
      bg: hd.backgroundColor, img: hd.backgroundImage, shadow: hd.boxShadow, h: c.getBoundingClientRect().height,
      band: box(hdEl)!,
      labels: [...c.querySelectorAll<HTMLElement>(".pc2-lbl, [data-pc2='label']")].filter((e, i, a) => a.indexOf(e) === i).map((e) => {
        const cs = getComputedStyle(e);
        return { text: e.textContent ?? "", box: box(e)!, edge: cs.boxShadow, font: cs.fontFamily, size: cs.fontSize, color: cs.color, bg: cs.backgroundColor, radius: cs.borderRadius };
      }),
      seal: box(c.querySelector(".qc154-seal")), name: box(c.querySelector('[data-qc154="name"]')),
      facts: [...c.querySelectorAll('[data-qc154="fact"]')].map((f) => box(f)!),
      inks, text: c.innerText,
      arrows: c.querySelectorAll('[data-qc153="arrow"]').length, chips: c.querySelectorAll(".qc1561-arr").length,
      chev: c.querySelectorAll('[class*="chev" i], [data-chev], [class*="wyt"], [class*="seam"]').length,
    };
  });
}, PAGE);
const byStatus = (cards: CardReading[]) => { const m = new Map<string, CardReading[]>(); for (const c of cards) m.set(c.status, [...(m.get(c.status) ?? []), c]); return m; };
const meets = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** open a card's slide-in from the grid and read its strip, bubbles and rim */
async function openSlide(page: Page, id: string) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
  const c = page.locator(`${PAGE} [data-qc154='card'][data-id='${id}']`).first();
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
    return { bg: st.backgroundColor, img: st.backgroundImage, shadow: st.boxShadow, color: st.color, inks, bubbles, labels: root.querySelectorAll(".pc2-lbl").length };
  }, CARD);
}

test.describe("Plumage colours v2 — the rendered locks", () => {
  if (run("1") || run("2") || run("3") || run("4") || run("5") || run("6") || run("8")) test("PC2-1 … PC2-6, PC2-8 · the grid card, its slide-in, Birds-eye, the filter and Responses", async ({ page }) => {
    await openQc(page);
    const cards = await readCards(page);
    const by = byStatus(cards);
    console.log("population:", JSON.stringify([...by].map(([s, l]) => [s, l.length, l.filter((c) => c.quiet).length])));

    /* PC2-1 — no outline on any grid band */
    const L1 = new Ledger("PC2-1");
    L1.check("grid cards on the page", cards.length >= 20, `${cards.length}`);
    for (const s of ["Partial Requested", "Full Requested", "Revise & Resubmit"]) L1.check(`${s}: population non-zero (the three v1 outlined)`, (by.get(s)?.length ?? 0) > 0, `${by.get(s)?.length ?? 0}`);
    for (const c of cards) L1.check(`${c.status} ${c.id}: grid band has no inset 3px shadow`, !/3px inset|inset[^,]*3px/.test(c.shadow), c.shadow);

    /* PC2-3 — the grid band per status (quiet cards fade from it) */
    const L3 = new Ledger("PC2-3");
    for (const s of ["Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit"]) L3.check(`${s}: population non-zero`, (by.get(s)?.length ?? 0) > 0, `${by.get(s)?.length ?? 0}`);
    for (const c of cards) {
      if (OFFER_STATUS.has(c.status)) continue;
      if (c.quiet) L3.check(`${c.status} ${c.id} (quiet): fades from ${statusBand(c.status)}`, c.img.includes(rgb(statusBand(c.status))) && c.img.startsWith("linear-gradient"), c.img);
      else L3.check(`${c.status} ${c.id}: grid band ${statusBand(c.status)}, flat`, c.bg === rgb(statusBand(c.status)) && c.img === "none", `${c.bg} / ${c.img}`);
    }

    /* PC2-4 / PC2-5 — the offer's grid band */
    const L4 = new Ledger("PC2-4");
    const L5 = new Ledger("PC2-5");
    const offers = cards.filter((c) => OFFER_STATUS.has(c.status));
    L4.check("Offer or Signed grid cards: population non-zero", offers.length > 0, `${offers.length}`);
    const grounds = [DUCK, ...STRIPES];
    for (const c of offers) {
      L4.check(`${c.status} ${c.id}: grid band computes the stripes`, isStripes(c.img), c.img);
      L5.check(`${c.status} ${c.id}: grid band is not navy`, c.bg !== rgb(NAVY) && !c.img.includes(rgb(NAVY)), `${c.bg}`);
      for (const k of c.inks) {
        L5.check(`${c.status} ${c.id} ${k.what}: ink`, isInk(k.color), k.color);
        const a = parse(k.color)[3];
        const worst = Math.min(...grounds.map((g) => contrast(k.color, g)));
        if (a === 1) L5.check(`${c.status} ${c.id} ${k.what}: ≥ 4.5:1 on duck egg and each stripe`, worst >= 4.5, worst.toFixed(2));
        else L5.note(`${c.status} ${c.id} ${k.what} (ink at ${a}): lowest contrast on duck egg / stripes`, worst.toFixed(2));
      }
    }

    /* PC2-6 — the label, on every grid card */
    const L6 = new Ledger("PC2-6");
    L6.check("quiet cards on the page (they carry it too)", cards.some((c) => c.quiet), `${cards.filter((c) => c.quiet).length}`);
    for (const c of cards) {
      L6.check(`${c.status} ${c.id}: exactly one label`, c.labels.length === 1, `${c.labels.length}`);
      const l = c.labels[0];
      if (!l) continue;
      L6.check(`${c.status} ${c.id}: its text is "${WORD[c.status]}"`, l.text === WORD[c.status], l.text);
      const mid = l.box.y + l.box.h / 2, edge = c.band.y + c.band.h;
      L6.check(`${c.status} ${c.id}: its centre within 1px of the band's bottom edge`, Math.abs(mid - edge) <= 1, `${(mid - edge).toFixed(2)}px`);
      L6.check(`${c.status} ${c.id}: 14px from the band's left, 22px high, radius 11`, Math.abs(l.box.x - c.band.x - 14) <= 0.5 && Math.abs(l.box.h - 22) <= 0.5 && l.radius === "11px", `${(l.box.x - c.band.x).toFixed(1)} / ${l.box.h} / ${l.radius}`);
      L6.check(`${c.status} ${c.id}: Special Elite 13px in ink on white, edge 1px inset`, /Special Elite/.test(l.font) && l.size === "13px" && l.color === rgb(INK) && l.bg === "rgb(255, 255, 255)" && /1px inset/.test(l.edge), `${l.font.split(",")[0]} ${l.size} ${l.color} ${l.bg} ${l.edge}`);
    }
    /* not clipped: a hit test at the label's lower corners (its pointer-events lifted for the reading only) */
    const clip = await page.evaluate((root) => {
      const out: { id: string; ok: boolean; got: string }[] = [];
      for (const c of [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((x) => x.getBoundingClientRect().width > 0)) {
        const l = c.querySelector<HTMLElement>(".pc2-lbl"); if (!l) continue;
        /* ⚠️ SCROLL THE CARD, NEVER THE LABEL: a clipping ancestor is a scroll container, and scrolling the label into
           view scrolls the band's content up by the clipped amount, so the probe would undo the clip it looks for
           (measured 23 Nov with a band set to overflow: hidden) */
        c.scrollIntoView({ block: "center" });
        const was = l.style.pointerEvents; l.style.pointerEvents = "auto";
        const r = l.getBoundingClientRect();
        /* 12px in from each end, clear of the 11px rounded ends, where a hit test follows the curve */
        const pts = [[r.left + 12, r.bottom - 2], [r.right - 12, r.bottom - 2], [r.left + r.width / 2, r.bottom - 1.5], [r.left + 12, r.top + 2]];
        const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === l || l.contains(e)); });
        l.style.pointerEvents = was;
        /* ⚠️ A HIT TEST DOES NOT SEE A CLIP: measured 23 Nov, a band with overflow: hidden cut every label in half on the
           screen while elementFromPoint still answered the label. So the clip is read as geometry: every ancestor that
           clips (overflow not visible) must hold the whole label inside its box. */
        const cut: string[] = [];
        for (let a = l.parentElement; a && a !== c.parentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
          const b = a.getBoundingClientRect();
          if (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5 || r.left < b.left - 0.5 || r.right > b.right + 0.5) cut.push(`${a.className.toString().split(" ")[0]} (${cs.overflowX}/${cs.overflowY}) cuts ${Math.max(0, r.bottom - b.bottom).toFixed(1)}px`);
        }
        out.push({ id: c.dataset.id ?? "", ok: hits.every(Boolean) && cut.length === 0, got: `${hits.join(",")}${cut.length ? ` · ${cut.join("; ")}` : ""}` });
      }
      return out;
    }, PAGE);
    L6.check("hit test: population", clip.length === cards.length, `${clip.length}`);
    for (const h of clip) L6.check(`${h.id}: no ancestor clips the label, and every corner of it is hit (not covered)`, h.ok, h.got);
    /* and in pixels: the label's bottom edge line (the stage edge, inset 1px) is drawn, on one card per status */
    const shown = new Set<string>();
    for (const c of cards) {
      if (shown.has(c.status) || !c.labels[0]) continue;
      shown.add(c.status);
      await page.locator(`${PAGE} [data-qc154='card'][data-id='${c.id}']`).evaluate((e) => e.scrollIntoView({ block: "center" }));
      const r = (await page.locator(`${PAGE} [data-qc154='card'][data-id='${c.id}'] .pc2-lbl`).boundingBox())!;
      const edgeHex = OFFER_STATUS.has(c.status) ? V2.stages.offer.edge : FULL_STATUS.has(c.status) ? V2.stages.full.edge : V1.stages[STAGE_OF(c.status)].edge;
      const shot = await page.screenshot({ clip: { x: r.x, y: r.y + r.height - 4, width: r.width, height: 4 } });
      const px = await edgeRow(page, shot.toString("base64"), hexArr(edgeHex));
      /* the label's 1px inset edge, in its stage's edge colour, drawn along its bottom across the middle: a clip at the
         band's edge leaves the card's body there instead (the white of the body passes for the label's white, so the
         edge line is what is read) */
      L6.check(`${c.status} ${c.id}: pixels — the label's bottom edge line (${edgeHex}) is on screen across its middle`, px >= 0.6, `${(px * 100).toFixed(0)}% of the middle near ${edgeHex}`);
    }

    /* PC2-8 — no "With you", no chevron, no new arrow */
    const L8 = new Ledger("PC2-8");
    L8.check("cards read: population", cards.length >= 20, `${cards.length}`);
    for (const c of cards) {
      L8.check(`${c.id}: no "With you" text`, !/with you/i.test(c.text), "");
      L8.check(`${c.id}: no chevron or new arrow (one track arrow, one action arrow at most)`, c.chev === 0 && c.arrows <= 1 && c.chips <= 1 && !/[›»❯〉⟩▶►]/.test(c.text), `chev ${c.chev}, track ${c.arrows}, chip ${c.chips}`);
    }

    /* the slide-in: strip per status (PC2-1/3/4/5), its bubbles, no label on it */
    const want = ["Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted", "Offer", "Signed"];
    const opened: string[] = [];
    const bubbleSeen = new Map<string, { bg: string; img: string; shadow: string; color: string }>();
    for (const s of want) {
      const c = (by.get(s) ?? []).find((x) => !x.quiet);
      if (!c) { L3.note(`${s}: no live card in the seed to open`, "skipped"); continue; }
      const r = await openSlide(page, c.id);
      opened.push(s);
      L1.check(`slide-in ${s} ${c.id}: strip has no inset 3px shadow`, !/3px inset/.test(r.shadow), r.shadow);
      L6.check(`slide-in ${s} ${c.id}: carries no band label`, r.labels === 0, `${r.labels}`);
      if (OFFER_STATUS.has(s)) {
        L4.check(`slide-in ${s} ${c.id}: strip computes the stripes`, isStripes(r.img), r.img);
        L5.check(`slide-in ${s} ${c.id}: strip is not navy`, r.bg !== rgb(NAVY), r.bg);
        L5.check(`slide-in ${s} ${c.id}: strip words in ink`, r.color === rgb(INK), r.color);
        for (const k of r.inks) L5.check(`slide-in ${s} ${k.what}: ink`, isInk(k.color), k.color);
      } else {
        L3.check(`slide-in ${s} ${c.id}: strip ${statusBand(s)}, flat`, r.bg === rgb(statusBand(s)) && r.img === "none", `${r.bg} / ${r.img}`);
      }
      for (const b of r.bubbles) if (!bubbleSeen.has(b.status)) bubbleSeen.set(b.status, b);
    }
    await page.keyboard.press("Escape").catch(() => {});
    L3.check("slide-in: opened Partial requested, Full requested and R&R at least", ["Partial Requested", "Full Requested", "Revise & Resubmit"].every((s) => opened.includes(s)), opened.join(", "));
    for (const [s, b] of bubbleSeen) {
      L1.check(`bubble ${s}: no outline`, !/3px inset/.test(b.shadow), b.shadow);
      if (OFFER_STATUS.has(s)) {
        L4.check(`bubble ${s}: flat duck egg (bubbles are not card bands)`, b.bg === rgb(DUCK) && b.img === "none", `${b.bg} / ${b.img}`);
        L5.check(`bubble ${s}: words in ink`, b.color === rgb(INK), b.color);
      }
    }

    /* PC2-4/5 — the Stage pill and segment, and the Offers group heading's count */
    const sf = await page.locator(`${PAGE} [data-qc156='panel'] >> visible=true`).first().evaluate((p) => [...p.querySelectorAll<HTMLElement>(".sf-lab[data-stage='offer'], .sf-seg[data-stage='offer']")].map((e) => {
      const cs = getComputedStyle(e); const nm = e.querySelector<HTMLElement>(".sf-nm");
      return { kind: e.classList.contains("sf-seg") ? "segment" : "pill", bg: cs.backgroundColor, img: cs.backgroundImage, color: nm ? getComputedStyle(nm).color : cs.color };
    })).catch(() => []);
    L4.check("the Stage filter's Offer pill: population", sf.some((x) => x.kind === "pill"), JSON.stringify(sf.map((x) => x.kind)));
    for (const x of sf) {
      L4.check(`Stage filter ${x.kind} (offer): flat duck egg`, x.bg === rgb(DUCK) && x.img === "none", `${x.bg} / ${x.img}`);
      if (x.kind === "pill") L5.check("Stage filter pill (offer): words in ink", x.color === rgb(INK), x.color);
    }
    const sec = await page.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc153='heading'][data-offer] small`)].map((e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, img: cs.backgroundImage, color: cs.color }; }), PAGE);
    if (sec.length) for (const x of sec) {
      L4.check("the Offers group heading's count: flat duck egg", x.bg === rgb(DUCK) && x.img === "none", `${x.bg} / ${x.img}`);
      L5.check("the Offers group heading's count: ink", isInk(x.color), x.color);
    } else L4.note("the Offers group heading", "not grouped by attention on this page (no heading to read)");

    /* PC2-2 — no v1 Full or navy-Offer hex on any stage surface of this page (bands, strips, bubbles, pills, chips) */
    const L2 = new Ledger("PC2-2");
    const gone = await page.evaluate((hexes) => {
      const want = hexes.map((h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`);
      const els = [...document.querySelectorAll<HTMLElement>(".qc151.qc153 *, [data-qp='panel'] *")];
      const hits: string[] = [];
      for (const e of els) {
        if (!e.getClientRects().length) continue;
        const cs = getComputedStyle(e);
        for (const p of [cs.backgroundColor, cs.color, cs.borderTopColor, cs.boxShadow, cs.backgroundImage]) if (want.some((w) => p.includes(w))) { hits.push(`${e.className.toString().slice(0, 40)}: ${p.slice(0, 60)}`); break; }
      }
      return { n: els.length, hits };
    }, V1_GONE);
    L2.check("elements read on the Query Centre and the slide-in", gone.n > 500, `${gone.n}`);
    L2.check("none computes a v1 Full or navy-Offer hex", gone.hits.length === 0, gone.hits.slice(0, 6).join(" | ") || "none");

    /* Birds-eye: each current bar is its status's band, flat, never outlined; an offer's duck egg */
    const statusById = new Map(cards.map((c) => [c.id, c.status]));
    await openQc(page, "birds");
    await page.locator(`${PAGE} [data-qc150="be-bar"]`).first().waitFor({ timeout: 30_000 });
    const bars = await page.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc150="be-row"]`)].flatMap((r) => {
      const b = r.querySelector<HTMLElement>('[data-qc150="be-bar"]'); if (!b) return [];
      const cs = getComputedStyle(b); const lb = b.querySelector<HTMLElement>(".qc150-lb");
      return [{ id: r.dataset.id ?? "", bg: cs.backgroundColor, img: cs.backgroundImage, shadow: cs.boxShadow, label: lb ? getComputedStyle(lb).color : "" }];
    }), PAGE);
    const known = bars.filter((b) => statusById.has(b.id));
    L3.check("Birds-eye bars with a known status: population", known.length >= 10, `${known.length} of ${bars.length}`);
    for (const b of known) {
      const s = statusById.get(b.id)!;
      L1.check(`Birds-eye ${s} ${b.id}: no outline`, !/3px inset/.test(b.shadow), b.shadow);
      L3.check(`Birds-eye ${s} ${b.id}: bar ${statusBand(s)}, flat`, b.bg === rgb(statusBand(s)) && b.img === "none", `${b.bg} / ${b.img}`);
      if (OFFER_STATUS.has(s)) {
        L4.check(`Birds-eye ${s} ${b.id}: flat duck egg, not the stripes`, b.bg === rgb(DUCK) && b.img === "none", `${b.bg} / ${b.img}`);
        if (b.label) L5.check(`Birds-eye ${s} ${b.id}: its label in ink`, isInk(b.label), b.label);
      }
    }

    /* Responses: the strip per answer, no outline; an offer's flat duck egg */
    await openRoute(page, "/queries/responses", DESK);
    await page.waitForTimeout(1500);
    const cards2 = page.locator("[data-qc154='card'] >> visible=true");
    const rsp: { status: string; bg: string; img: string; shadow: string }[] = [];
    if (await cards2.count()) {
      const first = cards2.first();
      await first.click().catch(() => {});
      await page.waitForTimeout(1200);
    }
    rsp.push(...await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-rsn='status']")].filter((e) => e.getClientRects().length).map((e) => {
      const cs = getComputedStyle(e); return { status: e.dataset.tone ?? "", bg: cs.backgroundColor, img: cs.backgroundImage, shadow: cs.boxShadow };
    })));
    if (rsp.length) for (const r of rsp) {
      L1.check(`Responses strip (${r.status}): no outline`, !/3px inset/.test(r.shadow), r.shadow);
      if (r.status === "offer") L4.check("Responses strip (offer): flat duck egg", r.bg === rgb(DUCK) && r.img === "none", `${r.bg} / ${r.img}`);
    } else L1.note("Responses strip", "no response open to read (the panel did not open from the first card)");

    L1.done(40); L2.done(2); L3.done(30); L4.done(4); L5.done(6); L6.done(60); L8.done(40);
  });

  if (run("7")) test("PC2-7 · the label clears the seal, the name and the facts at 1280, 1512 and 1920; one card height", async ({ page }) => {
    const L = new Ledger("PC2-7");
    for (const vp of [{ width: 1280, height: 800 }, { width: 1512, height: 982 }, { width: 1920, height: 1080 }]) {
      await openQc(page, "list", vp);
      const cards = await readCards(page);
      const longest = Math.max(...cards.map((c) => c.labels[0]?.text.length ?? 0));
      const longCards = cards.filter((c) => (c.labels[0]?.text.length ?? 0) === longest);
      L.check(`${vp.width}: cards and the longest status name on the page`, cards.length >= 20 && longest >= 17, `${cards.length} cards; longest "${longCards[0]?.labels[0]?.text}" (${longest}) on ${longCards.length}`);
      for (const c of cards) {
        const l = c.labels[0]?.box; if (!l) continue;
        const bad = [c.seal && meets(l, c.seal) ? "seal" : "", c.name && meets(l, c.name) ? "name" : "", ...c.facts.map((f, i) => (meets(l, f) ? `fact ${i + 1}` : ""))].filter(Boolean);
        L.check(`${vp.width} ${c.status} ${c.id}: the label meets nothing`, bad.length === 0, bad.join(",") || `facts ${(Math.min(...c.facts.map((f) => f.y)) - (l.y + l.h)).toFixed(1)}px below`);
      }
      const hs = cards.map((c) => c.h);
      L.check(`${vp.width}: every grid card the same height`, Math.max(...hs) - Math.min(...hs) <= 0.5, `${Math.min(...hs).toFixed(1)}–${Math.max(...hs).toFixed(1)}px`);
    }
    L.done(60);
  });

  if (run("9")) test("PC2-9 · the slide-in's rim breathes in the new Full and Offer rim; the four search tiles", async ({ page }) => {
    await openQc(page);
    const cards = await readCards(page);
    const L = new Ledger("PC2-9");
    for (const [stage, statuses, hex] of [["full", ["Full Requested", "Full Sent", "Revise & Resubmit"], V2.stages.full.rim], ["offer", ["Offer", "Signed"], V2.stages.offer.rim]] as const) {
      const c = cards.find((x) => (statuses as readonly string[]).includes(x.status) && !x.quiet);
      L.check(`${stage}: a card to open`, !!c, c ? `${c.status} ${c.id}` : "none");
      if (!c) continue;
      await liftMotionSuppression(page);
      await openSlide(page, c.id);
      /* the rim breathes while a journey drawer is open (Query card v163; tests/e2e/qc163.measure.ts openDrawer): open
         the reply composer, read, then Escape out — nothing is saved */
      const reply = page.locator(`${CARD} [data-qc152='reply-btn'], ${CARD} [data-qc152='reply'] button`).first();
      L.check(`${stage}: a reply button to open the drawer`, (await reply.count()) > 0, `${await reply.count()}`);
      await reply.click().catch(() => {});
      const drawer = await page.locator(`${CARD} [data-qc1522='composer']`).first().waitFor({ timeout: 8000 }).then(() => true, () => false);
      L.check(`${stage}: the drawer opened`, drawer, "");
      await page.waitForTimeout(2600);
      const tint = await page.evaluate((sel) => {
        const sp = document.querySelector<HTMLElement>(sel)?.closest(".spanel");
        const t = sp?.querySelector<HTMLElement>(":scope > .qc163-rim [data-qc163='tint'], :scope > .qc163-rim > b");
        const runs = sp?.getAnimations({ subtree: true }).filter((a) => (a as Animation & { id: string }).id === "qc163-tint").length ?? 0;
        return { bg: t ? getComputedStyle(t).backgroundColor : "", runs };
      }, CARD);
      L.check(`${stage}: the rim's tint is ${hex} (v2's rim)`, tint.bg === rgb(hex), tint.bg);
      L.check(`${stage}: the tint is breathing (qc163-tint runs)`, tint.runs >= 1, `${tint.runs}`);
      for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(300); }
    }

    /* (b) v1's PC1-7, unchanged: the four search tiles */
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
      const list = got.get(k) ?? []; const c = V1.kinds[k];
      L.check(`tile ${k}: population non-zero`, list.length > 0, `${list.length}`);
      for (const t of list.slice(0, 4)) {
        L.check(`tile ${k}${t.big ? " (44px)" : ""}: ${c.tile}, glyph ${c.glyph}`, t.bg === rgb(c.tile) && t.color === rgb(c.glyph), `${t.bg} / ${t.color}`);
        if (c.edge) L.check(`tile ${k}${t.big ? " (44px)" : ""}: 1px edge ${c.edge}`, t.shadow === `${rgb(c.edge)} 0px 0px 0px 1px inset`, t.shadow);
      }
    }
    L.done(12);
  });

  /* PC2-F — the frames, Chromium and WebKit at 1512; and PC2-6's clipping read again in WebKit */
  const L6W = new Ledger("PC2-6W");
  const frames = async (p: Page, engine: string) => {
      const L = L6W;
      const step = (w: string) => console.log(`PC2-F ${engine}: ${w}`);
      step("open the list");
      await openQc(p, "list", DESK, (w) => step(`  · ${w}`));
      step("read the cards");
      const cards = await readCards(p);
      /* the list, whole, then one card per status crop (Offer, PR, PS, FR, FS, R&R and a gone quiet card) */
      await p.screenshot({ path: `${DIR}/frames/${engine}-list-1512.png`, fullPage: true });
      const pick: [string, (c: CardReading) => boolean][] = [
        ["offer", (c) => OFFER_STATUS.has(c.status)], ["partial-requested", (c) => c.status === "Partial Requested" && !c.quiet],
        ["partial-sent", (c) => c.status === "Partial Sent" && !c.quiet], ["full-requested", (c) => c.status === "Full Requested" && !c.quiet],
        ["full-sent", (c) => c.status === "Full Sent" && !c.quiet], ["revise-resubmit", (c) => c.status === "Revise & Resubmit" && !c.quiet], ["gone-quiet", (c) => c.quiet],
      ];
      for (const [name, f] of pick) {
        const c = cards.find(f); if (!c) continue;
        const el = p.locator(`${PAGE} [data-qc154='card'][data-id='${c.id}']`);
        await el.scrollIntoViewIfNeeded();
        await el.screenshot({ path: `${DIR}/frames/${engine}-card-${name}.png` });
      }
      /* the Stage filter pills */
      const fp = p.locator(`${PAGE} [data-qc156='stages'] >> visible=true`).first();
      if (await fp.count()) await fp.screenshot({ path: `${DIR}/frames/${engine}-stage-pills.png` }).catch(() => {});
      /* the label's clipping, read in this engine */
      const clip = await p.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((c) => c.getBoundingClientRect().width > 0).map((c) => {
        const l = c.querySelector<HTMLElement>(".pc2-lbl"); if (!l) return { id: c.dataset.id ?? "", ok: false };
        /* ⚠️ SCROLL THE CARD, NEVER THE LABEL: a clipping ancestor is a scroll container, and scrolling the label into
           view scrolls the band's content up by the clipped amount, so the probe would undo the clip it looks for
           (measured 23 Nov with a band set to overflow: hidden) */
        c.scrollIntoView({ block: "center" });
        const was = l.style.pointerEvents; l.style.pointerEvents = "auto";
        const r = l.getBoundingClientRect();
        const hit = [[r.left + 12, r.bottom - 2], [r.right - 12, r.bottom - 2], [r.left + r.width / 2, r.bottom - 1.5]].every(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === l || l.contains(e)); });
        l.style.pointerEvents = was;
        let clipped = false;
        for (let a = l.parentElement; a && a !== c.parentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
          const b = a.getBoundingClientRect();
          if (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5 || r.left < b.left - 0.5 || r.right > b.right + 0.5) clipped = true;
        }
        return { id: c.dataset.id ?? "", ok: hit && !clipped };
      }), PAGE);
      L.check(`${engine}: labels read`, clip.length >= 20, `${clip.length}`);
      L.check(`${engine}: no label clipped or covered`, clip.every((c) => c.ok), clip.filter((c) => !c.ok).map((c) => c.id).join(",") || "none");
      /* the slide-in for an Offer and for Full requested */
      step("the slide-ins");
      for (const [name, f] of [["offer", (c: CardReading) => OFFER_STATUS.has(c.status)], ["full-requested", (c: CardReading) => c.status === "Full Requested" && !c.quiet]] as const) {
        const c = cards.find(f); if (!c) continue;
        await openSlide(p, c.id);
        await p.screenshot({ path: `${DIR}/frames/${engine}-slide-in-${name}.png` });
      }
      await p.keyboard.press("Escape").catch(() => {});
      step("Birds-eye");
      await openQc(p, "birds");
      await p.screenshot({ path: `${DIR}/frames/${engine}-birds-eye-1512.png` });
      step("Responses");
      await openRoute(p, "/queries/responses", DESK);
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${DIR}/frames/${engine}-responses-1512.png` });
      /* a chart that shows Full and Offer: the Dashboard's "How it's going" (Versions has no versions in the harness) */
      step("the Dashboard's chart");
      await openRoute(p, "/dashboard", DESK);
      const going = p.locator("button", { hasText: "How it" }).first();
      if (await going.count()) { await press(going); await p.waitForTimeout(800); }
      const chart = p.locator("[data-d3='going'] >> visible=true").first();
      if (await chart.count()) { await chart.scrollIntoViewIfNeeded(); await chart.locator("xpath=ancestor::*[contains(@class,'os-card')][1]").first().screenshot({ path: `${DIR}/frames/${engine}-dashboard-chart-1512.png` }).catch(async () => chart.screenshot({ path: `${DIR}/frames/${engine}-dashboard-chart-1512.png` })); }
      else await p.screenshot({ path: `${DIR}/frames/${engine}-dashboard-1512.png` });
      step("done");
  };
  if (run("F") || run("6")) test("PC2-F · frames in Chromium (1512) and the label read again", async ({ page }) => {
    test.setTimeout(600_000);
    await frames(page, "chromium");
  });
  if (run("F") || run("6") || run("W")) test("PC2-FW · frames in WebKit (1512) and the label's clipping read in WebKit", async ({ baseURL }) => {
    test.setTimeout(900_000);
    const b = await webkit.launch();
    try {
      const ctx = await b.newContext({ baseURL: baseURL ?? process.env.SA_E2E_BASE_URL, viewport: DESK });
      /* ⚠️ A LAUNCHED CONTEXT HAS NO ACTION TIMEOUT: a step that cannot act waits the test out. Measured 23 Nov: desktop
         WebKit cannot click the harness's "Sign in" button (ensureSignedIn's `.last()` of two never becomes actionable),
         and the first frames run hung 15 minutes on it. So: a default timeout, and the form submitted with Enter. */
      ctx.setDefaultTimeout(45_000);
      const p = await ctx.newPage();
      await p.goto("/#/signin");
      await p.locator("#au-email").fill(process.env.SA_E2E_EMAIL ?? "harness@scriptally.test");
      await p.locator("#au-pw").fill(process.env.SA_E2E_PASSWORD ?? envLocal("SA_E2E_PASSWORD") ?? "");
      await p.locator("#au-pw").press("Enter");
      await p.locator("#ws-sidebar, .ws-work, #app-stage-scroll").first().waitFor({ state: "attached", timeout: 60_000 });
      await frames(p, "webkit");
    } finally { await b.close(); }
    L6W.done(2);
  });
});

/** a value from .env.local (this process does not load it) */
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
