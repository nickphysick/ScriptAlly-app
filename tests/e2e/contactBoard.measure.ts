/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BOARD'S CARD AND COLUMN GEOMETRY (design authority: contact-list-v5.html).
 *
 * ⚠️ EVERY CLAIM HERE IS MEASURED BECAUSE NONE OF THEM CAN BE READ. The board's column accents
 * were asserted by a source lock that required `columnAccent` to return the string
 * `"var(--state-you-deep)"` — and it did, and passed, while the token resolved to nothing on this
 * page and all nine columns painted one ink hairline. A source lock proves the value was WRITTEN;
 * only a browser says what it resolved to. Same for the flag: `querySelector(".fl")` finding an
 * element proves it is mounted, not that it has a box.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";

const KILL_MOTION = `*, *::before, *::after { transition: none !important; animation: none !important; }`;

async function openBoard(page: import("@playwright/test").Page, width: number) {
  await assertLocalBundleIsDev();
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator('[data-lab-view="cast"]').click();
  await page.addStyleTag({ content: KILL_MOTION });
  await expect(page.locator('[data-agent-card="fx-long"]')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

test.describe("the board card carries the ref's anatomy", () => {
  test("name, agency, chips, and a flag with a box beside the city", async ({ page }) => {
    await openBoard(page, 1440);

    const read = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".agl-bcard")] as HTMLElement[];
      const withFlag = cards.filter((c) => c.querySelector(".fl"));
      const flagBoxes = withFlag.map((c) => {
        const r = (c.querySelector(".fl") as HTMLElement).getBoundingClientRect();
        return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      });
      const first = withFlag[0];
      return {
        cards: cards.length,
        withFlag: withFlag.length,
        withChip: cards.filter((c) => c.querySelector(".agl-chip")).length,
        flagBoxes: [...new Set(flagBoxes.map((b) => `${b.w}x${b.h}`))],
        name: first?.querySelector("b")?.textContent ?? "",
        agency: first?.querySelector("i")?.textContent ?? "",
        meta: (first?.querySelector(".agl-metaline")?.textContent ?? "").trim(),
        chips: [...(first?.querySelectorAll(".agl-chip") ?? [])].map((c) => c.textContent),
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[bcard] ${read.cards} cards · flags ${read.withFlag} ${read.flagBoxes.join("/")} · chips ${read.withChip} · "${read.name}" / "${read.agency}" / ${read.chips.join(",")} / "${read.meta}"`);

    /* population first — a board of one card proves nothing about what a card carries */
    expect(read.cards, "the board rendered nothing").toBeGreaterThan(3);
    expect(read.withFlag, "no card renders a flag").toBeGreaterThan(0);
    expect(read.withChip, "no card renders a genre chip").toBeGreaterThan(0);

    expect(read.name, "the card lost the agent's name").not.toBe("");
    expect(read.agency, "the card lost the agency").not.toBe("");
    expect(read.chips.length, "the card shows more than the ref's first two genres").toBeLessThanOrEqual(2);
    expect(read.chips.length).toBeGreaterThan(0);

    /* ⚠️ THE CITY IS IN THE META LINE BESIDE THE WINDOW — the ref's row is flag · city · ~N wks */
    expect(read.meta, "the meta line lost the city").toMatch(/[A-Za-z]/);
    expect(read.meta, "the meta line lost the stated window").toMatch(/~\d+\s*wks/i);

    /* ⚠️ THE FLAG HAS A BOX, AND IT IS THE LOCKED ONE. An element that exists with no size is the
       failure a `querySelector` check cannot see; and one national flag at three sizes across
       three views is the drift the locked 14×10 exists to stop. */
    expect(read.flagBoxes, "the board's flag is not the locked 14×10 — it is falling back to flag-icons' own box").toEqual(["14x10"]);
  });
});

test.describe("the columns are fixed, not fluid", () => {
  /* ⚠️ MEASURED AT TWO WIDTHS, because "246px" at one viewport is satisfied by a fluid column
     that happens to compute to 246 there. Two readings is what makes it a fixed value. */
  for (const width of [1280, 1920]) {
    test(`at ${width}px — 246px columns, a 26px gap, and the board scrolls`, async ({ page }) => {
      await openBoard(page, width);
      const read = await page.evaluate(() => {
        const cols = [...document.querySelectorAll(".agl-col")] as HTMLElement[];
        const board = document.querySelector(".agl-board") as HTMLElement;
        const wrap = document.querySelector(".agl-boardwrap") as HTMLElement;
        return {
          n: cols.length,
          widths: [...new Set(cols.map((c) => Math.round(c.getBoundingClientRect().width)))],
          flex: cols[0] ? getComputedStyle(cols[0]).flexGrow : null,
          gap: board ? getComputedStyle(board).columnGap : null,
          overflowX: wrap ? getComputedStyle(wrap).overflowX : null,
          scrollW: board?.scrollWidth ?? 0,
          clientW: wrap?.clientWidth ?? 0,
        };
      });
      // eslint-disable-next-line no-console
      console.log(`[cols ${width}] n=${read.n} widths=${read.widths.join("/")} grow=${read.flex} gap=${read.gap} scroll=${read.scrollW}/${read.clientW}`);

      expect(read.n, "the board has no columns").toBeGreaterThan(2);
      expect(read.widths, "the columns are not all the ref's fixed 246px").toEqual([246]);
      expect(read.flex, "a column grows — the board is filling its container rather than scrolling").toBe("0");
      expect(read.gap).toBe("26px");
      expect(read.overflowX, "the board does not scroll horizontally").toBe("auto");
      expect(read.scrollW, "the board fits its wrapper, so nothing is being proved about scrolling").toBeGreaterThan(read.clientW);
    });
  }
});

test.describe("the column underline carries the group's accent", () => {
  test("two different status columns paint two different colours", async ({ page }) => {
    await openBoard(page, 1440);
    const read = await page.evaluate(() => {
      const cols = [...document.querySelectorAll(".agl-col")] as HTMLElement[];
      return cols.map((c) => {
        const h = c.querySelector(".agl-bhead") as HTMLElement;
        const cs = getComputedStyle(h);
        return { key: (c.querySelector(".agl-btitle")?.textContent ?? "").trim(), colour: cs.borderBottomColor, width: cs.borderBottomWidth };
      });
    });
    // eslint-disable-next-line no-console
    console.log(`[underlines] ${read.map((r) => `${r.key}=${r.colour}`).join(" · ")}`);

    /* ⚠️ THE POPULATION FIRST. "Two columns differ" is vacuously satisfiable by a board with one
       column, or none — which is exactly the shape a broken grouping would produce. */
    expect(read.length, "fewer than two columns — the claim below has no subject").toBeGreaterThan(1);
    for (const r of read) expect(r.colour, `${r.key} has no underline colour at all`).not.toBe("");

    const distinct = new Set(read.map((r) => r.colour));
    expect(
      distinct.size,
      "every column painted the SAME underline — the accent is not reaching the rule. A var() that resolves to nothing is dropped, and the border falls back to currentColor, which looks like a design choice.",
    ).toBeGreaterThan(1);

    /* the two ends of the journey are the clearest pair, and they must not agree */
    const closed = read.find((r) => r.key === "Closed");
    const withYou = read.find((r) => /Requested|Resubmit/.test(r.key));
    expect(closed, "no Closed column").toBeTruthy();
    expect(withYou, "no with-you column").toBeTruthy();
    expect(closed!.colour, "the closed column and a with-you column paint the same accent").not.toBe(withYou!.colour);

    /* and it is a rule rather than a hairline — Chromium reports the USED width, so the ref's
       2.5px arrives as 2px; the claim is that it is thicker than a default border */
    expect(parseFloat(read[0].width)).toBeGreaterThanOrEqual(2);
  });
});
