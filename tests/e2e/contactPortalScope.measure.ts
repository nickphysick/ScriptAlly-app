/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PORTALLED SURFACES ARE STYLED — asserted as COMPUTED VALUES, never as a mount.
 *
 * ⚠️ EVERY EXISTING CHECK PASSED THROUGH A COMPLETELY UNSTYLED DRAWER, and that is the reason this
 * file exists. They ask whether it MOUNTS, and it did: the markup was right, the text was right,
 * the buttons worked, and `renderToStaticMarkup` — all this repo's unit tests can see — cannot
 * evaluate a stylesheet at all. An unstyled drawer is byte-identical to a styled one in every
 * artefact except a rendered page.
 *
 * ⚠️ AND IT CAME FROM ANOTHER PAGE, WHICH NO LOCK ON THIS ONE WOULD HAVE WATCHED. `SlideOver`
 * gained `createPortal(tree, document.body)` on 2026-09-09 so the DASHBOARD's drawer could sit
 * above everything. This page's rules are `.aglist .agl-…` and its tokens are declared on
 * `.aglist`, so the portal broke both at once — the selectors stopped matching, and every
 * `var(--agl-…)` became an unresolvable read, which CSS drops the whole declaration for. No error,
 * no warning, a valid stylesheet, every rule still in the deployed CSS, nothing left to match.
 *
 * ⚠️ SO THE ASSERTIONS READ COMPUTED STYLE. That is the only artefact that can tell a rule which
 * is ABSENT from a rule which is present and cannot REACH — and the second is what happened here.
 *
 * It runs against the LAB, whose cast is a fixture: no sign-in, no account, nothing written.
 */
import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

/** An unreachable token makes CSS drop the whole declaration, leaving the ground transparent. */
const painted = (c: string) => c !== "rgba(0, 0, 0, 0)" && c !== "transparent" && c !== "";

async function lab(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/#/contact-lab");
  await page.locator('[data-lab-view="cast"]').click();
  await expect(page.locator('[data-agent-card="fx-long"]')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}
const settle = (page: import("@playwright/test").Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

test.describe("the drawer", () => {
  test("read view — band, monogram and stars are painted, not bare", async ({ page }) => {
    await lab(page);
    await page.locator('[data-agent-card="fx-long"] .agl-body').click();
    await expect(page.locator(".slo")).toBeVisible({ timeout: 10_000 });
    await settle(page);

    const r = await page.evaluate(() => {
      const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
      const slo = document.querySelector(".slo") as HTMLElement;
      const head = document.querySelector(".slo .agl-dhead") as HTMLElement | null;
      const av = document.querySelector(".slo .agl-av") as HTMLElement | null;
      const stars = document.querySelector(".slo .agl-stars") as HTMLElement | null;
      const sr = stars?.getBoundingClientRect();
      return {
        /* THE MECHANISM: the page scope travelled through the portal */
        scoped: !!document.querySelector(".slo .aglist.agl-scope"),
        /* and the scope contributes NO box — it is an ancestor, not a layout */
        scopeDisplay: cs(document.querySelector(".slo .agl-scope"))?.display ?? "(none)",
        /* THE TOKEN, read where it is consumed — "(none)" is the unreachable case */
        band: (cs(head)?.getPropertyValue("--agl-band") ?? "").trim() || "(none)",
        sloWidth: Math.round(slo.getBoundingClientRect().width),
        headBg: head ? cs(head)!.backgroundColor : "(no head)",
        avRadius: av ? cs(av)!.borderRadius : "(no monogram)",
        starsDisplay: stars ? cs(stars)!.display : "(no stars)",
        starsW: sr ? Math.round(sr.width) : 0,
        starsH: sr ? Math.round(sr.height) : 0,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[read] scoped=${r.scoped} (${r.scopeDisplay}) --agl-band=${r.band} sloW=${r.sloWidth} headBg=${r.headBg} monogram=${r.avRadius} stars=${r.starsDisplay} ${r.starsW}x${r.starsH}`);

    expect(r.scoped, "the drawer's tree left the page scope behind in the portal").toBe(true);
    expect(r.scopeDisplay, "the scope is contributing a box — it must be an ancestor only").toBe("contents");
    expect(r.band, "the --agl-* tokens do not reach the drawer, so every var() read is dropped").not.toBe("(none)");
    expect(r.sloWidth, "the panel has no width").toBeGreaterThan(400);
    expect(painted(r.headBg), `the drawer head has no band (${r.headBg})`).toBe(true);
    expect(r.avRadius, "the monogram is not a disc").not.toBe("0px");
    /* ⚠️ STARS IN A ROW — unstyled they stack, which is the first thing a reader sees. */
    expect(r.starsDisplay, "the stars are not a flex row — they will stack").toContain("flex");
    expect(r.starsW, "the stars are taller than they are wide — they are stacking").toBeGreaterThan(r.starsH);
  });

  test("edit view — tab underline, field rules and button pills", async ({ page }) => {
    await lab(page);
    await page.locator('[data-agent-card="fx-long"]').getByRole("button", { name: /^Edit / }).click();
    await expect(page.locator(".slo .agl-tabs")).toBeVisible({ timeout: 10_000 });
    await settle(page);

    const r = await page.evaluate(() => {
      const cs = (e: Element | null) => (e ? getComputedStyle(e) : null);
      const tabs = document.querySelector(".slo .agl-tabs") as HTMLElement | null;
      const ehead = document.querySelector(".slo .agl-ehead") as HTMLElement | null;
      const input = document.querySelector(".slo .agl-in") as HTMLElement | null;
      const btn = document.querySelector(".slo .agl-btn") as HTMLElement | null;
      return {
        tabsBorder: tabs ? parseFloat(cs(tabs)!.borderBottomWidth) || 0 : -1,
        tabsDisplay: tabs ? cs(tabs)!.display : "(no tabs)",
        eheadBg: ehead ? cs(ehead)!.backgroundColor : "(no header)",
        inputBorder: input ? parseFloat(cs(input)!.borderBottomWidth) || 0 : -1,
        inputW: input ? Math.round(input.getBoundingClientRect().width) : 0,
        btnRadius: btn ? cs(btn)!.borderRadius : "(no button)",
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[edit] tabsBorder=${r.tabsBorder} tabsDisplay=${r.tabsDisplay} eheadBg=${r.eheadBg} inputBorder=${r.inputBorder} inputW=${r.inputW} btnRadius=${r.btnRadius}`);

    expect(r.tabsDisplay, "the tab row is not a flex row").toContain("flex");
    expect(r.tabsBorder, "the tab row has no underline").toBeGreaterThan(0.5);
    expect(painted(r.eheadBg), `the editor header has no band (${r.eheadBg})`).toBe(true);
    expect(r.inputBorder, "the fields have no rule").toBeGreaterThan(0);
    expect(r.inputW, "the fields have no width — the form is not laid out").toBeGreaterThan(150);
    expect(r.btnRadius, "the buttons are not pills").not.toBe("0px");
  });
});

/* ⚠️ THE DRAWER WAS NOT THE ONLY PASSENGER. Three surfaces on this page portal to `document.body`,
   and a fix that only restored the drawer would leave the other two failing the same way — which
   is the standing rule about scanning for the FAULT CLASS rather than the reported element. */
test.describe("the popovers", () => {
  test("the contact peek keeps the page's tokens through its portal", async ({ page }) => {
    await lab(page);
    await page.getByRole("button", { name: "List", exact: true }).click();
    await settle(page);
    await page.locator(".agl-lrow").first().getByRole("button", { name: /^Contact details for/ }).click();
    await expect(page.locator(".agl-peekpop")).toBeVisible({ timeout: 10_000 });
    await settle(page);
    const r = await page.evaluate(() => {
      const p = document.querySelector(".agl-peekpop") as HTMLElement;
      return { scoped: !!p.closest(".aglist.agl-scope"), bg: getComputedStyle(p).backgroundColor };
    });
    // eslint-disable-next-line no-console
    console.log(`[peek] scoped=${r.scoped} bg=${r.bg}`);
    expect(r.scoped, "the peek popover left the page scope behind").toBe(true);
    expect(painted(r.bg), `the peek popover has no ground (${r.bg})`).toBe(true);
  });

  test("quick add keeps the page's tokens through its portal", async ({ page }) => {
    await lab(page);
    await page.getByRole("button", { name: "List", exact: true }).click();
    await settle(page);
    await page.locator('[data-add-slot="email"][data-agent="fx-sparse"]').click();
    await expect(page.locator(".agl-qa")).toBeVisible({ timeout: 10_000 });
    await settle(page);
    const r = await page.evaluate(() => {
      const p = document.querySelector(".agl-qa") as HTMLElement;
      return { scoped: !!p.closest(".aglist.agl-scope"), bg: getComputedStyle(p).backgroundColor };
    });
    // eslint-disable-next-line no-console
    console.log(`[quickadd] scoped=${r.scoped} bg=${r.bg}`);
    expect(r.scoped, "the quick-add popover left the page scope behind").toBe(true);
    expect(painted(r.bg), `the quick-add popover has no ground (${r.bg})`).toBe(true);
  });
});
