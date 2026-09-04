/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 4 — the detail slide-over, measured.
 *
 * ⚠️ THE BAND CLAIM IS THE ONE THAT NEEDED A PANEL AT ALL. `query-tint-ladder.md` names the panel
 * header as the third surface the tint appears on, and pass 2 measured the record view painting
 * NONE of the eight tokens. Comparing the panel's computed band against the CARD's — not against a
 * hex — is what makes that survive a retune.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";

test("the panel: band, stepping, rail, and what it refuses to show", async ({ page }) => {
  const out: Record<string, unknown> = {};
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });

  /* the card we are about to open, and its band, read BEFORE the panel exists */
  /**
   * ⚠️ A SEEDED QUERY, NOT WHATEVER IS FIRST — and this is the difference between a measurement and
   * a monoculture. The harness account's ordinary queries carry NO per-query `activity` documents
   * (`seed.mjs` writes none), so the rail rendered only its derived waiting rung and an assertion
   * of "the rail is not empty" passed on a rail with nothing recorded in it. `seedCorrection.mjs`
   * writes real rungs into both stores; run it before this file.
   */
  const seeded = page.locator('.qcc[data-qcc-id^="cor-"]').first();
  expect(await seeded.count(), "no seeded query on the page — run `node tests/e2e/seedCorrection.mjs` first")
    .toBeGreaterThan(0);
  const first = seeded;
  const cardBefore = await first.evaluate((el) => ({
    id: el.getAttribute("data-qcc-id"),
    stage: [...el.classList].find((c) => c.startsWith("qcc--s-")),
    band: getComputedStyle(el.querySelector(".qcc-band") as Element).backgroundColor,
    leafDay: el.querySelector(".qcc-leaf-dy")?.textContent ?? null,
  }));
  out.cardBefore = cardBefore;

  await first.click();
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(600);

  out.panel = await page.evaluate(() => {
    const p = document.querySelector(".qpn") as HTMLElement | null;
    if (!p) return null;
    const bar = p.querySelector(".qpn-bar") as HTMLElement;
    const acts = [...bar.querySelectorAll<HTMLElement>("button")].map(
      (b) => (b.textContent ?? "").trim() || b.getAttribute("aria-label") || "",
    );
    const r = p.getBoundingClientRect();
    return {
      stage: p.getAttribute("data-qpn-stage"),
      stageClass: [...p.classList].find((c) => c.startsWith("qcc--s-")),
      band: getComputedStyle(p.querySelector(".qpn-band") as Element).backgroundColor,
      width: Math.round(r.width),
      right: Math.round(r.right),
      onScreen: r.left < window.innerWidth && r.right > 0,
      scrimOn: (document.querySelector(".qpn-scrim") as HTMLElement)?.dataset.on === "true",
      barActions: acts,
      position: p.querySelector(".qpn-pos")?.textContent ?? null,
      name: p.querySelector(".qpn-nm")?.textContent ?? null,
      /* ⚠️ THE CRUMB IS THE SHELL'S, AND IT ALREADY FOLLOWS `?q=`. `WorkspaceShell.recordCrumb`
         resolves the open query's agent from the search param — a DIFFERENT mechanism from
         `WorkspacePageGrid`'s `record` prop, which is what I checked when I reported that the crumb
         never named the record. It does; I had checked the wrong one of two. */
      crumb: [...document.querySelectorAll<HTMLElement>(".ws-crumb *")]
        .map((x) => (x.textContent ?? "").trim()).filter(Boolean).slice(-1)[0] ?? null,
      /* the rail, as rendered */
      rungs: [...p.querySelectorAll<HTMLElement>(".qpn-rung")].map((g) => ({
        event: g.querySelector(".qpn-ev")?.textContent ?? "",
        date: g.querySelector(".qpn-when")?.textContent ?? "",
        pending: !!g.querySelector(".qpn-rcard--pend"),
        hasMenu: !!g.querySelector(".qpn-more"),
        editableDate: !!g.querySelector("button.qpn-when"),
      })),
      materialRows: [...p.querySelectorAll<HTMLElement>(".qpn-row")].map((x) => (x.textContent ?? "").trim()),
      sections: [...p.querySelectorAll<HTMLElement>(".qpn-ttl")].map((x) => (x.textContent ?? "").trim()),
    };
  });

  /**
   * ⚠️ THE EVIDENCE IS WRITTEN BEFORE THE ASSERTIONS, not after. The first run of this file failed
   * on a later claim and never reached its `writeFileSync`, so the JSON on disk was the PREVIOUS
   * run's — and I read a stale card id out of it and drew a conclusion. A failing measurement must
   * still leave what it saw.
   */
  mkdirSync("reports", { recursive: true });
  const dump = () => writeFileSync("reports/query-centre-panel.json", JSON.stringify(out, null, 2));
  dump();

  /* ── the band is the CARD's, not a hex ── */
  const panel = out.panel as Record<string, unknown>;
  expect(panel, "the panel did not open").toBeTruthy();
  expect(panel.stageClass, "the panel does not carry the card's ladder class").toBe(cardBefore.stage);
  expect(panel.band, "the panel's band is not the card's colour").toBe(cardBefore.band);
  expect(panel.width, "the panel is not 580px").toBe(580);
  expect(panel.scrimOn, "no scrim").toBe(true);

  /* ── the rail matches the log, and the derived rung carries no menu ── */
  const rungs = panel.rungs as { event: string; pending: boolean; hasMenu: boolean }[];
  expect(rungs.length, "the rail is empty").toBeGreaterThan(0);
  /* ⚠️ AT LEAST ONE RECORDED RUNG. "Not empty" was satisfied by the derived waiting rung alone, on
     a query with no activity documents at all — a green about a rail that showed no history. */
  const recorded = rungs.filter((r) => !r.pending);
  expect(recorded.length, "the rail shows no RECORDED rung — only the derived waiting one").toBeGreaterThan(0);
  for (const r of rungs) {
    /* ⚠️ A RUNG YOU CAN DELETE MUST CORRESPOND TO A DOCUMENT. The waiting rung is a projection. */
    if (r.pending) expect(r.hasMenu, `the derived rung "${r.event}" offers a ⋯ menu`).toBe(false);
    else expect(r.hasMenu, `the recorded rung "${r.event}" has no ⋯ menu`).toBe(true);
    expect(r.event.trim(), "a rung rendered with no label").not.toBe("");
  }

  /* ── the three sections ── */
  expect(panel.sections).toEqual(["Tracking", "What went with this query", "Notes"]);
  expect((panel.materialRows as string[]).length, "the four material slots are not all stated").toBe(4);

  /* ── Nudge is agent-side only ── */
  const acts = (panel.barActions as string[]).map((a) => a.toLowerCase());
  const stage = String(panel.stage);
  if (stage.startsWith("in-")) {
    expect(acts.some((a) => a.includes("nudge")), "Nudge offered on a with-you query").toBe(false);
    expect(acts.some((a) => a.includes("mark sent")), "with-you does not offer Mark sent").toBe(true);
  } else if (stage.startsWith("out-")) {
    expect(acts.some((a) => a.includes("nudge")), "no Nudge on an agent-side query").toBe(true);
  }

  /* ── ←/→ follows the filtered order, and the panel does not close ── */
  const secondId = await page.locator(".qcc").nth(1).getAttribute("data-qcc-id");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  out.afterRight = await page.evaluate(() => ({
    open: !!document.querySelector(".qpn[data-on='true']"),
    pos: document.querySelector(".qpn-pos")?.textContent ?? null,
    name: document.querySelector(".qpn-nm")?.textContent ?? null,
  }));
  dump();
  const after = out.afterRight as Record<string, string | boolean | null>;
  expect(after.open, "→ closed the panel").toBe(true);
  expect(after.name, "→ did not move to the next card in the filtered order").not.toBe(panel.name);
  /* ⚠️ RELATIVE, NOT `2 of N`. The seeded query is wherever the sort puts it; an absolute position
     asserts the fixture's order rather than that stepping moved by one. */
  const posOf = (t: string | null) => Number((t ?? "").match(/^(\d+) of/)?.[1] ?? NaN);
  const before = posOf(panel.position as string);
  const nowPos = posOf(after.pos as string);
  expect(Number.isFinite(before) && Number.isFinite(nowPos), "no position readout").toBe(true);
  expect(nowPos, `→ moved from ${before} to ${nowPos}`).toBe(before + 1);
  void secondId;

  /* ── Escape closes ── */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  dump();
  out.afterEsc = await page.evaluate(() => ({
    open: !!document.querySelector(".qpn[data-on='true']"),
    gridStillThere: !!document.querySelector(".qcc-grid"),
    /* ⚠️ THE PAGE UNDERNEATH NEVER CHANGED — that is the whole point of an overlay. */
    masthead: document.querySelector(".wsh-title")?.textContent ?? null,
    crumb: [...document.querySelectorAll<HTMLElement>(".ws-crumb *")]
      .map((x) => (x.textContent ?? "").trim()).filter(Boolean).slice(-1)[0] ?? null,
  }));
  const esc = out.afterEsc as Record<string, unknown>;
  expect(esc.open, "Escape did not close the panel").toBe(false);
  expect(esc.gridStillThere, "the grid went away").toBe(true);
  /**
   * ⚠️ THE CRUMB NAMES THE OPEN QUERY AND GIVES THE NAME BACK. The brief asks the panel to set it
   * and restore it; the shell already does both from `?q=`, so nothing was built — but it is
   * asserted, because "it happens to work" and "it is guaranteed" are different states.
   */
  expect(panel.crumb, "the crumb did not name the open query").toBe(panel.name);
  expect(esc.crumb, "the crumb did not go back to the page name on close").not.toBe(panel.name);

  dump();
});
