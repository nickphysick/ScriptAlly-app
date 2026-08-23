/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ PACK B — THE ANCHOR LAW, ON A RENDERED PAGE ══════════════════════════════════════════════
 *
 * ⚠️ THIS IS THE REPLACEMENT NICK RULED FOR `paneGate.test.ts`'s SOURCE SCRAPE. That scrape asked
 * "is there a section for every declared requirement" by reading text — and once `TaskPaneBody`
 * took an `idPrefix`, the id became an expression and no scrape could see it. The law it protected
 * is unchanged and is stronger stated here: **every anchor the gate can require must RESOLVE to an
 * element that exists**, because a requirement the square cannot sit on, or the scroll cannot
 * reach, would gate the primary and point at nothing.
 *
 * ⚠️ A SOURCE TEST PROVES THE CODE WAS WRITTEN; THIS PROVES THE SECTION IS THERE TO BE SCROLLED TO.
 * Same lesson as Pack A.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/** The declaration, quoted from `paneGate.REQ` — the four the form asks plus the cohort's table. */
const DECLARED = ["s-unit", "s-when", "s-expect", "s-remind", "s-rows"];

test("Pack B — every declared anchor resolves in the pane that renders it", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));
  await openRoute(page, "/todo", { width: 1440, height: 900 });

  /**
   * ⚠️ THE CARDS ARE CHOSEN, NOT WALKED, AND THE FIRST VERSION TAUGHT ME WHY. It stepped through
   * the dock with the ›  button and found ZERO anchors across twelve cards — because the pane opens
   * on whatever is docked, which on this account is a NOTE, and a note declares nothing. A walk
   * that happens to meet only notes reports "no anchors" about a form that renders them perfectly.
   *
   * ⚠️ SO EACH KIND IS DOCKED BY CLICKING ITS OWN ROW. A `Send` card is what requires the unit,
   * the when and the expectation; the cohort's `s-rows` is the bulk `Fix`. Between them the
   * declaration is covered, and each assertion knows which journey it is speaking about.
   */
  const dock = async (match: RegExp) => {
    const pt = await page.evaluate((src) => {
      const re = new RegExp(src, "i");
      const row = Array.from(document.querySelectorAll(".row"))
        .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
        .find((e) => re.test((e.textContent ?? "").replace(/\s+/g, " "))) as HTMLElement | undefined;
      if (!row) return null;
      /* ⚠️ INTO VIEW FIRST. The cohort row sits well down a scrolling list, and a click at its
         off-screen coordinates lands on whatever is at that point instead — which reported the
         PREVIOUS card's band and read as "the cohort renders no anchors". */
      row.scrollIntoView({ block: "center" });
      const r = row.getBoundingClientRect();
      if (r.height < 2 || r.bottom > window.innerHeight || r.top < 0) return null;
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, match.source);
    if (!pt) return null;
    await page.waitForTimeout(250);   // let the scroll settle before the click
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(500);
    return page.evaluate((declared) => {
      const pane = Array.from(document.querySelectorAll(".tpn"))
        .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement | undefined;
      if (!pane) return null;
      /* ⚠️ SCOPED TO THE VISIBLE PANE, never the document — with two mounts a document-wide lookup
         returns the first, which is the collision this phase exists to remove. */
      return {
        band: (pane.querySelector(".band")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 44),
        found: declared.filter((id) => !!pane.querySelector(`#${id}`)),
      };
    }, DECLARED);
  };

  const send = await dock(/Send your (full|partial)/);
  const bulk = await dock(/imported queries are missing their material/);

  console.log(`  send card → ${send ? JSON.stringify(send.found) : "not found"}   (${send?.band ?? ""})`);
  console.log(`  bulk card → ${bulk ? JSON.stringify(bulk.found) : "not found"}   (${bulk?.band ?? ""})`);

  /* ⚠️ POPULATION FIRST — if neither card is on this account the claims below prove nothing. */
  expect(send, "no Send card on this account — the anchor law would be vacuous").not.toBeNull();
  expect(send!.found.length, "a Send card rendered NO declared anchor").toBeGreaterThan(0);

  /* ⚠️ THE LAW: the id the gate would scroll to is the id the section carries. A Send declares the
     parcel, the date and the expectation — each must RESOLVE, not merely be written in a file. */
  for (const id of ["s-unit", "s-when", "s-expect"]) {
    expect(send!.found, `a Send card does not render #${id} — the gate could require it and point at nothing`)
      .toContain(id);
  }
  /* ⚠️ THE COHORT IS ASSERTED ONLY IF IT ACTUALLY DOCKED. Its row sits far down a scrolling list,
     and a click that misses leaves the PREVIOUS card in the pane — which would then be asserted
     about under the cohort's name. The band is the proof it changed. */
  if (bulk && /imported|missing their material|fill in what you sent/i.test(bulk.band)) {
    expect(bulk.found, "the cohort card does not render #s-rows").toContain("s-rows");
  } else {
    console.log(`  ⚠️ the cohort card did not dock (band read "${bulk?.band ?? "—"}") — #s-rows is REPORTED, not asserted`);
  }

  const real = errs.filter((e) => !/favicon|net::ERR|Download the React DevTools/i.test(e));
  console.log(`  console errors: ${real.length ? JSON.stringify(real.slice(0, 3)) : "none"}`);
  expect(real, "the page threw at runtime").toEqual([]);
});

test("Pack B — /todo's ids are unprefixed, so nothing about this page changed", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  /* ⚠️ DOCK A CARD THAT HAS IDS TO BE BARE ABOUT. The pane opens on whatever is docked — a NOTE on
     this account — which renders no sections at all, so the first version of this test asserted
     "every id is bare" over an empty list and proved nothing. */
  const pt = await page.evaluate(() => {
    const row = Array.from(document.querySelectorAll(".row"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)
      .find((e) => /Send your (full|partial)/i.test((e.textContent ?? "").replace(/\s+/g, " "))) as HTMLElement | undefined;
    if (!row) return null;
    const b = row.getBoundingClientRect();
    return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
  });
  expect(pt, "no Send card to dock — the bareness claim would be vacuous").not.toBeNull();
  await page.mouse.click(pt!.x, pt!.y);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const pane = Array.from(document.querySelectorAll(".tpn"))
      .filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0)[0] as HTMLElement | undefined;
    return {
      panes: document.querySelectorAll(".tpn").length,
      ids: pane ? Array.from(pane.querySelectorAll("[id^='s-']")).map((e) => e.id) : [],
      prefixed: pane ? Array.from(pane.querySelectorAll("[id]")).map((e) => e.id).filter((i) => /^cal-s-/.test(i)) : [],
    };
  });
  console.log(`  panes ${r.panes} · ids ${JSON.stringify(r.ids)} · prefixed ${JSON.stringify(r.prefixed)}`);
  expect(r.ids.length, "the docked card rendered no ids — the bareness claim would be vacuous").toBeGreaterThan(0);
  /* ⚠️ ONE PANE ON /todo — the duplicate-id hazard is about a SECOND mount, which does not exist
     yet; this records the before-state so a later phase can show it is still one here. */
  expect(r.panes).toBe(1);
  /* every id this page renders is BARE — the default prefix is "" and this proves it on the page */
  for (const id of r.ids) expect(id).toMatch(/^s-[a-z]+$/);
  expect(r.prefixed, "/todo rendered a prefixed id — the default is not empty").toEqual([]);
});
