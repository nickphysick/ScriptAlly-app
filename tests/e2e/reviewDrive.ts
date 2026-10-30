/**
 * The gated review, driven (onboarding v9). One way through it, shared by every lock that has to
 * get past a step: since v9 a step's primary is disabled until everything on it has an answer, so a
 * lock that only wants to reach the next step has to answer first.
 *
 * Each helper gives the quickest honest answer the screen offers and returns how many it gave.
 */
import type { Locator, Page } from "@playwright/test";

const scopeOf = (page: Page, scope = "") => (sel: string) => page.locator(`${scope ? scope + " " : ""}${sel}`);

/* Set-up on phones v1 (30 Oct): below 768px the deck is a compact card whose "Answer this" opens a
   full-screen layer (`[data-im="q-layer"]`, portalled outside the deck) holding the SAME question
   bodies. A question's own `.o9-ans > .sf-btn` is visually hidden there (the layer's "Save and next"
   presses it), so a press dispatches on the element itself — the same handler, never a coordinate. */
const LAYER = '[data-im="q-layer"]';
async function openLayer(page: Page): Promise<void> {
  if ((await page.locator(LAYER).count()) === 0 && (await page.locator('[data-im="deck-answer"]').count()) > 0) {
    await page.locator('[data-im="deck-answer"]').click();
    await page.locator(LAYER).waitFor({ timeout: 10_000 });
  }
}
async function tap(l: Locator): Promise<void> {
  if (await l.isVisible() && (await l.boundingBox())!.width > 2) await l.click();
  else await l.evaluate((e) => (e as HTMLElement).click());
}

/** Decide every open duplicate set. `keepOne` keeps the set whose text matches apart, once. */
export async function decideDuplicates(page: Page, opts: { scope?: string; keepOne?: RegExp } = {}): Promise<number> {
  const $ = scopeOf(page, opts.scope);
  let kept = false, n = 0;
  for (let i = 0; i < 20 && (await $('[data-dup-state="open"]').count()) > 0; i++) {
    const set = $('[data-dup-state="open"]').first();
    if ((await set.getAttribute("data-dup-kind")) === "reconcile") await set.locator('[data-im="reconcile-right"]').click();
    else if (opts.keepOne && !kept && opts.keepOne.test((await set.textContent()) ?? "")) { await set.locator(".im-dupeact button").click(); kept = true; }
    else await set.getByRole("button", { name: "Remove this one" }).last().click();
    n++;
  }
  return n;
}

/** Answer one open queries question by its reason. */
export async function answerQuery(r: Locator, opts: { date?: string; undated?: boolean } = {}) {
  const code = await r.getAttribute("data-reason");
  const press = async (name: RegExp) => { await tap(r.getByRole("button", { name }).first()); };
  const typeDate = async (iso: string) => { await r.locator('input[type="date"]').first().fill(iso); await press(/^Save date$/); };
  switch (code) {
    case "two-dates": return press(/^Yes, that's right$/);
    case "missing-day": return press(/^Keep as month$/);
    case "serial-outlier": return press(/^That's right$/);
    case "no-date": return opts.date ? typeDate(opts.date) : press(/^(I don't have this date|Leave undated)$/);
    case "unreadable-date": if (opts.undated) return press(/^I don't have this date$/); return typeDate(opts.date ?? "2024-05-14");
    case "unreadable-response-date": return typeDate(opts.date ?? "2024-05-14");
    case "status-wording": return (await r.getByRole("button", { name: /^That's right$/ }).count()) ? press(/^That's right$/) : tap(r.locator("[data-status]").first());
    default: return tap(r.locator("button").first()); // ambiguous dates and status direction: the first reading offered
  }
}

/** Every question the agents step is asking, answered: carry on, mark as checked, or remove. */
export async function answerAgents(page: Page, opts: { scope?: string } = {}): Promise<number> {
  const $ = scopeOf(page, opts.scope);
  let n = 0;
  for (let i = 0; i < 30; i++) {
    await openLayer(page);
    const card = $(`[data-im="deck"] [data-reason], ${LAYER} [data-reason], [data-row="agent"][data-asks="1"] [data-reason]`).first();
    if ((await card.count()) === 0) break;
    const by = (name: string) => card.getByRole("button", { name });
    if (await by("Carry on without an agency").count()) await tap(by("Carry on without an agency").first());
    else if (await by("Mark as checked").count()) await tap(by("Mark as checked").first());
    else if (await by("Remove this row").count()) await tap(by("Remove this row").first());
    else if (await by("Merge them").count()) await tap(by("Merge them").first());
    else break;
    n++;
  }
  return n;
}

/** Every question the queries step is asking, answered. */
export async function answerQueries(page: Page, opts: { scope?: string; date?: string; undated?: boolean } = {}): Promise<number> {
  const $ = scopeOf(page, opts.scope);
  const asks = () => $(`[data-im="deck"] [data-reason], ${LAYER} [data-reason], [data-row="query"][data-asks="1"] [data-reason]`);
  let n = 0;
  for (let i = 0; i < 60; i++) {
    await openLayer(page);
    if ((await asks().count()) === 0) break;
    await answerQuery(asks().first(), opts); n++;
  }
  return n;
}

/** Answer whatever the step on show asks, so its primary lights. */
export async function settleStep(page: Page, opts: { scope?: string } = {}): Promise<void> {
  const $ = scopeOf(page, opts.scope);
  /* the summary has no step: a bare getAttribute would wait out the whole test for one */
  const review = $('[data-im="review"]');
  const step = (await review.count()) > 0 ? await review.first().getAttribute("data-step") : null;
  if (step === "duplicates") await decideDuplicates(page, opts);
  else if (step === "agents") await answerAgents(page, opts);
  else if (step === "queries") await answerQueries(page, opts);
}

/**
 * Set-up, from the journey question to the fork (onboarding v9): the answer, the acknowledgement
 * and the title, then "Your book". The passage is clicked to finish its typing at once.
 */
export async function walkSetupToFork(page: Page, opts: { journey?: string; title?: string; genre?: string } = {}): Promise<void> {
  const { journey = "A few queries out", title = "The Salt Road", genre = "Thriller" } = opts;
  await page.getByText(journey).first().click({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Continue$/ }).click();
  await page.locator('[data-screen="ack"]').waitFor({ timeout: 20_000 });
  await page.locator('[data-o9="passage"]').click();
  await page.locator("#o9-title").fill(title, { timeout: 20_000 });
  await page.locator('[data-o9="title-card"] [data-act="continue"]').click();
  await page.locator('[data-o9="book-card"].is-in').waitFor({ timeout: 20_000 });
  await page.locator('[data-o9="genre"] button', { hasText: new RegExp(`^\\s*${genre}`) }).first().click();
  await page.locator('[data-o9="book-card"] [data-act="continue"]').click();
  await page.locator('[data-act="upload"]').waitFor({ timeout: 20_000 });
}

/** Bring one card of the deck on show by its key (`a-<agent id>` or `q-<query id>`), using the dots. */
export async function showCard(page: Page, key: string): Promise<Locator> {
  const card = page.locator(`[data-im="deck-card"][data-card="${key}"]`);
  if ((await card.count()) === 0) {
    const dots = page.locator('[data-im="deck-dots"] .o9-dot');
    const n = await dots.count();
    for (let k = 0; k < n && (await card.count()) === 0; k++) await dots.nth(k).click();
  }
  if ((await card.count()) === 0) throw new Error(`the deck has no card ${key}`);
  return card;
}

/**
 * What a review step shows: the deck's cards (each brought on show in turn), then every ready row.
 * `asks` is "1" for a card that still wants an answer.
 */
export async function readStep(page: Page): Promise<{ text: string; chip: string; asks: string }[]> {
  const out: { text: string; chip: string; asks: string }[] = [];
  const dots = page.locator('[data-im="deck-dots"] .o9-dot');
  const n = await dots.count();
  for (let k = 0; k < n; k++) {
    await dots.nth(k).click();
    out.push(await page.locator('[data-im="deck-card"]').evaluate((c) => ({
      text: (c.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 260),
      chip: c.querySelector('[data-im="deck-chip"]')?.textContent?.trim() ?? "",
      asks: c.getAttribute("data-answered") === "1" ? "0" : "1",
    })));
  }
  if (n > 0) await dots.first().click();
  const more = page.locator('[data-im="show-all"]');
  if (await more.count()) await more.click();
  out.push(...await page.evaluate(() => [...document.querySelectorAll('[data-im="ready"] [data-row-id]')].map((r) => ({
    text: (r.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 260),
    /* import review v1: the per-row "Ready" chip is retired (the band says it). A row in the ready
       list is ready, unless the writer chose not to import it, which the row says in its own words. */
    chip: r.getAttribute("data-out") === "1" ? "Won't be imported" : "Ready",
    asks: "0",
  }))));
  return out;
}
/** The number in the step's heading: every live row of the step, asked or ready. */
export const stepTotal = async (page: Page): Promise<number> => Number((await page.locator('[data-im="title-n"]').textContent()) ?? "");
