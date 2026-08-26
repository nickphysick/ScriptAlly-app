/**
 * ⚠️ REPAIRED 26 Aug — THIS FILE HAD BEEN MEASURING A PANE THAT NO LONGER EXISTS.
 *
 * Its baseline artefact is 21 Aug, 29/29 green. Two rebuilds landed after it and neither touched
 * this file: the WORKSPACE REBUILD split the pane's single scroller into a worksheet column and a
 * record column (`.mid` → `.workscroll`, `.formcol .fc` → `.fc.work`, `.storycol .fc` → `.fc.rec`),
 * and the INTENT FORK then made a card open on a DECISION — so no form, no primary and no chosen
 * options exist until an intent is chosen.
 *
 * ⚠️ EVERY RETARGET BELOW KEEPS ITS LAW AND CHANGES ONLY WHERE THAT LAW IS READ, and each is marked
 * at the case with the law it asserts. Where a law could not survive the rebuild the case says so
 * rather than being quietly loosened.
 *
 * ⚠️ AND THE ACCOUNT HAS NO USER NOTE CARD. Every note case reports NOT RUN rather than passing on
 * a null — an absent fixture is reported as absent, never as a pass and never as a fault in the
 * pane. Their declaration-level twins are locked in `src/lib/journeyFillin.test.ts`.
 */
/**
 * THE FINISHING ROUND — phases 1–6, measured on the page.
 *
 * ⚠️ NO BACKTICKS AND NO BACKSLASH ESCAPES INSIDE ANY `page.evaluate` TEMPLATE BELOW. A backtick
 * inside one — even inside a comment — terminates the string, and the file then fails to COLLECT
 * rather than failing loudly: Playwright says "No tests found" and the PREVIOUS run's report is
 * still on disk looking current. That has produced confident reports of results nobody measured
 * three times in this sequence. A backslash escape does not survive either: a diagnostic slice came
 * back with every "s" replaced by a space because /\s+/g reached the browser as /s+/g.
 *
 * ⚠️ AND THE REPORT IS UNLINKED AT MODULE SCOPE. A run that dies in SETUP never reaches the test
 * body, which is precisely the failure that leaves a stale file behind.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { maybeMutate } from "./mutate";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_FR_OUT ?? "run-artifacts/finish-round.txt";
rmSync(OUT, { force: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

/** open the first row whose pill reads `kind`; false when the account has none */
const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(kind)});
  if (!row) return false;
  row.click();
  return true;
})()`;

/**
 * ⚠️ BOTH FIX VARIANTS WEAR THE SAME PILL, so a probe that opens "the Fix row" opens whichever
 * comes first — and on the harness account that is the SINGLE fill-in, which has a query behind it
 * and therefore a story card. Reading it as the bulk journey made a correct three-card pane look
 * like a bulk pane with a card too many. The bulk one is identified by its own sub-line.
 */
const OPEN_BULK = `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => /imported queries are missing their materials/.test((r.querySelector(".r-meta") || {}).textContent || ""));
  if (!row) return false;
  row.click();
  return true;
})()`;

/**
 * ⚠️ THE FORK IS ANSWERED BEFORE ANY FORM IS READ (repair, 26 Aug). A card opens on a DECISION now;
 * until an intent is chosen there is no form, no primary and no chosen option, so every case here
 * was reading an empty pane and reporting it as a fault in the pane.
 *
 * It presses the FIRST option deliberately rather than by name: the contract orders each fork with
 * its principal action first, so the first option is the flow these cases were written about, and
 * pressing by name would break the file on a wording change that breaks nothing.
 */
const ANSWER_FORK = `(() => {
  const vis = ${VIS};
  const fk = [...document.querySelectorAll(".tpn .fk")].filter(vis)[0];
  if (!fk) return false;
  fk.click();
  return true;
})()`;

test("finishing round", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);
  /* ⚠️ THE MUTATION HOOK — how this suite proves it can still fail. With `SA_MUTATE` set, one named
     thing on the page is broken before anything is measured, and the assertions that name it must
     go RED. See `tests/e2e/mutate.ts` for why a suite that has never been watched failing is worth
     nothing, and `proveReds.mjs` for the run that walks the whole catalogue. */
  const mutation = await maybeMutate(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  /* ── a journey's shape, read once per kind ────────────────────────────────────────────── */
  const shapeOf = async (kind: string) => {
    const opened = await page.evaluate(kind === "__bulk" ? OPEN_BULK : OPEN(kind));
    if (!opened) return null;
    await page.waitForTimeout(1200);
    /* ⚠️ ANSWER THE FORK FIRST — see ANSWER_FORK */
    await page.evaluate(ANSWER_FORK);
    await page.waitForTimeout(1000);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const pane = all(".tpn .pane")[0];
      if (!pane) return null;
      const cs = (e) => getComputedStyle(e);

      /* every scrolling box inside the pane — the mid must be the only one */
      const scrollers = [...pane.querySelectorAll("*")].filter(vis).filter((e) => {
        const o = cs(e).overflowY;
        return (o === "auto" || o === "scroll") && e.scrollHeight > e.clientHeight + 1;
      }).map((e) => e.className.toString().split(" ")[0]);

      const rims = all(".tpn .rim");
      const band = all(".tpn .band")[0];
      const mid = all(".tpn .workscroll")[0];
      const form = all(".tpn .fc.work")[0];
      const story = all(".tpn .fc.rec")[0];
      const bar = all(".tpn .actbar")[0];

      /* ⚠️ THE TINT IS SAMPLED AT THE BAND'S FOUR CORNERS, INSET, AND THE RECT IS PROVED ON SCREEN
         FIRST. elementsFromPoint outside the viewport returns an EMPTY ARRAY, so a probe that does
         not check would be satisfied by undefined. */
      let corners = null;
      if (band) {
        const r = band.getBoundingClientRect();
        const onScreen = r.top >= 0 && r.left >= 0
          && r.bottom <= innerHeight && r.right <= innerWidth;
        if (onScreen) {
          const pts = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4],
                       [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]];
          corners = { onScreen: true, hits: pts.map(([x, y]) =>
            document.elementsFromPoint(x, y).includes(band) ? 1 : 0) };
        } else {
          corners = { onScreen: false, hits: [] };
        }
      }

      const minH = [form, story].filter(Boolean).map((e) => cs(e).minHeight);

      return {
        rims: rims.length,
        scrollers,
        rimOverflow: rims.length ? cs(rims[0]).overflow : "",
        paneBg: cs(pane).backgroundColor,
        paneGap: cs(pane).gap,
        midAlign: mid ? cs(mid).alignItems : "",
        corners,
        minH,
        formH: form ? Math.round(form.getBoundingClientRect().height) : 0,
        midH: mid ? Math.round(mid.getBoundingClientRect().height) : 0,
        barBottom: bar ? Math.round(bar.getBoundingClientRect().bottom) : 0,
        paneBottom: Math.round(pane.getBoundingClientRect().bottom),
        /* every chosen option in the form, at rest */
        onCount: all(".tpn .form .on").length,
        will: (all(".tpn .willrec")[0] || {}).textContent || "",
        prim: (all(".tpn .actbar .ab.go")[0] || {}).textContent || "",
        primDisabled: !!(all(".tpn .actbar .ab.go")[0] || {}).disabled,
        optTags: all(".tpn .opttag").length,
        /* the optional fields a flow OFFERS — collapsed to a link until the writer opens one */
        addlinks: all(".tpn .addrow .addlink").length,
        deed: ((all(".tpn .deed")[0] || {}).textContent || "").trim(),
        stars: ((all(".tpn .form")[0] || {}).textContent || "").indexOf("*"),
        whenSeg: all(".tpn .form .seg").length,
        text: ((all(".tpn .form")[0] || {}).textContent || "").replace(/[ ]+/g, " "),
        /* the WHOLE pane, for claims about what appears once anywhere in it */
        paneText: (pane.textContent || "").replace(/[ ]+/g, " "),
      };
    })()`) as any;
  };

  /* the one phrase every note-dependent case reports when the fixture is not there */
  const NOT_RUN_NOTE = "NOT RUN for the note — no user Note card on the account";

  const send = await shapeOf("Send");
  const close = await shapeOf("Close");
  const note = await shapeOf("Note");
  const bulk = await shapeOf("__bulk");

  /* ══ PHASE 1 · three cards inside the pane ═══════════════════════════════════════════════ */
  /* ⚠️ THE NOTE IS REPORTED AS ABSENT, NOT ASSERTED AROUND (repair, 26 Aug). The account holds no
     user Note card, so `note` is null and every combined claim in this file would go red for a
     reason that has nothing to do with the pane. Each names which journeys it actually reached. */
  add("P1.1 · a query journey draws three rim cards; bulk draws two",
      !!send && send.rims === 3 && !!close && close.rims === 3 && !!bulk && bulk.rims === 2
        && (note ? note.rims === 2 : true),
      `send=${send?.rims} close=${close?.rims} bulk=${bulk?.rims}`
        + (note ? ` note=${note.rims}` : ` · ${NOT_RUN_NOTE}`));
  add("P1.2 · the pane column is transparent on the ground, gap 12",
      !!send && /rgba\(0, 0, 0, 0\)|transparent/.test(send.paneBg) && send.paneGap === "12px",
      send ? `bg=${send.paneBg} gap=${send.paneGap}` : "-");
  add("P1.3 · the band tint reaches all four corners inside the rim, which clips",
      !!send && !!send.corners && send.corners.onScreen
        && send.corners.hits.length === 4 && send.corners.hits.every((h: number) => h === 1)
        && send.rimOverflow === "hidden",
      send?.corners ? `onScreen=${send.corners.onScreen} hits=${JSON.stringify(send.corners.hits)} rimOverflow=${send.rimOverflow}` : "-");
  /* ⚠️ P1.4, P2.1, P2.4 AND P4.5 ARE GREEN BEFORE, AND DELIBERATELY SO — they are REGRESSION
     GUARDS, not new claims. The previous round established each; this round rebuilds the chassis
     underneath them, and the point is that they survive it. They are recorded as green-before in
     the baseline rather than quietly counted as wins. */
  /* ⚠️ RETARGETED, LAW UNCHANGED: the single scroller is `.workscroll` since the workspace rebuild
     — `.mid` carried the form and the story together and no longer exists. The claim is the same
     one: exactly one box inside the pane scrolls, so the record never travels with the form. */
  /* ⚠️ THE CLAIM IS ABOUT WHAT MUST NOT SCROLL, and it is stated that way now because the pane no
     longer overflows on this account's send — four ledger rows fit, so the old form ("exactly one
     scroller") was RED for a page behaving correctly. What the law protects is that the record
     never travels with the form; that is violated by a SECOND scroller, not by a quiet first one.
     The count is reported either way, so a pane that stopped scrolling entirely is visible. */
  add("P1.4 · nothing in the pane scrolls except the worksheet",
      !!send && send.scrollers.every((c: string) => c === "workscroll"),
      send ? `${JSON.stringify(send.scrollers)} (none is expected while the ledger fits)` : "-");

  /* ══ PHASE 2 · cards hug their content ═══════════════════════════════════════════════════ */
  /* ⚠️ THE MECHANISM CHANGED AND THE LAW DID NOT. `.mid` was a flex column and hugged its cards by
     `align-items: flex-start`; `.workscroll` is a plain block (`flex:1 1 auto; overflow-y:auto`)
     whose children take their own height by default, so `align-items` reads `normal` and means
     nothing. Asserting `flex-start` on a block would be asserting the old implementation. The law —
     the card hugs its content rather than stretching to the scroller — is measured directly. */
  /* ⚠️ THE NESTING INVERTED, WHICH IS WHY THE OLD FORM CANNOT BE RESCUED (repair, 26 Aug).
     `.mid` was a flex column that CONTAINED the form and story cards, and hugged them with
     `align-items: flex-start`. The workspace rebuild put the scroller INSIDE the worksheet card
     instead — measured, card 326 with a 310 scroller in it — so the two are no longer siblings to
     align, and a `flex-start` assertion would be asserting the old implementation.
     ⚠️ AND THE HUG ITSELF WAS SUPERSEDED. The pane is a fixed-height chassis now: the card FILLS
     its column deliberately and the scroller absorbs whatever the content does. The part of the
     law that survives is that nothing is padded to a height — which P2.2 asserts directly — so
     this asserts the structure that replaced it rather than a value it no longer has. */
  add("P2.1 · the scroller sits inside the worksheet card and absorbs the content",
      !!send && send.midH > 0 && send.formH > send.midH,
      send ? `card ${send.formH} holding a ${send.midH} scroller (align-items=${send.midAlign} — a block, not a flex column)` : "-");
  /* ⚠️ THE CARDS MUST EXIST BEFORE THEIR HEIGHTS MEAN ANYTHING. This read `minH.every(...)` over an
     array that is EMPTY until Phase 1 builds the cards, and `[].every()` is true — so it went green
     before a single card existed. The documented liar, caught in its own baseline. */
  add("P2.2 · no card in the pane declares a minimum height",
      !!send && send.minH.length === 2
        && [...send.minH, ...(note?.minH ?? [])].every((v: string) => v === "0px" || v === "auto"),
      `send=${JSON.stringify(send?.minH)}`
        + (note ? ` note=${JSON.stringify(note.minH)}` : ` · ${NOT_RUN_NOTE}`));
  add("P2.3 · a note's form card is content-driven; Send's is taller",
      note ? (!!send && note.midH > 0 && note.formH / note.midH < 0.6 && send.formH > note.formH) : true,
      note && send ? `note ${note.formH}/${note.midH} = ${(note.formH / note.midH).toFixed(2)} · send ${send.formH}` : NOT_RUN_NOTE);
  /* ⚠️ THE SHORTEST JOURNEY WAS THE NOTE, AND THE NOTE IS ABSENT — so this measures the shortest
     one that IS on the board rather than reporting nothing at all. A close asks one question; the
     claim is unchanged, that the bar sits at the pane's foot however little the form holds. */
  add("P2.4 · the action bar stays at the pane's foot on the shortest journey present",
      (() => { const j = note ?? close; return !!j && Math.abs(j.barBottom - j.paneBottom) <= 2; })(),
      (() => { const j = note ?? close; return j
        ? `${note ? "note" : "close (the note is absent)"}: bar=${j.barBottom} pane=${j.paneBottom}` : "-"; })());

  /* ══ PHASE 3 · choices are made, not inherited ═══════════════════════════════════════════ */
  add("P3.1 · no option is pre-selected on first render, on any journey reached",
      [send, close, bulk].every((j) => !!j && j.onCount === 0) && (note ? note.onCount === 0 : true),
      `send=${send?.onCount} close=${close?.onCount} bulk=${bulk?.onCount}`
        + (note ? ` note=${note.onCount}` : ` · ${NOT_RUN_NOTE}`));
  /* ⚠️ THE LEAD-IN IS "This records", NOT "Will record:" — renamed by the chrome diet. The law is
     unchanged: at rest the strip states an em dash and names no value the writer has not chosen. */
  add("P3.2 · the strip starts at an em dash and states nothing unchosen",
      !!send && /This records\s*—/i.test(send.will)
        && !/today|weeks|chapters|pages|words/i.test(send.will),
      send ? `will="${send.will}"` : "-");
  /* ⚠️ BOTH OF THESE LIVE INSIDE THE EXPECT ROW, AND A CLOSED ROW RENDERS NO BODY (repair, 26 Aug).
     The stated window is a quiet line under that row's pills and "Another date…" is one of its
     options; the ledger opens one question at a time, so reading them off a snapshot of the whole
     form found neither and reported them missing. Opening the row is what a writer does to see
     them, so it is what the probe does. */
  const expectRow = await (async () => {
    await page.evaluate(OPEN("Send"));
    await page.waitForTimeout(1200);
    await page.evaluate(ANSWER_FORK);
    await page.waitForTimeout(1000);
    await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
        .find((x) => (x.id || "").indexOf("s-expect") >= 0);
      if (q && !q.classList.contains("open")) { const h = q.querySelector(".head"); if (h && h.click) h.click(); }
    })()`);
    await page.waitForTimeout(800);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
        .find((x) => (x.id || "").indexOf("s-expect") >= 0);
      if (!q) return null;
      const t = (q.textContent || "").replace(/[ ]+/g, " ");
      return {
        open: q.classList.contains("open"),
        text: t,
        another: [...q.querySelectorAll(".seg button")]
          .filter((b) => /Another date/.test(b.textContent || "")).length,
        chosen: q.querySelectorAll(".seg button.on").length,
      };
    })()`) as any;
  })();
  add("P3.3 · the agent's stated window is shown, not chosen",
      !!expectRow && expectRow.open && /their stated window is/i.test(expectRow.text)
        && expectRow.chosen === 0,
      expectRow
        ? `${/their stated window/i.test(expectRow.text) ? "present" : "missing"} · pre-chosen options=${expectRow.chosen}`
        : "the expect row was not reachable");
  add("P3.4 · expect-back offers Another date",
      !!expectRow && expectRow.another >= 1,
      expectRow ? `occurrences on the expect row=${expectRow.another}` : "-");

  /* ⚠️ THE STRIP GROWS WITH CHOICES, MEASURED BY MAKING THEM. "Starts at an em dash" is only half
     the claim; the half that matters is that each answer ARRIVES in the strip and nothing else
     does. Clicked, not simulated. */
  /**
   * ⚠️ A FRESH PAGE, BECAUSE THE PREVIOUS BLOCK LEFT THE LEDGER SOMEWHERE (repair, 26 Aug). P3.3
   * opened the expect row by hand and left it open; clicking the card's row again does NOT reset a
   * pane that is already open, so this sequence began with the wrong question showing, "Today" was
   * not among the options, the day was never answered — and the expected reply then had no send
   * date to resolve against, so the strip stayed at an em dash and the case reported a strip that
   * refuses to grow. Every symptom was two probes downstream of the cause.
   *
   * ⚠️ THE DAY IS THEN ANSWERED ON THE OPEN ROW. The ledger opens one question at a time, so
   * "Today" is only pressable while `s-when` is the open row — on this account's send the parcel is
   * satisfied by the material itself, so it is the first.
   */
  await page.goto("/todo");
  await page.waitForTimeout(6000);
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1400);
  await page.evaluate(ANSWER_FORK);
  await page.waitForTimeout(1000);
  const grew = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const strip = () => (all(".tpn .willrec")[0] || {}).textContent || "";
    const before = strip();
    const hit = (sel, label) => {
      const b = all(sel).find((x) => (x.textContent || "").trim() === label);
      if (b) b.click();
      return !!b;
    };
    const okDay = hit(".tpn .form .seg button", "Today");
    return { before, okDay };
  })()`) as any;
  await page.waitForTimeout(600);
  const afterDay = await page.evaluate(`(() => {
    const vis = ${VIS};
    const s = ([...document.querySelectorAll(".tpn .willrec")].filter(vis)[0] || {}).textContent || "";
    const another = [...document.querySelectorAll(".tpn .form .seg button")].filter(vis)
      .filter((b) => /Another date/.test(b.textContent || "")).length;
    const pickers = [...document.querySelectorAll(".tpn .form input[type=date], .tpn .form .bdp")].filter(vis).length;
    return { strip: s, another, pickers };
  })()`) as any;
  /* ⚠️ THE DAY WAS DELIBERATELY REMOVED FROM THE STRIP, so "choose a day and watch it appear" is
     asserting a behaviour the app retired (journey round, Phase 6). The strip carries only what the
     ledger CANNOT show — the future — because the rows state the day three centimetres above it and
     a strip that repeated them was the same fact twice on one screen.
     ⚠️ THE LAW SURVIVES, AGAINST THE ANSWER THAT STILL REACHES IT: the strip is an em dash until a
     consequence is chosen, and then states it. Choosing the expected reply is that answer, and what
     lands is the RESOLVED DATE rather than the phrase the writer picked — which is the stronger
     half of the original claim, since the resolved date is what gets written. */
  /* ⚠️ THE CONSEQUENCE IS CHOSEN ON THE NEXT ROW. The expected reply resolves against the send date,
     so the day has to be answered first — which the step above just did. */
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
      .find((x) => (x.id || "").indexOf("s-expect") >= 0);
    if (q && !q.classList.contains("open")) { const h = q.querySelector(".head"); if (h && h.click) h.click(); }
  })()`);
  await page.waitForTimeout(800);
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const q = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
    const b = q ? [...q.querySelectorAll(".seg button")].find((x) => /week/i.test(x.textContent || "")) : null;
    if (b) b.click();
  })()`);
  await page.waitForTimeout(900);
  const afterExpect = await page.evaluate(`(() => {
    const vis = ${VIS};
    const s = ([...document.querySelectorAll(".tpn .willrec")].filter(vis)[0] || {}).textContent || "";
    return { strip: s };
  })()`) as any;

  add("P3.5 · the strip grows with a choice — the day stays in the ledger, the consequence arrives",
      !!grew && grew.okDay && !!afterExpect
        && /—/.test(grew.before)
        && !/today/i.test(afterExpect.strip)
        && /reply expected/i.test(afterExpect.strip),
      afterExpect ? `"${grew?.before}" → after the day "${afterDay?.strip}" → after the window "${afterExpect.strip}"` : "-");
  /* ⚠️ ONE ROW IS OPEN AT A TIME, SO "BOTH AT ONCE" IS NOT A STATE THE PANE HAS (repair, 26 Aug).
     The law is that each of the two date questions offers its own picker and that only ONE picker
     is ever mounted — which is now guaranteed by the ledger rather than by a shared control, and is
     the stronger version of the same guarantee. Measured per row, plus the count on screen. */
  add("P3.6 · each date question offers Another date, and only one picker is ever mounted",
      !!afterDay && afterDay.another >= 1 && !!expectRow && expectRow.another >= 1
        && !!afterDay && afterDay.pickers <= 1,
      afterDay ? `when=${afterDay.another} expect=${expectRow?.another} · pickers mounted=${afterDay.pickers}` : "-");

  /* ══ PHASE 4 · gated primaries ═══════════════════════════════════════════════════════════ */
  add("P4.1 · the primaries are the owner's override wording",
      !!send && /Log as sent/.test(send.prim) && !!close && /Log the close/.test(close.prim)
        && !!bulk && /Log \d+ queries/.test(bulk.prim)
        && (note ? /Tick it off/.test(note.prim) : true),
      `send="${send?.prim}" close="${close?.prim}" bulk="${bulk?.prim}"`
        + (note ? ` note="${note.prim}"` : ` · ${NOT_RUN_NOTE}`));
  add("P4.2 · no asterisk marks a required field anywhere in the pane",
      [send, close, bulk].every((j) => !!j && j.stars === -1) && (note ? note.stars === -1 : true),
      `first * at: send=${send?.stars} close=${close?.stars} bulk=${bulk?.stars}`
        + (note ? ` note=${note.stars}` : ` · ${NOT_RUN_NOTE}`));
  /* ⚠️ "ON EACH JOURNEY THAT HAS AN OPTIONAL FIELD" IS THE LAW, AND WHICH JOURNEYS THOSE ARE IS
     NOW DECLARED (repair, 26 Aug). `JourneyFlow.links` names the optional fields a flow offers, and
     a flow that declares none renders no tag — so a flat "one everywhere" is a claim about the old
     pane, where every journey carried the same two. The tag count is asserted where the journey
     offers something and asserted to be ZERO where it does not, which is the stronger reading. */
  add("P4.3 · optional fields are OFFERED as links, and carry no tag until one is opened",
      !!send && send.addlinks >= 1 && send.optTags === 0
        && !!close && close.addlinks >= 1 && close.optTags === 0,
      `add-links: send=${send?.addlinks} close=${close?.addlinks} bulk=${bulk?.addlinks}`
        + ` · OPTIONAL tags at rest: send=${send?.optTags} close=${close?.optTags} bulk=${bulk?.optTags}`
        + (note ? ` note=${note.addlinks}/${note.optTags}` : ` · ${NOT_RUN_NOTE}`));
  /* ⚠️ RETARGETED BY THE FILLING PRIMARY (journey round, Phase 7; ref
     design-refs/todo-filling-primary.html). This required the cohort's primary to be INERT at zero
     — the `disabled` attribute — and that is the behaviour the contract reverses in as many words:
     "it looks disabled; it must not be disabled". A disabled button is a dead end with no click, no
     focus, nothing to announce and no route to what is missing, and the gate's own handler already
     opens the first unanswered question — `s-rows` is a real anchor on the cohort's table, so the
     attribute was preventing the one thing that would have helped.

     The LAW is unchanged and is still asserted here: at zero touched rows the cohort's primary is
     not yet a live commit, and it says so. What moved is HOW — `aria-disabled`, an empty fill and
     a count reading "no queries filled in yet", instead of an attribute. The stated exception the
     case is named for (the count is IN the label) is untouched. */
  add("P4.4 · bulk is the stated exception — not live at zero, with its count showing",
      !!bulk && bulk.primDisabled === false && /Log 0 queries/.test(bulk.prim),
      bulk ? `disabled=${bulk.primDisabled} prim="${bulk.prim}"` : "-");
  add("P4.5 · every other primary stays clickable while incomplete",
      !!send && !send.primDisabled && !!close && !close.primDisabled
        && (note ? !note.primDisabled : true),
      `disabled: send=${send?.primDisabled} close=${close?.primDisabled}`
        + (note ? ` note=${note.primDisabled}` : ` · ${NOT_RUN_NOTE}`));

  /* an incomplete click must WRITE NOTHING and land focus on the first missing field */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  /* ⚠️ THE FORK IS ANSWERED FIRST — there is no primary to click until an intent is chosen, so the
     probe was reading `null` and reporting the gate as broken. */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  await page.evaluate(ANSWER_FORK);
  await page.waitForTimeout(1000);
  const gate = await page.evaluate(`(() => {
    const vis = ${VIS};
    const mid = [...document.querySelectorAll(".tpn .workscroll")].filter(vis)[0];
    const go = [...document.querySelectorAll(".tpn .actbar .ab.go")].filter(vis)[0];
    if (!mid || !go) return null;
    const before = mid.scrollTop;
    go.click();
    return { before };
  })()`) as any;
  await page.waitForTimeout(900);
  /* ⚠️ THE CLICK MAY NAVIGATE, AND THAT IS THE RED ANSWER RATHER THAN A CRASH. Before the gate
     exists the primary opens the takeover, which tears down the execution context — Playwright
     throws "Execution context was destroyed" and the whole run dies with no report. Catching it
     and recording it as "the click went through" is what lets this assertion be RED before it is
     green, which is the whole point of a baseline. */
  const gated = await page.evaluate(`(() => {
    const vis = ${VIS};
    const mid = [...document.querySelectorAll(".tpn .workscroll")].filter(vis)[0];
    const a = document.activeElement;
    return {
      after: mid ? mid.scrollTop : -1,
      active: a ? (a.className.toString() || a.tagName) : "none",
      inPane: !!(a && a.closest && a.closest(".tpn .form")),
      /* the takeover would have opened if the click had committed */
      tookOver: !!document.querySelector(".ff-wrap, .focusflow, [data-focusflow]"),
    };
  })()`).catch(() => ({ after: -1, active: "context destroyed", inPane: false, tookOver: true })) as any;
  add("P4.6 · an incomplete click writes nothing and lands focus in the form",
      !!gate && !!gated && !gated.tookOver && gated.inPane,
      gated ? `scrollTop ${gate?.before}→${gated.after} · active=${gated.active} inPane=${gated.inPane} tookOver=${gated.tookOver}` : "-");

  /* ══ PHASE 5 · the note journey ══════════════════════════════════════════════════════════ */
  /* ⚠️ COUNTED ACROSS THE WHOLE PANE, NOT THE FORM COLUMN. Scoped to `.formcol` this returned 1 and
     went green while the sentence was ALSO in the band sub-line — the duplicate the brief is about.
     A false green is the direction that costs: it would have passed for the life of the fault. */
  add("P5.1 · the finishing sentence appears exactly once in the pane, total",
      note ? (note.paneText.match(/ticking it off is what finishes it/gi) || []).length === 1 : true,
      note ? `count=${(note.paneText.match(/ticking it off is what finishes it/gi) || []).length}` : NOT_RUN_NOTE);
  add("P5.2 · a note has no When segment",
      note ? (note.whenSeg === 0 && !/\bWhen\b/.test(note.text)) : true,
      note ? `segs=${note.whenSeg}` : NOT_RUN_NOTE);
  const caveat = await (async () => {
    const opened = await page.evaluate(OPEN("Note"));
    if (!opened) return null;
    await page.waitForTimeout(1000);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const el = [...document.querySelectorAll(".tpn .form .notebody")].filter(vis)[0];
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { size: cs.fontSize, family: cs.fontFamily };
    })()`) as any;
  })();
  add("P5.3 · the note's own words are the centrepiece, Caveat at 26px",
      caveat ? (caveat.size === "26px" && /Caveat/i.test(caveat.family)) : true,
      caveat ? `${caveat.size} ${caveat.family}` : NOT_RUN_NOTE);

  /* ══ PHASE 6 · the bulk table ════════════════════════════════════════════════════════════ */
  const table = await (async () => {
    const opened = await page.evaluate(OPEN_BULK);
    if (!opened) return null;
    await page.waitForTimeout(1400);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const rows = all(".tpn .bulkrow");
      const heads = all(".tpn .bulkhead th, .tpn .bulk th").map((e) => (e.textContent || "").trim());
      const sent = rows.map((r) => {
        const c = r.querySelector(".bulk-sent");
        return c ? (c.getAttribute("data-ms") || "") : "";
      });
      return {
        rows: rows.length,
        heads,
        sent,
        showAll: all(".tpn .bulk-showall").length,
        /* the contract's own class is .fillrow with .fb buttons — this hunted a name I invented
           while writing the assertion before the markup existed, and reported an empty array */
        fills: all(".tpn .fillrow .fb").map((b) => (b.textContent || "").trim()),
        caveat: (all(".tpn .form")[0] || {}).textContent || "",
        bandSub: ((all(".tpn .b-sub")[0] || {}).textContent || "").trim(),
        deed: ((all(".tpn .deed")[0] || {}).textContent || "").trim(),
        dismissAll: all(".tpn .actbar button").map((b) => (b.textContent || "").trim()),
      };
    })()`) as any;
  })();
  add("P6.1 · the bulk table renders one row per query, five visible with the rest folded",
      !!table && table.rows === 5 && table.showAll === 1,
      table ? `rows=${table.rows} showAll=${table.showAll}` : "no bulk table");
  add("P6.2 · its columns are the contract's six",
      !!table && ["Agent", "Sent", "Covering letter", "Synopsis", "Opening sample", "Something else"]
        .every((h) => table.heads.some((x: string) => x.startsWith(h))),
      table ? JSON.stringify(table.heads) : "-");
  add("P6.3 · rows are ordered oldest sent first",
      !!table && table.sent.filter(Boolean).length > 1
        && table.sent.filter(Boolean).every((v: string, i: number, a: string[]) => i === 0 || Number(a[i - 1]) <= Number(v)),
      table ? JSON.stringify(table.sent) : "-");
  add("P6.4 · both fill actions are offered, with the requirements caveat verbatim",
      !!table && table.fills.some((f: string) => /Start from what each agent asks for/.test(f))
        && table.fills.some((f: string) => /Copy the first row down/.test(f))
        && /Requirements are what the agent asks for — not proof of what you sent\./.test(table.caveat),
      table ? JSON.stringify(table.fills) : "-");
  /* ⚠️ THE IMPORT CLAUSE IS NOT ASSERTED, AND THE REASON IS A FALSE PREMISE IN THE BRIEF. Nothing
     in the model stores when an import happened; the only date available is the earliest `dateSent`
     in the cohort, which is a FIRST-QUERY date wearing an import label — the exact fault the
     Manuscripts tile paid for. So the clause is omitted from the page and from this assertion,
     rather than the assertion being satisfied by a plausible wrong number. */
  /* ⚠️ THE COHORT MOVED FROM THE SUB-LINE INTO THE DEED (repair, 26 Aug). The band's sub-line is a
     preline about an AGENT, and a cohort has none — so it is empty on this journey, correctly, and
     the count is in the deed itself: "Fill in what you sent with 30 imported queries". The law is
     that the band STATES THE COHORT and does not fall back to a single query's wording; both halves
     are still asserted, against the element that carries it. */
  add("P6.5 · the band states the cohort, and never a single query's wording",
      !!table && /\d+ imported quer(y|ies)/.test(table.deed)
        && !/A gap on the record for/.test(table.deed + table.bandSub),
      table ? `deed="${table.deed}" sub="${table.bandSub}"` : "-");
  add("P6.6 · the bar offers Dismiss all beside the counted primary",
      !!table && table.dismissAll.some((b: string) => /Dismiss all/.test(b)),
      table ? JSON.stringify(table.dismissAll) : "-");

  const red = out.filter((r) => !r.ok);
  const lines = [`── finishing round · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`
    + (mutation ? ` · MUTATED: ${mutation}` : "")];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(OUT, report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
