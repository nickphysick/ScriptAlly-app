/**
 * §1 — one event grammar, on the running page.
 *
 * ⚠️ THE CLAIM IS A COMPARISON BETWEEN EVENT TYPES, so it reads every event on the card at once and
 * compares them to each other. Each type was internally consistent before this section — that is
 * why none of them read as a mistake — and only holding them side by side shows the three type
 * scales and the seven body gaps.
 *
 *   npx playwright test --project=measure qcGrammar
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const readCard = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const evs = [...document.querySelectorAll<HTMLElement>(".tl-ev")];
  return evs.map((e) => {
    const r1s = [...e.querySelectorAll<HTMLElement>(".tl-r1")];
    const body = e.querySelector<HTMLElement>(".tl-body");
    const parts = body ? [...body.children].map((c) => {
      const cs = getComputedStyle(c as HTMLElement);
      return { tag: (c as HTMLElement).className || c.tagName.toLowerCase(), top: cs.marginTop };
    }) : [];
    const ttl = e.querySelector<HTMLElement>(".tl-ttl");
    const meta = e.querySelector<HTMLElement>(".tl-meta");
    /* everything inside the row body that is neither row 1 nor row 2 */
    const rowbody = e.querySelector<HTMLElement>(".tl-rowbody");
    const stray = rowbody ? [...rowbody.children]
      .filter((c) => !(c as HTMLElement).classList.contains("tl-r1") && !(c as HTMLElement).classList.contains("tl-body"))
      .map((c) => (c as HTMLElement).className || c.tagName.toLowerCase()) : [];
    return {
      ghost: e.classList.contains("tl-ev--ghost"),
      minor: e.classList.contains("tl-ev--minor"),
      r1: r1s.length,
      title: ttl ? (ttl.textContent || "").trim().slice(0, 34) : null,
      size: ttl ? getComputedStyle(ttl).fontSize : null,
      family: ttl ? getComputedStyle(ttl).fontFamily.split(",")[0].replace(/"/g, "") : null,
      meta: meta ? (meta.textContent || "").replace(/\s+/g, " ").trim() : null,
      parts, stray,
    };
  });
});

test("§1 — every event is one row of head and one of body", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(500);

  /* walk until a query with several event types is on screen — a single-event query proves nothing */
  let evs = await readCard(page);
  const n = Math.min(await rows.count(), 10);
  for (let i = 0; i < n && evs.length < 3; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(400);
    evs = await readCard(page);
  }
  console.log(`  ${evs.length} events on this card`);
  evs.forEach((e) => console.log(`    ${e.ghost ? "ghost" : e.minor ? "minor" : "event"} "${e.title}" · ${e.family} ${e.size} · meta "${e.meta}" · body ${e.parts.map((p) => p.top).join("/") || "(none)"}${e.stray.length ? ` · STRAY ${e.stray.join(", ")}` : ""}`));
  expect(evs.length, "not enough events on any query to compare the types").toBeGreaterThan(2);

  const real = evs.filter((e) => !e.ghost);

  /* ⚠️ EXACTLY ONE ROW 1 PER EVENT, and a title in it. */
  for (const e of real) {
    expect(e.r1, `"${e.title}" renders ${e.r1} row-1s`).toBe(1);
    expect(e.title, "an event renders no title").toBeTruthy();
    expect(e.family, `"${e.title}" is not in the serif`).toMatch(/Playfair/i);
  }

  /* ⚠️ ONE SIZE FOR EVERY EVENT — asserted across the types rather than against 16px, because the
     claim is that they agree, not that they are any particular number. */
  const sizes = [...new Set(real.map((e) => e.size))];
  expect(sizes, `the events' titles are ${sizes.join(", ")} — not one size`).toHaveLength(1);

  /**
   * ⚠️ THE META SLOT HOLDS A DATE OR A DURATION AND NOTHING ELSE — which is NOT the same as holding
   * no word. "2 YEARS" is a duration and the section permits it in the same sentence that bans
   * prefixes; a literal "contains no word" test would fail the very thing it is protecting. What is
   * banned is a word BEFORE the figure explaining the slot, so the assertion is on how it starts.
   */
  for (const e of real) {
    if (!e.meta) continue;
    expect(e.meta, `the meta slot reads "${e.meta}" — it starts with a word`).toMatch(/^(\d|MON|TUE|WED|THU|FRI|SAT|SUN)/i);
    for (const w of ["SCHEDULED", "SENT ", "DUE ", "ON "]) {
      expect(e.meta.toUpperCase(), `the meta slot carries the prefix "${w.trim()}"`).not.toContain(w);
    }
  }

  /* ⚠️ NOTHING OUTSIDE THE TWO ROWS. */
  for (const e of real) expect(e.stray, `"${e.title}" renders ${e.stray.join(", ")} outside its two rows`).toEqual([]);

  /* ⚠️ ONE GAP BETWEEN BODY PARTS, ACROSS EVENT TYPES — the fault was seven margins, each
     defensible alone. The first part pays none; every later one pays the block's figure. */
  const gaps = real.flatMap((e) => e.parts.slice(1).map((p) => p.top));
  const uniq = [...new Set(gaps)];
  console.log(`  body gaps across all events: ${uniq.join(", ") || "(no multi-part bodies)"}`);
  expect(uniq.length, `the body parts pay ${uniq.join(", ")} — not one gap`).toBeLessThanOrEqual(1);
  for (const e of real) {
    if (e.parts.length) expect(e.parts[0].top, `"${e.title}"'s first body part pays a gap of its own`).toBe("0px");
  }
});
