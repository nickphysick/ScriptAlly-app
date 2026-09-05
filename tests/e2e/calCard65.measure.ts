/**
 * CALENDAR v65 §C — the click card (ref hover-card-by-type.html; pack §C for the trigger and the
 * band's two controls, which the pack adds over the ref's hover-only sketch).
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

test("⚠️ (§C) one card at a time; same-bar toggles; Esc, elsewhere and scroll close it", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const bars = page.locator(".tl-cal .tl-p[data-seg]");
  expect(await bars.count(), "no bars").toBeGreaterThan(5);
  const b1 = bars.nth(0), b2 = bars.nth(3);
  await b1.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(200);
  expect(await page.locator("body > .tl-cc").count(), "no card on click").toBe(1);
  /* another bar: still ONE card, now the other's */
  const nm1 = await page.locator(".tl-cc .tl-ccnm").textContent();
  await b2.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(200);
  expect(await page.locator("body > .tl-cc").count(), "two cards").toBe(1);
  const nm2 = await page.locator(".tl-cc .tl-ccnm").textContent();
  expect(nm2, "the card did not follow the second click").not.toBe(nm1);
  /* same bar toggles */
  await b2.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(150);
  expect(await page.locator("body > .tl-cc").count(), "same-bar click did not close").toBe(0);
  /* Esc closes */
  await b1.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(150);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  expect(await page.locator("body > .tl-cc").count(), "Escape did not close").toBe(0);
  /* elsewhere closes */
  await b1.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(150);
  await page.mouse.click(200, 780);
  await page.waitForTimeout(120);
  expect(await page.locator("body > .tl-cc").count(), "a click elsewhere did not close").toBe(0);
  /* scroll closes */
  await b1.evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    g.querySelector(".tl-rows")!.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(120);
  expect(await page.locator("body > .tl-cc").count(), "a scroll did not close").toBe(0);
});

test("⚠️ (§C) the card stacks above the group bars and the today line, and is wholly visible on a last row", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  /* the LAST visible bar on the board — its card must flip up and stay whole */
  const info = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const bars = [...g.querySelectorAll<HTMLElement>(".tl-p[data-seg]")]
      .filter((b) => { const r = b.getBoundingClientRect(); return r.height > 1 && r.top > 0 && r.bottom < innerHeight; });
    const last = bars[bars.length - 1];
    (last as HTMLElement).click();
    return { seg: last.dataset.seg, barTop: last.getBoundingClientRect().top };
  });
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const cc = document.querySelector<HTMLElement>("body > .tl-cc")!;
    const b = cc.getBoundingClientRect();
    /* stacking: the centre of the card's band hit-tests to the CARD, not to a group bar or line */
    const top = document.elementsFromPoint(b.left + b.width / 2, b.top + 10)[0] as HTMLElement;
    return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), vh: innerHeight,
      z: getComputedStyle(cc).zIndex,
      hit: cc.contains(top) ? "card" : String(top?.className).slice(0, 30) };
  });
  expect(r.hit, "something paints over the card").toBe("card");
  expect(Number(r.z)).toBeGreaterThan(25);
  expect(r.top, "the card starts above the viewport").toBeGreaterThanOrEqual(0);
  expect(r.bottom, `the card runs past the viewport (${r.bottom} of ${r.vh})`).toBeLessThanOrEqual(r.vh);
});

test("⚠️ (§C) gauge ends and counters hold the by-type table on the fixture, per branch", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const seen = await page.evaluate(async () => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const bars = [...g.querySelectorAll<HTMLElement>(".tl-p[data-seg]")].filter((b) => b.getBoundingClientRect().height > 1);
    const out: Record<string, { labels: string[]; counters: string[]; today: boolean; tone: string }> = {};
    for (const b of bars) {
      b.click();
      await new Promise((res) => setTimeout(res, 120));
      const cc = document.querySelector<HTMLElement>("body > .tl-cc");
      if (!cc) continue;
      const gauge = cc.querySelector<HTMLElement>(".tl-ccgauge")!;
      const counters = [...cc.querySelectorAll(".tl-ccmeta small")].map((s) => s.textContent ?? "");
      const key = counters[0] + "|" + (gauge.dataset.tone ?? "");
      out[key] = {
        labels: [...gauge.querySelectorAll(".lab")].map((l) => l.textContent ?? ""),
        counters, today: !!gauge.querySelector("b"), tone: gauge.dataset.tone ?? "",
      };
      b.click();
      await new Promise((res) => setTimeout(res, 60));
    }
    return out;
  });
  const kinds = Object.values(seen);
  console.log(`card branches seen: ${Object.keys(seen).length}`);
  for (const [k, v] of Object.entries(seen)) console.log(`  ${k}: labs=${JSON.stringify(v.labels)} counters=${JSON.stringify(v.counters)} today=${v.today}`);
  /* ⚠️ THE MONOCULTURE GUARD: at least three distinct kinds must have been exercised */
  expect(kinds.length, "the fixture exercised too few card kinds").toBeGreaterThanOrEqual(3);
  for (const v of kinds) {
    expect(v.counters.length, "a card lost a counter cell").toBe(3);
    /* counter one is the eyebrow's number-kind: its label belongs to the by-type table */
    expect(v.counters[0]).toMatch(/days (waiting|overdue|since request|quiet|left|to decide|in stage|total)/);
    /* the gauge's two labels exist; a live kind carries a today marker */
    expect(v.labels.length).toBe(2);
    expect(v.labels[0]).toMatch(/^(sent|requested|offered|created)\s/);
  }
  /* the silence tone is sand where a quiet branch was seen; rose never paints a silence */
  const quiet = Object.entries(seen).find(([k]) => k.startsWith("days quiet"));
  if (quiet) expect(quiet[1].tone).toBe("sand");
});

test("⚠️ (§C) a bar's ACTION button never opens the card — the sheet path is direct", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const seg = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const a = [...g.querySelectorAll<HTMLElement>(".tl-act[data-for]")].find((x) => x.querySelector(".tl-actbtn"));
    return a?.dataset.for ?? null;
  });
  expect(seg, "no action to press").not.toBeNull();
  const bar = page.locator(`.tl-p[data-seg="${seg}"]`);
  const b = (await bar.boundingBox())!;
  await page.mouse.move(b.x + Math.min(60, b.width / 2), b.y + b.height / 2);
  await page.waitForTimeout(250);
  await page.locator(`.tl-act[data-for="${seg}"] .tl-actbtn`).evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(200);
  expect(await page.locator("body > .tl-cc").count(), "the action press opened the card").toBe(0);
});
