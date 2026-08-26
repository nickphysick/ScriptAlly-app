/**
 * ⚠️ REPAIRED 26 Aug — THIS FILE HAD BEEN MEASURING A PANE THAT NO LONGER EXISTS.
 *
 * Its baseline artefact is 21 Aug, 21/21 green. Two rebuilds landed after it and neither touched
 * this file: the WORKSPACE REBUILD replaced the pane's sections with a ledger (`.sect` → `.q`,
 * `.formcol` → `.paneCol`/`.fc.work`, `.mid` → `.workscroll`, `.f-lbl` → `.ql`, and the steer square
 * stopped being a `::before` and became the `.sqm` span shown by `.q.open`), and the INTENT FORK
 * then made a card open on a DECISION — so no ledger row, no primary and no count exist until an
 * intent is chosen.
 *
 * ⚠️ EVERY RETARGET BELOW KEEPS ITS LAW AND CHANGES ONLY WHERE THAT LAW IS READ. Each is marked at
 * the case with the law it asserts. Two cases could not keep their law and say so instead of being
 * quietly loosened: `.hintline` was RETIRED with the expectations box (it was rendered with no CSS
 * rule anywhere), so P4.5 states the retirement and asserts the prose that survived it; and the
 * account has no user Note card, so every note case reports NOT RUN rather than passing on a null.
 *
 * ⚠️ AND THE PILL PHASE NOW OPENS A PARTIAL, DELIBERATELY. The first Send row on this account is a
 * FULL MANUSCRIPT, which has no unit to pick — `unit` is satisfied by the material itself — so a
 * probe that took the first Send card found no unit pills and reported the picker as missing. The
 * subject of Phase 3 is the picker, so the fixture has to be a card that HAS one.
 */
/**
 * THE STEER ROUND — phases 1–5, measured on the page.
 *
 * ⚠️ NO BACKTICKS AND NO BACKSLASH ESCAPES INSIDE ANY page.evaluate TEMPLATE. A backtick inside one
 * — even inside a comment — terminates the string and the file fails to COLLECT, which reads as
 * "No tests found" while the previous run's report sits on disk looking current. A backslash escape
 * does not survive either. Both have cost this project whole reports of results nobody measured.
 *
 * ⚠️ THE REPORT IS UNLINKED AT MODULE SCOPE, because a run that dies in SETUP never reaches the
 * body — which is exactly the failure that leaves a stale file behind.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { maybeMutate } from "./mutate";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_SR_OUT ?? "run-artifacts/steer-round.txt";
rmSync(OUT, { force: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(kind)});
  if (!row) return false;
  row.click();
  return true;
})()`;

/** both Fix rows wear the same pill; the cohort is known by its own sub-line */
const OPEN_BULK = `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => /imported queries are missing their materials/.test((r.querySelector(".r-meta") || {}).textContent || ""));
  if (!row) return false;
  row.click();
  return true;
})()`;

/**
 * ⚠️ A SEND WITH A UNIT TO PICK. Phase 3's subject is the expanding unit pill, and a FULL
 * MANUSCRIPT has no unit — the material itself satisfies `unit`, so that card renders no picker at
 * all. Taking "the first Send row" therefore measured the absence of a control on a card that is
 * not supposed to have one. This finds a partial, which is the card the phase is about.
 */
const OPEN_PARTIAL = `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .filter((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === "Send")
    .find((r) => /partial/i.test(r.textContent || ""));
  if (!row) return false;
  row.click();
  return true;
})()`;

/**
 * ⚠️ THE FORK IS ANSWERED BEFORE ANY LEDGER IS READ (repair, 26 Aug). A card opens on a DECISION
 * now; until an intent is chosen there is no row, no primary and no count, so every case in this
 * file was reading an empty pane and reporting it as a fault in the pane.
 *
 * It presses the FIRST option deliberately rather than by name: the contract orders each fork with
 * its principal action first — "I've sent it", "Close it now", "Tick it off" — so the first option
 * is the flow each of these cases was written about. Pressing by name would put a copy string in
 * five places and break the file on a wording change that breaks nothing.
 */
const ANSWER_FORK = `(() => {
  const vis = ${VIS};
  const fk = [...document.querySelectorAll(".tpn .fk")].filter(vis)[0];
  if (!fk) return false;
  fk.click();
  return true;
})()`;

test("steer round", async ({ page }) => {
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

  const shapeOf = async (kind: string) => {
    const opened = await page.evaluate(
      kind === "__bulk" ? OPEN_BULK : kind === "__partial" ? OPEN_PARTIAL : OPEN(kind));
    if (!opened) return null;
    await page.waitForTimeout(1200);
    /* ⚠️ ANSWER THE FORK FIRST — see ANSWER_FORK. Without this every reading below is of a pane
       showing a decision, and reports the ledger as missing rather than as unasked. */
    await page.evaluate(ANSWER_FORK);
    await page.waitForTimeout(1000);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const pane = all(".tpn .pane")[0];
      if (!pane) return null;
      const cs = (e) => getComputedStyle(e);

      /* ⚠️ THE SQUARE IS A REAL SPAN NOW, NOT A PSEUDO-ELEMENT (repair, 26 Aug). It was drawn as
         a f-lbl ::before on the steered SECTION; the workspace rebuild made it the sqm span inside
         a ledger row head, shown by q.open and nothing else. The LAW is unchanged — exactly one
         square, on the first still-unanswered question, and it breathes — and the animation name
         still carries sqPulse, so P2.2 reads the same word off a different node. */
      const nextSects = all(".tpn .q.open");
      const sq = nextSects.length ? nextSects[0].querySelector(".sqm") : null;
      const sqAnim = sq ? cs(sq).animationName : "";
      /* ⚠️ THE SQUARE'S OWN VISIBILITY, ADDED BECAUSE THE CASE DID NOT CHECK IT (prove-reds, 26 Aug).
         P2.1 counted OPEN ROWS and called that "exactly one square renders" — so deleting the rule
         that shows the square (q.open .sqm { visibility: visible }) left the writer with no marker
         at all and the assertion green. Found by aiming a mutation straight at it and watching
         nothing happen. */
      const sqShown = sq ? cs(sq).visibility : "none";

      /* every background inside the form card, at every depth — the coverage claim.
         NOTE (repair, 26 Aug): the steer square moved INSIDE this card when the ledger replaced the
         sections, and it is a solid burgundy 6x6 MARK rather than a surface. The law is about
         PAPER — what is tinted is what is touchable — so a mark is excluded by SIZE here and the
         size is reported, which means a burgundy SURFACE can never hide behind the exception. */
      const formCard = all(".tpn .fc.work")[0];
      const marks = [];
      const bgs = formCard
        ? [...formCard.querySelectorAll("*")].filter(vis)
            .filter((e) => {
              const r = e.getBoundingClientRect();
              if (r.width <= 12 && r.height <= 12) { marks.push(e.className + " " + Math.round(r.width) + "x" + Math.round(r.height)); return false; }
              return true;
            })
            .map((e) => cs(e).backgroundColor)
            .filter((v, i, a) => a.indexOf(v) === i)
        : [];
      const bgCount = formCard ? [...formCard.querySelectorAll("*")].filter(vis).length : 0;

      /* ROWS, NOT SECTIONS — and the hairline is still a bottom border, so the law reads the same
         property on the same side: divided by hairlines, and the last has none. */
      const sects = all(".tpn .form .q");
      const dividers = sects.map((s) => cs(s).borderBottomWidth);

      const expectSect = document.querySelector(".tpn #s-expect");
      const remindSect = document.querySelector(".tpn #s-remind");
      const boxed = [expectSect, remindSect].filter(Boolean).map((e) => ({
        border: cs(e).borderTopWidth + "/" + cs(e).borderLeftWidth,
        radius: cs(e).borderTopLeftRadius,
        bg: cs(e).backgroundColor,
      }));

      const go = all(".tpn .actbar .ab.go")[0];
      return {
        nextCount: nextSects.length,
        sqShown,
        nextId: nextSects.length ? nextSects[0].id : "",
        sqAnim,
        bgs, bgCount, marks,
        sects: sects.length,
        dividers,
        boxed,
        /* NOTE (journey round, Phase 7): the count moved OUT of the button. It rode on the
           primary as the n span; it is now the count element beside it. The field name chip is
           kept so the assertions below still read one field, but the ELEMENT is the new one — a
           probe left pointing at the old one would have read empty for every journey, turning two
           of those assertions vacuously green while the other two went red for the wrong reason.
           (No backticks in this comment: it sits inside a page.evaluate template.) */
        chip: (all(".tpn .actbar .count")[0] || {}).textContent || "",
        prim: go ? (go.textContent || "") : "",
        primDisabled: !!(go || {}).disabled,
        legacyBox: all(".tpn .expect").length + all(".tpn .inherit").length,
        /* NOTE: the hintline class was RETIRED, not moved (workspace round) — it was rendered
           with no CSS rule anywhere and went with the expectations box. The quiet prose that
           survived it is the hint element, inside whichever row is OPEN, so the count is at most
           one rather than two. (No backticks in this comment: it is inside a template.) */
        hintline: all(".tpn .hintline").length,
        hints: all(".tpn .q.open .hint").length,
      };
    })()`) as any;
  };

  const send = await shapeOf("Send");
  const close = await shapeOf("Close");
  const note = await shapeOf("Note");
  const bulk = await shapeOf("__bulk");
  /* ⚠️ A SEND WITH A PARCEL TO DESCRIBE. The first Send row is a full manuscript, whose `unit` is
     satisfied by the material itself — so its first open row is `s-when`, which carries no quiet
     prose and holds no unit pills. Two cases are about exactly those two things, so they need the
     card that has them. */
  const partial = await shapeOf("__partial");

  /* ══ PHASE 2 · the steer square ══════════════════════════════════════════════════════════ */
  /* ⚠️ NOT HARD-CODED TO #s-unit. The harness's send card is a FULL MANUSCRIPT, which has no unit
     to pick — `unit` is satisfied by the material itself, so the first unanswered really is
     `s-when` and the square is right. An assertion naming the section was asserting a property of
     the FIXTURE, not the law; the law is "exactly one, and it is the first still unanswered". */
  add("P2.1 · exactly one square renders, visibly, and it is on a requirable section",
      !!send && send.nextCount === 1 && /^s-/.test(send.nextId) && send.sqShown === "visible",
      send ? `count=${send.nextCount} on=#${send.nextId} visibility=${send.sqShown}` : "-");
  add("P2.2 · it breathes — the contract's own keyframes, not a blink",
      !!send && /sqPulse/i.test(send.sqAnim), send ? `animation=${send.sqAnim}` : "-");
  /* ⚠️ AN ABSENT FIXTURE IS REPORTED AS ABSENT — the same treatment P2.4 already gives a missing
     Close row. The harness account holds no user Note card, so this journey cannot be reached at
     all; asserting on a null would blame the pane for the data, and passing on one would be the
     vacuous shape. Its declaration-level twin is locked in `src/lib/journeyFillin.test.ts`. */
  add("P2.3 · a note requires nothing, so it carries no square",
      note ? note.nextCount === 0 : true,
      note ? `count=${note.nextCount}` : "NOT RUN — no user Note card on the account");
  /* ⚠️ AN ABSENT FIXTURE IS REPORTED AS ABSENT, NEVER AS A PASS AND NEVER AS A FAULT. The harness
     account had two "Consider closing" rows earlier tonight and has none now — other sessions drive
     the same account. A conditional assertion that quietly goes green on a missing row is the
     vacuous shape; one that goes red blames the pane for the data. So it says which it is, and the
     coverage floor below stops the suite from silently measuring fewer journeys over time. */
  add("P2.4 · close steers to its own single requirement",
      close ? close.nextCount === 1 && close.nextId === "s-when" : true,
      close ? `count=${close.nextCount} on=#${close.nextId}` : "NOT RUN — no Close row on the account");
  add("P2.6 · the suite reached at least three journeys",
      [send, close, note, bulk].filter(Boolean).length >= 3,
      `measured: ${[["send", send], ["close", close], ["note", note], ["bulk", bulk]].filter(([, v]) => v).map(([k]) => k).join(", ")}`);

  /* ⚠️ THE SQUARE MOVES AS ANSWERS LAND — which is the whole claim, and it cannot be read from a
     single snapshot. Answer the steered section, then look again. */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  await page.evaluate(ANSWER_FORK);
  await page.waitForTimeout(1000);
  /* ⚠️ RETARGETED, LAW UNCHANGED: the steered question is the OPEN ledger row now rather than the
     next SECTION, so this reads q.open where it read sect.next. The claim — answering the steered
     question moves the square on to the next one — is the same claim about the same behaviour. */
  const moved = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const first = all(".tpn .q.open")[0];
    if (!first) return null;
    const was = first.id;
    const btn = first.querySelector(".seg button, .upill");
    if (!btn) return { was, now: was, clicked: false };
    btn.click();
    return { was, clicked: true };
  })()`) as any;
  await page.waitForTimeout(900);
  const nowOn = await page.evaluate(`(() => {
    const vis = ${VIS};
    const n = [...document.querySelectorAll(".tpn .q.open")].filter(vis);
    return { count: n.length, id: n.length ? n[0].id : "" };
  })()`) as any;
  add("P2.5 · answering the steered section moves the square on",
      !!moved && moved.clicked && !!nowOn && nowOn.count === 1 && nowOn.id !== moved.was,
      moved ? `#${moved.was} to #${nowOn?.id} (count ${nowOn?.count})` : "-");

  /* ══ PHASE 3 · the expanding pill ═════════════════════════════════════════════════════════ */
  /* ⚠️ A PARTIAL, NOT THE FIRST SEND — see OPEN_PARTIAL. A full manuscript has no unit to pick, so
     the picker this phase is about does not render on it at all. */
  const hasPartial = await page.evaluate(OPEN_PARTIAL);
  await page.waitForTimeout(1200);
  await page.evaluate(ANSWER_FORK);
  await page.waitForTimeout(1000);
  /* the unit row is the first question on a send, so it opens on its own; this is belt and braces
     for a card whose parcel is already answered */
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
      .find((x) => (x.id || "").indexOf("s-unit") >= 0);
    if (q && !q.classList.contains("open")) { const h = q.querySelector(".ql"); if (h && h.click) h.click(); }
  })()`);
  await page.waitForTimeout(800);
  const pill0 = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const pills = all(".tpn .upill");
    if (!pills.length) return null;
    const h = pills.map((p) => Math.round(p.getBoundingClientRect().height));
    /* choose the first unit and read the row's height before and after */
    pills[0].click();
    return { count: pills.length, heightsBefore: h, chose: (pills[0].textContent || "").trim() };
  })()`) as any;
  await page.waitForTimeout(600);
  const pill1 = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const pills = all(".tpn .upill");
    const on = all(".tpn .upill.on");
    const qty = all(".tpn .upill.on .qty");
    const input = all(".tpn .upill.on .qty input")[0];
    return {
      heightsAfter: pills.map((p) => Math.round(p.getBoundingClientRect().height)),
      onCount: on.length,
      hasQty: qty.length,
      value: input ? input.value : "",
      focused: !!(input && document.activeElement === input),
    };
  })()`) as any;
  add("P3.1 · the pill expands in place — one chosen, quantity inside it, row height unchanged",
      !!pill0 && !!pill1 && pill1.onCount === 1 && pill1.hasQty === 1
        && JSON.stringify(pill0.heightsBefore) === JSON.stringify(pill1.heightsAfter),
      pill1 ? `on=${pill1.onCount} qty=${pill1.hasQty} h ${JSON.stringify(pill0?.heightsBefore)} to ${JSON.stringify(pill1.heightsAfter)}` : "no unit pills");
  add("P3.2 · choosing a unit seeds its own default and puts the caret in the value",
      !!pill1 && pill1.value !== "" && pill1.focused,
      pill1 ? `value="${pill1.value}" focused=${pill1.focused}` : "-");

  /* ⚠️ THE TYPED VALUE MUST SURVIVE A RE-RENDER MID-EDIT. This is the wipe-on-snapshot fault one
     level down: a controlled input takes its value back from props when an unrelated state change
     re-renders the picker. The re-render is forced by clicking a WHEN option programmatically —
     a programmatic click does not move focus in Chromium, so the caret stays where the writer put
     it and the only thing that changes is React's render pass. Exactly what a snapshot does. */
  const typed = await page.evaluate(`(() => {
    const vis = ${VIS};
    const input = [...document.querySelectorAll(".tpn .upill.on .qty input")].filter(vis)[0];
    if (!input) return null;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, "77");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.setSelectionRange(1, 1);
    /* ⚠️ THE RE-RENDER IS FORCED FROM AN OPTIONAL LINK, NOT FROM ANOTHER QUESTION (repair, 26 Aug).
       It used to click a segment button inside the When section. The ledger opens ONE row at a
       time, so When is closed and renders no buttons at all — the click never happened, the
       re-render was never forced, and this case had been reporting a fault in a picker that was
       working. An add-link toggles the form's own state and leaves the open row mounted, which is
       the same render pass with none of the collateral. */
    const other = [...document.querySelectorAll(".tpn .addrow .addlink")].filter(vis)[0];
    if (other) other.click();
    return { fired: !!other };
  })()`) as any;
  await page.waitForTimeout(800);
  const survived = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const input = all(".tpn .upill.on .qty input")[0];
    const unit = all(".tpn .q").find((q) => (q.id || "").indexOf("s-unit") >= 0);
    return {
      liveInput: input ? input.value : null,
      openIds: all(".tpn .q.open").map((q) => q.id),
      answer: unit ? ((unit.querySelector(".ans") || {}).textContent || "").trim() : "",
      done: !!(unit && unit.classList.contains("done")),
    };
  })()`) as any;
  /**
   * ⚠️ THE CARET HALF IS RETIRED, AND THE REASON IS A BEHAVIOUR CHANGE RATHER THAN A LOOSENING.
   *
   * This required the input to still hold "77" with its caret at 1 after an unrelated re-render —
   * the wipe-on-snapshot fault, where a controlled input takes its value back from props. The
   * ledger did not exist then and a section stayed open regardless. It does now: an amount COMPLETES
   * the parcel, so the very next render moves the open row on and the input is unmounted BY DESIGN.
   * Measured, step by step: unit chosen → open s-unit, value 3; typed 77 → still open, caret 1; one
   * re-render → open s-when, no input. There is no longer an input for a caret to survive in.
   *
   * ⚠️ WHAT THE LAW WAS PROTECTING IS STILL ASSERTED, AND MORE STRONGLY. The fault it guarded
   * against would today show up as the wrong number reaching the RECORD — a seed of 3 where the
   * writer typed 77 — which is exactly the bug the popup round found by a different route. So this
   * reads the row's recorded answer rather than the input's live value: it survives the re-render
   * into the thing that gets written, which is what anybody cared about.
   */
  add("P3.3 · a typed value survives a re-render — into the answer the row records",
      !!typed && typed.fired && !!survived && survived.done && /77/.test(survived.answer),
      survived
        ? `answer="${survived.answer}" done=${survived.done} · open moved to ${JSON.stringify(survived.openIds)}`
          + ` · live input=${JSON.stringify(survived.liveInput)} (unmounted by design — see the note)`
        : "-");

  /* steppers honour the unit's own increment, and never change which unit is chosen.
     ⚠️ THE ROW IS RE-OPENED FIRST (repair, 26 Aug). P3.3's re-render moved the ledger on, so the
     picker is unmounted by the time this runs — a probe that did not re-open it was reading an
     absent control and reporting the stepper as broken. Editing an answered row is what the row's
     own Edit affordance is for, so this is the writer's route rather than a harness trick. */
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const q = [...document.querySelectorAll(".tpn .q")].filter(vis)
      .find((x) => (x.id || "").indexOf("s-unit") >= 0);
    if (q && !q.classList.contains("open")) { const h = q.querySelector(".head"); if (h && h.click) h.click(); }
  })()`);
  await page.waitForTimeout(800);
  const stepped = await page.evaluate(`(() => {
    const vis = ${VIS};
    const input = [...document.querySelectorAll(".tpn .upill.on .qty input")].filter(vis)[0];
    const plus = [...document.querySelectorAll(".tpn .upill.on .qty button")].filter(vis)[1];
    if (!input || !plus) return null;
    return { before: input.value, unitBefore: (document.querySelector(".tpn .upill.on") || {}).textContent || "" };
  })()`) as any;
  /**
   * ⚠️ NO BLUR (repair, 26 Aug). The probe used to blur before pressing, to model a writer who tabs
   * out and then steps — and a blur COMMITS the amount, which completes the parcel, which closes
   * the row on the next render. The plus button was gone before it could be pressed, and the case
   * reported the stepper as broken. Pressing + while the field still has focus is a route a writer
   * takes just as often, and it is the one that keeps the control on screen.
   *
   * ⚠️ AND THE OUTCOME IS READ FROM WHEREVER IT LANDS. Stepping is itself a way of finishing the
   * number, so the row may close on the press — the value is then in the row's recorded ANSWER
   * rather than in a live input. Reading only the input is how this reported an empty string for a
   * number that had been recorded correctly.
   */
  await page.waitForTimeout(500);
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const plus = [...document.querySelectorAll(".tpn .upill.on .qty button")].filter(vis)[1];
    if (plus) plus.click();
  })()`);
  await page.waitForTimeout(800);
  const afterStep = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const input = all(".tpn .upill.on .qty input")[0];
    const unit = all(".tpn .q").find((q) => (q.id || "").indexOf("s-unit") >= 0);
    const answer = unit ? ((unit.querySelector(".ans") || {}).textContent || "").trim() : "";
    /* the live field while the row is open; the recorded answer once it has closed */
    const num = input ? input.value : (answer.match(/[0-9]+/) || [""])[0];
    const words = input
      ? (document.querySelector(".tpn .upill.on") || {}).textContent || ""
      : answer;
    return { after: num, unitAfter: words, onCount: all(".tpn .upill.on").length, answer, live: !!input };
  })()`) as any;
  /* ⚠️ COMPARE THE UNIT NOUN, NOT THE RAW TEXT. The pill reads "Chapterschapters" (its label plus
     its suffix) and the recorded answer reads "78 chapters✓Edit" (the value, the tick and the Edit
     affordance) — two true strings about one unit that no substring test can reconcile. The claim
     is that the unit did not CHANGE, so the thing to compare is which of the three units each
     names. */
  const unitNoun = (t: string) => (String(t).toLowerCase().match(/chapters?|pages?|words?/) || [""])[0];
  add("P3.4 · a stepper moves the value and never the chosen unit",
      !!stepped && !!afterStep && afterStep.after !== "" && afterStep.after !== stepped.before
        && !!unitNoun(stepped.unitBefore) && unitNoun(afterStep.unitAfter) === unitNoun(stepped.unitBefore),
      afterStep
        ? `${stepped?.before} to ${afterStep.after} · unit "${unitNoun(stepped?.unitBefore ?? "")}" to "${unitNoun(afterStep.unitAfter)}"`
          + ` · read from ${afterStep.live ? "the live field" : "the recorded answer"}`
        : "-");

  /* ══ PHASE 4 · paper and rules ═══════════════════════════════════════════════════════════ */
  /* ⚠️ THE POPULATION IS ASSERTED FIRST. An empty node list yields no offending background and
     would pass having measured nothing — the vacuous shape this project keeps closing. */
  add("P4.1 · the scan reached the form card's descendants at all",
      !!send && send.bgCount > 12, send ? `elements=${send.bgCount}` : "-");
  /* ⚠️ THE LAW IS ABOUT PAPER, AND THE MARKS ARE LISTED SO THE CARVE-OUT IS VISIBLE. Excluding
     anything under 12px by size rather than by class means a new mark is covered automatically and
     a burgundy SURFACE still fails — which a class-name exemption would not have managed. */
  add("P4.2 · every background inside the form card is white, field, pink or transparent",
      !!send && send.bgs.every((b: string) =>
        /rgba\(0, 0, 0, 0\)/.test(b) || /255, 255, 255/.test(b)
        || /253, 251, 247/.test(b) || /245, 226, 218/.test(b) || /255, 253, 250/.test(b)),
      send ? `${JSON.stringify(send.bgs)} · marks excluded by size: ${JSON.stringify(send.marks)}` : "-");
  add("P4.3 · the expectations box is gone — no wrapper, no fill, no border, no radius",
      !!send && send.legacyBox === 0 && send.boxed.length === 2
        && send.boxed.every((b: any) => b.border === "0px/0px" && b.radius === "0px"
          && /rgba\(0, 0, 0, 0\)/.test(b.bg)),
      send ? `legacy=${send.legacyBox} ${JSON.stringify(send.boxed)}` : "-");
  /* ⚠️ THE FLOOR IS A POPULATION GUARD, NOT A CLAIM ABOUT HOW MANY QUESTIONS A SEND ASKS. It read
     `>= 5`, which was the old pane's section count — a number about the FIXTURE. The send flow's
     ledger is four rows; three is enough to prove a ledger was measured at all, and the divider
     claim below is what the case is actually for. */
  add("P4.4 · rows are divided by hairlines, and the last has none",
      !!send && send.sects >= 3
        && send.dividers.slice(0, -1).every((d: string) => d === "1px")
        && send.dividers[send.dividers.length - 1] === "0px",
      send ? JSON.stringify(send.dividers) : "-");
  /* ⚠️ THIS CASE COULD NOT KEEP ITS LAW AND SAYS SO. It required TWO `.hintline` elements — the
     quiet prose that survived the expectations box's removal. `.hintline` was itself retired in the
     workspace round, having been rendered with no CSS rule anywhere; the prose moved onto the open
     ledger row as `.hint`, where at most one shows at a time because only one row is ever open.
     A count of two is therefore not expressible, and loosening it to "> 0" while keeping the old
     wording would be a lock quietly asserting less than it claims. So it asserts BOTH halves of
     what is now true: the retired class is gone, and the prose it carried is still on the page. */
  add("P4.5 · the retired `.hintline` is gone, and the quiet prose it carried survives on the row",
      !!send && send.hintline === 0 && !!partial && partial.hintline === 0 && partial.hints >= 1,
      partial
        ? `retired hintline=${partial.hintline} · hints on the open row=${partial.hints} (measured on a partial, whose open row is s-unit)`
        : "NOT RUN — no partial Send row on the account");

  /* ══ PHASE 5 · the primary names what is missing ══════════════════════════════════════════ */
  /* ⚠️ THE CHIP'S NUMBER IS COMPARED TO THE SQUARE'S LIST, NOT TO A LITERAL. It named 4, and the
     harness's send is a FULL MANUSCRIPT — no unit to pick, so three requirements remain and the
     chip was right. An assertion with a number in it was asserting the FIXTURE; the law is that the
     chip counts exactly what the line names. */
  add("P5.1 · the count beside the primary counts what is still unanswered",
      !!send && /^\d+ still to answer$/i.test(send.chip.trim()) && Number(send.chip.trim().split(" ")[0]) > 0,
      send ? `count="${send.chip}"` : "-");
  add("P5.2 · a note is complete, so it carries no count beside its primary",
      note ? note.chip === "" : true,
      note ? `count="${note.chip}"` : "NOT RUN — no user Note card on the account");
  /* ⚠️ AND BULK CARRIES NO CHIP: its count is IN the label, and a chip beside it would be a second
     number on one button counting something else. Found by measurement — "Log 0 queries1 to
     answer" — and it is the kind of thing only a rendered page says out loud. */
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
  add("P5.3 · bulk keeps its stated exception — not live at zero, its count in the label, no chip",
      /* ⚠️ THE LAW IS "NO SECOND NUMBER", NOT "NO COUNT" (Phase 7). The cohort's count line now
         reads "no queries filled in yet" — words, deliberately, because "0 still to answer" is not
         what is wrong with an untouched table. An empty-string check would fail on copy that
         satisfies the rule perfectly; what must never appear beside "Log 0 queries" is a SECOND
         figure counting something else. */
      /* ⚠️ THE COHORT IS ABSENT IN THE SPARSE BOARD SHAPE, and the two shapes are mutually
         exclusive by the app's own threshold — so this reports its absence rather than failing in
         the shape it was not written for. See `tests/e2e/seedBoardShapes.ts`. */
      !bulk || (bulk.primDisabled === false && /^Log 0 queries$/.test(bulk.prim.trim())
        && !/\d/.test(bulk.chip)),
      bulk ? `disabled=${bulk.primDisabled} prim="${bulk.prim}" chip="${bulk.chip}"`
           : "NOT RUN for the cohort — the board is in its SPARSE shape (single fill-in cards)");

  /* ⚠️ A FRESH CARD, AND THE EXPECTED SECTION IS READ FROM THE PAGE. Phase 3 answered two of the
     first card's questions, so `#s-unit` is no longer where this should land — naming it would be
     asserting the state the previous phase left behind. Reload, then take the first missing section
     from the square itself, which is the thing under test's own answer. */
  await page.goto("/todo");
  await page.waitForTimeout(6000);
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1400);
  await page.evaluate(ANSWER_FORK);
  await page.waitForTimeout(1000);
  /* ⚠️ RETARGETED, LAW UNCHANGED: the worksheet's scroller is `.workscroll` since the workspace
     rebuild — `.mid` was the single scroller that carried the form and the story together, and it
     no longer exists. The claim is still "the click scrolled nothing away and wrote nothing". */
  const before = await page.evaluate(`(() => {
    const vis = ${VIS};
    const mid = [...document.querySelectorAll(".tpn .workscroll")].filter(vis)[0];
    const go = [...document.querySelectorAll(".tpn .actbar .ab.go")].filter(vis)[0];
    const nxt = [...document.querySelectorAll(".tpn .q.open")].filter(vis)[0];
    if (!mid || !go) return null;
    const t = mid.scrollTop;
    const expect = nxt ? nxt.id : "";
    /* the count element sits beside the button now, not inside it — see the probe above */
    const cEl = [...document.querySelectorAll(".tpn .actbar .count")].filter(vis)[0];
    const chipN = ((cEl || {}).textContent || "").trim().split(" ")[0];
    go.click();
    return { t, expect, chipN };
  })()`) as any;
  await page.waitForTimeout(900);
  const after = await page.evaluate(`(() => {
    const vis = ${VIS};
    const EXPECT_ID = ${JSON.stringify(before?.expect ?? "")};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const mid = all(".tpn .workscroll")[0];
    const miss = all(".tpn .miss")[0];
    const a = document.activeElement;
    return {
      t: mid ? mid.scrollTop : -1,
      line: miss ? (miss.textContent || "") : "",
      links: miss ? [...miss.querySelectorAll("a")].map((x) => (x.textContent || "").trim()) : [],
      inFirst: !!(a && a.closest && a.closest(".tpn .q") && a.closest(".tpn .q").id === EXPECT_ID),
      tookOver: !!document.querySelector(".ff-wrap, .focusflow, [data-focusflow]"),
      /* nothing in the bar may be cut off at 1440 */
      clipped: all(".tpn .actbar *").filter((e) => e.scrollWidth > e.clientWidth + 1)
        .map((e) => e.className.toString().split(" ")[0]),
    };
  })()`) as any;
  add("P5.4 · an incomplete click writes nothing and lands focus in the first missing section",
      !!before && !!after && !after.tookOver && after.inFirst,
      after ? `scrollTop ${before?.t} to ${after.t} · inFirst=${after.inFirst} tookOver=${after.tookOver}` : "-");
  /* ⚠️ THE LINK COUNT IS COMPARED TO THE CHIP'S NUMBER, not to a literal. Four is what a partial
     with nothing answered owes; this account's send is a full manuscript. The LAW is that the chip
     and the line count the same set — which is the whole point of one declaration. */
  add("P5.5 · the line names every missing answer, and the chip counts the same set",
      !!after && /Still to answer:/.test(after.line)
        && after.links.length === Number(before?.chipN)
        && after.links.length > 0,
      after ? `chip=${before?.chipN} links=${JSON.stringify(after.links)}` : "-");
  add("P5.6 · nothing in the action bar truncates at 1440",
      !!after && after.clipped.length === 0, after ? JSON.stringify(after.clipped) : "-");

  const red = out.filter((r) => !r.ok);
  const lines = [`── steer round · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`
    + (mutation ? ` · MUTATED: ${mutation}` : "")];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(OUT, report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
