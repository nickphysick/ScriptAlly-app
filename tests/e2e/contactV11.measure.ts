/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v11 — the rendered locks, phase by phase (design authority:
 * design-refs/contact-list-v11.html, measured at 1440×900 and 1280×800).
 *
 * Phase 1: the centred group (page column + 340px rail, 28px gap, 1480 measure), the rail's
 * sticky geometry (its height from its own MEASURED top — the house viewport law), the tray
 * chrome, and `?view=` accepted-and-ignored (the switch is retired; a bookmarked view lands on
 * the one list rather than erroring).
 *
 * ⚠️ EVERY /agents PROBE GOES THROUGH `visiblePage` — every workspace page stays mounted, and
 * `document.querySelector` answers about whichever copy is first in the DOM.
 */
import { expect, test } from "@playwright/test";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { openRoute, visiblePage } from "./measure";
import { harnessDb } from "./harnessDocs";
import { collection, deleteField, doc, getDoc, getDocs, query as fsQuery, updateDoc, where } from "firebase/firestore";

let asserts = 0;
let ran = 0;
const bump = (n = 1) => { asserts += n; };
/** The add card's door since v12 P1 (3 Oct): "+ Add an agent" opens the centred card DIRECTLY —
 * the quick-add drop and the Paste-a-link pill are retired (the go-ahead's ask 2). */
const openAddCard = async (page: import("@playwright/test").Page, scope: string) => {
  await page.click(`${scope} [data-cl15="add"]`); /* v15 §2: the open header's own button */
};

test.beforeAll(async () => { await assertLocalBundleIsDev(); });
test.beforeEach(() => { ran += 1; });

test.afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`[contactV11] assertions run: ${asserts} across ${ran} tests (this worker)`);
  /* ⚠️ THE FLOOR IS THE GUARD AGAINST A SILENT HALF-RUN — a suite that finds no subject must
     fail in the language of a failure, not report a shorter green. It SCALES with the tests this
     WORKER ran (every case bumps at least twice), because the counter is per worker: a `-g` run,
     or a worker Playwright restarts after a crash, would otherwise fail the floor with every one
     of its own assertions green — measured, and the floor's noise then MASKED the real reason. */
  if (asserts < ran * 2) throw new Error(`contactV11 ran only ${asserts} assertions across ${ran} tests — a subject went missing`);
});

test.describe("phase 1 — the centred group and the rail shell", () => {
  /* the group's two columns are RETIRED by v13 P4 — the rail went and the group is one column (contactV13 CL13-5 holds the workspace's full width). RETIRED-contact-list-v13.md */

  /* the rail's sticky geometry is RETIRED by v13 P4 with the rail; Housekeeping moves to the floating tab and drawer (P5). RETIRED-contact-list-v13.md */

  /* the v11 rail tray's geometry is RETIRED by v13 P4 with the rail; HK v2's drawer header replaces it (P5). RETIRED-contact-list-v13.md */

  test("?view= is accepted and ignored — one renderer, no switch", async ({ page }) => {
    await openRoute(page, "/agents?view=board", { width: 1440, height: 900 });
    const scope = await visiblePage(page, ".agl-wpg");
    const r = await page.evaluate((scope) => ({
      rows: document.querySelectorAll(`${scope} [data-clv="row"]`).length,
      board: !!document.querySelector(`${scope} .agl-bcard`),
      lrow: !!document.querySelector(`${scope} .agl-lrow`),
      switchBtns: document.querySelectorAll(`${scope} [data-view-switch], ${scope} .qvs`).length,
      url: location.search,
    }), scope);
    expect(r.rows > 0, "the one renderer is not on the page").toBe(true);
    expect(r.board, "a board renderer answered a ?view=board URL").toBe(false);
    expect(r.lrow, "a list renderer leaked in").toBe(false);
    expect(r.switchBtns, "a view switch is still mounted").toBe(0);
    expect(r.url, "the parameter is ignored, not scrubbed").toContain("view=board");
    bump(5);
  });
});

/* ══ phase 2 — the hero (v11 §3, §11.1) and the count cards (§3.3, §11.3) ═══════════════════ */

/* ⚠️ RETIRED BY PAGE HEADER v2 §4, each by name: `heroRead`, "the hero, side by side at 1440 / 1920
   — card clear of the text, art on the column's edge, the peek kept", and "the hero stacks at 1280 —
   one-line title beside the sentence, the cards above the list, the same edge rules". Their subject
   — the v11 hero, the blank card placed inside the Archivist's drawing by `heroLayout` — is deleted;
   the page opens with the shared full header, measured in pageHeaderV2.measure.ts §4. The one claim
   that outlives it, that the three count cards sit as a row between the header and the list, is
   restated below. */

/* ⚠️ RETIRED BY v12 P2–P3 (3 Oct), each by name: "the count cards at 1280/1440: a row of three
   below the header's rule, above the list" and "the count cards filter — populations proved
   non-zero first, OR on multi-select, dim on the rest". Their subject — the CountCards row and
   its pool narrowing (cardSel, matchesCards, the OR) — left the LIST with the card index: the
   first thing below the rule is the A–Z strip (§10.2, and pageHeaderV2 §4's retargeted row),
   and the strip SCROLLS rather than filters, so there is no pool behaviour to restate.
   `CountCards` survives only in the empty state's exhibit, on a fixture, until P5. */

/* ══ phase 3 — the list: header row, faceted filter, bands, rows, the floating bar ══════════ */

test("the header row and the rows — one renderer, StatusDot on every queried row, genre first, no ellipsis", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const r = await page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="row"]`)] as HTMLElement[];
    const tally = document.querySelector(`${scope} [data-clv="tally"]`)?.textContent ?? "";
    return {
      toolbarGone: !document.querySelector(`${scope} .agl-toolbar`),
      gridGone: !document.querySelector(`${scope} .agl-grid`),
      rows: rows.length,
      tally,
      queried: rows.filter((x) => x.dataset.status !== "Not queried yet").length,
      dotted: rows.filter((x) => x.dataset.status !== "Not queried yet" && x.querySelector(".clv-ql svg")).length,
      hitFirst: rows
        .filter((x) => x.querySelector(".clv-gch .clv-hit"))
        .every((x) => x.querySelector(".clv-gch span")!.className.includes("clv-hit")),
      names: rows.map((x) => {
        const b = x.querySelector(".clv-rwho b") as HTMLElement;
        return { over: b.scrollWidth > b.clientWidth + 1 };
      }),
      bands: [...document.querySelectorAll(`${scope} [data-clv="band"]`)].map((b) => ({
        /* v14 P5: the count sits in the shared divider's `em` (data-cl13="gcount"), where v12/v13 used a <small> */
        label: b.querySelector("b")?.textContent, n: b.querySelector('[data-cl13="gcount"]')?.textContent ?? null,
      })),
    };
  }, scope);
  expect(r.toolbarGone, "the old toolbar is still mounted").toBe(true);
  expect(r.gridGone, "the card grid is still mounted").toBe(true);
  expect(r.rows, "population first").toBeGreaterThan(10);
  /* (the head row's "N of M" tally retired with the head, v13 P3 — the banner's eyebrow counts now) */
  expect(r.dotted, "a queried row without its StatusDot").toBe(r.queried);
  expect(r.hitFirst, "a matched genre chip is not first").toBe(true);
  const over = r.names.filter((n) => n.over).length;
  expect(over, "an agent's name ellipsised at 1440 on this account").toBe(0);
  /* v12 P2 (3 Oct): the page opens on the card index — the first divider is a LETTER tab and
     its <small> states the section's population ("2 agents"), where the v11 standing band led
     with "Your move". */
  expect(r.bands[0]?.label ?? "", "the default grouping's first band is a letter").toMatch(/^[A-Z]$/);
  expect(r.bands[0]?.n ?? "", "the divider's count small").toMatch(/^\d+ agents?$/);
  bump(8);
});

/* §11.4 (the v12 Filter panel) and §11.10 (the floating active-filter bar) are RETIRED by v13 P3: the
   banner's labelled pills and the filter line replace both (contactV13 CL13-7 holds the faceted counts,
   the kept scroll and the outside press; CL13-F the filter line). RETIRED-contact-list-v13.md. */

/* the sticky dividers under the sticky strip are RETIRED by v13 P4 — neither is sticky now; the slim bar stays in reach (CL13-SB). RETIRED-contact-list-v13.md */

/* ══════════════════════════ phase 4 — the agent pop-up (§11.6 / §11.7) ══════════════════════════ */

/* ⚠️ REWRITTEN AGAINST THE AGENT CARD (Agent card v1 P3, 5 Oct). The pop-up and its edit face are
   deleted; the agent card is the only agent editor, so these cases keep their v11 laws and drive the
   card's editor (`data-ae`). The old "520 wide, and the picker wears the portal dress" case RETIRES:
   the editor's width and height are agentCardV1.measure.ts's (by the mock's ruler), and the country
   is quick picks plus a searchable list on `:root` tokens, so there is no portal dress left to wear.
   Recorded in tests/e2e/RETIRED-agent-card-v1.md. */

const ED = '[data-ac="card"] [data-ae-mode="edit"]';
const ADD = '[data-ac="card"] [data-ae-mode="new"]';
const weeksText = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (document.querySelector('[data-ae="weeks"] b')?.textContent ?? "").trim());
const toWork = async (page: import("@playwright/test").Page) => {
  await page.click('[data-ac="card"] [data-ae="tabs"] [data-tab="work"]');
  await page.waitForSelector('[data-ac="card"] [data-sec="work"].on');
};

test("Escape and the backdrop return a CLEAN editor to the quick view, ask on a dirty one, and never discard in silence (§11.6)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.click(`${scope} [data-clv="row"]`);
  await page.waitForSelector('[data-ac="card"]');
  await page.click('[data-ac="card"] [data-ac="edit"]');
  await page.waitForSelector(ED);
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-ac="card"] [data-ac="head"]'), "the first Escape did not return a clean editor to the quick view").toBeVisible();
  expect(await page.locator(ED).count(), "the first Escape left the editor open").toBe(0);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });

  /* the backdrop: a clean editor goes back to the view; a dirty one ASKS and keeps the draft */
  await page.click(`${scope} [data-clv="row"]`);
  await page.waitForSelector('[data-ac="card"]');
  await page.click('[data-ac="card"] [data-ac="edit"]');
  await page.waitForSelector(ED);
  await page.mouse.click(30, 450); // well outside the centred card
  await expect(page.locator('[data-ac="card"] [data-ac="head"]'), "the backdrop did not return a clean editor to the view").toBeVisible();
  await page.click('[data-ac="card"] [data-ac="edit"]');
  await page.waitForSelector(ED);
  await page.fill('[data-ac="card"] [data-ae="name"]', "Zz draft only");
  await page.mouse.click(30, 450);
  await expect(page.locator('[data-ac="card"] [data-ae="ask"]'), "the backdrop discarded a dirty draft").toBeVisible();
  expect(await page.inputValue('[data-ac="card"] [data-ae="name"]'), "the draft went with the backdrop click").toBe("Zz draft only");
  await page.click('[data-ac="card"] [data-ae="discard"]');
  await page.waitForSelector('[data-ac="card"] [data-ac="head"]');
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  bump(6);
});

test("§11.7 — the reply-time note is live as the draft changes, names the engine's dates, and Discard writes nothing", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* an agent whose live query's expected date DEPENDS on the window — walk the with-the-agent
     rows until one yields a per-query line (a writer-dated or windowless query legitimately
     yields none; the note's generic lines must appear either way) */
  const candidates = await page.evaluate(
    (scope) => [...document.querySelectorAll(`${scope} [data-clv="row"][data-stand="agent"]`)]
      .map((x) => (x as HTMLElement).dataset.agentCard!).slice(0, 6),
    scope,
  );
  expect(candidates.length, "population first — no with-the-agent rows on this account").toBeGreaterThan(0);
  let perQuery = "";
  let generic = "";
  let summary = "";
  let before = "";
  let touchedId = "";
  for (const id of candidates) {
    await page.click(`${scope} [data-agent-card="${id}"]`);
    await page.waitForSelector('[data-ac="card"]');
    await page.click('[data-ac="card"] [data-ac="edit"]');
    await page.waitForSelector(ED);
    await toWork(page);
    const orig = await weeksText(page);
    /* + from Unknown goes to 6, from a window it adds a week; at 26 the minus takes one */
    const plus = page.locator('[data-ac="card"] [data-ae="weeks"] [data-d="1"]');
    if (await plus.isEnabled()) await plus.click();
    else await page.click('[data-ac="card"] [data-ae="weeks"] [data-d="-1"]');
    const note = await page.evaluate(() => ({
      also: (document.querySelector('[data-ae="also-work"]') as HTMLElement | null)?.textContent ?? "",
      sum: (document.querySelector('[data-ae="sum"]') as HTMLElement | null)?.textContent ?? "",
    }));
    generic = note.also;
    summary = note.sum;
    if (/Query Centre and Birds-eye view:.*→/.test(note.also)) {
      perQuery = note.also; before = orig; touchedId = id;
      break;
    }
    await page.click('[data-ac="card"] [data-ae="cancel"]');
    await page.click('[data-ac="card"] [data-ae="discard"]');
    await page.waitForSelector('[data-ac="card"] [data-ac="head"]');
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  }
  expect(generic, "the reply note never appeared at all").toContain("To-do list and Dashboard");
  expect(generic).toContain("Analytics");
  expect(summary, "the foot does not count what else moves").toMatch(/also changes \d+ things? elsewhere/);
  expect(perQuery, "no candidate produced a per-query engine line — the dry run is not reaching the queries").toContain("reply expected");
  /* the engine's from → to, en-GB — and "no date" is one of its honest answers (an agency with
     no stated window has no expected date until one is set), so either side may say it, and at
     least one side must be a real date or the line said nothing */
  expect(perQuery).toMatch(/(\d{1,2} [A-Z][a-z]{2}|no date) → (\d{1,2} [A-Z][a-z]{2}|no date)/);
  expect(perQuery).toMatch(/\d{1,2} [A-Z][a-z]{2}/);
  /* Discard writes NOTHING: reopen and the stored value is the original */
  await page.click('[data-ac="card"] [data-ae="cancel"]');
  await page.click('[data-ac="card"] [data-ae="discard"]');
  await page.waitForSelector('[data-ac="card"] [data-ac="head"]');
  await page.click('[data-ac="card"] [data-ac="edit"]');
  await page.waitForSelector(ED);
  await toWork(page);
  const after = await weeksText(page);
  expect(after, `Discard wrote a draft value to ${touchedId} — the account has been changed`).toBe(before);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"] [data-ac="head"]');
  await page.keyboard.press("Escape");
  bump(7);
});

test("§11.7 write half — save says what else moved, and the fixture agent is restored in the same run", async ({ page }) => {
  const ID = "clv-fx-never";
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const fx = `${scope} [data-agent-card="${ID}"]`;
  expect(await page.locator(fx).count(), "the fixture agent is not on this account — run tests/e2e/seedContactFixture.mjs").toBe(1);
  const { db, uid } = await harnessDb();
  const ref = doc(db, "users", uid, "agents", ID);
  expect("responseTimeWeeks" in ((await getDoc(ref)).data() ?? {}), "precondition: the fixture's reply time is deliberately absent (ruling c)").toBe(false);
  try {
    await page.click(fx);
    await page.waitForSelector('[data-ac="card"]');
    await page.click('[data-ac="card"] [data-ac="edit"]');
    await page.waitForSelector(ED);
    await toWork(page);
    expect(await weeksText(page)).toBe("Unknown");
    await page.click('[data-ac="card"] [data-ae="weeks"] [data-d="1"]');
    expect(await weeksText(page), "the first + goes to 6").toBe("6 weeks");
    await page.click('[data-ac="card"] [data-ae="save"]');
    /* the save returns the card to its quick view — wait for THAT, then read its foot */
    await page.waitForSelector('[data-ac="card"] [data-ac="head"]', { timeout: 15_000 });
    await page.waitForSelector('[data-ac="card"] [data-ac="foot"].on');
    /* ⚠️ THE ACCOUNT IS NOW CHANGED — the restore is in `finally` */
    const saved = await page.textContent('[data-ac="card"] [data-ac="foot"]');
    expect(saved, "the saved line is missing — the write may have failed with the account half-changed").toContain("Saved.");
    /* (Agent card v1 P4: the v11 line listed surfaces; the card's — the mock's — counts the expected
       dates the dry run moved, and this fixture is never queried, so it moves none and says so) */
    expect(saved, "the saved line claimed a date moved on an agent with no query").not.toContain("expected-reply date");
    expect(await page.textContent('[data-ac="card"] [data-ac="where"]'), "the view does not show the saved window").toContain("Replies in about 6 weeks");
    expect((await getDoc(ref)).data()?.responseTimeWeeks, "the window did not reach the store").toBe(6);
    await page.keyboard.press("Escape");
    bump(6);
  } finally {
    /* ⚠️ THE CARD HAS NO ROAD BACK TO UNKNOWN (decision 9), so the restore is the store's: the field
       DELETED, not zeroed — absence is the fixture (clv-fx-never is never queried, so no deadline
       moved with it) */
    await updateDoc(ref, { responseTimeWeeks: deleteField() });
    expect("responseTimeWeeks" in ((await getDoc(ref)).data() ?? {}), "THE FIXTURE WAS NOT RESTORED — clv-fx-never now carries a reply window it must not have").toBe(false);
    bump(1);
  }
});

/* ══════════════════════════ phase 5 — the add card (§8 / §11.9) ══════════════════════════ */

/* ⚠️ REWRITTEN AGAINST THE AGENT CARD (P3): the add card is the card's editor opened empty. The v11
   law "a name AND an agency" is the card's "a name OR an agency" (§5 — and the rules have always
   accepted either), so the disabled-until clause is rewritten, not weakened: a record with neither
   still cannot be added. */
test("the add card (§11.9): a name OR an agency, the duplicate blocks with its way through, typing keeps the node", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await openAddCard(page, scope);
  await page.waitForSelector(ADD);
  const disabledAt = async () => page.evaluate(() => (document.querySelector('[data-ae="save"]') as HTMLButtonElement).disabled);
  expect(await disabledAt(), "Add enabled on an empty form").toBe(true);
  await page.fill(`${ADD} [data-ae="name"]`, "Zz Probe Agent");
  expect(await disabledAt(), "a name alone must be enough").toBe(false);

  /* the duplicate: a NAME already on the list blocks Add and offers the way through */
  const existing = await page.evaluate((scope) => {
    for (const r of document.querySelectorAll(`${scope} [data-clv="row"]`)) {
      const el = r as HTMLElement;
      const nm = (el.querySelector(".clv-rwho b")?.textContent ?? "").trim();
      const agy = (el.querySelector(".clv-ragy")?.textContent ?? "").trim();
      if (nm && agy) return { id: el.dataset.agentCard!, name: nm };
    }
    return null;
  }, scope);
  expect(existing, "population first — no named agent on the list").not.toBeNull();
  await page.fill(`${ADD} [data-ae="name"]`, existing!.name);
  await expect(page.locator('[data-ac="card"] [data-ae="dup"]')).toBeVisible();
  expect(await disabledAt(), "a duplicate name did not block Add").toBe(true);
  await page.click('[data-ac="card"] [data-ae="dup-open"]');
  await page.waitForSelector('[data-ac="card"] #ac-name');
  const opened = await page.evaluate(() => ({
    add: !!document.querySelector('[data-ae-mode="new"]'),
    who: (document.querySelector('[data-ac="card"] #ac-name') as HTMLElement | null)?.textContent ?? "",
  }));
  expect(opened.add, "Open them instead left the add card open behind the card").toBe(false);
  expect(opened.who).toContain(existing!.name);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });

  /* §11.9's identity clause: the focused element is the SAME NODE before and after typing */
  await openAddCard(page, scope);
  await page.waitForSelector(ADD);
  await page.click(`${ADD} [data-ae="name"]`);
  await page.evaluate(() => { (window as unknown as { __n1: Element | null }).__n1 = document.activeElement; });
  await page.keyboard.type("Abc");
  const sameNode = await page.evaluate(() => (window as unknown as { __n1: Element | null }).__n1 === document.activeElement);
  expect(sameNode, "typing re-rendered the form — the focused element is a different node").toBe(true);
  /* the card is dirty now: Escape asks, and Discard closes it having written nothing */
  await page.keyboard.press("Escape");
  await page.click('[data-ac="card"] [data-ae="discard"]');
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  bump(8);
});

test("§11.9 the free cap surfaces IN the card — Add refuses, says why, and writes nothing", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const { execSync } = await import("node:child_process");
  /* ⚠️ THE PRECONDITION IS THE PREMISE: this lock exists because the harness account is FREE at
     34 agents, where `addAgent`'s own cap refuses a sixth. A client cannot flip its plan (the
     rules' billing guard — which is also why harnessPlan.mjs can no longer arrange a Pro window),
     so the cap IS this fixture's write path, and the full after-add choreography is proven on
     the lab over known content instead. If the account ever reads Pro, this case must be
     re-thought, not skipped. */
  const plan = /plan: (\w+)/.exec(execSync("node tests/e2e/harnessPlan.mjs", { encoding: "utf8" }))?.[1];
  expect(plan, "the cap lock's premise: a Free account at the cap").toBe("Free");
  await openAddCard(page, scope);
  await page.waitForSelector(ADD);
  await page.fill(`${ADD} [data-ae="name"]`, "Zz Probe Agent");
  await page.fill(`${ADD} [data-ae="agency"]`, "Probe & Co");
  await page.keyboard.press("Tab");
  await page.click('[data-ac="card"] [data-ae="save"]');
  /* the refusal lands in the foot, and the card STAYS — a closed card would read as a successful
     add that silently was not */
  await expect(page.locator('[data-ac="card"] [data-ae="sum-bad"]')).toContainText("capped at 5");
  expect(await page.locator(ADD).count(), "the card closed on a refused add").toBe(1);
  await page.click('[data-ac="card"] [data-ae="cancel"]');
  await page.click('[data-ac="card"] [data-ae="discard"]');
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  const out = execSync("node tests/e2e/cleanupProbeAgent.mjs", { encoding: "utf8" });
  expect(out, "a refused add still wrote the agent").toContain("deleted 0 agent");
  bump(5);
});

test("§11.9 after adding (the lab, over known content) — under its letter, centred, ringed", async ({ page }) => {
  /* the lab mounts the REAL page over the fixture with a local addAgent, no sign-in, no account
     writes — the choreography (band, scroll, ring) is the page's own; only the writer is local */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/contact-lab");
  await page.waitForSelector('[data-lab-view="cast"]');
  await page.click('[data-lab-view="cast"]');
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="row"]`);
  await openAddCard(page, scope);
  await page.waitForSelector(ADD);
  await page.fill(`${ADD} [data-ae="name"]`, "Zz Probe Agent");
  await page.fill(`${ADD} [data-ae="agency"]`, "Probe & Co");
  await page.keyboard.press("Tab");
  await page.click('[data-ac="card"] [data-ae="save"]');
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  const row = page.locator(`${scope} [data-clv="row"]`, { hasText: "Zz Probe Agent" }).first();
  await expect(row, "the new row never rendered").toBeVisible();
  /* the ring — the class is the lock (the harness kills animations, and reduced motion shows
     the same ring statically; either way the CLASS is what carries it) */
  const ringed = await row.evaluate((el) => el.classList.contains("clv-row--new"));
  expect(ringed, "the new row carries no ring").toBe(true);
  /* v12 P2 (3 Oct): the page opens on the card index, so the nearest preceding divider names
     the agent's SURNAME INITIAL — "Zz Probe Agent"'s surname is "Agent", the A divider. */
  const band = await row.evaluate((el) => {
    let n: Element | null = el;
    while (n) {
      let p = n.previousElementSibling;
      while (p) { if (p.matches('[data-clv="band"]')) return p.getAttribute("data-letter") ?? ""; p = p.previousElementSibling; }
      n = n.parentElement;
    }
    return "";
  });
  expect(band, "the new agent is not under its surname's letter").toBe("A");
  /* in view, centred: poll until two reads agree, then judge the rect */
  let last = -1;
  for (let i = 0; i < 30; i++) {
    const y = await row.evaluate((el) => el.getBoundingClientRect().top);
    if (Math.abs(y - last) < 1) break;
    last = y;
    await page.waitForTimeout(120);
  }
  const rect = await row.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { mid: (r.top + r.bottom) / 2, h: window.innerHeight };
  });
  expect(Math.abs(rect.mid - rect.h / 2), "the new row is not scrolled to the centre").toBeLessThanOrEqual(260);
  bump(5);
});

test("§11.7's third leg — saving a window that crosses today MOVES the row's group, and moves it back", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* a with-the-agent row whose send is older than a week on this fixture, so a one-week window
     crosses today and the row moves to Your move */
  const pick = await page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="row"][data-stand="agent"]`)] as HTMLElement[];
    return rows[0]?.dataset.agentCard ?? null;
  }, scope);
  expect(pick, "population first — no with-the-agent row under this scope").not.toBeNull();
  if (!pick) return;
  /* ⚠️ SNAPSHOT EVERYTHING THE SAVE CAN TOUCH, before it runs: the agent's window, and the
     deadline the fan-out rewrites on each of its queries (computeAgentDeadlineWrites) */
  const { db, uid } = await harnessDb();
  const aRef = doc(db, "users", uid, "agents", pick);
  const agentBefore = (await getDoc(aRef)).data() ?? {};
  const qBefore = (await getDocs(fsQuery(collection(db, "users", uid, "queries"), where("agentId", "==", pick)))).docs
    .map((d) => ({ ref: d.ref, data: d.data() }));
  let wrote = false;
  try {
    await page.click(`${scope} [data-agent-card="${pick}"]`);
    await page.waitForSelector('[data-ac="card"]');
    await page.click('[data-ac="card"] [data-ac="edit"]');
    await page.waitForSelector(ED);
    await toWork(page);
    /* to ONE week: from Unknown the first + is 6, then the minus walks down */
    if ((await weeksText(page)) === "Unknown") await page.click('[data-ac="card"] [data-ae="weeks"] [data-d="1"]');
    for (let i = 0; i < 30; i++) {
      const minus = page.locator('[data-ac="card"] [data-ae="weeks"] [data-d="-1"]');
      if (await minus.isDisabled()) break;
      await minus.click();
    }
    expect(await weeksText(page)).toBe("1 week");
    wrote = true;
    await page.click('[data-ac="card"] [data-ae="save"]');
    await page.waitForSelector('[data-ac="card"] [data-ac="head"]', { timeout: 15_000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-ac="card"]', { state: "detached" });
    const moved = await page.evaluate(
      ({ scope, id }) => (document.querySelector(`${scope} [data-agent-card="${id}"]`) as HTMLElement | null)?.dataset.stand ?? "",
      { scope, id: pick },
    );
    expect(moved, "the save did not move the row to Your move — the group is not reading the engine").toBe("you");
    bump(2);
  } finally {
    if (wrote) {
      /* ⚠️ RESTORED THROUGH THE STORE: the card has no road back to Unknown (decision 9), and the
         save fanned new deadlines out to this agent's queries — every one goes back as it was */
      await updateDoc(aRef, { responseTimeWeeks: "responseTimeWeeks" in agentBefore ? agentBefore.responseTimeWeeks : deleteField() });
      for (const q of qBefore) {
        await updateDoc(q.ref, { responseDeadline: "responseDeadline" in q.data ? q.data.responseDeadline : deleteField() });
      }
      await expect.poll(() => page.evaluate(
        ({ scope, id }) => (document.querySelector(`${scope} [data-agent-card="${id}"]`) as HTMLElement | null)?.dataset.stand ?? "",
        { scope, id: pick },
      ), { message: "THE RESTORE DID NOT LAND — the account's window is changed", timeout: 15_000 }).toBe("agent");
      const now = (await getDoc(aRef)).data() ?? {};
      expect(JSON.stringify(now.responseTimeWeeks ?? null), "THE AGENT'S WINDOW WAS NOT RESTORED").toBe(JSON.stringify(agentBefore.responseTimeWeeks ?? null));
      bump(2);
    }
  }
});

/* ══════════════════════════ phase 6 — Housekeeping (§9 / §11.2 / §11.8) ══════════════════════════ */

/* the rail tray's counts line and toggle are RETIRED by v13 P4 with the rail; HK v2 (P5) rebuilds both in the drawer. RETIRED-contact-list-v13.md */

/* §11.8's inline reply box (in the rail) is RETIRED by v13 P4 with the rail; HK v2 §9 (P5) holds its successor. RETIRED-contact-list-v13.md */

/* §11.8's three rail fixes are RETIRED by v13 P4 with the rail; HK v2 §9 (P5) holds their successors. RETIRED-contact-list-v13.md */

/* ═════════════ Query actions v1 follow-through — the log doors open the drawer IN PLACE ═════════════ */

test("Log query opens the query drawer on this page — no navigation, the agent carried (both doors)", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* door 1: the row's hover tray on a never-queried, open-door agent (v13 P4: the v11 mini retired
     into the tray, whose step is the card's own — Log a query here) */
  const row = page.locator(`${scope} [data-clv="row"][data-stand="none"][data-door="open"]`).first();
  const who = (await row.locator(".clv-rwho b").textContent())?.trim() ?? "";
  expect(who.length, "population first — no never-queried, open-door row").toBeGreaterThan(0);
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await row.locator('[data-cl13="tray-act"]').click();
  /* the drawer ROOT is a boxless wrapper — wait for ATTACHMENT; the content assertions carry visibility */
  await page.waitForSelector("[data-qad-root].is-open", { state: "attached" });
  const after = await page.evaluate(() => ({
    path: window.location.pathname,
    drawer: (document.querySelector("[data-qad-root]") as HTMLElement).textContent ?? "",
  }));
  expect(after.path, "the log door NAVIGATED — the drawer must open in place (query actions v1: every page finishes in the drawer)").toBe("/agents");
  expect(after.drawer, "the agent did not carry into the drawer").toContain(who);
  /* the drawer's own dismissal layers (Escape steps back one; ✕ raises the discard bar) are its
     suite's business — nothing is committed here, so a reload is the honest reset between doors */
  await page.reload();
  /* the reload rebuilt the DOM, so visiblePage's tag went with it — let the app come back
     through its splash, then re-derive the scope */
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".agl-wpg")].some((e) => e.getBoundingClientRect().height > 0));
  const scope2 = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope2} [data-clv="row"]`);
  /* door 2: the agent card's Log a query — the card yields to the drawer (one asking surface at a
     time). Retargeted (Agent card v1 P5): it no longer CLOSES, it DOCKS — mounted, so it comes back
     where it was, but stepped aside: out of reach and out of sight (lock 7 holds the rest) */
  await page.click(`${scope2} [data-clv="row"][data-stand="none"][data-door="open"]`);
  await page.waitForSelector('[data-ac="card"]');
  await page.click('[data-ac="card"] [data-ac="primary"][data-act="log"]');
  await page.waitForSelector("[data-qad-root].is-open", { state: "attached" });
  expect(await page.evaluate(() => window.location.pathname)).toBe("/agents");
  await expect(page.locator('[data-ac="overlay"].is-docked'), "the card stayed up behind the drawer — two asking surfaces at once").toHaveCount(1, { timeout: 5_000 });
  await expect(page.locator('[data-ac="card"]'), "a docked card is still on screen").toBeHidden();
  bump(5);
});


/* ══════════════════════════ v12 P1 — the hero (§10.1), the pills, and the quick-add's absence ══════════════════════════ */

/* v12 §10.1 (the open hero at the QC's height, the full painting on the column's edge) is RETIRED by
   Contact list v13 §2: the hero is the band, held by contactV13 CL13-1. It was already red on main
   before v13 (the QC's header became the band in v126). See RETIRED-contact-list-v13.md. */

test("v12 P1 — + Add an agent opens the centred card directly; no quick-add exists; Discover navigates", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.click(`${scope} [data-cl15="add"]`); /* v15 §2: the open header's own button */
  /* (P3: the add card is the agent card's editor, opened empty) */
  await page.waitForSelector('[data-ac="card"] [data-ae-mode="new"]');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("data-ae") ?? ""),
    { message: "the card opens name-focused" }).toBe("name");
  expect(await page.locator('[data-clv="quickadd"]').count(), "the quick-add drop came back").toBe(0);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  await page.click(`${scope} [data-cl15="discover"]`);
  await page.waitForURL(/\/agents\/discover/);
  bump(3);
});

/* ══════════════════════════ v12 P2 — the index strip (§10.2) and the re-dressed head (§10.3) ══════════════════════════ */

test("v12 §10.2 — 27 cells; every cell's count IS its section's rows; a click lands the divider on its margin, marked", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  await page.waitForSelector(`${scope} [data-clv="idx"]`);

  /* ── the census: strip cells against the dividers against the rows — three derivations of one
     partition, compared to each other, never to literals. Per-branch population asserted: a run
     with no lettered cells, or no letterless ones, proves nothing about the split. ── */
  const census = await page.evaluate((scope) => {
    const cells = [...document.querySelectorAll(`${scope} [data-clv="ixtab"]`)] as HTMLElement[];
    const all = document.querySelector(`${scope} [data-clv="ixall"]`) as HTMLElement | null;
    const bands = [...document.querySelectorAll(`${scope} [data-clv="band"]`)] as HTMLElement[];
    const perBand = bands.map((b) => {
      let n = 0;
      for (let el = b.nextElementSibling; el && !el.matches('[data-clv="band"]'); el = el.nextElementSibling) {
        if (el.matches("[data-agent-card]")) n += 1;
      }
      /* v12 P3: the divider's <i> became the RULE; the count is the <small>'s leading number */
      /* v14 P5: the count is the shared divider's `em` (data-cl13="gcount") now */
      return { letter: b.dataset.letter ?? "", band: parseInt(b.querySelector('[data-cl13="gcount"]')?.textContent ?? "", 10), rows: n };
    });
    const perCell = cells.map((c) => ({
      letter: c.dataset.letter ?? "",
      has: c.classList.contains("has"),
      disabled: (c as HTMLButtonElement).disabled,
      n: Number(c.querySelector("i")?.textContent ?? "0"),
    }));
    const rowCount = document.querySelectorAll(`${scope} [data-agent-card]`).length;
    return { cells: perCell, bands: perBand, allText: (all?.textContent ?? "").trim(), rowCount };
  }, scope);

  expect(census.cells.length, "26 letter cells").toBe(26);
  expect(census.allText).toBe(`All · ${census.rowCount}`);
  const lettered = census.cells.filter((c) => c.has);
  const bare = census.cells.filter((c) => !c.has);
  expect(lettered.length, "per-branch population: some cells carry agents").toBeGreaterThan(2);
  expect(bare.length, "per-branch population: some cells are empty").toBeGreaterThan(2);
  for (const c of bare) expect(c.disabled, `the bare ${c.letter} cell is inert`).toBe(true);
  /* cell count == divider count == rows under the divider, letter by letter */
  expect(census.bands.map((b) => b.letter)).toEqual(lettered.map((c) => c.letter));
  for (const b of census.bands) {
    const cell = lettered.find((c) => c.letter === b.letter)!;
    expect(cell?.n, `the ${b.letter} cell's count is its divider's`).toBe(b.band);
    expect(b.rows, `the ${b.letter} divider's count is its rows`).toBe(b.band);
  }
  /* the cells' sum is the tally's shown count */
  expect(lettered.reduce((s, c) => s + c.n, 0)).toBe(census.rowCount);
  bump(8 + bare.length + census.bands.length * 2);

  /* ── the click: pick a letter; the divider lands where its OWN scroll-margin-top (net of the
     scroller's scroll-padding-top) puts it — clear of the sticky slim bar — and the cell marks in
     the discs' ink. v13 P4: the strip is no longer sticky, so the landing is read against the
     values that place it, never against the strip. ⚠️ THE SETTLE MUST SEE THE SCROLL *LEAVE*
     FIRST (a smooth scroll's startup standstill reads as "stable"). The target is the SECOND
     divider: the LAST has too little content beneath it to reach the landing line. ── */
  const target = census.bands[1].letter;
  const startTop = await page.evaluate((scope) => (document.querySelector(`${scope} .wpg-scroll`) as HTMLElement).scrollTop, scope);
  await page.click(`${scope} [data-clv="ixtab"][data-letter="${target}"]`);
  await page.waitForFunction(([scope, startTop]) => {
    const sc = document.querySelector(`${scope} .wpg-scroll`) as HTMLElement;
    const w = window as unknown as { __clvLast?: number; __clvHold?: number };
    if (sc.scrollTop === startTop) { w.__clvHold = 0; w.__clvLast = sc.scrollTop; return false; }
    const same = w.__clvLast === sc.scrollTop;
    w.__clvHold = same ? (w.__clvHold ?? 0) + 1 : 0;
    w.__clvLast = sc.scrollTop;
    return same && (w.__clvHold ?? 0) >= 3;
  }, [scope, startTop] as const, { timeout: 10000 });
  const landed = await page.evaluate(([scope, target]) => {
    const sc = document.querySelector(`${scope} .wpg-scroll`) as HTMLElement;
    const band = document.querySelector(`${scope} [data-clv="band"][data-letter="${target}"]`) as HTMLElement;
    const cell = document.querySelector(`${scope} [data-clv="ixtab"][data-letter="${target}"]`) as HTMLElement;
    const bar = document.querySelector(`${scope} [data-sbar="contacts"] .sbar-in`) as HTMLElement | null;
    const disc = document.querySelector(`${scope} .clv-ini`) as HTMLElement;
    const discBg = getComputedStyle(disc).backgroundColor;
    const cellBg = getComputedStyle(cell).backgroundColor;
    const want = sc.getBoundingClientRect().top + (parseFloat(getComputedStyle(sc).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(band).scrollMarginTop) || 0);
    const top = band.getBoundingClientRect().top;
    return {
      off: top - want,
      clear: bar ? top - bar.getBoundingClientRect().bottom : null,
      marked: cell.classList.contains("on"),
      inkMatch: cellBg === discBg,
      detail: `top ${top.toFixed(1)} want ${want.toFixed(1)} bar ${bar ? bar.getBoundingClientRect().bottom.toFixed(1) : "none"} cell ${cellBg} disc ${discBg}`,
    };
  }, [scope, target] as const);
  expect(Math.abs(landed.off), `the divider lands on its own scroll margin — ${landed.detail}`).toBeLessThanOrEqual(2);
  /* RETIRED (Contact list v14, ruling Q7, 7 Oct): "the divider lands clear of the slim bar" — the slim bar retired
     with the open banner (RETIRED-contact-list-v14.md). The landing on its own margin and the mark still hold. */
  expect(landed.marked, "the picked cell is marked").toBe(true);
  expect(landed.inkMatch, `the marked cell wears the discs' own ink — ${landed.detail}`).toBe(true);

  /* ── All clears the mark and returns to the top of the list. The SAME settle as the landing:
     the derivation re-marks letters PASSING the strip mid-scroll (by design — it is a scroll-spy),
     so the mark is only judged once the scroll has departed and come to rest, plus one rAF pair
     for the derivation's final read to land in state. ── */
  const landedTop = await page.evaluate((scope) => (document.querySelector(`${scope} .wpg-scroll`) as HTMLElement).scrollTop, scope);
  await page.evaluate(() => { const w = window as unknown as { __clvLast?: number; __clvHold?: number }; delete w.__clvLast; delete w.__clvHold; });
  await page.click(`${scope} [data-clv="ixall"]`);
  await page.waitForFunction(([scope, from]) => {
    const sc = document.querySelector(`${scope} .wpg-scroll`) as HTMLElement;
    const w = window as unknown as { __clvLast?: number; __clvHold?: number };
    if (sc.scrollTop === from) { w.__clvHold = 0; w.__clvLast = sc.scrollTop; return false; }
    const same = w.__clvLast === sc.scrollTop;
    w.__clvHold = same ? (w.__clvHold ?? 0) + 1 : 0;
    w.__clvLast = sc.scrollTop;
    return same && (w.__clvHold ?? 0) >= 3;
  }, [scope, landedTop] as const, { timeout: 10000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const cleared = await page.evaluate((scope) => ({
    marked: !!document.querySelector(`${scope} [data-clv="ixtab"].on`),
  }), scope);
  expect(cleared.marked, "All clears the marked cell").toBe(false);
  bump(4);
});

/* v12 §10.3 (the head row: dashed title, tally, the controls dropping under) is RETIRED by v13 P3 — the
   open banner is the list's head (contactV13 CL13-B). RETIRED-contact-list-v13.md. */

/* v12 §10.4 (the slate divider tab on the ground) is RETIRED by v13 P4 — the tab is anthracite on a 2px rule inside the workspace (contactV13 CL13-5). RETIRED-contact-list-v13.md */

/* REWRITTEN (v14 P5): the row is v131's table grammar — four columns with the disc INSIDE the Agent column (its
   own 34px track retired), 22px right padding, and the wishlist on ONE line with a hover marquee, where v12 clamped
   it to two. The four-track, one-italic-line and every-row-has-a-wishlist-or-pill claims stand. */
test("v12 §10.5 — the dossier row: four tracks, one italic line, the one-line wishlist", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  const read = (w: number) => page.evaluate((scope) => {
    const rows = [...document.querySelectorAll(`${scope} [data-clv="row"]`)] as HTMLElement[];
    /* v13 P4: the 3px top strip retired — the 6px state edge replaces it (contactV13 CL13-6) */
    const first = rows[0];
    const cols = getComputedStyle(first).gridTemplateColumns.split(" ");
    const q = first.querySelector(".clv-rq") as HTMLElement;
    const pace = document.querySelectorAll(`${scope} .clv-rloc`).length;
    const italics = [...document.querySelectorAll(`${scope} .clv-ragy`)].map((e) => getComputedStyle(e).fontStyle);
    const minH = Math.min(...rows.map((x) => x.getBoundingClientRect().height));
    return {
      n: rows.length, cols, firstCol: parseFloat(cols[0] ?? "0"),
      qRight: Math.round((first.getBoundingClientRect().right - 22 - q.getBoundingClientRect().right) * 10) / 10,
      disc: (first.querySelector(".clv-ini") as HTMLElement | null)?.getBoundingClientRect().width ?? 0,
      pace, italics, minH,
      wishes: [...document.querySelectorAll(`${scope} .clv-rwish`)].length,
      tornWish: document.querySelectorAll(`${scope} [data-clv="torn-wish"]`).length,
    };
  }, scope);

  const r = await read(1440);
  expect(r.n, "population first").toBeGreaterThan(10);
  expect(r.cols.length, "four tracks at 1440").toBe(4);
  expect(r.disc, "the disc sits in the Agent column at the mock's 38").toBe(38);
  expect(Math.abs(r.qRight), "the query column ends on the row's padding edge").toBeLessThanOrEqual(1);
  expect(r.pace, "the v11 paceBits line is retired").toBe(0);
  expect(r.italics.length, "population: the one italic who line renders").toBeGreaterThan(5);
  for (const f of r.italics) expect(f).toBe("italic");
  expect(r.wishes + r.tornWish, "every row carries a wishlist or its torn slip").toBe(r.n);
  bump(7 + r.italics.length);

  /* the one line, under STRESS (the house law: growth must push, never overflow) — inject a long
     wishlist and the box holds at ONE line, its text running on past the box (v14: the marquee shows the rest) */
  const clamp = await page.evaluate((scope) => {
    const w = document.querySelector(`${scope} .clv-rwish .clv-mq`) as HTMLElement | null;
    const box = w?.parentElement as HTMLElement | null;
    if (!w || !box) return null;
    w.textContent = "Dark academia with a conscience, locked-room mysteries on moving vehicles, sisters who ruin each other politely, climate grief with jokes, heists where the real theft is emotional, and any book whose narrator lies to the reader for a structurally good reason.";
    const oneLine = parseFloat(getComputedStyle(box).lineHeight);
    return { h: box.getBoundingClientRect().height, twoLines: oneLine, clipped: w.scrollWidth > box.clientWidth + 1 };
  }, scope);
  expect(clamp, "no wishlist on the account to stress").not.toBeNull();
  expect(clamp!.h, `the wish holds at one line (${clamp!.h} vs ${clamp!.twoLines})`).toBeLessThanOrEqual(clamp!.twoLines + 1);
  expect(clamp!.clipped, "the line visibly runs on past its box on the injected text").toBe(true);
  bump(3);

  /* 1280: the same four columns on the narrow floors, 86px rows */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(250);
  const nr = await read(1280);
  expect(nr.cols.length, "still four tracks at 1280 — the v11 two-deck fold is retired").toBe(4);
  expect(nr.disc).toBe(38);
  /* v13 P4: with the rail gone the column at 1280 is no longer under the 720 container boundary, so
     the row keeps the mock's full template and its 80px floor (the 86 belonged to the narrow fold) */
  expect(nr.minH, "the row floors at the mock's 80").toBeGreaterThanOrEqual(79.5);
  bump(3);
});

/* ══════════════════════════ v12 P4 — Housekeeping's head in the slate (§10.6) ══════════════════════════ */

/* v12 §10.6 (the slate HK tray in the rail) is RETIRED by v13 P4 with the rail; HK v2's drawer (P5) replaces it. RETIRED-contact-list-v13.md */

/* ══════════════════════════ v12 P5 — the empty state: the ways, the banner, the previews (§10.7) ══════════════════════════ */

test("v12 §10.7 — the three ways in, the anthracite banner, and the two live previews", async ({ page }) => {
  await openRoute(page, "/agents", { width: 1440, height: 900 });
  const scope = await visiblePage(page, ".agl-wpg");
  /* the harness account has agents — the LH review aid holds the COUNT at 0, the page's own
     empty branch does the rest (the same door LH7/LH8 use) */
  await page.evaluate(() => {
    (window as unknown as { __SA_LH_COUNT?: number }).__SA_LH_COUNT = 0;
    window.dispatchEvent(new Event("sa:lh-count"));
  });
  await page.waitForSelector(`${scope} [data-clv="ways"]`);

  const r = await page.evaluate((scope) => {
    const grp = document.querySelector(`${scope} .clv-group`) as HTMLElement;
    const probe = document.createElement("i");
    probe.style.cssText = "position:absolute;visibility:hidden;background:var(--clv-btn);border-color:var(--clv-slate-tray)";
    grp.appendChild(probe);
    const btn = getComputedStyle(probe).backgroundColor;
    const slateTray = getComputedStyle(probe).borderColor;
    probe.remove();
    const typeFirst = getComputedStyle(grp).getPropertyValue("--sp-type").split(",")[0].trim().replace(/^"|"$/g, "");
    const ways = [...document.querySelectorAll(`${scope} [data-clv="ways"] .cd`)] as HTMLElement[];
    const pri = ways[0];
    const tpl = document.querySelector(`${scope} [data-clv="way-template"]`) as HTMLAnchorElement | null;
    const ban = document.querySelector(`${scope} [data-clv="eban"]`) as HTMLElement;
    const banBox = ban.getBoundingClientRect();
    const vis = document.querySelector(`${scope} [data-clv="vis"]`) as HTMLElement;
    const pics = [...vis.querySelectorAll(".clv-pic")] as HTMLElement[];
    const pv1 = vis.querySelector(".clv-pv1") as HTMLElement;
    const band = document.querySelector(`${scope} [data-lh="band"]`) as HTMLElement;
    return {
      btn, slateTray, typeFirst,
      n: ways.length,
      icoBg: ways.map((w) => getComputedStyle(w.querySelector(".clv-ico") as HTMLElement).backgroundColor),
      icoSize: (pri.querySelector(".clv-ico") as HTMLElement).getBoundingClientRect().width,
      priGo: getComputedStyle(pri.querySelector(".clv-cdgo") as HTMLElement).backgroundColor,
      otherGo: getComputedStyle(ways[1].querySelector(".clv-cdgo") as HTMLElement).backgroundColor,
      priIsImport: pri.getAttribute("data-clv") === "way-import",
      tplDownload: tpl ? tpl.hasAttribute("download") && (tpl.getAttribute("href") ?? "").endsWith(".xlsx") : false,
      h3Face: getComputedStyle(pri.querySelector("h3") as HTMLElement).fontFamily,
      banBg: getComputedStyle(ban).backgroundColor,
      banFace: getComputedStyle(ban.querySelector("h2") as HTMLElement).fontFamily,
      banCentred: getComputedStyle(ban).textAlign,
      banBox: { w: Math.round(banBox.width), h: Math.round(banBox.height) },
      banInBand: !!band && band.contains(ban),
      visCols: getComputedStyle(vis).gridTemplateColumns.split(" ").length,
      picH: pics.map((p) => Math.round(p.getBoundingClientRect().height)),
      masked: pics.map((p) => (getComputedStyle(p).maskImage ?? "none") !== "none" || ((getComputedStyle(p) as unknown as { webkitMaskImage?: string }).webkitMaskImage ?? "none") !== "none"),
      pvZoom: pv1 ? String((getComputedStyle(pv1) as unknown as { zoom?: string }).zoom ?? "") : "",
      pvRows: pv1 ? pv1.querySelectorAll('[data-clv="row"]').length : 0,
      pvDividers: pv1 ? pv1.querySelectorAll('[data-clv="band"]').length : 0,
      pvQVisible: pv1 ? [...pv1.querySelectorAll(".clv-rq")].filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).length : -1,
      pvWho: band ? band.querySelectorAll(".clv-rwho").length : 0,
      railInPv: !!vis.querySelector(".clv-pv2 .clv-tray"),
    };
  }, scope);

  expect(r.btn, "--clv-btn resolves (the two-nothings guard)").not.toBe("rgba(0, 0, 0, 0)");
  expect(r.n, "three ways in").toBe(3);
  expect(r.priIsImport, "Smart Import leads, recommended").toBe(true);
  expect(r.icoSize, "the 44px icon circle").toBe(44);
  for (const bg of r.icoBg) expect(bg, "the icon circles sit on the accent tray").toBe(r.slateTray);
  expect(r.priGo, "the recommended tile's pill is the ink").toBe(r.btn);
  expect(r.otherGo, "the other pills stay white").toBe("rgb(255, 255, 255)");
  expect(r.tplDownload, "the template tile is a real download of the xlsx").toBe(true);
  expect(r.h3Face, "the tile heading PAINTS machine (brand.tsx forces headings)").toContain(r.typeFirst);
  expect(r.banBg, "the banner is the ink").toBe(r.btn);
  expect(r.banFace, "the banner heading PAINTS machine").toContain(r.typeFirst);
  expect(r.banCentred).toBe("center");
  expect(r.banInBand, "the banner rides INSIDE the exhibition band (LH8's on-screen claim)").toBe(true);
  expect(r.banBox.h, `the banner's band (oracle 188 at its width; ours ${JSON.stringify(r.banBox)})`).toBeGreaterThanOrEqual(150);
  expect(r.banBox.h).toBeLessThanOrEqual(220);
  expect(r.visCols, "two features side by side").toBe(2);
  for (const h of r.picH) expect(h, "each preview window is the mock's 320").toBe(320);
  for (const m of r.masked) expect(m, "the preview's foot dissolves by mask").toBe(true);
  expect(r.pvZoom, "the previews render at the mock's .82").toBe("0.82");
  expect(r.pvRows, "the card-index preview renders real rows").toBeGreaterThanOrEqual(3);
  expect(r.pvDividers, "…under real letter dividers").toBeGreaterThanOrEqual(1);
  expect(r.pvQVisible, "the query column is HIDDEN in the preview").toBe(0);
  expect(r.pvWho, "the band feeds LH8 at least one .clv-rwho").toBeGreaterThanOrEqual(1);
  expect(r.railInPv, "the second feature is the rail, live").toBe(true);
  bump(21 + r.icoBg.length + r.picH.length + r.masked.length);

  /* the doors: Add opens the centred card (Escape closes); the import tile navigates — last */
  await page.click(`${scope} [data-clv="way-add"]`);
  await page.waitForSelector('[data-ac="card"] [data-ae-mode="new"]'); // (P3: the agent card's editor, empty)
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-ac="card"]', { state: "detached" });
  await page.click(`${scope} [data-clv="way-import"]`);
  await page.waitForURL(/\/import/);
  bump(2);
});
