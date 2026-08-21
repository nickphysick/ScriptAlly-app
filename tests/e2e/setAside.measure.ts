/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Set aside & tags" — measured, because reachability is the whole point of this work. Both
 * features were unreachable on main and on dev; a source lock proves a door was written, not that
 * it opens.
 *
 * ⚠️ ORDER IS PART OF THIS FILE, AND IT IS DECLARED RATHER THAN LUCKY. Every check runs against one
 * real account seeded by `seedSetAside.mjs`, and restoring is destructive: the checks that READ a
 * populated ledger come first, then the ones that CONSUME it. Two ordering bugs were written here
 * before that was stated — a first-row round trip that ate the seeded rule, and a geometry check
 * placed last that found an empty ledger — and both reported working code as broken. If you add a
 * check that needs rows, add it above "every kind restores"; if it needs a specific fixture kept
 * back, reserve it the way `RESERVED_RULE` is reserved.
 *
 *   node tests/e2e/seedSetAside.mjs   # before every run; --clean afterwards
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const DOOR = 'button[aria-label="Set aside and tags"]';

/** The rule row the board check below needs left alone — see `seedSetAside.mjs`. */
const RESERVED_RULE = "Stale queries";

/**
 * ⚠️ WAIT FOR THE STATE, NEVER FOR A DURATION. Every restore here is a Firestore write that reaches
 * the view through a listener, so "how long it takes" is a property of the network that day. A
 * fixed `waitForTimeout` turned this file amber: the same restore that measured 2 → 4 on one run
 * reported "STILL ABSENT" on the previous one, and the code was identical both times. A poll fails
 * for the right reason — the state never arrived — instead of for a reason nobody can reproduce.
 */
async function until(page: import("@playwright/test").Page, what: string, probe: () => Promise<boolean>, ms = 15000) {
  const started = Date.now();
  for (;;) {
    if (await probe()) return;
    if (Date.now() - started > ms) throw new Error(`timed out after ${ms}ms waiting for: ${what}`);
    await page.waitForTimeout(250);
  }
}

test("the door is on the board's tool row and opens the panel", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  expect(await page.locator(DOOR).count(), "the door must exist").toBe(1);

  await page.locator(DOOR).click();
  await page.waitForTimeout(400);
  const panel = page.locator(".sap");
  expect(await panel.count(), "the panel must open").toBe(1);

  const tabs = await page.locator(".sap-tab").allTextContents();
  console.log("TABS", JSON.stringify(tabs));
  expect(tabs.length).toBe(2);
  expect(tabs.join(" ")).toContain("Tags");
});

test("the set-aside pane lists what is hidden, or says plainly that nothing is", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".sap-row")].map((r) => ({
      label: r.querySelector(".sap-label")?.textContent ?? "",
      meta: r.querySelector(".sap-meta")?.textContent ?? "",
      kind: [...r.classList].find((c) => c.startsWith("sap-row--")) ?? "",
      restorable: !!r.querySelector(".sap-restore"),
    }));
    return { rows, empty: document.querySelector(".sap-empty")?.textContent ?? null,
             foot: document.querySelector(".sap-foot")?.textContent ?? null };
  });
  console.log("SET ASIDE", JSON.stringify(state, null, 1).slice(0, 700));

  /* ⚠️ THE DOOR IS REACHABLE EITHER WAY — that is the reversal this build made deliberately. */
  if (state.rows.length === 0) {
    expect(state.empty, "an empty ledger must still say what it is").toContain("Nothing set aside");
  } else {
    for (const r of state.rows) {
      expect(r.label.length, "every row names what it is").toBeGreaterThan(0);
      expect(r.meta.length, "and states why it is hidden").toBeGreaterThan(0);
      expect(r.restorable, `${r.label} has no Restore`).toBe(true);
    }
    expect(state.foot).toContain("Nothing here is deleted");
    /* a rule mute carries no date and must not invent one */
    for (const r of state.rows.filter((x) => x.kind === "sap-row--rule")) {
      expect(r.meta).toBe("MUTED AS A RULE");
    }
  }
});

test("the tags pane restores tag management, with its CRUD intact", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(400);
  await page.locator('.sap-tab:has-text("Tags")').click();
  await page.waitForTimeout(300);

  const pane = await page.locator("#sap-pane-tags").textContent();
  console.log("TAGS PANE", (pane ?? "").replace(/\s+/g, " ").slice(0, 220));
  expect(pane).toContain("Rename, recolour, retire.");
  expect(pane, "the consequence of deleting is stated before it happens")
    .toContain("detaches it from your notes and tasks");
});

test("the panel closes on Escape and returns focus to its door", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(400);
  expect(await page.locator(".sap").count()).toBe(1);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  expect(await page.locator(".sap").count(), "Escape must close it").toBe(0);
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? null);
  console.log("focus after Escape:", focused);
  expect(focused, "focus must return to the door").toBe("Set aside and tags");
});

/* ⚠️ THE FIRST-ROW ROUND TRIP LIVED HERE AND WAS DELETED RATHER THAN KEPT. It restored whatever
   sat at the top of the ledger — which is a RULE, because rules sort first — so it consumed the
   seeded rule before the per-kind check below could reach it, and that check then reported the
   rule kind missing. A test that mutates shared state and a test that reads it are not two tests;
   they are one test with an ordering bug. The per-kind version below subsumes it completely. */

/**
 * ⚠️ ALL THREE KINDS, SEEDED, because the ledger's whole claim is that it holds three different
 * things and one surviving kind would let the other two rot unnoticed. `seedSetAside.mjs` writes
 * the states the board's own forks write — not lookalikes — so what passes here passes there.
 */
test("the ledger holds all three kinds, each labelled for what it actually is", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(500);

  const rows = await page.evaluate(() => [...document.querySelectorAll(".sap-row")].map((r) => ({
    label: r.querySelector(".sap-label")?.textContent ?? "",
    meta: r.querySelector(".sap-meta")?.textContent ?? "",
    kind: ([...r.classList].find((c) => c.startsWith("sap-row--")) ?? "").replace("sap-row--", ""),
  })));
  console.log("LEDGER\n" + rows.map((r) => `  ${r.kind.padEnd(9)} ${r.label}  ·  ${r.meta}`).join("\n"));

  const byKind = (k: string) => rows.filter((r) => r.kind === k);
  expect(byKind("rule").length, "a muted rule must be listed").toBeGreaterThan(0);
  expect(byKind("dismissed").length, "a permanent dismissal must be listed").toBeGreaterThan(0);
  expect(byKind("snoozed").length, "a live snooze must be listed").toBeGreaterThan(0);

  /* a rule carries no stored date and must not print one */
  for (const r of byKind("rule")) expect(r.meta).toBe("MUTED AS A RULE");
  /* a dismissal states itself rather than the year 3000 the sentinel actually holds */
  for (const r of byKind("dismissed")) expect(r.meta).toBe("DISMISSED");
  /* ⚠️ AND A SNOOZE STATES ITS RETURN DATE — the one kind that HAS a date must show it, or the
     writer cannot tell an item coming back next week from one gone for good. */
  for (const r of byKind("snoozed")) expect(r.meta, r.label).toMatch(/^SNOOZED UNTIL \d{1,2} \w{3}$/);

  /* every row names a real subject — a fallback "task" would mean flagSubject resolved nothing */
  for (const r of rows) expect(r.label.length, JSON.stringify(r)).toBeGreaterThan(4);
});

/**
 * ⚠️ ONE RIGHT EDGE FOR EVERY RESTORE, MEASURED. The row used to wrap, so a long label put its
 * control underneath while its neighbours kept theirs on the right — the same control in two
 * places in one list. A CSS lock would only prove `flex-wrap: nowrap` was typed; what matters is
 * where the button lands next to the longest label the data actually produces.
 */
test("every Restore shares one right edge, whatever the label's length", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(500);

  const geom = await page.evaluate(() => [...document.querySelectorAll(".sap-row")].map((r) => {
    const b = r.querySelector(".sap-restore")!.getBoundingClientRect();
    const row = r.getBoundingClientRect();
    return { label: r.querySelector(".sap-label")!.textContent ?? "", right: Math.round(b.right),
             lines: Math.round(row.height), sameLine: b.top >= row.top && b.bottom <= row.bottom };
  }));
  console.log("ROW GEOMETRY\n" + geom.map((g) =>
    `  right ${g.right}  h ${String(g.lines).padStart(3)}  ${g.label}`).join("\n"));
  expect(geom.length, "the ledger must be populated for this to mean anything").toBeGreaterThan(1);

  /* ⚠️ THE PRECONDITION: a label long enough to have wrapped before. Without one the check passes
     on rows that were never at risk, which is the shape that goes green having measured nothing. */
  expect(Math.max(...geom.map((g) => g.label.length)),
    "no long label present — this check would be vacuous").toBeGreaterThan(28);

  const edges = new Set(geom.map((g) => g.right));
  expect([...edges], `Restore sits at ${[...edges].join(", ")} — the rows disagree`).toHaveLength(1);
  for (const g of geom) expect(g.sameLine, `"${g.label}" pushed its button out of the row`).toBe(true);
});

/**
 * ⚠️ NOTHING IN THE TAGS PANE IS CLIPPED BY THE PANEL, at any label length the model allows. The
 * row ran past the 254px pane and cut "Delete" off — the one control with a confirmation guard in
 * front of it, lost to a width. A CSS lock proves a wrap was typed; only the rendered box says
 * whether the control is on screen and clickable.
 */
test("no tag control is clipped by the panel edge", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.locator(DOOR).click();
  await page.waitForTimeout(450);
  await page.locator('.sap-tab:has-text("Tags")').click();
  await page.waitForTimeout(400);

  /* ⚠️ THE WORST CASE IS SEEDED, not hoped for: `normaliseTagLabel` caps a label at 24 characters,
     so a 24-character tag is the widest row the app can ever render. Measuring the two short
     seeded tags would pass on rows that were never at risk. */
  const long = "abcdefghijklmnopqrstuvwx";
  await page.locator(".tdb-tsettagl").first().click();
  await page.waitForTimeout(200);
  const field = page.locator(".tdb-tsettagin").first();
  await field.fill(long);
  await field.press("Enter");
  await until(page, "the long label to land",
    async () => (await page.locator(`.tdb-tsettagl:has-text("${long}")`).count()) === 1);

  const clip = await page.evaluate(() => {
    const pane = document.querySelector(".sap")!.getBoundingClientRect();
    return [...document.querySelectorAll(".tdb-tsettag")].flatMap((row) =>
      [...row.querySelectorAll("button, .tdb-tsettagct")].map((el) => {
        const r = el.getBoundingClientRect();
        return { what: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 18),
                 over: Math.round(r.right - pane.right), w: Math.round(r.width) };
      }));
  });
  const spilled = clip.filter((c) => c.over > 0 || c.w === 0);
  console.log(`tag controls measured: ${clip.length} · widest overhang ${Math.max(...clip.map((c) => c.over))}px`);
  if (spilled.length) console.log("SPILLED", JSON.stringify(spilled));
  expect(clip.length, "controls must have been found at all").toBeGreaterThan(6);
  expect(spilled, "a control is outside the panel").toHaveLength(0);

  /* put the label back so the CRUD check downstream finds what it expects */
  await page.locator(`.tdb-tsettagl:has-text("${long}")`).click();
  await page.waitForTimeout(200);
  const f2 = page.locator(".tdb-tsettagin").first();
  await f2.fill("revisions");
  await f2.press("Enter");
  await until(page, "the label to be restored",
    async () => (await page.locator('.tdb-tsettagl:has-text("revisions")').count()) === 1);
  await page.keyboard.press("Escape");
});

/**
 * ⚠️ THE ROUND TRIP FOR EACH KIND SEPARATELY. Restoring a rule and restoring a flag are two
 * different writes (`updateUserProfile` vs `upsertTaskFlag`), so one working proves nothing about
 * the other — and the whole regression this pack repairs was a surface that looked present and
 * reached nothing.
 */
test("every kind restores, and the door's marker follows the ledger down", async ({ page }) => {
  await openRoute(page, "/todo", { width: 1440, height: 900 });

  for (const kind of ["rule", "dismissed", "snoozed"]) {
    await page.locator(DOOR).click();
    await page.waitForTimeout(450);
    /* ⚠️ THE RESERVED ROW IS SKIPPED, not by luck of ordering. Tests in one file share one account,
       so a check that consumes a fixture another check needs is an ordering bug wearing a green
       tick until the day the order changes. */
    const row = kind === "rule"
      ? page.locator(".sap-row--rule").filter({ hasNotText: RESERVED_RULE }).first()
      : page.locator(`.sap-row--${kind}`).first();
    expect(await row.count(), `${kind} must be present to restore`).toBe(1);
    const label = await row.locator(".sap-label").textContent();
    const before = await page.locator(".sap-row").count();

    await row.locator(".sap-restore").click();
    await until(page, `the ${kind} row to leave the ledger`,
      async () => (await page.locator(".sap-row").count()) === before - 1);

    const after = await page.locator(".sap-row").count();
    console.log(`restored ${kind.padEnd(9)} "${label}" — rows ${before} → ${after}`);
    expect(after, `${kind} did not leave the ledger`).toBe(before - 1);
    expect(await page.locator(`.sap-row:has-text("${label}")`).count(), `"${label}" is still listed`).toBe(0);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
  }

  /* ⚠️ THE DOOR IS THE WITNESS. Its count reads the same `hiddenItems`, so an emptied ledger that
     left the marker lit would mean the two had forked — which is the fault that put the ledger in
     settings in the first place. */
  await page.locator(DOOR).click();
  await page.waitForTimeout(450);
  const left = await page.locator(".sap-row").allTextContents();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  const dot = await page.locator(`${DOOR} .l-icondot`).count();
  console.log(`ledger now holds ${left.length}: ${JSON.stringify(left)} · door marker: ${dot}`);
  expect(left.length, "only the reserved rule should remain").toBe(1);
  expect(left[0]).toContain(RESERVED_RULE);
  expect(dot, "a ledger that still holds something must keep the marker lit").toBe(1);
});

/**
 * ⚠️ TAG CRUD ACTED ON, NOT READ. The pane's copy check above proves the surface renders; it says
 * nothing about whether renaming, recolouring or deleting still reaches the profile — which is the
 * exact class of claim that let this feature sit unreachable for a release. Every step below
 * changes real data and re-reads it from a reopened panel.
 */
test("a tag renames, recolours and deletes — and the delete arms before it acts", async ({ page }) => {
  const openTags = async () => {
    await page.locator(DOOR).click();
    await page.waitForTimeout(450);
    await page.locator('.sap-tab:has-text("Tags")').click();
    await page.waitForTimeout(300);
  };
  const rows = () => page.evaluate(() => [...document.querySelectorAll(".tdb-tsettag")].map((r) => ({
    /* the row renders "#label"; the stored label is what everything else compares against */
    label: ((r.querySelector(".tdb-tsettagin") as HTMLInputElement | null)?.value
        ?? r.querySelector(".tdb-tsettagl")?.textContent ?? "").replace(/^#/, ""),
    swatch: getComputedStyle(r.querySelector(".tdb-tsettagsw")!).backgroundColor,
  })));

  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await openTags();
  const before = await rows();
  console.log("TAGS", JSON.stringify(before));
  expect(before.length, "seeded tags must be present").toBe(2);

  /* ── rename ─────────────────────────────────────────────────────────────── */
  await page.locator('.tdb-tsettagl:has-text("revisions")').click();
  await page.waitForTimeout(200);
  const field = page.locator(".tdb-tsettagin").first();
  /* ⚠️ TYPED WITH A SPACE, ON PURPOSE — `normaliseTagLabel` lowercases and strips it, so the value
     that must come back is "seconddraft". Asserting the typed string would fail against correct
     code; asserting the normalised one proves the writer's input went through the real rule. */
  await field.fill("Second Draft");
  await field.press("Enter");
  await until(page, "the rename to land", async () => (await rows()).some((r) => r.label === "seconddraft"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  await openTags();
  let now = await rows();
  console.log("after rename", JSON.stringify(now.map((r) => r.label)));
  expect(now.map((r) => r.label).join("|"), "the rename must survive a reopen").toContain("seconddraft");

  /* ── recolour ───────────────────────────────────────────────────────────── */
  const swatchBefore = now.find((r) => r.label === "seconddraft")!.swatch;
  await page.locator('.tdb-tsettagpal[aria-label*="seconddraft"] button[aria-label="butter"]').click();
  await until(page, "the recolour to land",
    async () => (await rows()).find((r) => r.label === "seconddraft")?.swatch !== swatchBefore);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  await openTags();
  now = await rows();
  const swatchAfter = now.find((r) => r.label === "seconddraft")!.swatch;
  console.log(`recolour ${swatchBefore} → ${swatchAfter}`);
  expect(swatchAfter, "the swatch must actually change").not.toBe(swatchBefore);

  /* ── delete, and the guard in front of it ───────────────────────────────── */
  const row = page.locator('.tdb-tsettag:has(.tdb-tsettagl:has-text("chasing"))').first();
  await row.locator(".tdb-tsettagdel").click();
  await page.waitForTimeout(250);
  /* ⚠️ THE ARM IS THE POINT — one click must NOT delete. */
  const armed = await row.locator(".tdb-tsettagdel.armed").count();
  const stillThere = (await rows()).length;
  console.log(`armed: ${armed === 1} · rows after the first click: ${stillThere}`);
  expect(armed, "the first click must arm, not act").toBe(1);
  expect(stillThere, "nothing may be deleted by the arming click").toBe(2);

  await row.locator(".tdb-tsettagdel.armed").click();
  await until(page, "the tag to be deleted", async () => (await rows()).length === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  await openTags();
  const after = await rows();
  console.log("after delete", JSON.stringify(after.map((r) => r.label)));
  expect(after.length, "the confirmed delete must remove exactly one").toBe(1);
  expect(after[0].label).toContain("seconddraft");
  await page.keyboard.press("Escape");
});

/**
 * ⚠️ UN-MUTING MUST BRING THE REMINDER BACK, NOT JUST CLEAR THE ROW. A ledger that removes an entry
 * without the thing it named returning is a ledger of promises. The board's own card is the
 * witness: `no_response_close` renders "Consider closing", and the rule mute is what suppresses it.
 *
 * ⚠️ AND IT ASSERTS ITS PRECONDITION, because the absence of a card proves nothing on its own. A
 * rule with no live subjects generates nothing in EITHER state, so "absent while muted" would be
 * satisfied by a mute that does not work — measured on `dq_mswl`, which qualifies twelve agents on
 * this account and still produces no card. The housekeeping group must be showing other work, and
 * the count must MOVE, or the reading is vacuous.
 */
test("a restored rule puts its reminder back on the board", async ({ page }) => {
  const CARD = /Consider closing/;
  const hkCount = async () => {
    const t = await page.locator("body").innerText();
    return Number((t.match(/HOUSEKEEPING\s+(\d+)/) ?? [])[1] ?? NaN);
  };

  await openRoute(page, "/todo", { width: 1440, height: 900 });

  const mutedTxt = await page.locator("body").innerText();
  const mutedN = await hkCount();
  console.log(`while muted · housekeeping ${mutedN} · "Consider closing" ${CARD.test(mutedTxt) ? "PRESENT" : "absent"}`);
  expect(CARD.test(mutedTxt), "a muted rule must not render its card").toBe(false);
  /* the precondition: the group is alive and showing OTHER housekeeping work */
  expect(mutedN, "housekeeping must be showing something, or the absence is vacuous").toBeGreaterThan(0);
  expect(mutedTxt).toMatch(/Fill in what you sent|missing their materials/i);

  await page.locator(DOOR).click();
  await page.waitForTimeout(450);
  const row = page.locator(".sap-row--rule").first();
  expect(await row.count(), "the mute must be listed while it is in force").toBe(1);
  await row.locator(".sap-restore").click();
  await until(page, "the ledger to drop the rule", async () => (await page.locator(".sap-row--rule").count()) === 0);
  await page.keyboard.press("Escape");
  await until(page, "the reminder to regenerate",
    async () => CARD.test(await page.locator("body").innerText()));

  const backTxt = await page.locator("body").innerText();
  const backN = await hkCount();
  const hit = backTxt.match(CARD);
  console.log(`after restoring  · housekeeping ${backN} · ${hit ? `"${hit[0]}" is back` : "STILL ABSENT"}`);
  expect(hit, "un-muting must let the reminder generate again").not.toBeNull();
  expect(backN, "and the group's own count must rise with it").toBeGreaterThan(mutedN);

  /* ⚠️ AND THE EMPTY STATE, MEASURED AT THE ONE MOMENT IT IS TRUE. This was the last thing set
     aside, so the ledger is now genuinely empty — and the door must still be there, which is the
     reversal this build made deliberately (the old ledger hid itself at zero). */
  await page.locator(DOOR).click();
  await page.waitForTimeout(450);
  const rows = await page.locator(".sap-row").count();
  const empty = await page.locator(".sap-empty").textContent();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  const dot = await page.locator(`${DOOR} .l-icondot`).count();
  console.log(`ledger now ${rows} rows · empty line: ${JSON.stringify(empty)} · door marker: ${dot}`);
  expect(rows).toBe(0);
  expect(empty).toContain("Nothing set aside");
  expect(dot, "an empty ledger must clear the door's marker").toBe(0);
  expect(await page.locator(DOOR).count(), "the door must remain reachable at zero").toBe(1);
});
