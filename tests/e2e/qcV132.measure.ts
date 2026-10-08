/**
 * Query Centre v132 — QC132 R1…R5 ("Recently updated") and W1…W10 ("Your queries"), at 1280 / 1512 / 1920
 * with the harness account's real data. R4 is the unit test `src/lib/qcRecent.test.ts`.
 * Ref design-refs/query-centre/query-centre-v132.html.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test qcV132
 *
 * Every case asserts its population first: a probe that finds nothing has failed, not skipped.
 */
import { test, expect, Page } from "@playwright/test";
import { inkOpen } from "./inkLib";

const WIDTHS = [1280, 1512, 1920];
const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
/** The desk's court for each status (tileCourt), stated here so a check never reads the page's own answer back. */
const COURT: Record<string, "you" | "agent" | "closed" | null> = {
  "Queried": "agent", "Partial Sent": "agent", "Full Sent": "agent", "Resubmitted": "agent",
  "Partial Requested": "you", "Full Requested": "you", "Revise & Resubmit": "you", "Offer": "you",
  "Rejected": "closed", "No Response": "closed", "Withdrawn": null, "Signed": null,
};
const NAME = { you: "With you", agent: "With agents", closed: "Closed" } as const;

async function openQc(page: Page, w: number) {
  await inkOpen(page, "/queries", w, { scope: "qc132" });
  await expect(page.locator('[data-qcv="ru"]:not([data-sk])'), "Recently updated is on the page").toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-qcv="row"]').first(), "the list loaded").toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(400);
}
const listState = (page: Page) => page.evaluate(() => ({
  ids: [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((r) => r.dataset.qid).join(","),
  counts: [...document.querySelectorAll<HTMLElement>('[data-qcv="showing"], [data-qcv="showing"], [data-qcv="gband"]')].map((e) => e.innerText.replace(/\s+/g, " ").trim()).join("|"),
}));
const listRows = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((r) => ({ id: r.dataset.qid!, name: r.dataset.name ?? "", status: r.dataset.status ?? "" })));

test.describe("Query Centre v132 — Recently updated", () => {
  test("R1 · thirds: the lede a third, the card on the stage's left, the panel 150 right, the card 34 down, centres level", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const r = await page.evaluate(() => {
        const g = (s: string) => document.querySelector<HTMLElement>(`[data-qcv="${s}"]`)?.getBoundingClientRect() ?? null;
        const ru = g("ru"), lede = g("ru-lede"), st = g("ru-stage"), pn = g("ru-panel");
        const card = document.querySelector<HTMLElement>('[data-qcv="ru-feat"] .qcard')?.getBoundingClientRect() ?? null;
        const gap = ru ? parseFloat(getComputedStyle(document.querySelector('[data-qcv="ru"]')!).columnGap) : NaN;
        return ru && lede && st && pn && card ? { ruW: ru.width, gap, ledeW: lede.width, stL: st.left, cardL: card.left, pnL: pn.left, cardT: card.top, pnT: pn.top, ledeC: lede.top + lede.height / 2, stC: st.top + st.height / 2 } : null;
      });
      expect(r, `${w}: the section's parts`).toBeTruthy();
      const want = (r!.ruW - r!.gap) / 3;
      expect(near(r!.ledeW, want, 8), `${w}: lede ${r!.ledeW} vs a third ${want}`).toBe(true);
      expect(near(r!.cardL, r!.stL, 1), `${w}: card left ${r!.cardL} vs stage ${r!.stL}`).toBe(true);
      expect(near(r!.pnL - r!.cardL, 150, 1), `${w}: panel starts ${r!.pnL - r!.cardL} right of the card`).toBe(true);
      expect(near(r!.cardT - r!.pnT, 34, 1), `${w}: card ${r!.cardT - r!.pnT} below the panel's top`).toBe(true);
      expect(near(r!.ledeC, r!.stC, 6), `${w}: centres ${r!.ledeC} / ${r!.stC}`).toBe(true);
    }
  });

  test("R2 · each desk card scopes the section to its court, and never the list", async ({ page }) => {
    await openQc(page, 1512);
    const all = await listRows(page);
    expect(all.length, "the list has rows").toBeGreaterThan(10);
    const before = await listState(page);
    await expect(page.locator('[data-qcv="ru-title"]')).toHaveText("Recently updated");
    for (const k of ["you", "agent", "closed"] as const) {
      await page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(350);
      await expect(page.locator('[data-qcv="ru-title"]'), `${k}: the heading`).toHaveText(NAME[k]);
      const s = await page.evaluate(() => ({
        rows: [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-row"]')].map((r) => r.dataset.qid!),
        feat: document.querySelector<HTMLElement>('[data-qcv="ru-feat"]')?.dataset.qid ?? null,
        names: [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-say"] b')].map((b) => b.innerText.trim()).filter((t) => !/things?$/i.test(t)),
      }));
      const court = new Map(all.map((r) => [r.id, COURT[r.status]]));
      const courtNames = new Set(all.filter((r) => COURT[r.status] === k).map((r) => r.name));
      expect(s.rows.length, `${k}: rows shown`).toBeGreaterThan(0);
      expect(s.rows.every((id) => court.get(id) === k), `${k}: every row is the court's ${JSON.stringify(s.rows.map((id) => court.get(id)))}`).toBe(true);
      expect(s.feat && court.get(s.feat) === k, `${k}: the featured card is the court's`).toBe(true);
      expect(s.names.length > 0 && s.names.every((n) => courtNames.has(n)), `${k}: the sentence names only the court's queries ${JSON.stringify(s.names)}`).toBe(true);
      expect(await listState(page), `${k}: the list is untouched`).toEqual(before);
      await page.locator(`[data-qcv="court"][data-court="${k}"] [data-qcv="court-pick"]`).click();
      await page.waitForTimeout(250);
      await expect(page.locator('[data-qcv="ru-title"]'), `${k}: cleared`).toHaveText("Recently updated");
    }
  });

  test("R3 · the button states the list's total, and goes to the list without touching it", async ({ page }) => {
    await openQc(page, 1512);
    const total = (await listRows(page)).length;
    expect(total, "the list has rows").toBeGreaterThan(10);
    await page.locator('[data-qcv="court"][data-court="closed"] [data-qcv="court-pick"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-qcv="ru-all"]')).toHaveText(`See all ${total} in the list`);
    const before = await listState(page);
    await page.locator('[data-qcv="ru-all"]').click();
    await page.waitForTimeout(900);
    const at = await page.evaluate(() => {
      const t = document.querySelector<HTMLElement>('[data-qcv="ws"], [data-qcv="ledger"]')?.getBoundingClientRect();
      const sc = document.querySelector<HTMLElement>(".wpg-scroll")!.getBoundingClientRect();
      return t ? t.top - sc.top : NaN;
    });
    expect(Math.abs(at) < 140, `the list is at the top of the view (${at})`).toBe(true);
    expect(await listState(page), "no filter was set").toEqual(before);
  });

  test("R5 · Also moved: five, newest first; a row features its card; and N more", async ({ page }) => {
    await openQc(page, 1512);
    const total = (await listRows(page)).length;
    const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-row"]')].map((r) => ({ id: r.dataset.qid!, t: +(r.dataset.moved ?? NaN) })));
    expect(rows.length, "five rows").toBe(Math.min(5, total));
    const dated = rows.filter((r) => Number.isFinite(r.t));
    expect(dated.every((r, i) => i === 0 || dated[i - 1].t >= r.t), `newest first ${JSON.stringify(rows.map((r) => r.t))}`).toBe(true);
    await page.locator('[data-qcv="ru-row"]').nth(2).click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({
      feat: document.querySelector<HTMLElement>('[data-qcv="ru-feat"]')?.dataset.qid ?? null,
      on: [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-row"]')].map((r) => !!r.dataset.on),
      ids: [...document.querySelectorAll<HTMLElement>('[data-qcv="ru-row"]')].map((r) => r.dataset.qid),
    }));
    expect(after.ids, "the rows do not change when one is featured").toEqual(rows.map((r) => r.id));
    expect(after.feat, "row 3's card is featured").toBe(rows[2].id);
    expect(after.on, "row 3 is marked featured").toEqual([false, false, true, false, false]);
    const more = (await page.locator('[data-qcv="ru-more"]').innerText()).trim();
    expect(more, "and N more").toBe(`and ${total - 5} more`);
  });
});

test.describe("Query Centre v132 — Your queries", () => {
  test("W1 · the ink bar: anthracite, 104 tall at least, the hawk 210 wide breaking its top, the title and the live count", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const r = await page.evaluate(() => {
        const q = (s: string) => document.querySelector<HTMLElement>(`[data-qcv="${s}"]`);
        const bar = q("ws-bar"), hawk = q("ws-hawk") as HTMLImageElement | null, title = q("ws-title"), sh = q("showing");
        if (!bar || !hawk || !title || !sh) return null;
        const b = bar.getBoundingClientRect(), h = hawk.getBoundingClientRect(), r1 = bar.querySelector<HTMLElement>(".qcw-r1")!.getBoundingClientRect();
        return {
          bg: getComputedStyle(bar).backgroundColor, r1H: r1.height,
          hawkW: hawk.offsetWidth, hawkLeft: hawk.offsetLeft, hawkTop: hawk.offsetTop, loaded: hawk.complete && hawk.naturalWidth > 0, hawkAbove: h.top < b.top,
          face: getComputedStyle(title).fontFamily, size: getComputedStyle(title).fontSize, text: title.innerText.trim(),
          x: Number(sh.dataset.x), y: Number(sh.dataset.y), rows: document.querySelectorAll('[data-qcv="row"]').length,
          titleLeft: title.getBoundingClientRect().left - b.left,
          /* the panel against the page's content (the desk): 20px wider on each side */
          panel: (() => { const p = bar.closest<HTMLElement>('[data-ws="true"]')?.getBoundingClientRect(), d = q("courts")?.getBoundingClientRect(); return p && d ? { l: d.left - p.left, r: p.right - d.right } : null; })(),
          /* the hawk is clipped if any ancestor up to the scroller clips and does not contain its box */
          clippedBy: (() => { for (let a = hawk.parentElement; a && !a.matches(".wpg-scroll"); a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowY !== "visible" || cs.overflowX !== "visible") { const r = a.getBoundingClientRect(); if (h.top < r.top - 0.5 || h.left < r.left - 0.5) return a.className || a.tagName; } } return null; })(),
        };
      });
      expect(r, `${w}: the bar's parts`).toBeTruthy();
      expect(r!.bg, `${w}: the bar is anthracite`).toBe("rgb(42, 58, 82)");
      expect(r!.r1H, `${w}: the title row is at least 104`).toBeGreaterThanOrEqual(104);
      expect(r!.hawkW, `${w}: the hawk is 210 wide`).toBe(210);
      expect(r!.loaded, `${w}: the hawk's image loaded`).toBe(true);
      expect(near(r!.hawkLeft, 8) && near(r!.hawkTop, -74), `${w}: the hawk at 8/-74, got ${r!.hawkLeft}/${r!.hawkTop}`).toBe(true);
      expect(r!.hawkAbove, `${w}: the hawk breaks the bar's top`).toBe(true);
      expect(r!.clippedBy, `${w}: the hawk is clipped by ${r!.clippedBy}`).toBeNull();
      expect(r!.panel, `${w}: the panel and the desk measured`).toBeTruthy();
      expect(near(r!.panel!.l, 20) && near(r!.panel!.r, 20), `${w}: the panel steps ${r!.panel!.l} / ${r!.panel!.r} into the margins`).toBe(true);
      expect(near(r!.titleLeft, 236), `${w}: the title starts 236 in, got ${r!.titleLeft}`).toBe(true);
      expect(r!.face, `${w}: the title is the typewriter`).toMatch(/Special Elite/);
      expect(r!.size, `${w}: 32px`).toBe("32px");
      expect(r!.text).toBe("Your queries");
      expect(r!.y, `${w}: the total`).toBeGreaterThan(10);
      expect(r!.x, `${w}: "Showing" counts the rows drawn`).toBe(r!.rows);
    }
  });

  const deskYou = (page: Page) => page.locator('[data-qcv="court"][data-court="you"] [data-qcv="court-count"]').first().innerText().then((t) => Number(t.replace(/\D/g, "")));
  const deskOverdue = (page: Page) => page.evaluate(() => {
    /* the desk prints the number (court-tile) and its words (court-label) as two elements of one line */
    const line = [...document.querySelectorAll<HTMLElement>('[data-qcv="court"][data-court="agent"] [data-qcv="court-line"]')]
      .find((l) => /overdue/i.test(l.querySelector<HTMLElement>('[data-qcv="court-label"]')?.innerText ?? ""));
    return line ? Number(line.querySelector<HTMLElement>('[data-qcv="court-tile"]')?.innerText.trim() ?? NaN) : NaN;
  });
  const shownIds = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((r) => r.dataset.qid!));

  test("W2 · the two pills: the desk's own numbers, each filters the list to exactly that set, and a second press clears", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const all = await listRows(page);
      expect(all.length, `${w}: the list has rows`).toBeGreaterThan(10);
      const you = await deskYou(page), over = await deskOverdue(page);
      expect(you, `${w}: the desk says something is with you`).toBeGreaterThan(0);
      expect(Number.isFinite(over), `${w}: the desk's overdue line was found`).toBe(true);
      const pill = (k: string) => page.locator(`[data-qcv="ws-pill"][data-k="${k}"]`);
      expect(Number((await pill("you").locator("b").innerText()).trim()), `${w}: your move = the desk's With you`).toBe(you);
      expect(Number((await pill("past").locator("b").innerText()).trim()), `${w}: overdue = the desk's responses overdue`).toBe(over);
      await pill("you").click();
      await page.waitForTimeout(300);
      await expect(pill("you")).toHaveAttribute("aria-pressed", "true");
      const ids = await shownIds(page);
      const st = new Map(all.map((r) => [r.id, r.status]));
      expect(ids.length, `${w}: your move shows the desk's number`).toBe(you);
      expect(ids.every((id) => COURT[st.get(id)!] === "you"), `${w}: every row is with you`).toBe(true);
      await pill("you").click();
      await page.waitForTimeout(300);
      await expect(pill("you")).toHaveAttribute("aria-pressed", "false");
      expect((await shownIds(page)).length, `${w}: a second press returns everything`).toBe(all.length);
      if (over > 0) {
        await pill("past").click(); await page.waitForTimeout(300);
        expect((await shownIds(page)).length, `${w}: overdue shows the desk's number`).toBe(over);
        await pill("past").click(); await page.waitForTimeout(300);
      }
    }
  });

  test("W3 · the strip: one line, one value at a time, and Clear all puts everything back", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const total = (await listRows(page)).length;
      const line = await page.evaluate(() => {
        const s = document.querySelector<HTMLElement>('[data-qcv="ws-strip"]')!;
        const kids = [...s.querySelectorAll<HTMLElement>(':scope > [data-qcv="ws-chip"], :scope > [data-qcv="ws-more"]')];
        const tops = kids.map((k) => Math.round(k.getBoundingClientRect().top));
        const sr = s.getBoundingClientRect();
        return { n: kids.length, oneTop: new Set(tops).size === 1, inside: kids.every((k) => k.getBoundingClientRect().right <= sr.right + 0.5), h: sr.height, keys: kids.map((k) => k.dataset.k ?? "more") };
      });
      expect(line.n, `${w}: the strip has chips`).toBeGreaterThanOrEqual(3);
      expect(line.keys, `${w}: More filters is always there`).toContain("more");
      expect(line.oneTop, `${w}: one line`).toBe(true);
      expect(line.inside, `${w}: nothing runs past the strip`).toBe(true);
      expect(near(line.h, 67, 1.5), `${w}: the strip is one row tall, got ${line.h}`).toBe(true);
      const chip = (k: string) => page.locator(`[data-qcv="ws-strip"] > [data-qcv="ws-chip"][data-k="${k}"]`);
      const pressed = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="ws-chip"][aria-pressed="true"], [data-qcv="ws-pill"][aria-pressed="true"]')].filter((e) => e.closest('[data-qcv="ws-strip"]') ? !e.closest(".qcw-strip-measure") : true).map((e) => `${e.dataset.qcv}:${e.dataset.k}`));
      await chip("you").click(); await page.waitForTimeout(250);
      expect((await pressed()).sort(), `${w}: Your move is pressed, and its pill with it`).toEqual(["ws-chip:you", "ws-pill:you"]);
      await chip("closed").click(); await page.waitForTimeout(250);
      expect(await pressed(), `${w}: one value at a time`).toEqual(["ws-chip:closed"]);
      await page.locator('[data-qcv="find"] input').fill("zz");
      await page.waitForTimeout(250);
      await page.locator('[data-qcv="ws-clear"]').click(); await page.waitForTimeout(300);
      expect(await pressed(), `${w}: Clear all leaves nothing pressed`).toEqual([]);
      await expect(page.locator('[data-qcv="find"] input'), `${w}: and empties Find`).toHaveValue("");
      expect((await shownIds(page)).length, `${w}: and returns every row`).toBe(total);
      await expect(page.locator('[data-qcv="ws-clear"]'), `${w}: Clear all goes when nothing is on`).toHaveCount(0);
    }
  });
});

/* ── Phase 3 · the list ───────────────────────────────────────────────────────────────────────────── */
const URG = [
  { key: "you", label: "Your move", hint: "offers and requests", bg: "rgb(246, 226, 216)" },
  { key: "quiet", label: "Past the date", hint: "replies overdue", bg: "rgb(226, 231, 239)" },
  { key: "waiting", label: "Waiting", hint: "with agents, not yet due", bg: "rgb(226, 231, 239)" },
  { key: "closed", label: "Closed", hint: "passed or no response", bg: "rgb(236, 232, 227)" },
];
async function groupBy(page: Page, label: RegExp) {
  await page.locator('[data-qcv="ws-head"]').evaluate((e) => e.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(200);
  await page.locator('[data-qcv="ws-group"]').click();
  await page.waitForTimeout(250);
  await page.getByRole("menuitemradio", { name: label }).first().click();
  await page.waitForTimeout(500);
}

test.describe("Query Centre v132 — the list", () => {
  test("W4 · urgency bands: the table's order, labels and grounds, 54 tall, and a band folds its rows", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      await groupBy(page, /^Urgency$/);
      const bands = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qcv="gband"]')].map((b) => ({
        key: b.dataset.group!, label: b.querySelector('[data-qcv="gband-t"]')?.textContent?.trim() ?? "",
        hint: b.querySelector('[data-qcv="gband-h"]')?.textContent?.trim() ?? "", h: b.getBoundingClientRect().height, bg: getComputedStyle(b).backgroundColor,
      })));
      expect(bands.length, `${w}: bands drawn`).toBeGreaterThanOrEqual(3);
      const order = URG.filter((u) => bands.some((b) => b.key === u.key)).map((u) => u.key);
      expect(bands.map((b) => b.key), `${w}: the order is you · quiet · waiting · closed`).toEqual(order);
      for (const b of bands) {
        const u = URG.find((x) => x.key === b.key)!;
        expect(b.label, `${w}: ${b.key}'s label`).toBe(u.label);
        expect(b.hint.toLowerCase(), `${w}: ${b.key}'s hint`).toBe(u.hint);
        expect(near(b.h, 54), `${w}: ${b.key} is ${b.h} tall`).toBe(true);
        expect(b.bg, `${w}: ${b.key}'s ground`).toBe(u.bg);
      }
      const first = bands[0].key;
      const rowsIn = () => page.evaluate((k) => document.querySelectorAll(`[data-qcv="grp"][data-group="${k}"] [data-qcv="row"]`).length, first);
      const before = await rowsIn();
      expect(before, `${w}: the first band has rows`).toBeGreaterThan(0);
      await page.locator(`[data-qcv="gband"][data-group="${first}"]`).click();
      await page.waitForTimeout(200);
      expect(await rowsIn(), `${w}: clicking the band folds its rows`).toBe(0);
      await page.locator(`[data-qcv="gband"][data-group="${first}"]`).click();
      await page.waitForTimeout(200);
      expect(await rowsIn(), `${w}: and again unfolds them`).toBe(before);
    }
  });

  test("W5 · one grid: labels and cells share x-edges, the last two columns are 284, the labels lift only while stuck", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const g = await page.evaluate(() => {
        const labs = [...document.querySelectorAll<HTMLElement>('.qcw-list [data-lt="labels"] > *')].map((e) => e.getBoundingClientRect());
        const row = document.querySelector<HTMLElement>('.qcw-list [data-qcv="row"]')!;
        const cells = [...row.children].filter((c) => !(c as HTMLElement).matches('[data-qcv="row-tray"]')).map((c) => c.getBoundingClientRect());
        return { labs: labs.map((r) => ({ l: r.left, r: r.right, w: r.width })), cells: cells.map((r) => ({ l: r.left, r: r.right, w: r.width })) };
      });
      expect(g.labs.length, `${w}: four labels`).toBe(4);
      expect(g.cells.length, `${w}: four cells`).toBe(4);
      g.labs.forEach((l, i) => {
        expect(near(l.l, g.cells[i].l), `${w}: column ${i} starts at ${l.l} / ${g.cells[i].l}`).toBe(true);
        expect(near(l.r, g.cells[i].r), `${w}: column ${i} ends at ${l.r} / ${g.cells[i].r}`).toBe(true);
      });
      expect(near(g.cells[2].w, 284) && near(g.cells[3].w, 284), `${w}: sent ${g.cells[2].w}, next ${g.cells[3].w}`).toBe(true);
      const shadow = () => page.evaluate(() => { const l = document.querySelector<HTMLElement>('.qcw-list [data-lt="labels"]')!; return { stuck: l.classList.contains("is-stuck"), sh: getComputedStyle(l).boxShadow, top: l.getBoundingClientRect().top, sc: l.closest(".wpg-scroll")!.getBoundingClientRect().top }; });
      await page.locator('[data-qcv="ws-head"]').evaluate((e) => e.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(300);
      const rest = await shadow();
      expect(rest.stuck, `${w}: not stuck at rest`).toBe(false);
      expect(rest.sh, `${w}: no shadow at rest`).toBe("none");
      await page.locator('.qcw-list [data-qcv="row"]').nth(6).evaluate((e) => e.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(400);
      const pinned = await shadow();
      expect(near(pinned.top, pinned.sc, 1.5), `${w}: the labels pinned at the scroller's top (${pinned.top} / ${pinned.sc})`).toBe(true);
      expect(pinned.stuck, `${w}: stuck once pinned`).toBe(true);
      expect(pinned.sh, `${w}: the lift shadow while stuck`).not.toBe("none");
    }
  });

  test("W6 · what you sent: a 112 slot, the first tile on one line down the list, three branches, no title", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const c = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcw-list [data-qcv="sent"]')].map((s) => {
        const slot = s.children[0] as HTMLElement, tiles = [...s.querySelectorAll<HTMLElement>('[data-qcv="sent-tile"]')];
        return {
          kind: s.dataset.slot!, known: s.dataset.known === "true", slotW: slot.getBoundingClientRect().width, tile0: tiles[0]?.getBoundingClientRect().left ?? NaN,
          states: tiles.map((t) => t.dataset.state!), titles: s.querySelectorAll("[title]").length, chip: slot.textContent?.trim() ?? "",
        };
      }));
      expect(c.length, `${w}: cells drawn`).toBeGreaterThan(10);
      const tally: Record<string, number> = {};
      for (const x of c) tally[x.kind] = (tally[x.kind] ?? 0) + 1;
      expect(tally.package ?? 0, `${w}: a package send is on the page (${JSON.stringify(tally)})`).toBeGreaterThan(0);
      const knownPkgs = c.filter((x) => x.kind === "package" && x.known).length;
      expect(knownPkgs, `${w}: a package send whose edition is on file`).toBeGreaterThan(0);
      tally.packageUnknown = c.filter((x) => x.kind === "package" && !x.known).length;
      expect(tally.add ?? 0, `${w}: an unrecorded send is on the page (${JSON.stringify(tally)})`).toBeGreaterThan(0);
      for (const x of c) expect(Math.abs(x.slotW - 112), `${w}: a ${x.kind} slot is ${x.slotW} wide`).toBeLessThanOrEqual(0.5);
      const x0 = c[0].tile0;
      for (const x of c) expect(Math.abs(x.tile0 - x0), `${w}: the first tile at ${x.tile0} against ${x0}`).toBeLessThanOrEqual(0.5);
      for (const x of c) {
        expect(x.titles, `${w}: no native title in a cell`).toBe(0);
        expect(x.states.length).toBe(4);
        if (x.kind === "add") expect(x.states.every((s) => s === "unrecorded"), `${w}: + Add lights nothing`).toBe(true);
        /* a package whose edition is on file lights its contents; one no longer on file says Not recorded */
        if (x.kind === "package" && x.known) expect(x.states.some((s) => s === "sent"), `${w}: a package lights its contents`).toBe(true);
        if (x.kind === "package" && !x.known) expect(x.states.every((s) => s === "unrecorded"), `${w}: an unknown package claims nothing`).toBe(true);
        if (x.kind === "empty") expect(x.chip, `${w}: an individual send's slot is empty`).toBe("");
      }
      console.log(`[W6] ${w}: ${JSON.stringify(tally)}`);
    }
  });

  test("W7 · popups: hover and focus show the title and line within 200ms, 10 above, inside the window; Esc and scroll hide", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      await page.locator('[data-qcv="ws-head"]').evaluate((e) => e.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(300);
      const targets = ['[data-qcv="row-pkg"]', '[data-qcv="row-add"]', '[data-qcv="sent-tile"][data-state="sent"]', '[data-qcv="sent-tile"][data-state="not"]', '[data-qcv="sent-tile"][data-state="unrecorded"]'];
      let checked = 0;
      for (const sel of targets) {
        const t = page.locator(`.qcw-list ${sel}`).first();
        if (!(await t.count())) continue;
        await t.scrollIntoViewIfNeeded();
        const want = await t.evaluate((e) => ({ title: (e as HTMLElement).dataset.tip, line: (e as HTMLElement).dataset.tl, native: e.getAttribute("title") }));
        expect(want.native, `${w} ${sel}: no native title`).toBeNull();
        expect(want.title, `${w} ${sel}: the target carries its popup's title`).toBeTruthy();
        for (const how of ["hover", "focus"] as const) {
          await page.mouse.move(2, 2); await page.keyboard.press("Escape"); await page.waitForTimeout(150);
          const t0 = Date.now();
          if (how === "hover") await t.hover(); else await t.focus();
          await page.waitForFunction(() => !!document.querySelector('[data-qcv="tip"].on'), null, { timeout: 2000 });
          const dt = Date.now() - t0;
          const r = await page.evaluate((s) => {
            const tip = document.querySelector<HTMLElement>('[data-qcv="tip"]')!, el = document.querySelector<HTMLElement>(`.qcw-list ${s}`)!;
            const a = tip.getBoundingClientRect(), b = el.getBoundingClientRect();
            return { title: tip.querySelector("b")!.textContent, line: tip.querySelector("span")!.textContent, gap: b.top - a.bottom, l: a.left, rr: a.right, t: a.top, vw: innerWidth, desc: el.getAttribute("aria-describedby") === tip.id };
          }, sel);
          expect(dt, `${w} ${sel} ${how}: shown in ${dt}ms`).toBeLessThanOrEqual(200 + 120);
          expect(r.title, `${w} ${sel}: title`).toBe(want.title);
          expect(r.line, `${w} ${sel}: line`).toBe(want.line);
          expect(Math.abs(r.gap - 10), `${w} ${sel}: ${r.gap}px above`).toBeLessThanOrEqual(2);
          expect(r.l >= 0 && r.rr <= r.vw && r.t >= 0, `${w} ${sel}: inside the window`).toBe(true);
          expect(r.desc, `${w} ${sel}: tied by aria-describedby`).toBe(true);
          checked++;
        }
        await page.keyboard.press("Escape"); await page.waitForTimeout(150);
        expect(await page.locator('[data-qcv="tip"].on').count(), `${w} ${sel}: Esc hides it`).toBe(0);
      }
      expect(checked, `${w}: targets checked`).toBeGreaterThanOrEqual(6);
      /* scroll hides it */
      const t = page.locator('.qcw-list [data-qcv="sent-tile"]').first();
      await t.hover(); await page.waitForFunction(() => !!document.querySelector('[data-qcv="tip"].on'), null, { timeout: 2000 });
      await page.mouse.wheel(0, 120); await page.waitForTimeout(250);
      expect(await page.locator('[data-qcv="tip"].on').count(), `${w}: scrolling hides it`).toBe(0);
    }
  });

  test("W8 · the tray on hover stays clear of the What-you-sent cell by 8px or more", async ({ page }) => {
    for (const w of WIDTHS) {
      await openQc(page, w);
      const n = Math.min(12, await page.locator('.qcw-list [data-qcv="row"]').count());
      let seen = 0;
      for (let i = 0; i < n; i++) {
        const row = page.locator('.qcw-list [data-qcv="row"]').nth(i);
        if (!(await row.locator('[data-qcv="row-act"]').count())) continue;
        await row.scrollIntoViewIfNeeded(); await row.hover(); await page.waitForTimeout(220);
        const g = await row.evaluate((r) => ({ tray: r.querySelector('[data-qcv="row-tray"]')!.getBoundingClientRect().left, sent: r.querySelector('[data-qcv="row-sent"]')!.getBoundingClientRect().right, op: getComputedStyle(r.querySelector('[data-qcv="row-tray"]')!).opacity }));
        expect(g.op, `${w} row ${i}: the tray shows`).toBe("1");
        expect(g.tray - g.sent, `${w} row ${i}: tray ${g.tray} vs sent ${g.sent}`).toBeGreaterThanOrEqual(8);
        seen++;
      }
      expect(seen, `${w}: rows with an action hovered`).toBeGreaterThan(2);
    }
  });
});
