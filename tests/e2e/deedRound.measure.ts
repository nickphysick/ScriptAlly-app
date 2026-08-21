/**
 * THE DEED ROUND — phases 1–4, measured on the page.
 *
 * ⚠️ NO BACKTICKS AND NO BACKSLASH ESCAPES INSIDE ANY page.evaluate TEMPLATE. A backtick inside one
 * — even in a comment — terminates the string, and the file then fails to COLLECT: Playwright says
 * "No tests found" while the previous run's report sits on disk looking current. Three rounds have
 * lost reports that way. Backslash escapes do not survive either.
 *
 * ⚠️ THE REPORT IS UNLINKED AT MODULE SCOPE, because a run that dies in SETUP never reaches the
 * body — which is exactly the failure that leaves a stale file behind.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_DR_OUT ?? "run-artifacts/deed-round.txt";
rmSync(OUT, { force: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;
const OPEN = (kind: string) => `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(kind)});
  if (!row) return false; row.click(); return true;
})()`;
const OPEN_BULK = `(() => {
  const vis = ${VIS};
  const row = [...document.querySelectorAll(".tlc .row")].filter(vis)
    .find((r) => /imported queries are missing their materials/.test((r.querySelector(".r-meta") || {}).textContent || ""));
  if (!row) return false; row.click(); return true;
})()`;

test("deed round", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  const shapeOf = async (kind: string) => {
    const opened = await page.evaluate(kind === "__bulk" ? OPEN_BULK : OPEN(kind));
    if (!opened) return null;
    await page.waitForTimeout(1300);
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const pane = all(".tpn .pane")[0];
      if (!pane) return null;
      const cs = (e) => getComputedStyle(e);
      const deed = all(".tpn .deed")[0];

      /* ⚠️ EVERY HEADING-ROLE ELEMENT, AND EVERY DESCENDANT OF EACH — the coverage assertion.
         Checking the deed's own children only would miss an emphasis nested two deep, which is
         exactly how a rule like this survives: nobody puts the offending span at the top level. */
      const HEAD_SEL = ".tpn .deed, .tpn .f-h, .tpn .story-h .t, .tpn .story-h .stat, .tpn .notebody";
      const heads = all(HEAD_SEL);
      const shifted = [];
      for (const h of heads) {
        const base = cs(h).color;
        for (const kid of h.querySelectorAll("*")) {
          const c = cs(kid).color;
          if (c !== base) shifted.push((h.className || "") + " > " + (kid.tagName + "." + (kid.className || "")) + " " + c + " vs " + base);
        }
      }

      return {
        deedText: deed ? (deed.textContent || "").replace(/[ ]+/g, " ").trim() : "",
        deedEms: deed ? deed.querySelectorAll("i").length : 0,
        deedOldEms: deed ? deed.querySelectorAll("em").length : 0,
        deedSize: deed ? cs(deed).fontSize : "",
        deedWeight: deed ? cs(deed).fontWeight : "",
        deedLh: deed ? cs(deed).lineHeight : "",
        headCount: heads.length,
        kidCount: heads.reduce((n, h) => n + h.querySelectorAll("*").length, 0),
        shifted,
        subs: all(".tpn .b-sub").length,
        will: (all(".tpn .willrec")[0] || {}).textContent || "",
        willLead: (all(".tpn .willrec .lead")[0] || {}).textContent || "",
        willTransform: all(".tpn .willrec")[0] ? cs(all(".tpn .willrec")[0]).textTransform : "",
        storyHeadBg: all(".tpn .story-h")[0] ? cs(all(".tpn .story-h")[0]).backgroundImage : "",
        storyStat: (all(".tpn .story-h .stat")[0] || {}).textContent || "",
        storyCount: all(".tpn .story-h .c").length,
      };
    })()`) as any;
  };

  /* ⚠️ AN ABSENT JOURNEY IS NOT RUN, NEVER PASSED AND NEVER FAILED. Other sessions drive this same
     harness account: all four journeys opened in one run tonight and three were gone from the next.
     A conditional that goes green on a missing row is vacuous; one that goes red blames the pane for
     the data. The coverage floor below is what stops the suite quietly measuring less over time. */
  const seen = (j: any, id: string, ok: () => boolean, note: () => string) =>
    add(id, j ? ok() : true, j ? note() : "NOT RUN — journey absent from the account this run");

  const send = await shapeOf("Send");
  const note = await shapeOf("Note");
  const bulk = await shapeOf("__bulk");
  const close = await shapeOf("Close");

  /* ══ PHASE 1 · the deed is a sentence ════════════════════════════════════════════════════ */
  add("P1.1 · the coverage scan reached every heading and their descendants",
      !!send && send.headCount >= 2 && send.kidCount >= 2,
      send ? `headings=${send.headCount} descendants=${send.kidCount}` : "-");
  add("P1.2 · no element inside a heading shifts colour",
      [send, note, bulk, close].filter(Boolean).every((j: any) => j.shifted.length === 0),
      JSON.stringify([send, note, bulk, close].filter(Boolean).flatMap((j: any) => j.shifted).slice(0, 3)));
  add("P1.3 · the send deed is the contract's sentence, italic and uncoloured",
      !!send && /^Send your (full|partial) manuscript for .+/.test(send.deedText)
        && send.deedEms > 0 && send.deedOldEms === 0,
      send ? `"${send.deedText}" i=${send.deedEms} em=${send.deedOldEms}` : "-");
  add("P1.4 · it is Playfair 19/400 at 1.3, not the old 21/500 at 1.12",
      !!send && send.deedSize === "19px" && send.deedWeight === "400"
        && Math.abs(parseFloat(send.deedLh) - 19 * 1.3) < 1.5,
      send ? `${send.deedSize}/${send.deedWeight} lh=${send.deedLh}` : "-");
  add("P1.5 · no placeholder text ever appears inside a deed",
      [send, note, bulk, close].filter(Boolean)
        .every((j: any) => !/not specified|unknown|undefined|null/i.test(j.deedText)),
      [send, bulk, close].filter(Boolean).map((j: any) => j.deedText.slice(0, 40)).join(" | "));
  add("P1.6 · the sub-line is gone wherever a sentence absorbed it; the note keeps its own",
      !!send && send.subs === 0 && (!close || close.subs === 0) && (!bulk || bulk.subs === 0)
        && (!note || note.subs === 1),
      `send=${send?.subs} close=${close?.subs} bulk=${bulk?.subs} note=${note?.subs}`);
  seen(bulk, "P1.7 · the bulk deed counts its cohort in the sentence",
      () => /^Fill in what you sent with \d+ imported queries/.test(bulk.deedText),
      () => `"${bulk.deedText}"`);

  /* ══ PHASE 2 · will-record reads like a sentence ══════════════════════════════════════════ */
  add("P2.1 · the strip has a mono lead-in and prose after it",
      !!send && /This records/i.test(send.willLead) && send.willTransform === "none",
      send ? `lead="${send.willLead}" transform=${send.willTransform}` : "-");
  add("P2.2 · nothing chosen renders the em-dash form, with no field separators",
      !!send && /—/.test(send.will) && !/·/.test(send.will),
      send ? `"${send.will}"` : "-");
  seen(note, "P2.3 · a note states its own sentence",
      () => /Your note, ticked off today\./.test(note.will), () => `"${note.will}"`);
  seen(bulk, "P2.4 · bulk states nothing yet rather than a count of nothing",
      () => /nothing yet/i.test(bulk.will) && !/·/.test(bulk.will), () => `"${bulk.will}"`);

  /* ══ PHASE 3 · the story panel speaks the Query Centre's voice ════════════════════════════ */
  add("P3.1 · the story header carries the sage gradient",
      !!send && /linear-gradient/.test(send.storyHeadBg)
        && /215, 221, 213/.test(send.storyHeadBg) && /213, 219, 211/.test(send.storyHeadBg),
      send ? send.storyHeadBg.slice(0, 80) : "-");
  add("P3.2 · the right-hand side is the query's status word, not an entry count",
      !!send && send.storyStat.trim().length > 0 && send.storyCount === 0,
      send ? `stat="${send.storyStat}" counts=${send.storyCount}` : "-");

  /* ══ THE STRIP'S REMINDER CLAUSE — one case of each, and no date said twice ════════════════ */
  const clause = async (label: string) => {
    await page.goto("/todo"); await page.waitForTimeout(6000);
    if (!(await page.evaluate(OPEN("Send")))) return null;
    await page.waitForTimeout(1300);
    /* answer everything, choosing the named reminder — the strip only states what is chosen */
    for (let i = 0; i < 5; i++) {
      await page.evaluate(`(() => {
        const vis = ${VIS};
        const n = [...document.querySelectorAll(".tpn .sect.next")].filter(vis)[0];
        if (!n) return;
        const named = [...n.querySelectorAll(".seg button")].find((b) => (b.textContent || "").trim() === ${JSON.stringify(label)});
        const b = named || n.querySelector(".seg button, .upill");
        if (b) b.click();
      })()`);
      await page.waitForTimeout(500);
    }
    /* ⚠️ THE PANE MUST STILL BE THE SEND JOURNEY, and that is checked rather than assumed. This
       measured a NOTE's strip once — the row order changes under other sessions, and a probe that
       reads whatever pane happens to be open reports a true sentence about the wrong journey. */
    return await page.evaluate(`(() => {
      const vis = ${VIS};
      const deed = [...document.querySelectorAll(".tpn .deed")].filter(vis)[0];
      if (!deed || !/^Send your /.test((deed.textContent || "").trim())) return "";
      const w = [...document.querySelectorAll(".tpn .willrec")].filter(vis)[0];
      return w ? (w.textContent || "").replace(/[ ]+/g, " ") : "";
    })()`) as string;
  };

  const onDay = await clause("On the day");
  const weekBefore = await clause("The week before");
  const dateRepeats = (s: string) => {
    const dates = (s.match(/\d{1,2} [A-Z][a-z]+/g) || []);
    return new Set(dates).size !== dates.length;
  };
  /* ⚠️ NOT RUN WHEN THE JOURNEY IS NOT THERE — the convention this suite already uses for absent
     fixtures. The row order on the shared harness account changes between runs, and a probe that
     goes red for missing data blames the pane for the account. The P0 floor below is what stops the
     suite quietly measuring nothing. Phase 3's seeded fixture is what removes the volatility. */
  add("P4a · a zero lead reads as words, not the same date twice",
      onDay ? (/lands here on the day/i.test(onDay) && !dateRepeats(onDay)) : true,
      onDay ? `"${onDay}"` : "NOT RUN — send journey absent from the account this run");
  add("P4b · a non-zero lead says the relation AND the date",
      weekBefore ? (/the week before, on \d/i.test(weekBefore) && !dateRepeats(weekBefore)) : true,
      weekBefore ? `"${weekBefore}"` : "NOT RUN — send journey absent from the account this run");

  /* ══ PHASE 4 · custom date opens the calendar ═════════════════════════════════════════════ */
  await page.evaluate(OPEN("Send"));
  await page.waitForTimeout(1300);
  const reveals: Record<string, unknown> = {};
  /* which journey the pane is actually showing when P4 runs — the diagnostic that was missing */
  reveals["deed"] = await page.evaluate(`(() => {
    const d = document.querySelector(".tpn .deed");
    return d ? (d.textContent || "").slice(0, 34) : "(no pane)";
  })()`);
  for (const [row, label] of [["s-when", "Another date…"], ["s-expect", "Another date…"], ["s-remind", "A custom date…"]] as const) {
    reveals[row] = await page.evaluate(`(() => {
      const vis = ${VIS};
      const sect = document.querySelector(".tpn #${row}");
      if (!sect) return false;
      const b = [...sect.querySelectorAll(".seg button")].find((x) => (x.textContent || "").trim() === ${JSON.stringify(label)});
      if (!b) return false;
      b.click();
      return true;
    })()`) as boolean;
    await page.waitForTimeout(700);
    reveals[row + ":field"] = await page.evaluate(`(() => {
      const sect = document.querySelector(".tpn #${row}");
      if (!sect) return false;
      /* The picker's own class is sa-dp, not anything containing the word "date". This hunted the
         word and found nothing on three rows that were all rendering correctly — a probe searching
         for a name it invented rather than the one the component uses.
         (No backticks in this comment. See the file header: one inside a page.evaluate template
         terminates the string, the file fails to COLLECT, and the previous run's report survives on
         disk looking current.) */
      return sect.querySelectorAll(".sa-dp").length;
    })()`);
  }
  add("P4.1 · the custom option reveals a date field on all three rows",
      ["s-when", "s-expect", "s-remind"].every((r) => reveals[r] === true && Number(reveals[r + ":field"]) > 0),
      JSON.stringify(reveals));

  /* a revealed-but-empty field is not an answer: the chip must not have counted it */
  const chipAfter = await page.evaluate(`(() => {
    const vis = ${VIS};
    const go = [...document.querySelectorAll(".tpn .actbar .ab.go")].filter(vis)[0];
    return go ? ((go.querySelector(".n") || {}).textContent || "").trim() : "";
  })()`) as string;
  add("P4.2 · a revealed but empty date does not count as an answer",
      /^[1-9]\d* to answer$/.test(chipAfter),
      `chip="${chipAfter}"`);

  add("P0 · the suite reached at least two journeys",
      [send, note, bulk, close].filter(Boolean).length >= 2,
      `measured: ${[["send", send], ["note", note], ["bulk", bulk], ["close", close]].filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}`);

  const red = out.filter((r) => !r.ok);
  const lines = [`── deed round · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(OUT, report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
