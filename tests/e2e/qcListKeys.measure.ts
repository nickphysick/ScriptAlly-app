/**
 * §4 — the list as a composite widget, driven on the running page.
 *
 * ⚠️ THE PACK NAMES THIS EXPLICITLY: jsdom cannot verify the scrolling, so the decisions are unit
 * tests (`src/lib/listKeyboard.test.ts`) and THESE are the browser's. What only a browser can say:
 * whether Tab really enters and leaves at one stop, whether Down from a group's last row reaches
 * the next group's first, whether the focused row is ever hidden under a sticky heading, and
 * whether a clicked row draws a ring while a keyboard-focused one does.
 *
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcListKeys
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const state = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  const m = (q: string) => { try { return !!a?.matches(q); } catch { return false; } };
  const rows = [...document.querySelectorAll(".f12-row")] as HTMLElement[];
  const scroller = document.querySelector(".f12-rows") as HTMLElement;
  const sc = scroller.getBoundingClientRect();
  const r = a?.classList.contains("f12-row") ? a.getBoundingClientRect() : null;
  return {
    activeIsRow: !!a?.classList.contains("f12-row"),
    activeId: a?.id ?? "",
    activeName: (a?.querySelector(".f12-nm") ?? a)?.textContent?.trim().slice(0, 24) ?? "",
    focusVisible: m(":focus-visible"),
    outline: a ? getComputedStyle(a).outlineStyle : "—",
    selectedId: (document.querySelector(".f12-row.f12-sel") as HTMLElement | null)?.id ?? "",
    /* ⚠️ IS THE FOCUSED ROW ACTUALLY IN THE SCROLLER'S BOX? The sticky-heading clause is about
       exactly this, and a rect outside the viewport is not a measurement (the house rule). */
    inView: r ? r.top >= sc.top - 0.5 && r.bottom <= sc.bottom + 0.5 : null,
    /* what covers the focused row's top-left corner — a sticky heading would be here */
    coveringTop: r ? (document.elementsFromPoint(r.left + 12, r.top + 3)[0] as HTMLElement | undefined)?.className ?? "" : "",
    tabStops: rows.filter((e) => e.tabIndex === 0).length,
    rowCount: rows.length,
    groupNames: [...document.querySelectorAll('.f12-rows [role="group"]')].map((g) => g.getAttribute("aria-label")),
    listName: (document.querySelector(".f12-rows") as HTMLElement).getAttribute("aria-label"),
    stickyHeads: [...document.querySelectorAll(".qc-gh")].filter((h) => getComputedStyle(h as HTMLElement).position === "sticky").length,
  };
});

test("§4b/§4c — one tab stop, arrows cross groups, selection follows focus", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.waitForTimeout(200);

  const s0 = await state(page);
  console.log(`rows=${s0.rowCount} tabStops=${s0.tabStops} list="${s0.listName}" groups=${JSON.stringify(s0.groupNames)} stickyHeads=${s0.stickyHeads}`);
  /* ⚠️ ROLES FIRST — the widget must be a widget before its keys mean anything */
  expect(s0.tabStops, `${s0.tabStops} rows are tabbable; a roving tabindex has exactly one`).toBe(1);
  expect(s0.listName, "the list has no accessible name").toBeTruthy();
  expect(s0.groupNames.length, "the groups are not groups").toBeGreaterThan(0);
  for (const n of s0.groupNames) expect(n, "a group has no accessible name").toBeTruthy();

  /* ── the group boundary (§4b) ─────────────────────────────────────────────────────────────
     ⚠️ DRIVEN, NOT ASSUMED: walk Down through the whole list and record which group each landing
     is in. A boundary crossing is two consecutive landings in different groups; a heading that
     stopped focus would show up as a landing that is not a row. */
  /* ⚠️ ENGAGE THE HEADER FIRST. The plate collapses on the first pointerdown in the content area,
     which shifts everything up by ~76px between pointerdown and pointerup — so the first click of a
     visit is measured against a page that has already moved. Two clicks, then measure. */
  await page.locator(".f12-row").first().click();
  await page.waitForTimeout(250);
  await page.locator(".f12-row").first().click();
  await page.waitForTimeout(250);
  console.log("after click: " + JSON.stringify(await page.evaluate(() => {
    const a = document.activeElement as HTMLElement;
    const rows = [...document.querySelectorAll(".f12-row")] as HTMLElement[];
    return { activeId: a?.id, idx: rows.indexOf(a), group: a?.closest('[role="group"]')?.getAttribute("aria-label"),
             sel: (document.querySelector(".f12-row.f12-sel") as HTMLElement | null)?.id,
             first: rows[0]?.id, firstGroup: rows[0]?.closest('[role="group"]')?.getAttribute("aria-label") };
  })));
  const walk: { id: string; group: string | null; sel: string }[] = [];
  for (let i = 0; i < Math.min(s0.rowCount + 2, 24); i++) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(60);
    walk.push(await page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      return {
        id: a?.id ?? "(not a row)",
        group: a?.closest('[role="group"]')?.getAttribute("aria-label") ?? null,
        sel: (document.querySelector(".f12-row.f12-sel") as HTMLElement | null)?.id ?? "",
      };
    }));
  }
  const groups = walk.map((w) => w.group);
  const crossings = groups.filter((g, i) => i > 0 && g !== groups[i - 1]).length;
  console.log(`walk: ${[...new Set(groups)].join(" → ")} · crossings=${crossings}`);
  console.log(walk.slice(0, 8).map((w, i) => `  ${i}: ${w.id} [${w.group}] sel=${w.sel}`).join("\n"));
  expect(walk.every((w) => w.id.startsWith("query-row-")), "focus landed on something that is not a row — a heading is a stop")
    .toBe(true);
  expect(crossings, "Down never crossed a group boundary — §4b is unexercised or broken").toBeGreaterThan(0);
  /* ⚠️ SELECTION FOLLOWS FOCUS — asserted on EVERY landing, not just the last */
  expect(walk.every((w) => w.sel === w.id), "the pane did not follow focus on every step").toBe(true);

  /* ── the focused row is never hidden ─────────────────────────────────────────────────────── */
  const s1 = await state(page);
  console.log(`after walk: inView=${s1.inView} coveringTop="${s1.coveringTop}"`);
  expect(s1.inView, "the focused row is outside the scroller's box").toBe(true);
  expect(s1.coveringTop, `something covers the focused row's top: ${s1.coveringTop}`).toContain("f12-row");

  /* ── Home / End reach the ends of the filtered list ──────────────────────────────────────── */
  await page.keyboard.press("End");
  await page.waitForTimeout(120);
  const end = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".f12-row")] as HTMLElement[];
    return { at: rows.indexOf(document.activeElement as HTMLElement), n: rows.length };
  });
  expect(end.at, "End did not reach the last row").toBe(end.n - 1);
  await page.keyboard.press("Home");
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => [...document.querySelectorAll(".f12-row")].indexOf(document.activeElement as Element)), "Home did not reach the first row").toBe(0);

  /* ── PageDown moves further than one row ─────────────────────────────────────────────────── */
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(120);
  const paged = await page.evaluate(() => [...document.querySelectorAll(".f12-row")].indexOf(document.activeElement as Element));
  console.log(`PageDown from 0 → ${paged}`);
  expect(paged, "PageDown moved one row or none — it is meant to move by a viewport").toBeGreaterThan(1);

  /* ── type-ahead ──────────────────────────────────────────────────────────────────────────── */
  /* ⚠️ THE LETTER IS CHOSEN FROM THE DATA, and from a name that is NOT the first row's — otherwise
     "it jumped" and "it did not move" are the same reading. Skipped with a stated reason when the
     account holds no such name, rather than passing on a letter that proves nothing. */
  const names = await page.evaluate(() => [...document.querySelectorAll(".f12-row")]
    .map((r) => (r.querySelector(".f12-nm")?.textContent ?? "").trim()));
  const target = names.findIndex((n, i) => i > 0 && n && n[0].toLowerCase() !== (names[0][0] ?? "").toLowerCase());
  console.log(`names: ${names.slice(0, 6).join(" | ")}…`);
  if (target < 0) {
    console.log("⚠️ every row's agent shares a first letter — type-ahead is unexercised on this account");
  } else {
    const letter = names[target][0].toLowerCase();
    await page.keyboard.press("Home");
    await page.waitForTimeout(120);
    await page.keyboard.press(letter);
    await page.waitForTimeout(180);
    const jumped = await page.evaluate(() => [...document.querySelectorAll(".f12-row")].indexOf(document.activeElement as Element));
    console.log(`type "${letter}" from 0 → ${jumped} (first match is ${target})`);
    expect(jumped, `type-ahead did not reach the first "${letter}" row`).toBe(target);
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).classList.contains("f12-row")), "type-ahead moved focus out of the list").toBe(true);
    /* ⚠️ AND IT SELECTS WHAT IT FINDS — type-ahead is navigation, so selection follows it too */
    expect(await page.evaluate(() => (document.querySelector(".f12-row.f12-sel") as HTMLElement)?.id === document.activeElement?.id),
      "the pane did not follow a type-ahead jump").toBe(true);
  }

  /* ── §4a — the ring belongs to the keyboard ──────────────────────────────────────────────── */
  const kbd = await state(page);
  expect(kbd.focusVisible, "a keyboard-focused row draws NO ring").toBe(true);
  expect(kbd.outline, "the keyboard ring is not drawn").not.toBe("none");
  await page.locator(".f12-row").nth(3).click();
  await page.waitForTimeout(150);
  const clicked = await state(page);
  console.log(`ring: keyboard fv=${kbd.focusVisible}/${kbd.outline} · clicked fv=${clicked.focusVisible}/${clicked.outline}`);
  expect(clicked.focusVisible, "a clicked row draws a ring — the lingering-ring fault").toBe(false);
  expect(clicked.outline, "a clicked row draws an outline").toBe("none");

  /* ── one tab stop: Tab leaves the list rather than walking it ────────────────────────────── */
  await page.keyboard.press("Tab");
  await page.waitForTimeout(120);
  const afterTab = await page.evaluate(() => (document.activeElement as HTMLElement)?.classList.contains("f12-row"));
  expect(afterTab, "Tab moved to another row — the list is a trap").toBe(false);
});

/**
 * ⚠️ FOCUS AFTER THE LIST CHANGES UNDER IT — driven through the real Filter popover rather than by
 * setting state, because the clause is about what happens to a writer part-way down a list when
 * they narrow it. The decision is unit-locked (`nearestSurvivor`); this proves it is wired.
 */
test("§4c — filtering leaves focus on a surviving row, not the top and not <body>", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click();
  await page.waitForTimeout(250);
  await page.locator(".f12-row").first().click();
  await page.waitForTimeout(250);

  /* walk a good way down so the top is a visibly wrong answer */
  for (let i = 0; i < 8; i++) { await page.keyboard.press("ArrowDown"); await page.waitForTimeout(45); }
  const before = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".f12-row")] as HTMLElement[];
    return { id: (document.activeElement as HTMLElement).id, at: rows.indexOf(document.activeElement as HTMLElement), n: rows.length };
  });
  console.log(`before filtering: row ${before.at} of ${before.n} (${before.id})`);
  expect(before.at, "the walk did not get far enough down for this case to mean anything").toBeGreaterThan(3);

  /* ⚠️ NARROWED THROUGH THE SEARCH FIELD, because it is the one narrowing this account's data can
     be relied on to produce. The Filter popover's options depend on which statuses exist; a run
     that clicks one and happens to remove nothing reports green about an unexercised case — which
     is exactly what the first attempt did, and said so. The code path is the same: `visibleIds`
     changes under the roving row. */
  const keep = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".f12-row")] as HTMLElement[];
    const names = rows.map((r) => (r.querySelector(".f12-nm")?.textContent ?? "").trim());
    /* a fragment from a row ABOVE the focused one, so the focused row is the one removed */
    return names[0]?.slice(0, 4) ?? "";
  });
  await page.locator('input[aria-label="Search queries"]').fill(keep);
  await page.waitForTimeout(400);

  const after = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".f12-row")] as HTMLElement[];
    const a = document.activeElement as HTMLElement;
    return {
      n: rows.length, activeId: a?.id ?? "", activeIsRow: !!a?.classList.contains("f12-row"),
      activeTag: a?.tagName ?? "", at: rows.indexOf(a),
      roving: rows.filter((r) => r.tabIndex === 0).map((r) => r.id),
      sel: (document.querySelector(".f12-row.f12-sel") as HTMLElement | null)?.id ?? "",
    };
  });
  console.log(`after filtering: ${after.n} rows · active=${after.activeTag}#${after.activeId} at ${after.at} · roving=${after.roving.join(",")} · sel=${after.sel}`);

  if (after.n === before.n) {
    console.log("⚠️ THE FILTER DID NOT NARROW THE LIST — this case is unexercised on this account");
    return;
  }
  /* ⚠️ THE ROVING IS THE CLAIM, NOT `document.activeElement`. Dismissing the popover legitimately
     returns focus to its trigger; what must not happen is the list forgetting where the writer
     was, which is what the roving row records. */
  expect(after.roving, "no row is reachable — the next Tab would restart at the page's first control").toHaveLength(1);
  expect(after.roving[0], "the roving row is not in the surviving list").toBeTruthy();
  expect(after.sel, "the pane is reading a query the list no longer shows").toBe(after.roving[0]);
  /* ⚠️ FOCUS ITSELF STAYS WITH THE SEARCH FIELD HERE, AND THAT IS CORRECT — the writer is still
     typing in it, and the guard exists precisely so the cursor is not pulled out of the control
     that caused the change.
     ⚠️ THE OTHER BRANCH — focus IN the list when its rows change, where the effect moves focus to
     the survivor rather than letting it fall to `<body>` — is NOT exercised here and is not
     pretended to be: it needs a row to disappear while a row holds focus, which on this account
     means a deletion. The decision is unit-locked (`nearestSurvivor`); the wiring above proves the
     roving and the selection follow. Stated rather than left as a silent gap. */
  expect(after.activeTag, "focus was pulled out of the field the writer is typing in").toBe("INPUT");
});
