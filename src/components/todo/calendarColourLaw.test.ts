/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE BOARD HAS NO BURGUNDY AND NO BLACK (v39, the colour law).
 *
 * Burgundy is not a brand colour. It had become the board's default accent — hovers, active
 * segments, marker ink, an emphasis span, a selected row's edge — nine sites, none of them a
 * decision, each one copied from the last. Colour now appears ONLY in the pills; everything else
 * is near-black ink, cream, parchment, sage, pink or slate.
 *
 * ⚠️ AND BLACK IS FORBIDDEN SEPARATELY FROM BURGUNDY, because it arrives by a different route:
 * nobody types `#7c3a2a` by accident, and everybody types `black`.
 *
 * ⚠️ COMMENTS ARE STRIPPED FIRST. This file's own prose names every hex it forbids — twice over,
 * in the sheet and here — and a raw-text sweep would report the law as its own first violation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * The territory. A file that is not the calendar's is not this law's to police.
 *
 * ⚠️ IT MUST GROW WITH THE TERRITORY, AND A HAND-WRITTEN LIST DOES NOT. Between v39 and v40 the
 * calendar gained five modules — the pill, the fades, the tier ladder, the views and the ranges —
 * and every one of them was outside the law while the law read as covering the board. That is the
 * carve-out fault from the other end: not an exemption that stopped being needed, but a population
 * that quietly stopped being the whole of it.
 *
 * ⚠️ SHARED MODULES ARE DELIBERATELY ABSENT. `db`, `materials`, `todoBoard`, `todoColumns`,
 * `shellSidebar`, `agentDisplay`, `queryPrimaryAction`, `todoRoutes` and `todoWrite` are read by
 * surfaces all over the app, and burgundy is the app's own accent everywhere else. A law about the
 * calendar may not reach into them.
 *
 * ⚠️ `barFit.ts` IS DELETED (v40, Phase 8) — nothing imported it once the content ladder replaced
 * it, and the two comments still naming it are history rather than callers.
 */
const TERRITORY = [
  "src/components/todo/todoCalendar.css",
  "src/components/todo/TodoCalendarPage.tsx",
  "src/lib/journeyBars.ts",
  "src/lib/calendarFade.ts",
  /* v60: the six sections. Pure membership — it declares no colour at all, which is exactly
     why it belongs in the census: the law is that a calendar-owned module has NO burgundy and NO
     black, and a file that happens to contain none today still has to be swept tomorrow. */
  "src/lib/calendarSections.ts",
  /* v63: the board's view options — grouping, sorting and the status filter */
  "src/lib/calendarToolbar.ts",
  /* v64: the facet model — the sidebar's filter, the move grouping, the census */
  "src/lib/calendarFacets.ts",
  "src/lib/calendarPill.ts",
  "src/lib/cardTier.ts",
  "src/lib/timelineCopy.ts",
  "src/lib/timelineGroups.ts",
  "src/lib/timelineRanges.ts",
  "src/lib/timelineViews.ts",
  "src/lib/todoCalendar.ts",
  "src/lib/todoTimeline.ts",
];

const FORBIDDEN: [string, RegExp][] = [
  ["#7c3a2a", /#7c3a2a/i],
  ["#632e22", /#632e22/i],
  ["#6b3023", /#6b3023/i],
  ["#000000", /#000000/i],
  /* ⚠️ BOUNDED, or it matches `blackout`, `blacklist` and the word inside any prose that survives
     the comment strip inside a template literal. */
  ["black", /(^|[^-\w])black([^-\w]|$)/i],
  /* ⚠️ THE NAME, NOT ONLY THE VALUE. A token called `--tl-burgundy` holding near-black is a lie
     that survives every check on colours, and it is the shape a restored accent comes back in:
     somebody reads the name, believes it, and puts the hue back. Deleted, and forbidden. */
  ["--tl-burgundy", /--tl-burgundy/i],
];

const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the calendar's colour law", () => {
  it("reads the whole territory — a sweep over nothing proves nothing", () => {
    for (const f of TERRITORY) {
      expect(existsSync(join(process.cwd(), f)), `${f} is missing from the territory`).toBe(true);
      expect(readFileSync(join(process.cwd(), f), "utf8").length, `${f} is empty`).toBeGreaterThan(400);
    }
    /* ⚠️ THE SIZE, EXACTLY. A floor lets the territory shrink one file at a time while the law
       goes on reading as if it covered the board — which is what happened between v39 and v40,
       from the other direction: five new modules and a list that never grew. Changing this number
       is the deliberate act of having decided what the calendar owns. */
    expect(TERRITORY.length, "the territory changed — was that deliberate?").toBe(15);
    /* ⚠️ AND EVERY CALENDAR-OWNED MODULE THE PAGE IMPORTS IS IN IT, derived rather than trusted.
       A file added to `src/lib/` and imported by the board is inside this law whether or not
       anybody remembered to list it. */
    const page = readFileSync(join(process.cwd(), "src/components/todo/TodoCalendarPage.tsx"), "utf8");
    const imported = [...page.matchAll(/"\.\.\/\.\.\/lib\/([a-zA-Z]+)"/g)].map((m) => m[1]);
    const OWNED = /^(journeyBars|calendar[A-Z]|cardTier|timeline)/;
    const missing = imported.filter((n) => OWNED.test(n))
      .filter((n) => !TERRITORY.includes(`src/lib/${n}.ts`));
    expect(missing, "calendar-owned modules outside the colour law").toEqual([]);
  });

  it("no burgundy and no black, in any file the calendar owns", () => {
    const offenders: string[] = [];
    for (const f of TERRITORY) {
      const src = decls(readFileSync(join(process.cwd(), f), "utf8"));
      for (const [name, re] of FORBIDDEN) {
        for (const line of src.split("\n")) {
          if (re.test(line)) offenders.push(`${f.split("/").pop()}: ${name} — ${line.trim().slice(0, 70)}`);
        }
      }
    }
    expect(offenders, `the colour law is broken:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  it("and the sweep can still find a violation — proved against a planted one", () => {
    /* ⚠️ THE DETECTOR IS EXERCISED ON A STRING, not on the repo. A lock whose pattern has quietly
       stopped matching reports a clean territory in exactly the same words as a clean one. */
    const planted = ".x { color: #7C3A2A; }\n.y { background: black; }\n.z { border: 1px solid #000000 }";
    const caught = FORBIDDEN.filter(([, re]) => planted.split("\n").some((l) => re.test(l)));
    expect(caught.map(([n]) => n), "the detector missed a planted violation")
      .toEqual(["#7c3a2a", "#000000", "black"]);
    /* and it does not fire on the words that merely contain it */
    expect(FORBIDDEN.find(([n]) => n === "black")![1].test("--blackout: 1; .non-black-x {}")).toBe(false);
  });
});
