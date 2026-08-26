import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 3 — the board is grouped, and the counts are the rows.
 *
 * ⚠️ THE COUNT CLAIM IS ASSERTED AGAINST RENDERED ROWS, NOT AGAINST A DERIVATION. "Filters apply
 * before grouping, so counts always match what is on screen" is a claim about the COMPOSITION of
 * two passes; checking the derivation would measure one of them twice. The probe counts the rows
 * the browser drew between one header and the next.
 */
const board = `(() => {
  const all = [...document.querySelectorAll(".tl")];
  const tl = all.find((e) => e.getBoundingClientRect().height > 0);
  const kids = [...tl.children].filter((e) => e.getBoundingClientRect().height > 0);
  const out = []; let cur = null;
  for (const el of kids) {
    if (el.classList.contains("tl-ghead")) {
      cur = {
        name: (el.querySelector(".tl-ghname") || {}).textContent || "",
        stated: Number((el.querySelector(".tl-ghn") || {}).textContent || "-1"),
        open: (el.querySelector(".tl-ghbtn") || {}).getAttribute("aria-expanded") === "true",
        drawn: 0,
      };
      out.push(cur);
    } else if (el.classList.contains("tl-row") && !el.classList.contains("tl-head")) {
      if (el.classList.contains("tl-row--pin")) continue;
      if (cur) cur.drawn += 1; else out.push({ name: "(before any header)", stated: -1, open: true, drawn: 1 });
    }
  }
  return { groups: out, pinned: tl.querySelectorAll(".tl-row--pin").length,
           headers: tl.querySelectorAll(".tl-ghead").length };
})()`;

test("Phase 3 — groups, counts, and the collapsed one", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);

  const r = await page.evaluate<any>(board);
  for (const g of r.groups) console.log(`  ${g.name.padEnd(16)} stated ${g.stated} · drawn ${g.drawn} · open ${g.open}`);
  console.log(`  ${r.headers} headers · ${r.pinned} pinned row(s)`);

  /* ⚠️ THE POPULATION FIRST — a board with no groups satisfies every clause below by vacancy. */
  expect(r.headers, "no group headers at all — nothing was measured").toBeGreaterThan(0);

  const ORDER = ["Offers", "Needs you now", "Needs you soon", "Watching brief", "Snoozed", "Recently closed"];
  const seen = r.groups.map((g: any) => g.name);
  expect(seen, "a header appeared that is not one of the six").toEqual(seen.filter((n: string) => ORDER.includes(n)));
  /* ⚠️ THE SEQUENCE, NOT THE SET — offers first is a rule about position, and a set comparison
     would pass with them last. */
  expect(seen, "the groups are out of order").toEqual(ORDER.filter((n) => seen.includes(n)));

  for (const g of r.groups) {
    expect(g.stated, `${g.name}: an empty group was drawn — a header for nothing`).toBeGreaterThan(0);
    if (g.open) {
      expect(g.drawn, `${g.name}: the header says ${g.stated} and the board drew ${g.drawn}`).toBe(g.stated);
    } else {
      expect(g.drawn, `${g.name}: collapsed, but ${g.drawn} rows are on screen`).toBe(0);
    }
  }

  /* ⚠️ SNOOZED IS SHUT AT REST AND EVERY OTHER GROUP IS OPEN. A quiet group is honest; a group
     that disappears is not, which is what a snoozed row does on the ungrouped board. */
  for (const g of r.groups) {
    if (g.name === "Snoozed") expect(g.open, "Snoozed is open at rest").toBe(false);
    else expect(g.open, `${g.name} is collapsed at rest`).toBe(true);
  }

  const snoozed = r.groups.find((g: any) => g.name === "Snoozed");
  if (snoozed) {
    await page.getByRole("button", { name: /Snoozed/ }).click();
    await page.waitForTimeout(320);
    const after = await page.evaluate<any>(board);
    const s2 = after.groups.find((g: any) => g.name === "Snoozed");
    console.log(`  Snoozed expanded · drawn ${s2.drawn} of ${s2.stated}`);
    expect(s2.open, "Snoozed did not expand").toBe(true);
    expect(s2.drawn, "Snoozed expanded and drew a different number than it stated").toBe(s2.stated);
  } else {
    console.log("  NOTE: no snoozed row on this account — the collapse is unit-locked only");
  }

  /* ── filters run BEFORE grouping, so a filter cannot make a count lie ──────────────────────
     ⚠️ "Kinds" IS A `role="group"` OF PRESSED TOGGLES, NOT A MENU. Asking for a button by that
     name matches nothing and Playwright waits the whole test timeout for it to appear — five
     minutes spent proving that a name I guessed does not exist. Addressed by its real role, and
     COUNTED before it is clicked, so a control that is not there fails in a line instead of
     hanging: the pack's "by role, not by class" is only half the rule, and this is the other half. */
  const kinds = page.getByRole("group", { name: "Kinds" });
  expect(await kinds.count(), "no Kinds control found by role").toBe(1);
  const on = kinds.getByRole("button", { pressed: true });
  const lit = await on.count();
  console.log(`  Kinds · ${lit} filter(s) lit`);
  if (lit > 1) {
    await on.first().click();
    await page.waitForTimeout(500);
    const f = await page.evaluate<any>(board);
    expect(f.headers, "filtering removed every group — nothing left to check").toBeGreaterThan(0);
    for (const g of f.groups) {
      console.log(`  filtered · ${g.name.padEnd(16)} stated ${g.stated} · drawn ${g.drawn}`);
      if (g.open) expect(g.drawn, `filtered ${g.name}: header says ${g.stated}, board drew ${g.drawn}`).toBe(g.stated);
      expect(g.stated, `filtered ${g.name}: an empty group survived the filter`).toBeGreaterThan(0);
    }
    /* put it back, so the next spec meets the board it expects */
    await on.first().click();
    await page.waitForTimeout(400);
  } else {
    console.log(`  NOTE: only ${lit} kind lit — turning it off would empty the board, so not exercised`);
  }

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
