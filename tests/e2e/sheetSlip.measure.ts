/**
 * ⚠️ THE SHEET AND THE QUICK REFERENCE — drawer round Phase 3, RETARGETED by the tightened
 * round's Phase 4 (5 Sep). The reference was a floating SLIP beside the sheet; it is a COLUMN OF
 * THE SHEET now, so every claim below that was about the slip's own card — its rim, its bookmark
 * tab, its 264px slot — is either restated about the column or DELETED with its object. What
 * survives unchanged is the pair of laws this file exists for, and they matter more, not less:
 * the WRAP LAW (now: the DOCUMENT's width cannot change when the reference is put aside) and the
 * HEIGHT RULE, whose from-parts derivation and branch tally are still the strongest statement of
 * it anywhere in the suite.
 *
 * The three floating cards become ONE framed object and one slip beside it. Two of the claims
 * below were written and PROVED RED against the three-card build before a line of it was changed,
 * because they are the two that decide the shape:
 *
 *   · THE WRAP LAW — nothing about the slip's state reaches the band, so the deed's width cannot
 *     change when the slip is dismissed. The mockup this is built from does NOT obey it: its
 *     `.wcol` is `flex: 1 1 auto`, so dismissing grows the sheet by 264px and the deed re-wraps.
 *     The brief corrects the ref, and this is the assertion that holds the correction.
 *   · THE HEIGHT RULE — the sheet is its CONTENT's height, capped at the drawer's. Never stretched
 *     to fill, never shorter than its content. Both halves are measured, on two journeys chosen
 *     for their length, because a rule with one sample is a coincidence.
 *
 * ⚠️ THE SLIP IS READ-ONLY, AND THAT IS A COVERAGE ASSERTION. It sweeps every descendant for a
 * focusable element, not the first level — the whole point of a reference is that consulting it
 * cannot change anything, and nobody puts the offending control at the top.
 *
 * ⚠️ NO BACKTICKS OR REGEX LITERALS INSIDE ANY page.evaluate TEMPLATE.
 *
 * Read-only: it clicks rows, the slip's × and the tab. It presses no primary and writes nothing.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_SS_OUT ?? "run-artifacts/sheet-slip.txt";
rmSync(OUT, { force: true });

const SETTLED = "document.querySelector('.tdw-split').getAnimations().length === 0";

test("the sheet is one object, the slip is beside it, and the band never hears about it", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await ensureSignedIn(page);
  /* ⚠️ WHICH BRANCHES OF THE HEIGHT RULE THIS RUN ACTUALLY EXERCISED. Asserted at the end: a rule
     with two branches, measured only on one, is a rule half-proved — and it goes green. */
  const seen = new Set<string>();

  for (const w of [1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/todo");
    await page.waitForFunction(
      "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
    await liftMotionSuppression(page);

    const rows = await page.evaluate(`document.querySelectorAll(".tlc .row").length`) as number;
    add("P3.0 @" + w + " · rows on the board, so there is a task to open", rows > 1, "rows = " + rows);

    /* ⚠️ TWO CLICKS, A RENDER APART (tightened round, Phase 2's grammar) — the first FOCUSES the
       row and drops its action strip, the second opens. With one click the pane never mounted, so
       every probe below read null and the `› Next task` locator waited out the whole test for an
       element that could not appear: a HANG rather than a red, which reports as a timeout and
       says nothing about the page. */
    await page.locator(".tlc .row").first().click();
    await page.waitForFunction("!!document.querySelector('.tlc .actrow.show')", null, { timeout: 5_000 }).catch(() => {});
    await page.locator(".tlc .row.focus").first().click();
    await page.waitForFunction(SETTLED, null, { timeout: 5_000 }).catch(() => {});

    /* ── one framed object ──────────────────────────────────────────────────────────────── */
    /* ⚠️ THE COUNT IS OF CARDS INSIDE THE DRAWER, not of `.rim`s in the document — the slip has a
       rim of its own and is a different object. One sheet card, one slip card, and nothing else
       floating: the three-card pane had `.fc.hdr`, `.fc.work` and `.fc.rec`, which is what this
       phase collapses. */
    const shape = await page.evaluate(`(() => {
      const work = document.querySelector(".tdw-work");
      if (!work) return null;
      const sheet = work.querySelector(".sheet");
      return {
        cards: work.querySelectorAll(".fc").length,
        sheets: work.querySelectorAll(".sheet").length,
        rimsInSheet: sheet ? sheet.querySelectorAll(".rim").length : -1,
        bandInSheet: !!(sheet && sheet.querySelector(".dhead")),
        workInSheet: !!(sheet && sheet.querySelector(".work, .workscroll")),
        footInSheet: !!(sheet && sheet.querySelector(".foot")),
      };
    })()`) as any;
    add("P3.1 @" + w + " · the sheet is ONE rim holding the band, the work and the foot",
        !!shape && shape.sheets === 1 && shape.rimsInSheet === 1
          && shape.bandInSheet && shape.workInSheet && shape.footInSheet,
        shape ? "sheets " + shape.sheets + " · rims inside " + shape.rimsInSheet
          + " · header " + shape.bandInSheet + " · work " + shape.workInSheet + " · foot " + shape.footInSheet
          + " · loose .fc cards " + shape.cards : "no drawer");

    /* ── ⚠️ THE HEIGHT RULE, STATED AS A RULE RATHER THAN AS TWO SAMPLES ────────────────── */
    /* The sheet is `min(its content, the drawer)`. Written as two cases — "a short journey hugs"
       and "a long journey caps" — it depended on the fixture holding one of each AT EVERY WIDTH,
       and it did not: the same journey overflows by 418px at 1440 and fits with 83px to spare at
       1920, because a wider sheet fits more per line. One assertion covers both branches, and the
       run TALLIES which it saw so a fixture that drifts into one of them fails loudly instead of
       measuring half the rule twice. */
    /* ⚠️ THE CONTENT'S HEIGHT IS MEASURED FROM ITS PARTS, NEVER FROM THE SHEET'S OWN. A first form
       computed it as `sheet.height + scroller.overflow`, which is circular: a sheet stretched to
       fill has no overflow, so `wants` came back EQUAL to the cap and `h === min(wants, cap)` was
       satisfied by the very fault it exists to catch. Proved by mutation — `flex-grow: 1` reddened
       nothing. Band + foot + the scroller's scrollHeight + the sheet's padding is what the content
       wants, and it does not know or care how tall the sheet turned out.
       ⚠️ AND THE DIFFERENCE IS COMPUTED AT FULL PRECISION AND ROUNDED ONCE. Rounding the sheet, the
       content and the cap separately and comparing the results made a 0.6px layout read as a 1px
       disagreement at 1920 — three roundings, three directions. The reported figures stay rounded
       because they are for a human; the CLAIM is `delta`.
       ⚠️ BOTH OF THESE NOTES SIT OUTSIDE THE TEMPLATE. A backtick inside a page.evaluate string
       terminates it and the FILE fails to collect — which prints "No tests found" and greps as
       ZERO reds, i.e. as a clean pass. It happened four times in this round and once it silently
       faked three mutation results in a row. */
    const measureSheet = () => page.evaluate(`(() => {
      const work = document.querySelector(".tdw-work");
      const sheet = work && work.querySelector(".sheet");
      if (!sheet) return null;
      const rim = sheet.querySelector(".rim");
      const scroller = sheet.querySelector(".workscroll");
      const foot = sheet.querySelector(".foot");
      const band = sheet.querySelector(".dhead");
      const pad = sheet.getBoundingClientRect().height - rim.getBoundingClientRect().height;
      const over = scroller ? scroller.scrollHeight - scroller.clientHeight : 0;
      /* the rim's own top and bottom borders are between the sheet's padding and its contents, and
         they are MEASURED rather than assumed: offsetHeight minus clientHeight is border plus any
         scrollbar, which is exactly the slice band + foot + scroller does not include. Without it
         the sum came up 2px short at every width — small enough to have been "fixed" with a
         tolerance, which would have re-opened the hole the circular version left. */
      const rimEdge = rim.offsetHeight - rim.clientHeight;
      const natural = pad + rimEdge
        + (band ? band.getBoundingClientRect().height : 0)
        + (foot ? foot.getBoundingClientRect().height : 0)
        + (scroller ? scroller.scrollHeight : 0);
      const hExact = sheet.getBoundingClientRect().height;
      const capExact = work.getBoundingClientRect().height;
      return {
        h: Math.round(hExact), cap: Math.round(capExact), wants: Math.round(natural),
        delta: Math.round(Math.abs(hExact - Math.min(natural, capExact)) * 10) / 10,
        over: Math.round(over), pad: Math.round(pad),
        footIn: !!(foot && sheet.getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom > -2),
      };
    })()`) as Promise<any>;

    const short = await measureSheet();
    add("P3.2 @" + w + " · the sheet is min(its content, the drawer) — first journey",
        !!short && short.delta <= 1,
        short ? "sheet " + short.h + " vs min(content " + short.wants + ", drawer " + short.cap + ") — out by " + short.delta
          + " · " + (short.over > 0 ? "CAPPED, work overflows by " + short.over : "HUGGING") : "no sheet");
    if (short) seen.add(short.over > 0 ? "capped" : "hugging");

    /* ⚠️ THE SECOND SAMPLE IS THE TALLEST SHEET ON THE BOARD, FOUND BY OPENING ROWS AND
       MEASURING — not by scoring their pills. The pill heuristic ("Close beats Send beats the
       rest") is a PROXY for length, and it picked a housekeeping close whose sheet came to 575
       against a 614 cap: hugging, so the run's tally reported the capping branch as never
       exercised, which it was. The proxy was reasonable and wrong, and only the tally said so.
       Each candidate is opened, its fork answered if it has one, and its sheet measured; the
       tallest wins. That is slower and it is the only version that means what it says. */
    const longest = await page.evaluate(`(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const rows = [...document.querySelectorAll(".tlc .row")];
      let best = -1, bestN = -1;
      for (let i = 0; i < Math.min(rows.length, 6); i++) {
        const list = [...document.querySelectorAll(".tlc .row")];
        if (!list[i]) continue;
        list[i].click(); await sleep(140);
        const f = document.querySelector(".tlc .row.focus"); if (f) f.click();
        await sleep(650);
        const fk = document.querySelector(".tpn .fk"); if (fk) { fk.click(); await sleep(550); }
        const sh = document.querySelector(".tpn .sheet");
        const h = sh ? sh.getBoundingClientRect().height : -1;
        if (h > best) { best = h; bestN = i; }
      }
      return bestN;
    })()`) as number;
    if (longest > -1) {
      await page.locator(".tlc .row").nth(longest).click();
      await page.waitForFunction("!!document.querySelector('.tlc .actrow.show')", null, { timeout: 5_000 }).catch(() => {});
      await page.locator(".tlc .row.focus").first().click();
      /* ⚠️ AND ITS LEDGER, NOT ITS FORK — the fork is three options and the ledger is four
         questions plus what they open, so a "longest journey" that stopped at the fork measured
         the SHORT state under a long name. It is what took the capping branch out of this run's
         tally (P3.10 saw only "hugging"), which is the tally doing exactly its job. */
      await page.waitForTimeout(400);
      await page.evaluate(`(() => { const b = document.querySelector(".tpn .fk"); if (b) b.click(); })()`);
      await page.waitForTimeout(300);
    }
    const tall = await measureSheet();
    add("P3.3 @" + w + " · the sheet is min(its content, the drawer) — longest journey",
        !!tall && tall.delta <= 1 && tall.footIn,
        tall ? "sheet " + tall.h + " vs min(content " + tall.wants + ", drawer " + tall.cap + ") — out by " + tall.delta
          + " · " + (tall.over > 0 ? "CAPPED, work overflows by " + tall.over : "HUGGING")
          + " · the foot is inside the rim = " + tall.footIn : "no sheet");
    if (tall) seen.add(tall.over > 0 ? "capped" : "hugging");

    /* ── ⚠️ THE WRAP LAW ────────────────────────────────────────────────────────────────── */
    /* ⚠️ THE SUBJECT MOVED WITH THE REFERENCE AND THE LAW DID NOT (tightened round, Phase 4).
       It was the BAND's width with the slip shown and dismissed; the band is retired and the
       reference is a column of the sheet, so what must not move is the DOCUMENT — measured here
       as the header row's width, which is the document's own track, plus the TITLE's line count,
       which is what a reader actually notices when a measure changes under them. The ref still
       gives the freed space back (`.sheet.railClosed { grid-template-columns: minmax(0,1fr) 30px }`);
       the correction is now the sheet's own margin, and this is where it is held. */
    /* ⚠️ THE DOCUMENT'S OWN TRACK, NOT THE HEADER — and the difference is the whole restructure.
       The header row SPANS BOTH COLUMNS now, so it narrows with the sheet when the reference
       collapses (546 → 336, measured) and is no longer a proxy for the document's width. What
       must not move is the column the writer is reading. */
    const bandW = () => page.evaluate(
      `(() => { const b = document.querySelector(".tdw-work .form");
                return b ? Math.round(b.getBoundingClientRect().width * 100) / 100 : -1; })()`) as Promise<number>;
    const deedLines = () => page.evaluate(
      `(() => { const d = document.querySelector(".tdw-work .title");
                if (!d) return -1;
                const r = document.createRange(); r.selectNodeContents(d);
                return r.getClientRects().length; })()`) as Promise<number>;

    const bandBefore = await bandW();
    const linesBefore = await deedLines();

    const dismissed = await page.evaluate(`(() => {
      const x = document.querySelector(".tdw-work .rail .qhead .cl");
      if (!x) return false;
      x.click();
      return true;
    })()`) as boolean;
    await page.waitForTimeout(360);
    const bandAfter = await bandW();
    const linesAfter = await deedLines();

    add("P3.4 @" + w + " · the reference column has a collapse of its own",
        dismissed, dismissed ? "the column's chevron was found and pressed" : "no chevron in the column");
    add("P3.5 @" + w + " · THE WRAP LAW — the document's width and the title's line count are identical with the reference put aside",
        dismissed && bandBefore > 0 && Math.abs(bandAfter - bandBefore) < 0.5 && linesAfter === linesBefore,
        "document " + bandBefore + " → " + bandAfter + " · the title sets " + linesBefore + " → " + linesAfter + " lines");

    /* the spine IS the collapsed column — it exists only once the reference is put aside */
    const tabWhenGone = await page.evaluate(`(() => {
      const t = document.querySelector(".tdw-work .rail .rh");
      if (!t) return "absent";
      const r = t.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? "shown" : "hidden";
    })()`) as string;
    add("P3.6 @" + w + " · the spine appears once the reference is put away",
        tabWhenGone === "shown", "the spine is " + tabWhenGone);

    /* ⚠️ DISMISSAL IS REMEMBERED FOR THE SESSION, NOT PER TASK — so walking with › must not bring
       it back. A per-task memory would make the reference flicker in and out as you walk the list. */
    await page.locator('.tdw-work .dnav button[aria-label="Next task"]').click().catch(() => {});
    await page.waitForTimeout(320);
    const stillGone = await page.evaluate(`(() => {
      const qr = document.querySelector(".tdw-work .rail");
      if (!qr) return "unmounted";
      return qr.getBoundingClientRect().width > 40 ? "back" : "collapsed";
    })()`) as string;
    /* ⚠️ UNMOUNTED AND ZERO-WIDTH ARE BOTH "AWAY", and the precondition is what makes that safe
       to fold. A dismissed slip is not rendered at all, so `unmounted` is the honest reading of a
       working page; before the build it was ALSO the reading of a page with no slip — which is why
       the case requires `dismissed` first, and why it went green against the three-card pane until
       that guard was added in the red-before pass. */
    /* ⚠️ "BACK" IS NOW A WIDTH, NOT A PRESENCE. The slip was UNMOUNTED when dismissed; the
       column is always mounted and collapses to its 30px spine, so the reading that means "it
       came back" is the OPEN width. A check still asking whether the element exists would pass
       on a column that had reopened itself. */
    add("P3.7 @" + w + " · the dismissal survives walking to the next task",
        dismissed && stillGone !== "back", "the reference is " + stillGone
        + " · it had been dismissed = " + dismissed);

    /* restore it through the spine */
    const restored = await page.evaluate(`(() => {
      const t = document.querySelector(".tdw-work .rail .rh");
      if (!t) return false;
      t.click();
      return true;
    })()`) as boolean;
    await page.waitForTimeout(360);
    const backShape = await page.evaluate(`(() => {
      const qr = document.querySelector(".tdw-work .rail");
      const t = document.querySelector(".tdw-work .rail .rh");
      const tb = t ? t.getBoundingClientRect() : null;
      return { qr: qr ? Math.round(qr.getBoundingClientRect().width) : -1,
               tab: tb ? (tb.width > 0 && tb.height > 0 ? "shown" : "hidden") : "absent" };
    })()`) as { qr: number; tab: string };
    add("P3.8 @" + w + " · the spine brings it back at its full width, and the spine goes",
        restored && backShape.qr === 240 && backShape.tab !== "shown",
        "reference " + backShape.qr + "px · the spine is " + backShape.tab);

    /* ── ⚠️ NOTHING IN THE REFERENCE IS EDITABLE — a COVERAGE sweep, not a first-level one ────── */
    const slipControls = await page.evaluate(`(() => {
      const qr = document.querySelector(".tdw-work .rail");
      if (!qr) return null;
      const found = [];
      for (const el of qr.querySelectorAll("*")) {
        const tag = el.tagName.toLowerCase();
        const editable = el.isContentEditable
          || tag === "input" || tag === "textarea" || tag === "select" || tag === "button"
          || (tag === "a" && el.getAttribute("href"))
          || (el.getAttribute("tabindex") && el.getAttribute("tabindex") !== "-1");
        if (!editable) continue;
        const where = el.closest(".qhead") ? "head" : el.closest(".qbtn") ? "foot" : "body";
        found.push(where + ":" + tag);
      }
      return found;
    })()`) as string[] | null;
    /* ⚠️ EXACTLY THREE SURVIVE NOW, AND EVERY ONE IS NAMED BY THE CONTRACT — the chevron in the
       head, the agent's → in the body, and the query link in the foot. It was two: the column
       gained the agent row in the tightened round's Phase 4, and its arrow is a LINK to a record
       rather than an act on this one, which is the distinction this case is actually about. They
       are identified by WHERE they are rather than by a class, because the two links carry
       different ones and a class-matched form once reported the query link itself as a stray. */
    const strays = (slipControls ?? []).filter((c) => c !== "head:button" && c !== "foot:a" && c !== "body:a");
    add("P3.9 @" + w + " · the reference holds no control but its chevron and its two links",
        !!slipControls && slipControls.length <= 3 && strays.length === 0,
        slipControls ? slipControls.length + " focusable: " + slipControls.join(", ") : "no reference");
  }

  /* ⚠️ BOTH BRANCHES, OR THE RULE IS HALF-PROVED. `min(a, b)` is satisfied trivially whenever the
     sample never reaches the cap; this is what stops a fixture drifting shorter and taking the
     capping half of the claim with it, silently. */
  add("P3.10 · both branches of the height rule were exercised in this run",
      seen.has("hugging") && seen.has("capped"), "branches seen: " + [...seen].sort().join(", "));

  writeFileSync(OUT, out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n") + "\n");
  // eslint-disable-next-line no-console
  console.log("\n" + out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n"));
  const bad = out.filter((r) => !r.ok);
  expect(bad.map((r) => r.id + " — " + r.note).join("\n"), "sheetSlip").toEqual("");
});
