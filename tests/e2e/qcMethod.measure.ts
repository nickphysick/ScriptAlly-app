/**
 * §3 — the method menu, on the running page.
 *
 * ⚠️ THE CLAIM IS ABOUT WORDS AND ABOUT A HEAD, and both are things a source lock can only say were
 * written. The vocabulary had TWO copies that had already diverged — the page said `email`, the
 * PDF said `Email` — so the check that matters is what the page renders beside what the menu
 * offers, read from the same run.
 *
 *   npx playwright test --project=measure qcMethod
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§3 — capitalised, and the menu says what it is", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 8000 });
  await page.waitForTimeout(500);

  const qual = await page.evaluate(() => {
    const t = document.querySelector(".qp-inplace");
    return {
      word: (t?.textContent || "").trim(),
      line: (t?.closest(".tl-r1")?.textContent || "").replace(/\s+/g, " ").trim(),
    };
  });
  console.log(`  row 1 reads: "${qual.line}"`);
  expect(qual.word, "no send method on this query's send event").not.toBe("");

  /* ⚠️ NO `via`. The qualifier already sits behind a `·`, so "Query sent · via Email" said the same
     thing twice; the preposition was left from the retired "Sent by …" line. */
  expect(qual.line, "the qualifier still carries the retired preposition").not.toContain("· via");
  expect(qual.word[0], `the method reads "${qual.word}" — lower case`).toBe(qual.word[0].toUpperCase());

  await page.locator(".qp-inplace").click();
  await page.waitForTimeout(400);
  const menu = await page.evaluate(() => {
    const m = document.querySelector<HTMLElement>(".f12-menu");
    if (!m) return null;
    return {
      head: (m.querySelector(".f12-menu-head")?.textContent || "").trim(),
      items: [...m.querySelectorAll(".f12-menu-item")].map((i) => (i.textContent || "").replace(/\s+/g, " ").trim()),
      ticked: [...m.querySelectorAll(".f12-menu-item")].filter((i) => (i.textContent || "").includes("✓")).length,
      shadow: getComputedStyle(m).boxShadow !== "none",
    };
  });
  console.log(`  menu head "${menu?.head}" · items ${menu?.items.join(" | ")} · ticked ${menu?.ticked}`);
  expect(menu, "the word opened nothing").not.toBeNull();
  expect(menu!.head, "the menu does not say what its list answers").toBe("Sent via");
  expect(menu!.items.length, "the menu does not offer the four methods").toBe(4);
  /* ⚠️ EVERY ROW CAPITALISED, and the tick on exactly one — a list with no tick states no current
     value, and a list with two states an impossible one. */
  for (const i of menu!.items) {
    const word = i.replace("✓", "").trim();
    expect(word[0], `"${word}" is lower case in the menu`).toBe(word[0].toUpperCase());
  }
  expect(menu!.ticked, "the menu marks no current method, or more than one").toBe(1);
  /* ⚠️ AND THE ROW'S OWN WORD IS ONE OF THE MENU'S — the two copies of this vocabulary had already
     drifted, so they are asserted against each other rather than against a list written here. */
  expect(menu!.items.map((i) => i.replace("✓", "").trim()), `the row says "${qual.word}" and the menu does not offer it`)
    .toContain(qual.word);
  expect(menu!.shadow, "the menu is not the page's standard popover").toBe(true);

  await page.keyboard.press("Escape");
});
