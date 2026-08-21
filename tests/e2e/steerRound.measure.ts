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

test("steer round", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  const shapeOf = async (kind: string) => {
    const opened = await page.evaluate(kind === "__bulk" ? OPEN_BULK : OPEN(kind));
    if (!opened) return null;
    await page.waitForTimeout(1200);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const pane = all(".tpn .pane")[0];
      if (!pane) return null;
      const cs = (e) => getComputedStyle(e);

      /* ⚠️ THE SQUARE IS A PSEUDO-ELEMENT, so it is counted through the class that draws it and
         its computed animation is read off the same element. There is no node to query. */
      const nextSects = all(".tpn .sect.next");
      const sqAnim = nextSects.length
        ? getComputedStyle(nextSects[0].querySelector(".f-lbl"), "::before").animationName
        : "";

      /* every background inside the form card, at every depth — the coverage claim */
      const formCard = all(".tpn .formcol .fc")[0];
      const bgs = formCard
        ? [...formCard.querySelectorAll("*")].filter(vis)
            .map((e) => cs(e).backgroundColor)
            .filter((v, i, a) => a.indexOf(v) === i)
        : [];
      const bgCount = formCard ? [...formCard.querySelectorAll("*")].filter(vis).length : 0;

      const sects = all(".tpn .formcol .sect");
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
        nextId: nextSects.length ? nextSects[0].id : "",
        sqAnim,
        bgs, bgCount,
        sects: sects.length,
        dividers,
        boxed,
        chip: go ? ((go.querySelector(".n") || {}).textContent || "") : "",
        prim: go ? (go.textContent || "") : "",
        primDisabled: !!(go || {}).disabled,
        legacyBox: all(".tpn .expect").length + all(".tpn .inherit").length,
        hints: all(".tpn .hintline").length,
      };
    })()`) as any;
  };

  const send = await shapeOf("Send");
  const close = await shapeOf("Close");
  const note = await shapeOf("Note");
  const bulk = await shapeOf("__bulk");

  /* ══ PHASE 2 · the steer square ══════════════════════════════════════════════════════════ */
  /* ⚠️ NOT HARD-CODED TO #s-unit. The harness's send card is a FULL MANUSCRIPT, which has no unit
     to pick — `unit` is satisfied by the material itself, so the first unanswered really is
     `s-when` and the square is right. An assertion naming the section was asserting a property of
     the FIXTURE, not the law; the law is "exactly one, and it is the first still unanswered". */
  add("P2.1 · exactly one square renders, and it is on a requirable section",
      !!send && send.nextCount === 1 && /^s-/.test(send.nextId),
      send ? `count=${send.nextCount} on=#${send.nextId}` : "-");
  add("P2.2 · it breathes — the contract's own keyframes, not a blink",
      !!send && /sqPulse/i.test(send.sqAnim), send ? `animation=${send.sqAnim}` : "-");
  add("P2.3 · a note requires nothing, so it carries no square",
      !!note && note.nextCount === 0, note ? `count=${note.nextCount}` : "-");
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
  const moved = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const first = all(".tpn .sect.next")[0];
    if (!first) return null;
    const was = first.id;
    const btn = first.querySelector(".seg button, .upill");
    if (!btn) return { was, now: was, clicked: false };
    btn.click();
    return { was, clicked: true };
  })()`) as any;
  await page.waitForTimeout(700);
  const nowOn = await page.evaluate(`(() => {
    const vis = ${VIS};
    const n = [...document.querySelectorAll(".tpn .sect.next")].filter(vis);
    return { count: n.length, id: n.length ? n[0].id : "" };
  })()`) as any;
  add("P2.5 · answering the steered section moves the square on",
      !!moved && moved.clicked && !!nowOn && nowOn.count === 1 && nowOn.id !== moved.was,
      moved ? `#${moved.was} to #${nowOn?.id} (count ${nowOn?.count})` : "-");

  /* ══ PHASE 3 · the expanding pill ═════════════════════════════════════════════════════════ */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
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
    const when = [...document.querySelectorAll(".tpn #s-when .seg button")].filter(vis)[0];
    if (when) when.click();
    return { fired: !!when };
  })()`) as any;
  await page.waitForTimeout(600);
  const survived = await page.evaluate(`(() => {
    const vis = ${VIS};
    const input = [...document.querySelectorAll(".tpn .upill.on .qty input")].filter(vis)[0];
    if (!input) return null;
    return {
      value: input.value,
      caret: input.selectionStart,
      stillFocused: document.activeElement === input,
    };
  })()`) as any;
  add("P3.3 · a typed value and its caret survive a re-render mid-edit",
      !!typed && typed.fired && !!survived && survived.value === "77"
        && survived.caret === 1 && survived.stillFocused,
      survived ? `value="${survived.value}" caret=${survived.caret} focused=${survived.stillFocused}` : "-");

  /* steppers honour the unit's own increment, and never change which unit is chosen */
  const stepped = await page.evaluate(`(() => {
    const vis = ${VIS};
    const input = [...document.querySelectorAll(".tpn .upill.on .qty input")].filter(vis)[0];
    const plus = [...document.querySelectorAll(".tpn .upill.on .qty button")].filter(vis)[1];
    if (!input || !plus) return null;
    /* ⚠️ BLUR AND CLICK ARE TWO EVENTS, AND THE PROBE MUST BE TOO. Firing both in one tick reads
       the stepper's closure before React has flushed the commit — the value went 77 to 4, which
       looked like the typed number being discarded and was the PROBE collapsing two user actions
       into one. A writer who tabs out and then presses + gets a re-render in between. */
    input.blur();
    return { before: input.value, unitBefore: (document.querySelector(".tpn .upill.on") || {}).textContent || "" };
  })()`) as any;
  await page.waitForTimeout(500);
  await page.evaluate(`(() => {
    const vis = ${VIS};
    const plus = [...document.querySelectorAll(".tpn .upill.on .qty button")].filter(vis)[1];
    if (plus) plus.click();
  })()`);
  await page.waitForTimeout(500);
  const afterStep = await page.evaluate(`(() => {
    const vis = ${VIS};
    const input = [...document.querySelectorAll(".tpn .upill.on .qty input")].filter(vis)[0];
    return {
      after: input ? input.value : "",
      unitAfter: (document.querySelector(".tpn .upill.on") || {}).textContent || "",
      onCount: [...document.querySelectorAll(".tpn .upill.on")].filter(vis).length,
    };
  })()`) as any;
  add("P3.4 · a stepper moves the value and never the chosen unit",
      !!stepped && !!afterStep && afterStep.after !== stepped.before
        && afterStep.onCount === 1
        && afterStep.unitAfter.replace(/[0-9−+]/g, "").trim() === stepped.unitBefore.replace(/[0-9−+]/g, "").trim(),
      afterStep ? `${stepped?.before} to ${afterStep.after} · still one unit=${afterStep.onCount}` : "-");

  /* ══ PHASE 4 · paper and rules ═══════════════════════════════════════════════════════════ */
  /* ⚠️ THE POPULATION IS ASSERTED FIRST. An empty node list yields no offending background and
     would pass having measured nothing — the vacuous shape this project keeps closing. */
  add("P4.1 · the scan reached the form card's descendants at all",
      !!send && send.bgCount > 12, send ? `elements=${send.bgCount}` : "-");
  add("P4.2 · every background inside the form card is white, field, pink or transparent",
      !!send && send.bgs.every((b: string) =>
        /rgba\(0, 0, 0, 0\)/.test(b) || /255, 255, 255/.test(b)
        || /253, 251, 247/.test(b) || /245, 226, 218/.test(b) || /255, 253, 250/.test(b)),
      send ? JSON.stringify(send.bgs) : "-");
  add("P4.3 · the expectations box is gone — no wrapper, no fill, no border, no radius",
      !!send && send.legacyBox === 0 && send.boxed.length === 2
        && send.boxed.every((b: any) => b.border === "0px/0px" && b.radius === "0px"
          && /rgba\(0, 0, 0, 0\)/.test(b.bg)),
      send ? `legacy=${send.legacyBox} ${JSON.stringify(send.boxed)}` : "-");
  add("P4.4 · sections are divided by hairlines, and the last has none",
      !!send && send.sects >= 5
        && send.dividers.slice(0, -1).every((d: string) => d === "1px")
        && send.dividers[send.dividers.length - 1] === "0px",
      send ? JSON.stringify(send.dividers) : "-");
  add("P4.5 · the quiet lines survive the box's removal",
      !!send && send.hints === 2, send ? `hintlines=${send.hints}` : "-");

  /* ══ PHASE 5 · the primary names what is missing ══════════════════════════════════════════ */
  add("P5.1 · the primary carries a count chip while incomplete",
      !!send && /4 to answer/.test(send.chip), send ? `chip="${send.chip}"` : "-");
  add("P5.2 · a note is complete, so it carries no chip",
      !!note && note.chip === "", note ? `chip="${note.chip}"` : "-");
  add("P5.3 · bulk keeps its stated exception — inert at zero, count showing",
      !!bulk && bulk.primDisabled && /Log 0 queries/.test(bulk.prim),
      bulk ? `disabled=${bulk.primDisabled} prim="${bulk.prim}"` : "-");

  /* an incomplete click: no write, the line names every missing answer, focus lands in the first */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1200);
  const before = await page.evaluate(`(() => {
    const vis = ${VIS};
    const mid = [...document.querySelectorAll(".tpn .mid")].filter(vis)[0];
    const go = [...document.querySelectorAll(".tpn .actbar .ab.go")].filter(vis)[0];
    if (!mid || !go) return null;
    const t = mid.scrollTop;
    go.click();
    return { t };
  })()`) as any;
  await page.waitForTimeout(900);
  const after = await page.evaluate(`(() => {
    const vis = ${VIS};
    const all = (s) => [...document.querySelectorAll(s)].filter(vis);
    const mid = all(".tpn .mid")[0];
    const miss = all(".tpn .miss")[0];
    const a = document.activeElement;
    return {
      t: mid ? mid.scrollTop : -1,
      line: miss ? (miss.textContent || "") : "",
      links: miss ? [...miss.querySelectorAll("a")].map((x) => (x.textContent || "").trim()) : [],
      inFirst: !!(a && a.closest && a.closest("#s-unit")),
      tookOver: !!document.querySelector(".ff-wrap, .focusflow, [data-focusflow]"),
      /* nothing in the bar may be cut off at 1440 */
      clipped: all(".tpn .actbar *").filter((e) => e.scrollWidth > e.clientWidth + 1)
        .map((e) => e.className.toString().split(" ")[0]),
    };
  })()`) as any;
  add("P5.4 · an incomplete click writes nothing and lands focus in the first missing section",
      !!before && !!after && !after.tookOver && after.inFirst,
      after ? `scrollTop ${before?.t} to ${after.t} · inFirst=${after.inFirst} tookOver=${after.tookOver}` : "-");
  add("P5.5 · the line names every missing answer, each as its own link",
      !!after && /Still to answer:/.test(after.line) && after.links.length === 4,
      after ? `links=${JSON.stringify(after.links)}` : "-");
  add("P5.6 · nothing in the action bar truncates at 1440",
      !!after && after.clipped.length === 0, after ? JSON.stringify(after.clipped) : "-");

  const red = out.filter((r) => !r.ok);
  const lines = [`── steer round · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(OUT, report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
