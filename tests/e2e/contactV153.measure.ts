/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15.3 (design-refs/contact-list-v15-3.html) — the rendered locks, §6 of the pack, at 1512 × 900 and
 * 1280 × 800. Each was proved red on the pre-v15.3 build (036289e7) and by its named mutation before its green was
 * believed (reports/contact-list-v15-3/).
 *
 * N1 the hero number · N2 the faces' order · N3 colours · N4 the key · N5 spacing · N6 the week card.
 *
 * ⚠️ N2's two fixtures (6/3/5 and 1/0/9) and N6's three comparisons (more, fewer, same) are UNIT locks
 * (src/lib/contactDesk.test.ts): the shared harness account is one cast in one week, so the page can show only one
 * branch of each. Here the page is held to the same RULE over whatever the account holds, and the tally of what it
 * held is written to the ledger.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { checkOverflow, near, openContacts } from "./cl15Lib";

const DIR = "reports/contact-list-v15-3";
const WIDTHS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    /* a run that writes fewer readings than it claims is red, whatever its cases say */
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
/** Screenshots for the report, only when asked (`CL153_SHOTS=1`): a routine run must not dirty tracked images. */
const shot = async (page: Page, name: string, vp: { width: number }, clip?: { x: number; y: number; width: number; height: number }) => {
  if (!process.env.CL153_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}-${vp.width}.png`, animations: "disabled", clip });
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private mode */ } });
});

async function readHeader(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const q = <T extends Element>(s: string) => root?.querySelector<T>(s) ?? null;
    const qa = <T extends Element>(s: string) => [...(root?.querySelectorAll<T>(s) ?? [])];
    const b = (e: Element | null) => { if (!e) return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
    const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
    const h1 = q<HTMLElement>('[data-cl15="header"] h1'), hn = q<HTMLElement>('[data-cl15="hero-n"]'), ht = q<HTMLElement>('[data-cl15="hero-t"]');
    const img = q<HTMLElement>('[data-cl15="header-art"] img');
    const faces = q<HTMLElement>('[data-cl15="faces"]');
    const ground = getComputedStyle(root?.closest(".ws-main") ?? document.body).getPropertyValue("--ws-page").trim();
    return {
      vw: window.innerWidth, ground,
      h1: b(h1), pageTitle: h1?.hasAttribute("data-page-title") ?? false, h1Text: (h1?.textContent ?? "").replace(/\s+/g, " ").trim(),
      hn: hn ? { text: hn.textContent ?? "", size: cs(hn)!.fontSize, face: cs(hn)!.fontFamily, box: b(hn) } : null,
      ht: ht ? { text: ht.textContent ?? "", size: cs(ht)!.fontSize, face: cs(ht)!.fontFamily, box: b(ht) } : null,
      txt: b(q('[data-cl15="header-text"]')), img: b(img), drop: img ? parseFloat(cs(img)!.top) || 0 : 0,
      sub: b(q('[data-cl15="sub"]')), faces: b(faces), acts: b(q(".cl15-acts")),
      discs: qa<HTMLElement>('[data-cl15="face"]').map((d) => ({
        state: d.dataset.state ?? "", bg: cs(d)!.backgroundColor, ink: cs(d)!.color, shadow: cs(d)!.boxShadow, z: cs(d)!.zIndex,
        text: d.textContent ?? "", tip: d.title, box: b(d)!, hidden: d.closest('[aria-hidden="true"]') !== null,
        size: cs(d)!.fontSize, face: cs(d)!.fontFamily,
      })),
      more: (() => { const m = q<HTMLElement>('[data-cl15="faces-more"]'); return m ? { text: m.textContent ?? "", box: b(m)! } : null; })(),
      key: qa<HTMLElement>('[data-cl15="key-item"]').map((k) => ({
        state: k.dataset.state ?? "", text: (k.textContent ?? "").trim(), box: b(k)!,
        dotBg: cs(k.querySelector("i"))!.backgroundColor, dotShadow: cs(k.querySelector("i"))!.boxShadow,
      })),
      keyBox: b(q('[data-cl15="faces-key"]')), keyRule: cs(q('[data-cl15="faces-key"]'))?.borderLeftWidth ?? "",
      rows: qa(".clv-row").length,
      queriedLabel: q('[data-dk="queried"]')?.getAttribute("aria-label") ?? "",
      queriedLine: (q('[data-dk="queried"] [data-dk-part="line"]')?.textContent ?? "").trim(),
      closedArc: cs(q('[data-dk-arc="closed"]'))?.stroke ?? null, activeArc: cs(q('[data-dk-arc="active"]'))?.stroke ?? null,
    };
  });
}

const INK = "rgb(42, 58, 82)", GREY = "rgb(179, 172, 165)", WHITE = "rgb(255, 255, 255)";
const ORDER = ["active", "closed", "none"];
const SLOTS: Record<string, number> = { active: 4, closed: 2, none: 2 };

test("CL15.3-N1–N5 · header", async ({ page }) => {
  const L = new Ledger("header");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    await page.waitForTimeout(600);
    const r = await readHeader(page);
    const w = String(vp.width), narrow = vp.width < 1440;
    /* the population first: an absent hero number or an empty face row is a failure, never a pass */
    L.check("N0 the hero number, the faces and the key are on the page", w, !!r.hn && !!r.ht && r.discs.length > 0 && r.key.length > 0, `hn ${!!r.hn} ht ${!!r.ht} discs ${r.discs.length} key ${r.key.length}`);
    if (!r.hn || !r.ht || !r.h1 || !r.txt || !r.img || !r.sub || !r.faces || !r.acts || !r.keyBox) continue;
    const keyN = Object.fromEntries(r.key.map((k) => [k.state, Number(/^(\d+)/.exec(k.text)?.[1] ?? NaN)])) as Record<string, number>;
    const count = Number(r.hn.text);
    const of = /of (\d+) queried/.exec(r.queriedLine);

    /* ── N1 ── */
    L.check("N1 .hn is the count on file (= the Queried card's “of N”)", w, /^\d+$/.test(r.hn.text) && count === Number(of?.[1]), `hn "${r.hn.text}" · "${r.queriedLine}"`);
    L.check(`N1 .hn is ${narrow ? 98 : 124}px (±1) Special Elite`, w, near(parseFloat(r.hn.size), narrow ? 98 : 124, 1) && /Special Elite/.test(r.hn.face), `${r.hn.size} ${r.hn.face}`);
    L.check(`N1 .ht is ${narrow ? 34 : 42}px (±1) and reads “agent(s) on file”`, w, near(parseFloat(r.ht.size), narrow ? 34 : 42, 1) && r.ht.text === (count === 1 ? "agent on file" : "agents on file") && /Special Elite/.test(r.ht.face), `${r.ht.size} "${r.ht.text}"`);
    L.check("N1 the h1 is one line (height ≤ 1.1 × .hn's size) and keeps data-page-title", w, r.h1.h <= 1.1 * parseFloat(r.hn.size) && r.pageTitle, `h1 ${r.h1.h.toFixed(1)} vs ${(1.1 * parseFloat(r.hn.size)).toFixed(1)}`);
    L.check("N1 the title still reads “N agent(s) on file” as text", w, r.h1Text === `${count} agent${count === 1 ? "" : "s"} on file`, r.h1Text);
    L.check("N1 the figure and its words share a baseline: .ht sits inside .hn's box, to its right", w, r.ht.box!.l > r.hn.box!.r && r.ht.box!.b <= r.hn.box!.b + 2 && r.ht.box!.t > r.hn.box!.t, `hn ${r.hn.box!.t.toFixed(0)}–${r.hn.box!.b.toFixed(0)} ht ${r.ht.box!.t.toFixed(0)}–${r.ht.box!.b.toFixed(0)}`);
    const textC = (r.txt.t + r.txt.b) / 2, layoutC = (r.img.t - r.drop + r.img.b - r.drop) / 2;
    L.check("N1 the text block is centred against the drawing's layout box (±4)", w, Math.abs(textC - layoutC) <= 4, `text ${textC.toFixed(1)} drawing ${layoutC.toFixed(1)}`);

    /* ── N2 ── the page's cast, held to the rule: the discs are a prefix of [≤4 active, ≤2 closed, ≤2 not queried] */
    const ideal = ORDER.flatMap((s) => Array.from({ length: Math.min(SLOTS[s], keyN[s] ?? 0) }, () => s));
    const shown = r.discs.map((d) => d.state);
    /* one more disc costs its width less the overlap; the room is the drawing's left less the column gap */
    const step = narrow ? 27 : 31, gap = narrow ? 36 : 56;
    L.check("N2 the discs are ink, then grey, then white: a prefix of ≤4 active, ≤2 closed, ≤2 not queried", w, shown.length >= 1 && shown.every((s, i) => s === ideal[i]) && shown.length <= ideal.length, `shown ${shown.join(",")} · ideal ${ideal.join(",")}`);
    L.check("N2 discs are only ever dropped from the END, and only when the row would run into the drawing", w, shown.length === ideal.length || r.faces.r + step > r.img.l - gap, `shown ${shown.length} of ${ideal.length} · row right ${r.faces.r.toFixed(0)} + one more ${step} vs drawing left ${r.img.l.toFixed(0)} less the ${gap} gap`);
    L.check("N2 earlier discs are on top: z-index falls along the row, and each overlaps the last", w, r.discs.every((d, i) => i === 0 || (Number(d.z) < Number(r.discs[i - 1].z) && near(r.discs[i - 1].box.r - d.box.l, narrow ? 5 : 7, 0.6))), r.discs.map((d) => d.z).join(","));

    /* ── N3 ── */
    const paint = (d: (typeof r.discs)[number]) => d.state === "active" ? d.bg === INK
      : d.state === "closed" ? d.bg === GREY
      : d.bg === WHITE && /rgb\(42, 58, 82\).*inset|inset.*rgb\(42, 58, 82\)/.test(d.shadow);
    L.check("N3 active discs are ink, closed grey, not queried white with an ink ring", w, r.discs.every(paint), r.discs.map((d) => `${d.state}:${d.bg}`).join(" "));
    L.check(`N3 every disc is ${narrow ? 32 : 38} round, mono, with a 3px halo in the page's colour, and aria-hidden with a tooltip`, w,
      r.discs.every((d) => near(d.box.w, narrow ? 32 : 38, 0.6) && near(d.box.h, narrow ? 32 : 38, 0.6) && /Mono/.test(d.face) && d.hidden && / · (query active|query closed|not queried yet)$/.test(d.tip) && d.shadow.includes("0px 0px 0px 3px") && d.text.length >= 1 && d.text.length <= 2),
      r.discs.map((d) => `${d.text}|${d.tip}|${d.box.w}`).slice(0, 3).join(" · "));
    L.check("N3 the Queried ring's closed arc is grey rgb(179, 172, 165), its active arc ink", w, (r.closedArc === null ? (keyN.closed ?? 0) === 0 : r.closedArc === GREY) && (r.activeArc === null ? (keyN.active ?? 0) === 0 : r.activeArc === INK), `closed ${r.closedArc} active ${r.activeArc}`);
    L.check("N3 the key's dots carry the same three colours", w, r.key.every((k) => k.state === "active" ? k.dotBg === INK : k.state === "closed" ? k.dotBg === GREY : k.dotBg === WHITE && /inset/.test(k.dotShadow)), r.key.map((k) => `${k.state}:${k.dotBg}`).join(" "));

    /* ── N4 ── */
    const sum = r.key.reduce((s, k) => s + (keyN[k.state] ?? 0), 0);
    L.check("N4 the key's numbers sum to the count on file", w, sum === count, `${r.key.map((k) => k.text).join(" + ")} = ${sum} vs ${count}`);
    L.check("N4 the key reads “{n} active · {n} closed · {n} not queried”, in order, a zero item hidden", w,
      r.key.every((k) => new RegExp(`^[1-9]\\d* ${k.state === "none" ? "not queried" : k.state}$`).test(k.text)) && r.key.map((k) => ORDER.indexOf(k.state)).every((v, i, a) => i === 0 || v > a[i - 1]),
      r.key.map((k) => k.text).join(" · "));
    const lab = /: (\d+) active, (\d+) closed$/.exec(r.queriedLabel);
    L.check("N4 the key's active and closed are the Queried card's own (every agent, never the discs shown)", w, !!lab && Number(lab[1]) === (keyN.active ?? 0) && Number(lab[2]) === (keyN.closed ?? 0), `${r.queriedLabel} · key ${keyN.active ?? 0}/${keyN.closed ?? 0}`);
    const moreN = count - r.discs.length;
    L.check("N4 “+{n} more” is the count less the discs shown, hidden at 0", w, moreN > 0 ? r.more?.text === `+${moreN} more` : r.more === null, `${r.more?.text ?? "none"} · expected ${moreN}`);

    /* ── N5 ── */
    L.check("N5 the faces sit 16 (±2) under the subheader", w, near(r.faces.t - r.sub.b, 16, 2), (r.faces.t - r.sub.b).toFixed(1));
    L.check("N5 the buttons sit 22 (±2) under the faces", w, near(r.acts.t - r.faces.b, 22, 2), (r.acts.t - r.faces.b).toFixed(1));
    const disc = r.discs[0].box.h;
    const inRow = [...r.discs.map((d) => d.box), ...(r.more ? [r.more.box] : []), ...r.key.map((k) => k.box)];
    L.check("N5 the row is one line: no taller than a disc + 2, with every part inside it", w, r.faces.h <= disc + 2 && inRow.every((x) => x.t >= r.faces.t - 1 && x.b <= r.faces.b + 1), `row ${r.faces.h.toFixed(1)} disc ${disc}`);
    /* the room is the drawing's left LESS THE COLUMN GAP: a row that stops short of the drawing but sits in the gap has
       still pushed into it (the "never drop a disc" mutation stayed green against the drawing's edge alone) */
    L.check(`N5 the row never pushes into the drawing: the key ends ${gap} or more before the drawing begins`, w, r.keyBox.r <= r.img.l - gap + 1, `key right ${r.keyBox.r.toFixed(1)} drawing left ${r.img.l.toFixed(1)} gap ${gap}`);
    L.check("N5 the key is ruled off on its left", w, r.keyRule === "1px", r.keyRule);
    await checkOverflow(page, L as never, `v15.3 header ${w}`);
    console.log(`  [cast ${w}] ${r.key.map((k) => k.text).join(" · ")} · shown ${shown.length}/${ideal.length}`);
    await shot(page, "header-desk", vp);
    await shot(page, "faces-detail", vp, { x: Math.max(0, r.txt.l - 16), y: Math.max(0, r.txt.t - 44), width: Math.min(r.img.l - r.txt.l + 16, vp.width), height: r.txt.h + 60 });
  }
  /* a disc opens that agent's card */
  /* an unbounded read of a missing element waits out the whole test: ask how many there are first */
  const anyFace = (await page.locator('.aglist [data-cl15="face"]').count()) > 0;
  const tip = anyFace ? await page.locator('.aglist [data-cl15="face"]').first().getAttribute("title") : null;
  if (anyFace) await page.locator('.aglist [data-cl15="face"]').first().evaluate((e) => (e as HTMLElement).click());
  const card = page.locator('[data-ac="card"]');
  if (anyFace) await card.waitFor({ timeout: 10_000 }).catch(() => {});
  const cardText = (await card.count()) ? (await card.first().innerText()) : "";
  const name = (tip ?? "").split(" · ")[0];
  L.check("N3 a disc opens that agent's card", "1280", !!name && cardText.includes(name), `tip "${tip}" · card ${cardText.slice(0, 60).replace(/\n/g, " ")}`);
  L.done(46);
});

test("CL15.3-N6 · week card", async ({ page }) => {
  const L = new Ledger("week");
  for (const vp of WIDTHS) {
    await openContacts(page, vp);
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>(".aglist")].find((e) => e.getBoundingClientRect().height > 0) ?? null;
      const desk = root?.querySelector<HTMLElement>('[data-cl15="desk"]') ?? null;
      const card = desk?.querySelector<HTMLElement>(".dsk-card") ?? null;
      const mom = card?.querySelector<HTMLElement>('[data-dk-part="mom"]') ?? null;
      const chart = card?.querySelector<HTMLElement>("[data-dk-chart]") ?? null;
      const svg = chart?.querySelector("svg") ?? null;
      return {
        probe: card?.dataset.dk ?? null, line: (card?.querySelector('[data-dk-part="line"]')?.textContent ?? "").trim(),
        mom: mom ? { dir: mom.dataset.dir ?? "", text: (mom.textContent ?? "").trim(), colour: getComputedStyle(mom).color, arrow: mom.querySelector("path")?.getAttribute("d") ?? null } : null,
        kind: chart?.dataset.dkChart ?? null, bars: (chart?.dataset.dkBars ?? "").split(",").filter(Boolean).map(Number),
        rects: [...(svg?.querySelectorAll("rect") ?? [])].map((x) => ({ op: getComputedStyle(x).fillOpacity, fill: getComputedStyle(x).fill, h: x.getBoundingClientRect().height, w: x.getBoundingClientRect().width })),
        svg: svg ? { w: svg.getBoundingClientRect().width, h: svg.getBoundingClientRect().height } : null,
        caption: chart?.querySelector("small")?.textContent ?? "", chartHidden: chart?.getAttribute("aria-hidden") ?? null,
        label: card?.getAttribute("aria-label") ?? "", press: card?.querySelectorAll("button").length ?? -1,
        deskText: (desk?.textContent ?? "").replace(/\s+/g, " "), deskLabels: [...(desk?.querySelectorAll("[aria-label]") ?? [])].map((e) => e.getAttribute("aria-label") ?? ""),
        cards: desk?.querySelectorAll(".dsk-card").length ?? 0, lines: desk?.querySelectorAll('[data-dk-chart="line"]').length ?? -1,
      };
    });
    const w = String(vp.width), narrow = vp.width < 1440;
    L.check("N6 the first desk card is the week card, with its 8 bars", w, r.probe === "week" && r.kind === "weeks" && r.bars.length === 8 && r.rects.length === 8 && r.cards === 3, `probe ${r.probe} chart ${r.kind} bars ${r.bars.length} rects ${r.rects.length}`);
    if (r.probe !== "week" || !r.mom || !r.svg || r.bars.length !== 8) continue;
    const n = r.bars[7], last = r.bars[6], d = n - last;
    L.check("N6 the line reads “{n} added this week”, n being this week's bar", w, r.line === `${n} added this week`, `"${r.line}" · bars ${r.bars.join(",")}`);
    const want = d > 0 ? { dir: "up", text: `${d} more than last week`, colour: "rgb(79, 122, 75)", arrow: "M6 2.2 10 7.4H2z" }
      : d < 0 ? { dir: "down", text: `${-d} fewer than last week`, colour: "rgb(160, 99, 63)", arrow: "M6 9.8 2 4.6h8z" }
      : { dir: "none", text: "Same as last week", colour: "rgba(28, 19, 15, 0.45)", arrow: null };
    L.check("N6 the comparison matches the two last bars, in words, colour and arrow", w, r.mom.dir === want.dir && r.mom.text === want.text && r.mom.colour === want.colour && r.mom.arrow === want.arrow, `${JSON.stringify(r.mom)} · wanted ${want.text}`);
    L.check("N6 only the last bar is at full opacity; the rest are ink at 22%", w, r.rects.every((x, i) => x.fill === "rgb(42, 58, 82)" && near(Number(x.op), i === 7 ? 1 : 0.22, 0.005)), r.rects.map((x) => x.op).join(","));
    /* the drawing keeps its 112 × 38 ratio inside its box, so at 84 × 30 a unit is 0.75px (the oracle's own) */
    const scale = Math.min(r.svg.w / 112, r.svg.h / 38);
    L.check("N6 a week with none is a 2-unit stub and the busiest week the tallest", w, r.rects.every((x, i) => r.bars[i] === 0 ? near(x.h, 2 * scale, 0.4) : x.h >= 2 * scale - 0.4) && r.rects.every((x, i) => r.bars[i] === Math.max(...r.bars) && r.bars[i] > 0 ? near(x.h, 36 * scale, 0.5) : true), r.rects.map((x) => x.h.toFixed(1)).join(","));
    L.check(`N6 the chart is ${narrow ? "84 × 30" : "112 × 38"}, aria-hidden, captioned “added per week”`, w, near(r.svg.w, narrow ? 84 : 112, 0.6) && near(r.svg.h, narrow ? 30 : 38, 0.6) && r.chartHidden === "true" && r.caption === "added per week", `${r.svg.w}×${r.svg.h} "${r.caption}"`);
    const total = r.bars.reduce((s, v) => s + v, 0);
    L.check("N6 the card's label says the week and the eight weeks, and the card is not pressable", w, r.label === `${n} ${n === 1 ? "agent" : "agents"} added this week, ${total} in the last 8 weeks` && r.press === 0, `"${r.label}" buttons ${r.press}`);
    L.check("N6 nothing inside the desk says “agents on file”, and no line chart is left", w, !/agents? on file/i.test(r.deskText) && r.deskLabels.every((l) => !/agents? on file/i.test(l)) && r.lines === 0, r.deskText.slice(0, 90));
    console.log(`  [week ${w}] bars ${r.bars.join(",")} · ${r.mom.text}`);
    const box = await page.locator('.aglist [data-cl15="desk"] .dsk-card').first().boundingBox();
    if (box) await shot(page, "added-this-week-card", vp, { x: box.x - 16, y: box.y - 40, width: box.width + 32, height: box.height + 56 });
  }
  L.done(16);
});
