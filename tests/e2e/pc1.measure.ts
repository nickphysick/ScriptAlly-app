/**
 * Plumage colours v1 — the rendered locks (PC1-1 … PC1-7), on the emulator harness at 1512 × 982. Every colour is read
 * with getComputedStyle from the page; a source test is not a measurement. Each lock first proves its population is
 * non-zero (the Ledger's `min`, and an explicit count per status), then asserts.
 *
 *   PC1-1  the grid card band is its status's band, for every status on the page (quiet cards fade from it)
 *   PC1-2  the with-you outline on the grid card: Partial requested, Full requested (their sent shade) and R&R (navy),
 *          3px inset, top corners 12px, bottom corners square; no other status has one
 *   PC1-3  the offer is flat navy: no gradient layer, the paper name
 *   PC1-4  Birds-eye: each current bar is its status's band, with no outline
 *   PC1-5  the slide-out strip: the status band and the outline (top corners 13px), on a Partial requested query
 *   PC1-6  one agent bubble: the band of the status that reply set, no outline
 *   PC1-7  the four search tiles: query, agent, material, task
 *
 * SA_PHASE=mutant writes its ledgers beside the green ones (reports/plumage-colours-v1/ledger/mutant-*) and is expected red.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

/* ⚠️ THE EXPECTATIONS COME FROM THE PACK, NOT FROM src/. A lock that imported lib/stageColours would move with any
   mutation of the table and never read red; the JSON is the oracle (with Nick's one amendment, the navy offer). */
const PACK = JSON.parse(readFileSync("design-refs/plumage-colours-v1/plumage-colours-v1.json", "utf8")) as {
  navy: string; statusBand: Record<string, string>; withYouOutline: Record<string, string>; kinds: Record<string, { tile: string; glyph: string; edge?: string }>;
};
const PLUMAGE_NAVY = PACK.navy;
const OFFER_INK = "#f4eee5";
/** the pack's status names, by the enum's */
const NAME: Record<string, string> = {
  Queried: "Queried", "Partial Requested": "Partial requested", "Partial Sent": "Partial sent", "Full Requested": "Full requested",
  "Full Sent": "Full sent", "Revise & Resubmit": "Revise and resubmit", Resubmitted: "Resubmitted", Offer: "Offer", Signed: "Signed",
  Rejected: "Rejected", "No Response": "No response", Withdrawn: "Withdrawn",
};
const statusBand = (s: string): string => (s === "Offer" || s === "Signed" ? PLUMAGE_NAVY : PACK.statusBand[NAME[s] ?? "Queried"]);
const withYouOutline = (s: string): string | null => PACK.withYouOutline[NAME[s] ?? ""] ?? null;
type Kind = "query" | "agent" | "material" | "task";
const KIND_COLOURS = PACK.kinds as Record<Kind, { tile: string; glyph: string; edge?: string }>;

const PAGE = ".qc151.qc153";
const PHASE = process.env.SA_PHASE === "mutant" ? "mutant" : "after";
const DIR = "reports/plumage-colours-v1";
const DESK = { width: 1512, height: 982 };
const CARD = "[data-qp='panel'] [data-qc152='card']";
test.setTimeout(420_000);
mkdirSync(`${DIR}/ledger`, { recursive: true });

const rgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
/** the computed box-shadow an inset 3px outline reads as */
const ring = (hex: string) => `${rgb(hex)} 0px 0px 0px 3px inset`;

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${PHASE}-${this.id}.json`, JSON.stringify(this.rows, null, 1));
    /* ⚠️ SOFT, so a red ledger never hides the ones after it in the same test (each still fails the test) */
    expect.soft(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect.soft(this.rows.filter((r) => !r.ok).map((r) => r.name), `${this.id}: red rows`).toEqual([]);
  }
}

async function openQc(page: Page, view: "list" | "birds" = "list") {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511");
    } catch { /* private */ }
  });
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

interface CardReading { id: string; status: string; quiet: boolean; bg: string; img: string; shadow: string; tl: string; tr: string; bl: string; br: string; name: string }
const readCards = (page: Page): Promise<CardReading[]> => page.evaluate((root) => {
  return [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].map((c) => {
    const hd = getComputedStyle(c.querySelector<HTMLElement>('[data-qc154="band"]')!);
    const nm = c.querySelector<HTMLElement>('[data-qc154="name"]');
    return {
      id: c.dataset.id ?? "", status: c.dataset.status ?? "", quiet: c.hasAttribute("data-quiet"),
      bg: hd.backgroundColor, img: hd.backgroundImage, shadow: hd.boxShadow,
      tl: hd.borderTopLeftRadius, tr: hd.borderTopRightRadius, bl: hd.borderBottomLeftRadius, br: hd.borderBottomRightRadius,
      name: nm ? getComputedStyle(nm).color : "",
    };
  });
}, PAGE);

test.describe("Plumage colours v1 — the rendered colours", () => {
  test("PC1-1 … PC1-3 · the grid card: the status band, the with-you outline, the flat navy offer", async ({ page }) => {
    await openQc(page);
    const cards = await readCards(page);
    const by = new Map<string, CardReading[]>();
    for (const c of cards) by.set(c.status, [...(by.get(c.status) ?? []), c]);
    console.log("population:", JSON.stringify([...by].map(([s, l]) => [s, l.length])));

    const L1 = new Ledger("PC1-1");
    L1.check("cards on the page", cards.length >= 20, `${cards.length}`);
    for (const s of ["Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Offer", "Rejected"])
      L1.check(`${s}: population non-zero`, (by.get(s)?.length ?? 0) > 0, `${by.get(s)?.length ?? 0}`);
    for (const c of cards) {
      if (c.quiet) L1.check(`${c.status} ${c.id} (quiet): fades from its status band`, c.img.includes(rgb(statusBand(c.status))) && c.img.includes("linear-gradient"), c.img);
      else L1.check(`${c.status} ${c.id}: band ${statusBand(c.status)}`, c.bg === rgb(statusBand(c.status)) && c.img === "none", `${c.bg} / ${c.img}`);
    }
    L1.done(30);

    const L2 = new Ledger("PC1-2");
    for (const s of ["Partial Requested", "Full Requested", "Revise & Resubmit"]) {
      const live = (by.get(s) ?? []).filter((c) => !c.quiet);
      L2.check(`${s}: population non-zero`, live.length > 0, `${live.length}`);
      for (const c of live) {
        L2.check(`${s} ${c.id}: outline 3px inset ${withYouOutline(s)}`, c.shadow === ring(withYouOutline(s)!), c.shadow);
        L2.check(`${s} ${c.id}: top corners 12px, bottom square`, c.tl === "12px" && c.tr === "12px" && c.bl === "0px" && c.br === "0px", `${c.tl} ${c.tr} ${c.bl} ${c.br}`);
      }
    }
    const rest = cards.filter((c) => !withYouOutline(c.status));
    L2.check("statuses not with the writer: population non-zero", rest.length > 0, `${rest.length}`);
    L2.check("statuses not with the writer: no outline", rest.every((c) => !/0px 0px 0px 3px inset/.test(c.shadow)), rest.filter((c) => /3px inset/.test(c.shadow)).map((c) => c.id).join(",") || "none");
    L2.check("R&R's outline is navy", withYouOutline("Revise & Resubmit") === PLUMAGE_NAVY, String(withYouOutline("Revise & Resubmit")));
    L2.done(8);

    const L3 = new Ledger("PC1-3");
    const offers = by.get("Offer") ?? [];
    L3.check("offer cards: population non-zero", offers.length > 0, `${offers.length}`);
    for (const c of offers) {
      L3.check(`Offer ${c.id}: flat navy, no gradient layer`, c.bg === rgb(PLUMAGE_NAVY) && c.img === "none", `${c.bg} / ${c.img}`);
      L3.check(`Offer ${c.id}: name in the paper`, c.name === rgb(OFFER_INK), c.name);
    }
    L3.done(3);
  });

  test("PC1-4 · Birds-eye: each current bar is its status's band, never outlined", async ({ page }) => {
    await openQc(page);
    const statusById = new Map((await readCards(page)).map((c) => [c.id, c.status]));
    await openQc(page, "birds");
    await page.locator(`${PAGE} [data-qc150="be-bar"]`).first().waitFor({ timeout: 30_000 });
    const bars = await page.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc150="be-row"]`)].flatMap((r) => {
      const b = r.querySelector<HTMLElement>('[data-qc150="be-bar"]');
      if (!b) return [];
      const cs = getComputedStyle(b);
      return [{ id: r.dataset.id ?? "", bg: cs.backgroundColor, img: cs.backgroundImage, shadow: cs.boxShadow }];
    }), PAGE);
    const L = new Ledger("PC1-4");
    const known = bars.filter((b) => statusById.has(b.id));
    L.check("bars with a known status: population non-zero", known.length >= 10, `${known.length} of ${bars.length}`);
    const seen = new Set(known.map((b) => statusById.get(b.id)));
    L.check("requested and sent both on the chart", seen.has("Partial Requested") && seen.has("Full Sent"), [...seen].join(", "));
    for (const b of known) {
      const s = statusById.get(b.id)!;
      L.check(`${s} ${b.id}: bar ${statusBand(s)}, flat, no outline`, b.bg === rgb(statusBand(s)) && b.img === "none" && !/3px inset/.test(b.shadow), `${b.bg} / ${b.img} / ${b.shadow}`);
    }
    L.done(12);
  });

  test("PC1-5 / PC1-6 · the slide-out strip and an agent bubble", async ({ page }) => {
    await openQc(page);
    const c = page.locator(`${PAGE} [data-qc154='card'][data-status='Partial Requested']:not([data-quiet])`).first();
    const L5 = new Ledger("PC1-5");
    L5.check("a live Partial requested card to open", (await c.count()) > 0, `${await c.count()}`);
    const id = await c.getAttribute("data-id");
    await c.scrollIntoViewIfNeeded();
    await c.locator("[data-qc154='name']").first().click();
    await page.locator(`${CARD}[data-id='${id}']`).first().waitFor({ timeout: 15_000 });
    await page.waitForTimeout(900);
    const r = await page.evaluate((sel) => {
      const root = document.querySelector<HTMLElement>(sel)!;
      const st = getComputedStyle(root.querySelector<HTMLElement>("[data-qc152='band']")!);
      const bubbles = [...root.querySelectorAll<HTMLElement>(".qc152-m.them[data-status]:not(.qc1522-draft)")].map((m) => {
        const bx = m.querySelector<HTMLElement>(".qc152-bx");
        const cs = bx ? getComputedStyle(bx) : null;
        return { status: m.dataset.status ?? "", bg: cs?.backgroundColor ?? "", img: cs?.backgroundImage ?? "", shadow: cs?.boxShadow ?? "" };
      });
      return { bg: st.backgroundColor, img: st.backgroundImage, shadow: st.boxShadow, tl: st.borderTopLeftRadius, tr: st.borderTopRightRadius, bl: st.borderBottomLeftRadius, br: st.borderBottomRightRadius, bubbles };
    }, CARD);
    L5.check("strip: the Partial requested band, flat", r.bg === rgb(statusBand("Partial Requested")) && r.img === "none", `${r.bg} / ${r.img}`);
    L5.check("strip: the outline, 3px inset, the Partial sent shade", r.shadow === ring(withYouOutline("Partial Requested")!), r.shadow);
    L5.check("strip: top corners 13px, bottom square", r.tl === "13px" && r.tr === "13px" && r.bl === "0px" && r.br === "0px", `${r.tl} ${r.tr} ${r.bl} ${r.br}`);
    L5.done(4);

    const L6 = new Ledger("PC1-6");
    const pr = r.bubbles.filter((b) => b.status === "Partial Requested");
    L6.check("the agent's Partial requested bubble: population non-zero", pr.length > 0, `${pr.length} of ${r.bubbles.length}`);
    for (const b of pr) {
      L6.check("bubble: the Partial requested band (the status the reply set)", b.bg === rgb(statusBand("Partial Requested")), b.bg);
      L6.check("bubble: no outline, no gradient", !/3px inset/.test(b.shadow) && b.img === "none", `${b.shadow} / ${b.img}`);
    }
    L6.done(3);
  });

  test("PC1-7 · the four search tiles", async ({ page }) => {
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
    const L = new Ledger("PC1-7");
    for (const k of want) {
      const list = got.get(k) ?? [];
      const c = KIND_COLOURS[k];
      L.check(`${k}: population non-zero`, list.length > 0, `${list.length}`);
      for (const t of list.slice(0, 6)) {
        L.check(`${k}${t.big ? " (44px)" : ""}: tile ${c.tile}, glyph ${c.glyph}`, t.bg === rgb(c.tile) && t.color === rgb(c.glyph), `${t.bg} / ${t.color}`);
        if (c.edge) L.check(`${k}${t.big ? " (44px)" : ""}: 1px edge ${c.edge}`, t.shadow === `${rgb(c.edge)} 0px 0px 0px 1px inset`, t.shadow);
      }
    }
    L.done(8);
  });
});
