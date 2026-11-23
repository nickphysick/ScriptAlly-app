/**
 * Query Centre v157 — the slate ladder, the foil offer, centred boxes and gone quiet (design-refs/query-centre-v157.html),
 * measured on the emulator harness at 1512 × 982 and 1280 × 800, every fold open (Gone quiet and Closed shown in place).
 *
 *   SA_PHASE=before  Step 0.5: every card's outer box, band height, both fact boxes' outer boxes and every track node's
 *                    box, to reports/query-centre-v157/baseline.json; before shots. The locks run too, and are red.
 *   (default)        QC157-1 … QC157-11, each a ledger in reports/query-centre-v157/ledger/; after shots and crops.
 *   SA_PHASE=ref     the reference's own cards, cropped beside ours (one per stage, one quiet at rest and hovered).
 *
 * ⚠️ THE NUDGED FIXTURE IS FOUND FROM THE HARNESS DATA, NOT FROM THE PAGE: a query whose latest nudge (lastNudgeSentDate,
 *    else a nudgeDate already past) is on or after its latest send. QC157-9's nudged/not-nudged split is checked against
 *    that list, so a card that used the wrong date for its line cannot satisfy it.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { openRoute } from "./measure";
import { statusBand } from "../../src/lib/stageColours";

const PAGE = ".qc151.qc153";
const PHASE = process.env.SA_PHASE === "before" ? "before" : process.env.SA_PHASE === "ref" ? "ref" : "after";
const DIR = "reports/query-centre-v157";
const SHOTS = `${DIR}/shots`;
const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 800 }];
test.setTimeout(1_200_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });

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

/* ── the harness's nudged queries (see the header) ─────────────────────────────────────────────────────────────── */
const ms = (v: unknown): number | null => { if (typeof v !== "string" || !v) return null; const t = Date.parse(v); return Number.isNaN(t) ? null : t; };
const NUDGED: Set<string> = (() => {
  const h = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")) as { docs: Record<string, Record<string, unknown>> };
  const out = new Set<string>();
  for (const [path, q] of Object.entries(h.docs)) {
    if (!/\/queries\/[^/]+$/.test(path) || !q.status) continue;
    const n = ms(q.lastNudgeSentDate) ?? ms(q.nudgeDate);
    if (n == null || n > Date.now()) continue;
    const sends = [q.dateSent, q.partialSentDate, q.fullSentDate].map(ms).filter((t): t is number => t != null);
    if (sends.length && n < Math.max(...sends)) continue;
    out.add(String(q.id ?? path.split("/").pop()));
  }
  return out;
})();

async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => {
    try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ }
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
/** the harness kills every transition; the hover locks time the real ones */
const letMotion = (page: Page) => page.evaluate(() => document.querySelectorAll("style").forEach((s) => { if ((s.textContent ?? "").includes("transition: none !important")) s.remove(); }));

/* ── the geometry (Step 0.5 and QC157-11): boxes relative to the list's own top-left, so scrolling cannot move them ── */
type Box = [number, number, number, number];
interface CardGeo { id: string; status: string; tone: string; quiet: boolean; card: Box; band: number; facts: Box[]; nodes: Box[] }
const geometry = (page: Page): Promise<CardGeo[]> => page.evaluate((sel) => {
  const root = document.querySelector<HTMLElement>(sel)!;
  const o = root.getBoundingClientRect();
  const bx = (e: Element): [number, number, number, number] => { const r = e.getBoundingClientRect(); return [+(r.left - o.left).toFixed(2), +(r.top - o.top).toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; };
  return [...root.querySelectorAll<HTMLElement>("[data-qc154='card']")].map((c) => ({
    id: c.dataset.id!, status: c.dataset.status!, tone: c.dataset.tone!, quiet: c.hasAttribute("data-quiet"),
    card: bx(c), band: +c.querySelector("[data-qc154='band']")!.getBoundingClientRect().height.toFixed(2),
    facts: [...c.querySelectorAll("[data-qc154='fact']")].map(bx),
    nodes: [...c.querySelectorAll("[data-qc153='node']")].map(bx),
  }));
}, PAGE);

/** the page's stamped quiet rows, read off the card's own Next box words before v157 (Step 0.4's test, on the page) */
const cardIds = (page: Page, filter: string) => page.evaluate(([sel, f]) => [...document.querySelector(sel as string)!.querySelectorAll<HTMLElement>(`:scope [data-qc154='card']${f}`)].map((c) => c.dataset.id!), [PAGE, filter]);

test.describe("Query Centre v157", () => {
  test("Step 0.5 — the baseline geometry, and the before shots", async ({ page }) => {
    test.skip(PHASE !== "before", "before only");
    const out: Record<string, CardGeo[]> = {};
    for (const vp of SIZES) {
      await openQc(page, vp);
      out[`${vp.width}x${vp.height}`] = await geometry(page);
      const groups = page.locator(`${PAGE} section.qc153-grp`);
      for (let i = 0; i < await groups.count(); i++) await groups.nth(i).screenshot({ path: `${SHOTS}/before-${vp.width}-group-${i + 1}-${await groups.nth(i).getAttribute("data-k")}.png` });
    }
    writeFileSync(`${DIR}/baseline.json`, JSON.stringify(out, null, 1));
    console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.length} cards`).join(" · "));
    expect(Object.values(out).every((v) => v.length > 0)).toBe(true);
  });

  test("the fixture holds a quiet card that was nudged and one that was not", async ({ page }) => {
    test.skip(PHASE === "ref", "not on the reference");
    await openQc(page, SIZES[0]);
    const quiet = await cardIds(page, "[data-quiet]");
    const all = await cardIds(page, "");
    const nudged = quiet.filter((id) => NUDGED.has(id)), not = quiet.filter((id) => !NUDGED.has(id));
    const L = new Ledger("fixture");
    L.check(`harness nudged queries: ${[...NUDGED].join(", ") || "none"}`, NUDGED.size > 0, `${NUDGED.size}`);
    L.check(`quiet cards on the grid (${all.length} cards): ${quiet.length}`, quiet.length >= 2, quiet.join(", "));
    L.check("at least one quiet card has been nudged", nudged.length >= 1, nudged.join(", "));
    L.check("at least one quiet card has not", not.length >= 1, not.join(", "));
    L.done(4);
  });

  for (const vp of SIZES) {
    const w = `${vp.width}×${vp.height}`;

    test(`QC157-1 bands — ${w}`, async ({ page }) => {
      test.skip(PHASE === "ref", "not on the reference");
      await openQc(page, vp);
      const L = new Ledger(`QC157-1-${vp.width}`);
      const got = await page.evaluate((sel) => [...document.querySelector(sel as string)!.querySelectorAll<HTMLElement>(`:scope [data-qc154='card']`)].map((c) => {
        const cs = getComputedStyle(c.querySelector<HTMLElement>("[data-qc154='band']")!);
        return { id: c.dataset.id!, status: c.dataset.status!, quiet: c.hasAttribute("data-quiet"), color: cs.backgroundColor, image: cs.backgroundImage };
      }), PAGE);
      const rgb = (hex: string) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
      const seen = new Set<string>();
      for (const c of got) {
        if (seen.has(`${c.status}${c.quiet}`)) continue;
        seen.add(`${c.status}${c.quiet}`);
        /* Plumage colours v2: an offer's grid band is the soft stripes, with no flat colour of its own; they are measured
           by tests/e2e/pc2.measure.ts PC2-4, so here an offer is only checked to be striped */
        if ((c.status === "Offer" || c.status === "Signed") && !c.quiet) {
          L.check(`${c.status}: band striped (PC2-4 reads the stripes)`, /^repeating-linear-gradient\(118deg/.test(c.image), `${c.id} ${c.image.slice(0, 40)}`);
          continue;
        }
        const want = rgb(statusBand(c.status));
        /* a quiet band is a gradient (no colour of its own): its first stop is the status's band (Plumage colours v1) */
        const v = c.quiet ? (c.image.match(/rgb\([^)]*\)/)?.[0] ?? "none") : c.color;
        L.check(`${c.status}${c.quiet ? " (quiet)" : ""}: band ${want}`, v === want, `${c.id} ${v}`);
      }
      const rej = got.find((c) => c.status === "Rejected");
      L.check("a Rejected card is #eceae6", !!rej && rej.color === "rgb(236, 234, 230)", rej ? rej.color : "no Rejected card");
      L.done(6);
    });

    /* QC157-2 (the offer's foil) is retired by Plumage colours v1; Plumage colours v2's offer stripes are measured by
       tests/e2e/pc2.measure.ts PC2-4 (the stripes on the grid band, flat duck egg elsewhere). */

    test(`QC157-3 track — ${w}`, async ({ page }) => {
      test.skip(PHASE === "ref", "not on the reference");
      await openQc(page, vp);
      const L = new Ledger(`QC157-3-${vp.width}`);
      const got = await page.evaluate((sel) => [...document.querySelector(sel as string)!.querySelectorAll<HTMLElement>(`:scope [data-qc154='card']`)].filter((c) => !c.querySelector(".qc153-trk.is-ended")).map((c) => ({
        status: c.dataset.status!, nodes: [...c.querySelectorAll<HTMLElement>("[data-qc153='node']")].map((n) => ({ s: n.dataset.state!, c: getComputedStyle(n).color })),
      })), PAGE);
      const seen = new Set<string>();
      for (const g of got) {
        for (const n of g.nodes) {
          const k = `${g.status}:${n.s}`; if (seen.has(k)) continue; seen.add(k);
          /* Plumage colours v2: ink on every band, the offer's duck egg included (v1's paper on navy is retired) */
          const want = n.s === "cur" || n.s === "reached" ? "rgb(28, 19, 15)" : "rgba(28, 19, 15, 0.42)";
          L.check(`${g.status} ${n.s} step: ${want}`, n.c === want, n.c);
        }
      }
      L.check("reached and unreached steps both seen", [...seen].some((k) => k.endsWith(":reached")) && [...seen].some((k) => k.endsWith(":fut")), [...seen].join(" "));
      L.done(6);
    });

    test(`QC157-4 centred and QC157-5 needs you — ${w}`, async ({ page }) => {
      test.skip(PHASE === "ref", "not on the reference");
      await openQc(page, vp);
      const L4 = new Ledger(`QC157-4-${vp.width}`), L5 = new Ledger(`QC157-5-${vp.width}`);
      const got = await page.evaluate((sel) => [...document.querySelector(sel as string)!.querySelectorAll<HTMLElement>(`:scope [data-qc154='fact']`)].map((f) => {
        const r = f.getBoundingClientRect();
        const kids = [...f.children].filter((k) => getComputedStyle(k).position !== "absolute" && (k as HTMLElement).getBoundingClientRect().height > 0);
        const first = kids[0].getBoundingClientRect(), last = kids[kids.length - 1].getBoundingClientRect();
        const cs = getComputedStyle(f); const b = f.querySelector("b");
        return { id: (f.closest("[data-qc154='card']") as HTMLElement).dataset.id!, k: f.dataset.k!, hot: f.classList.contains("is-hot") || f.dataset.state === "over",
          above: first.top - r.top, below: r.bottom - last.bottom, bg: cs.backgroundColor, shadow: cs.boxShadow, after: b ? getComputedStyle(b, "::after").content : "none" };
      }), PAGE);
      const worst = got.reduce((m, g) => Math.max(m, Math.abs(g.above - g.below)), 0);
      L4.check(`every fact box (${got.length}): gap above and below differ ≤ 1px`, got.length > 0 && worst <= 1, `worst ${worst.toFixed(2)}`);
      for (const g of got.filter((x) => Math.abs(x.above - x.below) > 1).slice(0, 8)) L4.check(`${g.id} ${g.k}`, false, `${g.above.toFixed(2)} / ${g.below.toFixed(2)}`);
      const hot = got.filter((g) => g.hot), cold = got.filter((g) => !g.hot);
      L5.check(`hot boxes on the page: ${hot.length}`, hot.length > 0, "");
      L5.check("every hot box is white with the inset 1.5px navy outline", hot.every((g) => g.bg === "rgb(255, 255, 255)" && /rgb\(42, 58, 82\) 0px 0px 0px 1\.5px inset/.test(g.shadow)), [...new Set(hot.map((g) => `${g.bg} | ${g.shadow}`))].join(" ; "));
      L5.check("no hot value has ::after content", hot.every((g) => g.after === "none" || g.after === "normal"), [...new Set(hot.map((g) => g.after))].join(","));
      L5.check("every other box is #fbf9f5 with no outline", cold.every((g) => g.bg === "rgb(251, 249, 245)" && g.shadow === "none"), [...new Set(cold.map((g) => `${g.bg} | ${g.shadow}`))].join(" ; "));
      /* every ledger is written even when an earlier one fails */
      try { L4.done(1); } finally { L5.done(4); }
    });

    test(`QC157-6/7/9 quiet band, step and words — ${w}`, async ({ page }) => {
      test.skip(PHASE === "ref", "not on the reference");
      await openQc(page, vp);
      const L6 = new Ledger(`QC157-6-${vp.width}`), L7 = new Ledger(`QC157-7-${vp.width}`), L9 = new Ledger(`QC157-9-${vp.width}`);
      const got = await page.evaluate((sel) => [...document.querySelector(sel as string)!.querySelectorAll<HTMLElement>(`:scope [data-qc154='card']`)].map((c) => {
        const band = getComputedStyle(c.querySelector<HTMLElement>("[data-qc154='band']")!).backgroundImage;
        const cur = c.querySelector<HTMLElement>(".qc153-nd--cur"); const arw = cur?.querySelector<HTMLElement>(".qc153-arw");
        const after = cur?.nextElementSibling as HTMLElement | null;
        const nx = c.querySelector<HTMLElement>("[data-qc154='fact'][data-k='next']")!;
        return { id: c.dataset.id!, status: c.dataset.status!, quiet: c.hasAttribute("data-quiet"), band,
          badge: arw ? getComputedStyle(arw).backgroundColor : "", circles: arw?.querySelectorAll("circle").length ?? 0, paths: arw?.querySelectorAll("path").length ?? 0,
          link: after ? getComputedStyle(after).backgroundImage : "",
          state: nx.dataset.state ?? "", label: nx.querySelector(".qc154-fl")?.textContent ?? "", value: nx.querySelector("b")?.textContent ?? "", line: nx.querySelector("em")?.textContent ?? null, bar: !!nx.querySelector(".qc154-bar") };
      }), PAGE);
      const quiet = got.filter((g) => g.quiet);
      L6.check(`quiet cards: ${quiet.length}`, quiet.length >= 2, quiet.map((q) => q.id).join(", "));
      L6.check("every quiet band is a gradient ending in white at 82%", quiet.every((q) => /linear-gradient\(90deg.*rgb\(255, 255, 255\) 82%\)/.test(q.band)), [...new Set(quiet.map((q) => q.band))].join(" ; "));
      const flat = got.filter((g) => !g.quiet && g.status !== "Offer" && g.status !== "Signed");
      L6.check("no other card has a band gradient", flat.every((g) => g.band === "none"), [...new Set(flat.map((g) => g.band))].join(" ; ").slice(0, 300));
      /* "waiting" read from the Next box's own state, not the quiet mark: a Queried card still inside its reply window
         ("wait") or just past it ("over", nudge due) — with the agent, and not gone quiet */
      const twins = got.filter((g) => g.status === "Queried" && (g.state === "wait" || g.state === "over"));
      L6.check("waiting Queried cards (in or just past their reply window) have a flat band, beside quiet Queried cards", quiet.some((q) => q.status === "Queried") && twins.length > 0 && twins.every((t) => !t.quiet && t.band === "none"), twins.map((t) => `${t.id}:${t.state}:${t.band}`).join(" ") || "no waiting Queried card");
      L7.check("every quiet badge is navy", quiet.every((q) => q.badge === "rgb(42, 58, 82)"), [...new Set(quiet.map((q) => q.badge))].join(","));
      L7.check("every quiet badge holds three circles and no arrow path", quiet.every((q) => q.circles === 3 && q.paths === 0), quiet.map((q) => `${q.circles}/${q.paths}`).join(" "));
      L7.check("the link after a quiet card's current step is dotted", quiet.every((q) => /repeating-linear-gradient\(90deg, rgba\(28, 19, 15, 0\.5\) 0px, rgba\(28, 19, 15, 0\.5\) 2px, rgba\(0, 0, 0, 0\) 2px, rgba\(0, 0, 0, 0\) 4px\)/.test(q.link)), [...new Set(quiet.map((q) => q.link))].join(" ; "));
      const waitBadge = got.find((g) => !g.quiet && g.paths > 0);
      L7.check("a card that is not quiet keeps its arrow", !!waitBadge && waitBadge.circles === 0, waitBadge?.id ?? "none");
      L9.check("every quiet box: Gone quiet · Nudge or close, no bar", quiet.every((q) => q.label === "Gone quiet" && q.value === "Nudge or close" && !q.bar), quiet.map((q) => `${q.label}·${q.value}·${q.bar}`).join(" "));
      const n = quiet.filter((q) => NUDGED.has(q.id)), s = quiet.filter((q) => !NUDGED.has(q.id));
      L9.check("the nudged quiet cards' line starts “nudged ”", n.length > 0 && n.every((q) => (q.line ?? "").startsWith("nudged ")), n.map((q) => `${q.id}: ${q.line}`).join(" | "));
      /* a query with no reply date (an agent who states no reply window, quiet by the undated 84-day rule) has no line */
      L9.check("the others' line starts “since ”, or there is none (no reply date)", s.some((q) => (q.line ?? "").startsWith("since ")) && s.every((q) => q.line == null || q.line.startsWith("since ")), s.map((q) => `${q.id}: ${q.line}`).join(" | "));
      try { L6.done(4); } finally { try { L7.done(4); } finally { L9.done(3); } }
    });

    test(`QC157-8 z's — ${w}`, async ({ page }) => {
      test.skip(PHASE === "ref", "not on the reference");
      await openQc(page, vp);
      await letMotion(page);
      const L = new Ledger(`QC157-8-${vp.width}`);
      const census = await page.evaluate((sel) => {
        const cards = [...document.querySelector(sel as string)!.querySelectorAll<HTMLElement>(`:scope [data-qc154='card']`)];
        return { quiet: cards.filter((c) => c.hasAttribute("data-quiet")).map((c) => ({ id: c.dataset.id!, zz: c.querySelectorAll(":scope > .qc157-zz").length, hidden: c.querySelector(".qc157-zz")?.getAttribute("aria-hidden") ?? "", zs: c.querySelectorAll(".qc157-zz > b").length, pe: c.querySelector(".qc157-zz") ? getComputedStyle(c.querySelector(".qc157-zz")!).pointerEvents : "" })),
          others: cards.filter((c) => !c.hasAttribute("data-quiet") && c.querySelector(".qc157-zz")).length };
      }, PAGE);
      L.check("each quiet card has one aria-hidden, pointer-events: none set of three z's", census.quiet.length >= 2 && census.quiet.every((q) => q.zz === 1 && q.hidden === "true" && q.zs === 3 && q.pe === "none"), JSON.stringify(census.quiet));
      L.check("no other card has any", census.others === 0, `${census.others}`);
      const id = census.quiet[0]?.id;
      const card = page.locator(`${PAGE} [data-qc154='card'][data-id="${id}"]`).first();
      await card.scrollIntoViewIfNeeded();
      /* scroll the card a little below the toolbar so its top edge is clear of the sticky strip */
      await page.evaluate((cid) => { const c = document.querySelector<HTMLElement>(`.qc151.qc153 [data-qc154='card'][data-id="${cid}"]`)!; c.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }); }, id);
      await page.mouse.move(2, 2); await page.waitForTimeout(700);
      const zs = () => card.evaluate((c) => [...c.querySelectorAll<HTMLElement>(".qc157-zz > b")].map((b) => {
        const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
        let cut = ""; for (let a = b.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          const s = getComputedStyle(a); if (s.overflowX === "visible" && s.overflowY === "visible") continue;
          const ar = a.getBoundingClientRect(); if (r.top < ar.top - 0.5 || r.left < ar.left - 0.5 || r.right > ar.right + 0.5 || r.bottom > ar.bottom + 0.5) { cut = `${a.className} (${s.overflow})`; break; }
        }
        return { op: cs.opacity, tf: cs.transform, font: cs.fontFamily, col: cs.color, size: cs.fontSize, inView: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth, cut, box: [r.left, r.top, r.width, r.height].map((v) => +v.toFixed(1)) };
      }));
      const rest = await zs();
      L.check("at rest each is opacity 0", rest.every((z) => z.op === "0"), rest.map((z) => z.op).join(","));
      await card.locator("[data-qc154='name']").hover(); await page.waitForTimeout(600);
      const hov = await zs();
      L.check("600ms after hover: .7, .85, 1", hov.map((z) => z.op).join(",") === "0.7,0.85,1", hov.map((z) => z.op).join(","));
      L.check("…with no transform", hov.every((z) => z.tf === "none"), hov.map((z) => z.tf).join(" | "));
      L.check("Special Elite, navy", hov.every((z) => /Special Elite/i.test(z.font) && z.col === "rgb(42, 58, 82)"), `${hov[0]?.font} ${hov[0]?.col}`);
      L.check("12, 15 and 19px", hov.map((z) => z.size).join(",") === "12px,15px,19px", hov.map((z) => z.size).join(","));
      L.check("no z is clipped: inside the viewport, and inside every clipping ancestor", hov.every((z) => z.inView && !z.cut), JSON.stringify(hov.map((z) => ({ box: z.box, inView: z.inView, cut: z.cut }))));
      if (vp.width === 1512) await page.screenshot({ path: `${SHOTS}/after-quiet-hover-1512.png`, clip: await card.boundingBox().then((b) => ({ x: b!.x - 16, y: b!.y - 30, width: b!.width + 32, height: b!.height + 46 })) });
      L.done(8);
    });

    test(`QC157-10 quiet chip — ${w}`, async ({ page }) => {
      test.skip(PHASE === "ref", "not on the reference");
      await openQc(page, vp);
      const L = new Ledger(`QC157-10-${vp.width}`);
      const id = (await cardIds(page, "[data-quiet]"))[0];
      const card = page.locator(`${PAGE} [data-qc154='card'][data-id="${id}"]`).first();
      const chip = card.locator(".qc1561-chip");
      await card.scrollIntoViewIfNeeded();
      await card.locator("[data-qc154='name']").hover();
      await expect(chip).toHaveAccessibleName("Nudge or close");
      L.check("the chip is named “Nudge or close”", true, id);
      L.check("its mode is open (it opens the card)", (await chip.getAttribute("data-mode")) === "open", `${await chip.getAttribute("data-mode")}`);
      await chip.click();
      await page.waitForTimeout(1200);
      const st = await page.evaluate(() => ({
        open: /[?&]q=/.test(location.href) || [...document.querySelectorAll<HTMLElement>("[data-qc1522]")].some((e) => e.getBoundingClientRect().width > 0),
        composer: [...document.querySelectorAll<HTMLElement>("[data-qc1522='composer']")].some((e) => e.getBoundingClientRect().width > 0),
        drawer: [...document.querySelectorAll<HTMLElement>("[data-qa-drawer], .qa-drawer, [data-drawer-mode]")].some((e) => e.getBoundingClientRect().width > 0),
      }));
      L.check("one click opens the card, and no journey", st.open && !st.composer && !st.drawer, JSON.stringify(st));
      if (vp.width === 1512) await page.screenshot({ path: `${SHOTS}/after-quiet-chip-click-1512.png` });
      L.done(3);
    });

    test(`QC157-11 nothing moved — ${w}`, async ({ page }) => {
      test.skip(PHASE !== "after", "after only");
      const base = JSON.parse(readFileSync(`${DIR}/baseline.json`, "utf8")) as Record<string, CardGeo[]>;
      await openQc(page, vp);
      const now = await geometry(page);
      const was = new Map(base[`${vp.width}x${vp.height}`].map((c) => [c.id, c]));
      const L = new Ledger(`QC157-11-${vp.width}`);
      L.check("the same cards", now.length === was.size && now.every((c) => was.has(c.id)), `${now.length} vs ${was.size}`);
      let worst = 0; const bad: string[] = [];
      const cmp = (id: string, what: string, a: number[], b: number[]) => { a.forEach((v, i) => { const d = Math.abs(v - b[i]); worst = Math.max(worst, d); if (d > 0.5) bad.push(`${id} ${what}[${i}] ${b[i]}→${v}`); }); };
      for (const c of now) {
        const b = was.get(c.id); if (!b) continue;
        cmp(c.id, "card", c.card, b.card); cmp(c.id, "band", [c.band], [b.band]);
        c.facts.forEach((f, i) => cmp(c.id, `fact${i}`, f, b.facts[i] ?? [NaN, NaN, NaN, NaN]));
        c.nodes.forEach((n, i) => cmp(c.id, `node${i}`, n, b.nodes[i] ?? [NaN, NaN, NaN, NaN]));
      }
      L.check("every card, band, fact box and track node within 0.5px of the baseline", bad.length === 0, `worst ${worst.toFixed(2)}; ${bad.slice(0, 10).join(" | ")}`);
      L.done(2);
    });
  }

  test("after shots and crops", async ({ page }) => {
    test.skip(PHASE !== "after", "after only");
    for (const vp of SIZES) {
      await openQc(page, vp);
      const groups = page.locator(`${PAGE} section.qc153-grp`);
      for (let i = 0; i < await groups.count(); i++) await groups.nth(i).screenshot({ path: `${SHOTS}/after-${vp.width}-group-${i + 1}-${await groups.nth(i).getAttribute("data-k")}.png` });
      if (vp.width !== 1512) continue;
      const picks = await page.evaluate((sel) => {
        const out: Record<string, string> = {};
        document.querySelector(sel as string)!.querySelectorAll<HTMLElement>(`:scope [data-qc154='card']`).forEach((c) => {
          const k = c.hasAttribute("data-quiet") ? "quiet" : c.dataset.tone!;
          if (!out[k]) out[k] = c.dataset.id!;
        });
        return out;
      }, PAGE);
      for (const [k, id] of Object.entries(picks)) {
        const card = page.locator(`${PAGE} [data-qc154='card'][data-id="${id}"]`).first();
        await page.evaluate((cid) => document.querySelector<HTMLElement>(`.qc151.qc153 [data-qc154='card'][data-id="${cid}"]`)!.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }), id);
        await page.mouse.move(2, 2); await page.waitForTimeout(300);
        const b = (await card.boundingBox())!;
        await page.screenshot({ path: `${SHOTS}/crop-ours-${k}.png`, clip: { x: b.x - 12, y: b.y - 26, width: b.width + 24, height: b.height + 38 } });
        if (k === "quiet") { await card.locator("[data-qc154='name']").hover(); await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/crop-ours-quiet-hover.png`, clip: { x: b.x - 12, y: b.y - 26, width: b.width + 24, height: b.height + 38 } }); }
      }
    }
  });

  test("the reference's cards, cropped", async ({ page }) => {
    test.skip(PHASE !== "ref", "ref only");
    const f = resolve("design-refs/query-centre-v157.html");
    expect(existsSync(f)).toBe(true);
    await page.setViewportSize(SIZES[0]);
    await page.goto(pathToFileURL(f).href);
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.fonts.ready);
    const picks = await page.evaluate(() => {
      const out: Record<string, number> = {};
      document.querySelectorAll<HTMLElement>(".qc").forEach((c, i) => {
        const r = c.getBoundingClientRect(); if (!r.width) return;
        const t = c.classList.contains("quiet") ? "quiet" : c.querySelector<HTMLElement>(".hd")?.getAttribute("title") ?? "";
        if (t && out[t] == null) out[t] = i;
      });
      return out;
    });
    console.log("ref picks", JSON.stringify(picks));
    for (const [k, i] of Object.entries(picks)) {
      const card = page.locator(".qc").nth(i);
      await card.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2); await page.waitForTimeout(300);
      const b = (await card.boundingBox())!;
      const name = k.replace(/[^a-z]+/gi, "-").toLowerCase();
      await page.screenshot({ path: `${SHOTS}/crop-ref-${name}.png`, clip: { x: Math.max(0, b.x - 12), y: Math.max(0, b.y - 26), width: b.width + 24, height: b.height + 38 } });
      if (k === "quiet") { await card.hover(); await page.waitForTimeout(800); await page.screenshot({ path: `${SHOTS}/crop-ref-quiet-hover.png`, clip: { x: Math.max(0, b.x - 12), y: Math.max(0, b.y - 26), width: b.width + 24, height: b.height + 38 } }); }
    }
    expect(Object.keys(picks).length).toBeGreaterThan(3);
  });
});
