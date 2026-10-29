/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FOUR FIXES — the source half. §1's fill, §3's leaves, §4's one hover implementation.
 *
 * ⚠️ WHAT IS **NOT** HERE IS THE GEOMETRY, AND THAT IS THE SPLIT THIS REPO ALREADY STATES. "The
 * three columns do not intersect", "the line paints over a hovered card" and "hovering reveals the
 * label" are claims about a rendered page and live in `tests/e2e/calFixes.measure.ts`; a source
 * lock can only say that the code was written. What belongs here is the other kind: this element
 * is mounted, this token is still emitted, this host does not carry a second copy of a mechanism.
 *
 * ⚠️ AND EVERY READ STRIPS COMMENTS FIRST. The prose in these files quotes the very tokens the
 * cases forbid — the fills that were retired, the handler that was deleted — so a raw-text sweep
 * would find a retirement's own obituary and report it as live code.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { sliceBetween } from "../../../test/sliceBetween";

const R = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
/** comments out — block and line, in that order */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");

const BOARD_CSS = decls(R("src/components/todo/todoCalendar.css"));
const BOARD_TSX = decls(R("src/components/shared/timeline/TimelineBoard.tsx"));
const QC = decls(R("src/components/Queries.tsx"));
/* The To-do Calendar page — the board's last host — was RETIRED on 29 Oct, so §4's host cases went with it
   (tests/e2e/RETIRED-retire-calendar-v1.md). The board's own files stay, unmounted, by that run's ruling. */

/** every declaration block in a stylesheet, selector list and body */
const blocks = (css: string) =>
  [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
const bodyOf = (css: string, selector: string) => {
  const hits = blocks(css).filter((b) => b.sel.split(",").some((one) => one.trim() === selector));
  expect(hits.length, `${selector} is declared ${hits.length} times — name the one you mean`).toBeGreaterThan(0);
  return hits.map((b) => b.body).join("\n");
};

describe("§1 · a past stage is drawn in its own state colour, faded", () => {
  it("the stage publishes its state from `stateFor` — the same call its card is built from", () => {
    /* ⚠️ ONE DERIVATION, TWO READERS. The fill and the card that opens from a stage must agree
       about which state it was; they do so by construction only while both come from this call. */
    const stage = sliceBetween(BOARD_TSX, "className={`tl-jc${narrow", "</span>", "the past-stage element");
    expect(stage).toContain("data-st={stateFor(a.status ?? QueryStatus.QUERIED)}");
    expect(stage).toContain("bandClass: `tl-st-${stateFor(a.status ?? QueryStatus.QUERIED)}`");
  });

  it("⚠️ its fill is the state token, not white — the whole of the fault", () => {
    const jc = bodyOf(BOARD_CSS, ".tl-jc");
    /* the painted value is the token; `#fff` survives only as the fallback for a stage whose
       status does not map, which is a stage drawn as it always was rather than a transparent box */
    expect(jc, "the stage no longer reads `--st` for its fill").toMatch(/background\s*:\s*var\(--st,\s*#fff\)/);
    const rest = jc.replace(/background\s*:\s*var\(--st,\s*#fff\)\s*;/, "");
    expect(rest, "a second, colourless background is still declared on the stage").not.toMatch(/background\s*:\s*#(fff|ffffff)\b/i);
  });

  it("all five states map, each to its OWN token", () => {
    /* A mapping that is complete and crossed — `you` reading the sage — is a board that states the
       wrong court in the one vocabulary reserved for it, and reads as perfectly fine. */
    for (const state of ["queried", "agent", "you", "offer", "closed"]) {
      const rule = blocks(BOARD_CSS).find((b) => b.sel === `.tl-jc[data-st="${state}"]`);
      expect(rule, `no fill mapped for a ${state} stage`).toBeTruthy();
      expect(rule!.body).toMatch(new RegExp(`--st\\s*:\\s*var\\(--state-${state}\\)`));
    }
  });

  it("it rests at .34 and comes to full strength above its neighbours", () => {
    const jc = bodyOf(BOARD_CSS, ".tl-jc");
    expect(jc).toMatch(/opacity\s*:\s*\.34\b/);
    const hover = bodyOf(BOARD_CSS, ".tl-jc:hover");
    expect(hover).toMatch(/opacity\s*:\s*1\b/);
    expect(hover).toMatch(/z-index\s*:\s*12\b/);
  });
});

/* ⚠️ DESCRIBE RETIRED (Query Centre v11, 19 Sep) — "§3 · the range is two leaves, and the row can no longer be
   squeezed". It locked the Query Centre calendar's HEADER row (pager, two date leaves, search, view switch) and
   its sheet `queryCalendarLayout.css`; both are deleted with the rail. v11's calendar states its range as text in
   its own control row — measured in tests/e2e/qcV11.measure.ts. */

describe("§4 · one hover implementation, and both hosts mount it", () => {
  it("no page mounts the board now — its last host, the Calendar page, was retired (29 Oct)", () => {
    /* ⚠️ RETARGETED (Calendar retired, 29 Oct). The two host cases (the shared hover, real handlers) had one
       subject, `TodoCalendarPage`, and it is deleted. What survives is the ABSENCE, asserted over every page
       file, so a board that is mounted again arrives here and has to bring its host cases back with it. */
    expect(QC, "the Query Centre mounts the To-do board again").not.toContain("<TimelineBoard");
    const walked: string[] = [];
    const hosts: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.tsx$/.test(n) || /\.test\.tsx$/.test(n)) continue;
        walked.push(p);
        if (n === "TimelineBoard.tsx") continue; // the board names itself; skipped by name, never by loosening the pattern
        if (decls(readFileSync(p, "utf8")).includes("<TimelineBoard")) hosts.push(p);
      }
    };
    walk(join(process.cwd(), "src"));
    expect(walked.length, "a sweep over nothing proves nothing").toBeGreaterThan(300);
    expect(hosts).toEqual([]);
  });

  it("the mark reveals on focus as well as on hover", () => {
    /* `opacity: 0` does not take a button out of the tab order, so before this a Tab landed on an
       invisible control. Both halves of the reveal are asserted, because the `.on` half alone is
       what the keyboard could never reach. */
    const reveal = blocks(BOARD_CSS).filter((b) => b.sel.includes(".tl-act") && /opacity\s*:\s*1\b/.test(b.body));
    const sels = reveal.map((b) => b.sel).join(" | ");
    expect(sels, "hover no longer reveals the label").toContain(".tl-act.on .tl-actlab");
    expect(sels, "focus does not reveal the label").toContain(".tl-act:focus-within .tl-actlab");
    expect(sels, "focus does not reveal the button").toContain(".tl-act:focus-within .tl-actbtn");
    /* the urgent mark hides entirely at rest, so its own opacity has to answer to focus too */
    expect(sels, "an urgent mark stays invisible to the keyboard").toContain(".tl-act--od:focus-within");
  });

  it("the grace is a named constant, so a measurement can wait longer than it rather than guess", () => {
    const hook = decls(R("src/components/shared/timeline/useSegHover.ts"));
    expect(hook).toMatch(/export const SEG_HOVER_DELAY_MS\s*=\s*\d+/);
    expect(hook, "the delay is not applied to the state change").toContain("setTimeout(");
    expect(hook, "the timer outlives the board").toContain("clearTimeout");
  });
});
