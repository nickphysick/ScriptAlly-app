/**
 * ⚠️ THE SHEET AND THE QUICK REFERENCE SLIP — drawer round, Phase 3.
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

    await page.locator(".tlc .row").first().click();
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
        bandInSheet: !!(sheet && sheet.querySelector(".band")),
        workInSheet: !!(sheet && sheet.querySelector(".work, .workscroll")),
        footInSheet: !!(sheet && sheet.querySelector(".foot")),
      };
    })()`) as any;
    add("P3.1 @" + w + " · the sheet is ONE rim holding the band, the work and the foot",
        !!shape && shape.sheets === 1 && shape.rimsInSheet === 1
          && shape.bandInSheet && shape.workInSheet && shape.footInSheet,
        shape ? "sheets " + shape.sheets + " · rims inside " + shape.rimsInSheet
          + " · band " + shape.bandInSheet + " · work " + shape.workInSheet + " · foot " + shape.footInSheet
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
      const band = sheet.querySelector(".band");
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

    /* ⚠️ THE SECOND SAMPLE IS THE LONGEST JOURNEY ON THE BOARD, chosen by measuring rather than by
       naming a card — a fixture that drifts would otherwise make this the first case twice, which
       is the monoculture fault this repo already records. */
    const longest = await page.evaluate(`(() => {
      const rows = [...document.querySelectorAll(".tlc .row")];
      let best = 0, bestN = -1;
      for (let i = 0; i < rows.length; i++) {
        const pill = ((rows[i].querySelector(".pill") || {}).textContent || "").trim();
        const score = pill === "Close" ? 3 : pill === "Send" ? 2 : 1;
        if (score > best) { best = score; bestN = i; }
      }
      return bestN;
    })()`) as number;
    if (longest > -1) {
      await page.locator(".tlc .row").nth(longest).click();
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
    /* The band's width, with the slip shown and with it dismissed. The ref grows the sheet when
       the slip goes (`.wcol { flex: 1 1 auto }`), which re-wraps the deed — the brief forbids it
       and this is where that correction lives. */
    const bandW = () => page.evaluate(
      `(() => { const b = document.querySelector(".tdw-work .band");
                return b ? Math.round(b.getBoundingClientRect().width * 100) / 100 : -1; })()`) as Promise<number>;
    const deedLines = () => page.evaluate(
      `(() => { const d = document.querySelector(".tdw-work .deed");
                if (!d) return -1;
                const r = document.createRange(); r.selectNodeContents(d);
                return r.getClientRects().length; })()`) as Promise<number>;

    const bandBefore = await bandW();
    const linesBefore = await deedLines();

    const dismissed = await page.evaluate(`(() => {
      const x = document.querySelector(".tdw-work .qr .x, .tdw-work .rhead .x");
      if (!x) return false;
      x.click();
      return true;
    })()`) as boolean;
    await page.waitForTimeout(360);
    const bandAfter = await bandW();
    const linesAfter = await deedLines();

    add("P3.4 @" + w + " · the slip has a dismiss of its own",
        dismissed, dismissed ? "the slip's × was found and pressed" : "no × inside the slip");
    add("P3.5 @" + w + " · THE WRAP LAW — the band's width is identical with the slip gone",
        dismissed && bandBefore > 0 && Math.abs(bandAfter - bandBefore) < 0.5 && linesAfter === linesBefore,
        "band " + bandBefore + " → " + bandAfter + " · the deed sets " + linesBefore + " → " + linesAfter + " lines");

    /* the tab exists only when the slip is dismissed */
    const tabWhenGone = await page.evaluate(`(() => {
      const t = document.querySelector(".tdw-work .qrtab");
      if (!t) return "absent";
      const r = t.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? "shown" : "hidden";
    })()`) as string;
    add("P3.6 @" + w + " · the bookmark tab appears once the slip is put away",
        tabWhenGone === "shown", "the tab is " + tabWhenGone);

    /* ⚠️ DISMISSAL IS REMEMBERED FOR THE SESSION, NOT PER TASK — so walking with › must not bring
       it back. A per-task memory would make the slip flicker in and out as you walk the list. */
    await page.locator('.tdw-work .b-nav button[aria-label="Next task"]').click().catch(() => {});
    await page.waitForTimeout(320);
    const stillGone = await page.evaluate(`(() => {
      const qr = document.querySelector(".tdw-work .qr");
      if (!qr) return "unmounted";
      return qr.getBoundingClientRect().width > 0 ? "back" : "collapsed";
    })()`) as string;
    /* ⚠️ UNMOUNTED AND ZERO-WIDTH ARE BOTH "AWAY", and the precondition is what makes that safe
       to fold. A dismissed slip is not rendered at all, so `unmounted` is the honest reading of a
       working page; before the build it was ALSO the reading of a page with no slip — which is why
       the case requires `dismissed` first, and why it went green against the three-card pane until
       that guard was added in the red-before pass. */
    add("P3.7 @" + w + " · the dismissal survives walking to the next task",
        dismissed && stillGone !== "back", "the slip is " + stillGone
        + " · it had been dismissed = " + dismissed);

    /* restore it through the tab */
    const restored = await page.evaluate(`(() => {
      const t = document.querySelector(".tdw-work .qrtab");
      if (!t) return false;
      t.click();
      return true;
    })()`) as boolean;
    await page.waitForTimeout(360);
    const backShape = await page.evaluate(`(() => {
      const qr = document.querySelector(".tdw-work .qr");
      const t = document.querySelector(".tdw-work .qrtab");
      const tb = t ? t.getBoundingClientRect() : null;
      return { qr: qr ? Math.round(qr.getBoundingClientRect().width) : -1,
               tab: tb ? (tb.width > 0 && tb.height > 0 ? "shown" : "hidden") : "absent" };
    })()`) as { qr: number; tab: string };
    add("P3.8 @" + w + " · the tab brings it back, and then the tab goes",
        restored && backShape.qr === 264 && backShape.tab !== "shown",
        "slip " + backShape.qr + "px · the tab is " + backShape.tab);

    /* ── ⚠️ NOTHING IN THE SLIP IS EDITABLE — a COVERAGE sweep, not a first-level one ────── */
    const slipControls = await page.evaluate(`(() => {
      const qr = document.querySelector(".tdw-work .qr");
      if (!qr) return null;
      const found = [];
      for (const el of qr.querySelectorAll("*")) {
        const tag = el.tagName.toLowerCase();
        const editable = el.isContentEditable
          || tag === "input" || tag === "textarea" || tag === "select" || tag === "button"
          || (tag === "a" && el.getAttribute("href"))
          || (el.getAttribute("tabindex") && el.getAttribute("tabindex") !== "-1");
        if (!editable) continue;
        const where = el.closest(".rhead") ? "head" : el.closest(".rfoot") ? "foot" : "body";
        found.push(where + ":" + tag);
      }
      return found;
    })()`) as string[] | null;
    /* ⚠️ EXACTLY TWO SURVIVE, AND THEY ARE IDENTIFIED BY WHERE THEY ARE, NOT BY A CLASS. The
       query link carries no class of its own — a first form matched on one and reported the link
       itself as a stray, which is a check going red about a page that is correct. The dismiss is
       the button in the head; the link is the anchor in the foot; anything else is a stray. */
    const strays = (slipControls ?? []).filter((c) => c !== "head:button" && c !== "foot:a");
    add("P3.9 @" + w + " · the slip holds no control but its × and the query link",
        !!slipControls && slipControls.length === 2 && strays.length === 0,
        slipControls ? slipControls.length + " focusable: " + slipControls.join(", ") : "no slip");
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
