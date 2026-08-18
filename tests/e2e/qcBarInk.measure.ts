/**
 * §2 — the control bar's inks, on the running page.
 *
 * ⚠️ THE FAULT WAS A COLOUR, so a source lock cannot settle it: the class could be gone and the
 * cascade still land the button in `--faint`. This reads the computed colour of every verb.
 *
 *   npx playwright test --project=measure qcBarInk
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const readBar = (page: Page) => page.evaluate(() => {
  /* ⚠️ THE WHOLE BAR, INCLUDING `Log new query` — it sits in the toolbar's OTHER cell, so a probe
     scoped to `.qc-phead` counted five controls and reported the bar as short. The section's claim
     is about the row the writer sees, not about one cell of the grid. */
  const btns = [...document.querySelectorAll<HTMLElement>(".qc-phead button, .qc-logq, .qc-verbs-inert button")];
  return btns.map((b) => {
    const c = getComputedStyle(b);
    return {
    label: (b.querySelector("span:not(.qc-btn-sub)")?.textContent || b.getAttribute("aria-label") || "Export").trim(),
    colour: c.color,
    /* §1 — every control is a real button: an outline at rest, one height, one ground between them */
    outline: `${c.borderTopStyle} ${c.borderTopWidth} ${c.borderTopColor}`,
    ground: c.backgroundColor,
    h: Math.round(b.getBoundingClientRect().height),
    weight: c.fontWeight,
    disabled: (b as HTMLButtonElement).disabled,
    ariaDisabled: b.getAttribute("aria-disabled") === "true",
    ghost: !!b.closest(".qc-verbs-inert"),
  };
  });
});

test("§2 — Mark closed, Export and Delete take the bar's ink", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  /* the muted step, read from the page rather than restated as a hex */
  const faint = await page.evaluate(() => {
    const root = document.querySelector(".f12-root") ?? document.documentElement;
    const probe = document.createElement("span");
    probe.style.color = getComputedStyle(root).getPropertyValue("--faint").trim();
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color; probe.remove();
    return c;
  });
  console.log(`--faint = ${faint}`);
  expect(faint, "the page has no --faint to compare against").not.toBe("");

  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(320);
  const live = await readBar(page);
  for (const b of live) console.log(`  ${b.ghost ? "ghost" : "live "} "${b.label}" · ${b.h}px · ink ${b.colour}/${b.weight} · outline ${b.outline} · ground ${b.ground}${b.disabled ? " [disabled]" : ""}${b.ariaDisabled ? " [aria-disabled]" : ""}`);

  /* ⚠️ EXPORT HAS NO LABEL, ONLY AN `aria-label` — it is the bar's one icon-only verb, and matching
     it on the word "Export" found nothing while reporting two of three, which is the shape that
     would have passed if the count had not been asserted. */
  const three = ["Mark closed", "Download this query as PDF", "Delete"];
  const found = live.filter((b) => !b.ghost && three.some((t) => b.label.startsWith(t)));
  expect(found.length, `only ${found.length} of the three verbs were found in the live bar`).toBe(3);
  for (const b of found) {
    expect(b.colour, `"${b.label}" is still the muted ink`).not.toBe(faint);
    expect(b.disabled, `"${b.label}" is disabled — it is an unconditional action`).toBe(false);
    expect(b.ariaDisabled, `"${b.label}" is marked unavailable`).toBe(false);
  }
  /* ⚠️ SUPERSEDED BY §1, AND POINTED THE OTHER WAY. This asserted the three closing verbs shared
     Nudge's ink, which was true while Nudge was a plain button; §1 moves Nudge into the forward
     group (`Record response` · `Nudge` · `View related tasks`) and separates the two groups by ink
     and weight. So the claim is now that the three CLOSING verbs match each other — the fault this
     was written for, one of them fading out, is caught by that just as well — and that they are
     lighter than the forward group rather than equal to it. Still no hexes on either side. */
  const inks = [...new Set(found.map((b) => b.colour))];
  expect(inks, `the three closing verbs are ${inks.join(", ")} — not one ink`).toHaveLength(1);
  const fwd = live.find((b) => !b.ghost && b.label.startsWith("Nudge") && !b.ariaDisabled);
  expect(fwd, "no enabled Nudge on this query to compare the groups against").toBeTruthy();
  expect(Number(fwd!.weight), "Nudge is no heavier than the verbs that end a query").toBeGreaterThan(Number(found[0].weight));
  expect(found[0].colour, "the closing verbs took the forward group's ink").not.toBe(fwd!.colour);

  /**
   * ⚠️ AND THE NO-SELECTION STATE, WHICH IS A DIFFERENT THING AND IS REPORTED AS SUCH. With nothing
   * selected the bar renders a GHOST — `aria-hidden`, every one of its five buttons `disabled`,
   * holding the row's geometry so it does not move when a query is clicked. That is not the muting
   * §2 removes: it applies to the primary too. What is asserted here is that the ghost carries no
   * muted CLASS, so the two treatments cannot be confused when it is next edited.
   */
  await page.locator('input[aria-label="Search queries"]').fill("zzzz-no-such-query");
  await page.waitForTimeout(500);
  const empty = await readBar(page);
  const ghosts = empty.filter((b) => b.ghost);
  console.log(`\nwith nothing selected: ${ghosts.length} ghost verbs · ${[...new Set(ghosts.map((g) => g.colour))].join(", ")}`);
  if (ghosts.length) {
    for (const g of ghosts) expect(g.disabled, `the ghost's "${g.label}" is live`).toBe(true);
    expect(new Set(ghosts.map((g) => g.colour)).size, "the ghost's verbs are not all one ink — a rank survived in the shape").toBe(1);
  } else {
    console.log("  (the selection survives an empty filter, so the ghost is unreachable from here)");
  }
});

test("§1 — every control in the bar is a real button", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(400);

  const bar = (await readBar(page)).filter((b) => !b.ghost);
  for (const b of bar) console.log(`  "${b.label}" · ${b.h}px · ${b.weight} · outline ${b.outline} · ground ${b.ground}`);
  console.log(`\n${bar.length} controls in the bar`);
  expect(bar.length, "the bar holds fewer controls than the section counts").toBeGreaterThanOrEqual(6);

  /* ⚠️ AN OUTLINE AT REST ON EVERY ONE — the fault was that they read as text until hovered. */
  for (const b of bar) {
    expect(b.outline, `"${b.label}" has no outline at rest`).not.toMatch(/none|0px/);
    expect(b.outline, `"${b.label}"'s outline is transparent`).not.toContain("rgba(0, 0, 0, 0)");
  }
  /* ⚠️ ONE HEIGHT, READ FROM ONE TOKEN — seven near-identical buttons is where a second hardcoded
     value gets in, so this compares them to each other rather than to a figure. */
  const heights = [...new Set(bar.map((b) => b.h))];
  expect(heights, `the bar's controls are ${heights.join(", ")}px — not one height`).toHaveLength(1);

  /* ⚠️ EXACTLY ONE GROUND, and it is the one control that creates something. */
  const filled = bar.filter((b) => b.ground !== "rgba(0, 0, 0, 0)" && b.ground !== "rgb(255, 255, 255)");
  console.log(`  filled: ${filled.map((f) => `"${f.label}" ${f.ground}`).join(", ") || "(none)"}`);
  expect(filled.length, `${filled.length} filled controls: ${filled.map((f) => f.label).join(", ")}`).toBe(1);
  expect(filled[0].label.toLowerCase(), "the one fill is not Log new query").toContain("log new query");

  /* ⚠️ TEXT WEIGHT IS THE ONLY THING SEPARATING THE TWO GROUPS. */
  const forward = bar.filter((b) => /Record response|Nudge|View related tasks/.test(b.label));
  const closing = bar.filter((b) => /Mark closed|Download this query as PDF|Delete/.test(b.label));
  expect(forward.length, "the forward group was not found").toBeGreaterThanOrEqual(2);
  expect(closing.length, "the closing group was not found").toBe(3);
  const fw = Math.min(...forward.map((b) => Number(b.weight)));
  const cw = Math.max(...closing.map((b) => Number(b.weight)));
  console.log(`  weights: forward ${fw} · closing ${cw}`);
  expect(fw, `the forward verbs (${fw}) are not heavier than the closing ones (${cw})`).toBeGreaterThan(cw);
  /* and the separation is weight ALONE — same outline, same ground */
  expect([...new Set([...forward, ...closing].map((b) => b.outline))], "the two groups differ in outline").toHaveLength(1);
});
