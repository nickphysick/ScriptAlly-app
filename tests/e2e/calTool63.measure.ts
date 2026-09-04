/**
 * v63 C — the board toolbar: Group, Sort, Status, the row count and Clear all.
 *
 * ⚠️ EVERY CASE DRIVES THE CONTROL AND READS THE BOARD, never the control's own state. A toolbar
 * whose menus open and tick correctly while the rows below never move is exactly the composed-result
 * fault this repo records: the parts each measure right and the whole does nothing. So each case
 * takes a BEFORE reading of the rendered rows, operates the control, and takes an AFTER — and the
 * claim is about the difference.
 *
 * ⚠️ AND EACH ONE ASSERTS ITS POPULATION FIRST. A sweep over a board with no rows reports no
 * disagreement and passes; a fixture where every row is in one state proves only that one state
 * behaves. The distinct values seen are printed with every reading for that reason.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

/** the board as it is drawn: every group's name and the row keys under it, in order */
async function boardNow(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const grid = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0);
    if (!grid) return null;
    const groups = [...grid.querySelectorAll<HTMLElement>(".tl-grp")].map((g) => ({
      label: g.querySelector(".tl-gdiv .gp span:not(.gico)")?.textContent?.trim() ?? "",
      count: Number(g.querySelector(".tl-gdiv .gp b")?.textContent ?? "0"),
      hasDivider: !!g.querySelector(".tl-gdiv"),
      purpose: g.querySelector(".tl-gdiv .geb")?.textContent?.trim() ?? null,
      rows: [...g.querySelectorAll<HTMLElement>(".tl-glanes > *")]
        .map((r) => r.getAttribute("data-rowkey") ?? r.textContent?.trim().slice(0, 40) ?? ""),
    }));
    const cnt = document.querySelector(".tl-tbcnt")?.textContent?.trim() ?? null;
    return {
      groups,
      groupCount: groups.length,
      rows: groups.flatMap((g) => g.rows),
      rowTotal: groups.reduce((n, g) => n + g.rows.length, 0),
      countLine: cnt,
      /* the trigger's words with the chevron dropped — the gap between them is CSS, not text */
      trig: [...document.querySelectorAll<HTMLElement>(".tl-tbtrig")].map((t) =>
        [...t.childNodes].map((n) => (n as HTMLElement).classList?.contains("tl-tbchev")
          ? "" : (n.textContent ?? "")).join(" ").replace(/\s+/g, " ").trim()),
      clearShown: !!document.querySelector(".tl-tbclear"),
    };
  });
}

/** open a toolbar menu by its trigger's accessible name, and return its option labels */
async function openMenu(page: import("@playwright/test").Page, label: string) {
  await page.locator(`.tl-tbtrig[aria-label="${label}"]`).click();
  await expect(page.locator(`.tl-tb .tl-dd[aria-label="${label}"]`)).toBeVisible();
  /* ⚠️ THE NAME SPAN, NOT THE BUTTON. The tick is always laid out and only its opacity moves, so
     a button's `textContent` reads `Urgency✓` — the mark arriving as part of the name. */
  return page.locator(`.tl-dd[aria-label="${label}"] .tl-ddopt .tl-ddname`).allTextContents();
}

test.describe("v63 · C — the toolbar", () => {
  test("⚠️ (c1) it exists, states the row count, and every control names its value", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const b = await boardNow(page);
    expect(b, "no board").not.toBeNull();
    /* ⚠️ THE POPULATION FIRST. Everything below is satisfied by a board with nothing on it. */
    expect(b!.rowTotal, `only ${b!.rowTotal} rows — the fixture cannot exercise this`).toBeGreaterThan(6);

    const bar = await page.evaluate(() => {
      const v = document.querySelector<HTMLElement>(".tl-vtool");
      const rail = document.querySelector<HTMLElement>(".tl-rail");
      const pane = document.querySelector<HTMLElement>(".tl-boardpane");
      if (!v || !rail || !pane) return null;
      const cs = getComputedStyle(v);
      return {
        inPane: pane.contains(v),
        aboveRail: v.getBoundingClientRect().bottom <= rail.getBoundingClientRect().top + 1,
        pad: cs.padding,
        bg: cs.backgroundColor,
        chromeBg: getComputedStyle(document.querySelector(".tl-axis")!).backgroundColor,
        borderB: cs.borderBottomWidth,
        triggers: document.querySelectorAll(".tl-vtool .tl-tbtrig").length,
      };
    });
    expect(bar, "no toolbar").not.toBeNull();
    /* it is the board pane's chrome, not the page's, and it sits above the date bar */
    expect(bar!.inPane, "the toolbar is not inside the board pane").toBe(true);
    expect(bar!.aboveRail, "the toolbar is not above the date bar").toBe(true);
    expect(bar!.pad, "the ref's 8/14 padding").toBe("8px 14px");
    expect(bar!.borderB, "no hairline under the toolbar").toBe("1px");
    /* ⚠️ THE IDENTITY, NOT THE VALUE — the toolbar wears the same chrome as the sidebar pane, which
       survives a retone; pinning `#faf9f7` would go red on a legitimate one. */
    expect(bar!.bg, "the toolbar is not on the chrome ground").toBe(bar!.chromeBg);
    expect(bar!.triggers, "three controls: Group, Sort, Status").toBe(3);

    /* each trigger states its own value, so the row can be read without opening anything */
    expect(b!.trig[0]).toMatch(/^Group Urgency/);
    expect(b!.trig[1]).toMatch(/^Sort Urgency/);
    expect(b!.trig[2]).toMatch(/^Status/);
    /* ⚠️ THE COUNT IS THE DRAWN ROWS AND IT NAMES ITS UNIT. The sidebar's numbers are a census of
       the whole board and this one is what survived the filters; two bare numerals answering two
       questions is how a board states a figure nobody can reconcile. */
    expect(b!.countLine, "no row count").not.toBeNull();
    expect(b!.countLine).toBe(`${b!.rowTotal} ${b!.rowTotal === 1 ? "row" : "rows"}`);
    /* nothing applied, so nothing to clear */
    expect(b!.clearShown, "`Clear all` is offered with nothing applied").toBe(false);
  });

  test("⚠️ (c2) Group changes the GROUP SET, and every grouping's counts sum to the rows drawn", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const before = await boardNow(page);
    expect(before!.rowTotal).toBeGreaterThan(6);

    const opts = await openMenu(page, "Group rows by");
    expect(opts, "the four groupings").toEqual(["Urgency", "Status", "Action required", "No grouping"]);
    await page.keyboard.press("Escape");

    const seen: Record<string, { groups: number; rows: number; labels: string[]; dividers: number }> = {};
    for (const name of ["Status", "Action required", "No grouping", "Urgency"]) {
      await page.locator('.tl-tbtrig[aria-label="Group rows by"]').click();
      await page.locator(`.tl-dd[aria-label="Group rows by"] .tl-ddopt`, { hasText: name }).first().click();
      const b = await boardNow(page);
      seen[name] = {
        groups: b!.groupCount, rows: b!.rowTotal, labels: b!.groups.map((g) => g.label),
        dividers: b!.groups.filter((g) => g.hasDivider).length,
      };
      /* ⚠️ THE COUNTS ON THE DIVIDERS SUM TO THE ROWS ACTUALLY DRAWN — wherever there ARE dividers.
         A pill stating a number nothing under it matches is the two-numbers fault one level down.
         `No grouping` draws none by design, so it has nothing to sum and is checked separately
         below; asserting a sum of zero against 23 rows would be a lock failing on correct work. */
      if (name !== "No grouping") {
        const summed = b!.groups.reduce((n, g) => n + g.count, 0);
        expect(summed, `${name}: pills say ${summed}, ${b!.rowTotal} rows drawn`).toBe(b!.rowTotal);
      }
      /* and the row SET never changes — grouping arranges, it does not filter */
      expect([...b!.rows].sort(), `${name} changed which rows are on the board`)
        .toEqual([...before!.rows].sort());
    }
    console.log("groupings:", JSON.stringify(seen, null, 1));

    /* ⚠️ THE GROUP SETS ARE GENUINELY DIFFERENT — otherwise every case above passes on a control
       that ticks and does nothing, which is exactly the fault this file exists to catch. */
    expect(seen["Status"].labels, "Status grouped the same as Urgency")
      .not.toEqual(seen["Urgency"].labels);
    expect(seen["Action required"].labels, "Action grouped the same as Urgency")
      .not.toEqual(seen["Urgency"].labels);
    /* ⚠️ `No grouping` DRAWS NO DIVIDER AT ALL — one container, no heading. A heading reading
       "everything" over every row on the board states nothing. */
    expect(seen["No grouping"].groups, "`No grouping` still drew groups").toBe(1);
    /* ⚠️ READ FROM THAT GROUPING'S OWN SNAPSHOT, not from the page after the loop. The loop ends on
       `Urgency`, so a live query here counts Urgency's six dividers and reports `No grouping` as
       having drawn them — a true measurement of the wrong moment. */
    expect(seen["No grouping"].dividers, "`No grouping` drew a divider").toBe(0);
    for (const g of ["Urgency", "Status", "Action required"]) {
      expect(seen[g].dividers, `${g} drew no dividers`).toBe(seen[g].groups);
    }
  });

  test("⚠️ (c3) Sort changes the ORDER, Reverse inverts it, and Reset restores the default", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    /* order is only legible with the dividers out of the way — one sequence, not six */
    await page.locator('.tl-tbtrig[aria-label="Group rows by"]').click();
    await page.locator('.tl-dd[aria-label="Group rows by"] .tl-ddopt', { hasText: "No grouping" }).click();

    const base = await boardNow(page);
    expect(base!.rowTotal, "too few rows to order").toBeGreaterThan(6);

    const opts = await openMenu(page, "Sort rows by");
    /* the four keys, then the direction and the reset — which are NOT keys */
    expect(opts.slice(0, 4)).toEqual(["Urgency", "Status", "Queried date", "Most recent activity"]);
    expect(opts, "Reverse order is missing").toContain("Reverse order");
    await page.keyboard.press("Escape");

    const orders: Record<string, string[]> = { Urgency: base!.rows };
    for (const key of ["Status", "Queried date", "Most recent activity"]) {
      await page.locator('.tl-tbtrig[aria-label="Sort rows by"]').click();
      await page.locator('.tl-dd[aria-label="Sort rows by"] .tl-ddopt', { hasText: key }).first().click();
      const b = await boardNow(page);
      orders[key] = b!.rows;
      /* ⚠️ SORTING REORDERS, IT NEVER FILTERS. Same set, different sequence. */
      expect([...b!.rows].sort(), `${key} changed the row set`).toEqual([...base!.rows].sort());
    }
    const sig = new Map<string, string[]>();
    for (const [k, o] of Object.entries(orders)) {
      const h = o.join("|");
      sig.set(h, [...(sig.get(h) ?? []), k]);
    }
    const distinct = new Set(sig.keys());
    /* ⚠️ NAME THE KEYS THAT COINCIDE. `3 of 4` passes the assertion below and still hides which two
       agree — on this fixture that may be honest (two keys can genuinely give one order) or it may
       be a comparator doing nothing. The set is printed so a reader can tell which. */
    console.log("orders seen:", distinct.size, "of", Object.keys(orders).length,
      "| groups:", JSON.stringify([...sig.values()]));
    /* ⚠️ A MONOCULTURE PASSES EVERYTHING ABOVE. If all four keys produce one sequence the control
       is inert and every assertion so far is satisfied — so the distinct count is the real claim. */
    /* ⚠️ FOUR KEYS, FOUR ORDERS — not "more than one". `> 1` passed while `Queried date` and
       `Most recent activity` produced ONE identical sequence, because both were derived from
       `items`, which holds only what falls inside the drawn window: on this fixture nothing did,
       every comparison returned 0, and `Array.sort`'s stability handed back the input order twice.
       Two opposite-direction date sorts agreeing is the tell, and only naming the groups made it
       visible. The strict count is what makes the next inert comparator fail. */
    expect(distinct.size,
      `sort keys sharing an order: ${JSON.stringify([...sig.values()].filter((g) => g.length > 1))}`)
      .toBe(4);

    /* Reverse inverts whatever key is on */
    await page.locator('.tl-tbtrig[aria-label="Sort rows by"]').click();
    await page.locator('.tl-dd[aria-label="Sort rows by"] .tl-ddopt', { hasText: "Reverse order" }).click();
    await page.keyboard.press("Escape");
    const rev = await boardNow(page);
    expect(rev!.rows, "Reverse did not invert the order")
      .toEqual([...orders["Most recent activity"]].reverse());

    /* Reset puts the key AND the direction back — a reset that restores one of two is not a reset */
    await page.locator('.tl-tbtrig[aria-label="Sort rows by"]').click();
    await page.locator('.tl-dd[aria-label="Sort rows by"] .tl-ddlink', { hasText: "Reset sort" }).click();
    const back = await boardNow(page);
    expect(back!.trig[1], "Reset did not restore the key").toMatch(/^Sort Urgency/);
    expect(back!.rows, "Reset did not restore the order").toEqual(orders["Urgency"]);
  });

  test("⚠️ (c4) Status narrows the rows, badges what is ticked, and Clear all restores the board", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const base = await boardNow(page);
    expect(base!.rowTotal).toBeGreaterThan(6);

    const opts = await openMenu(page, "Filter by status");
    /* ⚠️ TEN, IN THE APP'S OWN NAMES — a recorded deviation. The ref lists nine: it shortens
       `Revise & Resubmit` to `R&R` and folds `Rejected` and `Withdrawn` into one `Closed`, which
       makes two distinct statuses unfilterable apart and names a status the data does not carry. */
    expect(opts.length, "the ten canonical statuses").toBe(10);
    expect(opts).toContain("Revise & Resubmit");
    expect(opts).toContain("Rejected");
    expect(opts).toContain("Withdrawn");
    expect(opts).not.toContain("R&R");

    /* tick the first status that actually has rows behind it, so the case is not a monoculture */
    let picked = "";
    for (const st of opts) {
      await page.locator('.tl-dd[aria-label="Filter by status"] .tl-ddopt', { hasText: st }).first().click();
      const b = await boardNow(page);
      if (b!.rowTotal > 0) { picked = st; break; }
      await page.locator('.tl-dd[aria-label="Filter by status"] .tl-ddopt', { hasText: st }).first().click();
    }
    expect(picked, "no status on this fixture has rows — the case proves nothing").not.toBe("");

    const one = await boardNow(page);
    console.log(`status filter: ${picked} → ${one!.rowTotal} of ${base!.rowTotal} rows`);
    /* ⚠️ THE FILTER MUST ACTUALLY NARROW. A filter that ticks and leaves the board alone satisfies
       every other assertion here. */
    expect(one!.rowTotal, `${picked} did not narrow the board`).toBeLessThan(base!.rowTotal);
    expect(one!.rowTotal).toBeGreaterThan(0);
    expect(one!.countLine, "the count did not follow the filter")
      .toBe(`${one!.rowTotal} ${one!.rowTotal === 1 ? "row" : "rows"}`);

    const badge = await page.locator(".tl-tbbadge").textContent();
    expect(badge, "the badge does not count what is ticked").toBe("1");

    /* ⚠️ `Clear all` APPEARS ONLY WITH SOMETHING TO CLEAR, and it restores the board entire */
    await page.keyboard.press("Escape");
    expect(await page.locator(".tl-tbclear").count(), "`Clear all` did not appear").toBe(1);
    await page.locator(".tl-tbclear").click();
    const after = await boardNow(page);
    expect(after!.rows, "Clear all did not restore the board").toEqual(base!.rows);
    expect(after!.clearShown, "`Clear all` stayed after clearing").toBe(false);
    expect(await page.locator(".tl-tbbadge").count(), "the badge survived the clear").toBe(0);
  });

  test("⚠️ (c5) the toolbar and the sidebar answer different questions, and both stay true", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    /* ⚠️ BOTH CENSUSES, AND THE SECOND ONE WAS ADDED BECAUSE A MUTATION AIMED AT THE FIRST LANDED
       ON IT AND NOTHING NOTICED. The sidebar states the board twice — the views' pills and the
       four At-a-glance tiles — and BOTH are counts of the whole board. Watching only the pills
       left the tiles free to follow a toolbar filter, which is the two-numbers fault this case
       exists to forbid, in the half nobody was looking at. */
    const readCensus = () => page.evaluate(() => ({
      views: [...document.querySelectorAll<HTMLElement>(".tl-axis .gpill")].map((p) => ({
        name: p.querySelector("span")?.textContent?.trim() ?? "",
        n: Number(p.querySelector("b")?.textContent ?? "0"),
      })),
      glance: [...document.querySelectorAll<HTMLElement>(".tl-axis .st > div")].map((t) => ({
        name: t.querySelector("small")?.textContent?.trim() ?? "",
        n: Number(t.querySelector("b")?.textContent ?? "0"),
      })),
    }));
    const census = await readCensus();
    expect(census.views.length, "no sidebar views to compare against").toBeGreaterThan(3);
    expect(census.glance.length, "no At-a-glance tiles to compare against").toBeGreaterThan(3);

    const base = await boardNow(page);
    expect(base!.rowTotal).toBeGreaterThan(6);

    /* narrow with the toolbar, then check the sidebar's census is UNMOVED */
    await page.locator('.tl-tbtrig[aria-label="Filter by status"]').click();
    let narrowed = base!.rowTotal;
    for (const st of await page.locator('.tl-dd[aria-label="Filter by status"] .tl-ddopt').allTextContents()) {
      await page.locator('.tl-dd[aria-label="Filter by status"] .tl-ddopt', { hasText: st }).first().click();
      const b = await boardNow(page);
      if (b!.rowTotal > 0 && b!.rowTotal < base!.rowTotal) { narrowed = b!.rowTotal; break; }
      await page.locator('.tl-dd[aria-label="Filter by status"] .tl-ddopt', { hasText: st }).first().click();
    }
    expect(narrowed, "nothing narrowed — the comparison is vacuous").toBeLessThan(base!.rowTotal);
    await page.keyboard.press("Escape");

    const after = await readCensus();
    /* ⚠️ THE SIDEBAR IS A CENSUS OF THE WHOLE BOARD AND THE TOOLBAR'S COUNT IS WHAT IS DRAWN.
       That is why the toolbar names its unit: two numbers that disagree are only legible when each
       says what it is counting. A census that moved with the filter could not be added up. */
    expect(after.views, "the views' census moved with a toolbar filter").toEqual(census.views);
    expect(after.glance, "the At-a-glance census moved with a toolbar filter").toEqual(census.glance);
    const drawn = (await boardNow(page))!.countLine;
    console.log("census:", JSON.stringify(census.views),
      "| glance:", JSON.stringify(census.glance), "| drawn:", drawn);
    expect(drawn).toBe(`${narrowed} ${narrowed === 1 ? "row" : "rows"}`);
  });
});
