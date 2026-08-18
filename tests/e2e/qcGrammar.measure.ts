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

/**
 * §2 — the manuscript is body content, not a headline.
 *
 * ⚠️ MEASURED AS A COMPARISON, NOT AGAINST 15px. The rule is that the body may not outweigh the
 * event it sits inside; a pixel assertion would pass the day both numbers moved together in the
 * wrong direction, which is the failure the derived token exists to prevent.
 */
test("§2 — the manuscript sits under its event, not over it", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(500);

  const g = await page.evaluate(() => {
    const ms = document.querySelector<HTMLElement>(".qc-mname--ms");
    const ev = ms?.closest(".tl-ev")?.querySelector<HTMLElement>(".tl-ttl") ?? null;
    const icon = document.querySelector<HTMLElement>(".qc-sentbk");
    const line = document.querySelector<HTMLElement>(".qc-sentms");
    return {
      ms: ms ? { size: getComputedStyle(ms).fontSize, text: (ms.textContent || "").trim(), tag: ms.tagName } : null,
      ev: ev ? { size: getComputedStyle(ev).fontSize, text: (ev.textContent || "").trim() } : null,
      icon: icon ? { stroke: getComputedStyle(icon).stroke, w: Math.round(icon.getBoundingClientRect().width) } : null,
      /* the icon and the name on one optical line — an SVG has no baseline, so this row centres */
      align: line ? getComputedStyle(line).alignItems : null,
      meta: document.querySelectorAll(".qc-msec").length,
      sentText: (document.querySelector(".qc-sentmat")?.textContent || "").replace(/\s+/g, " ").trim(),
    };
  });
  console.log(`  event "${g.ev?.text}" ${g.ev?.size} · manuscript "${g.ms?.text}" ${g.ms?.size} (${g.ms?.tag}) · icon ${g.icon?.w}px ${g.icon?.stroke} · align ${g.align}`);
  console.log(`  send event reads: "${g.sentText.slice(0, 120)}"`);

  expect(g.ms, "no manuscript on this send").not.toBeNull();
  expect(g.ev, "the manuscript is not inside an event").not.toBeNull();
  expect(parseFloat(g.ms!.size), `the manuscript (${g.ms!.size}) is not smaller than its event title (${g.ev!.size})`)
    .toBeLessThan(parseFloat(g.ev!.size));

  /* ⚠️ IT IS STILL THE LINK — a button, reachable by keyboard, which is what a `span` would lose. */
  expect(g.ms!.tag, "the manuscript stopped being the card's one navigation").toBe("BUTTON");

  expect(g.icon, "the manuscript has no mark").not.toBeNull();
  expect(g.icon!.stroke, "the mark is not burgundy").toBe("rgb(124, 58, 42)");
  expect(g.align, "the icon is baselined against text — an SVG has no baseline and will sit low").toBe("center");

  /* ⚠️ GENRE AND WORD COUNT ARE GONE FROM THE EVENT — asserted on the rendered text, not the class,
     since the fault would be the words appearing however they were marked up. */
  expect(g.meta, "the retired meta line is rendering").toBe(0);
  expect(g.sentText, "a word count is still in the send event").not.toMatch(/[\d,]+ words/);
});
