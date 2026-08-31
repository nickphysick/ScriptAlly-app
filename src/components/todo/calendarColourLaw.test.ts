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

/** The territory. A file that is not the calendar's is not this law's to police. */
const TERRITORY = [
  "src/components/todo/todoCalendar.css",
  "src/components/todo/TodoCalendarPage.tsx",
  "src/lib/journeyBars.ts",
  "src/lib/timelineCopy.ts",
  "src/lib/timelineGroups.ts",
  "src/lib/todoTimeline.ts",
  "src/lib/barFit.ts",
];

const FORBIDDEN: [string, RegExp][] = [
  ["#7c3a2a", /#7c3a2a/i],
  ["#632e22", /#632e22/i],
  ["#6b3023", /#6b3023/i],
  ["#000000", /#000000/i],
  /* ⚠️ BOUNDED, or it matches `blackout`, `blacklist` and the word inside any prose that survives
     the comment strip inside a template literal. */
  ["black", /(^|[^-\w])black([^-\w]|$)/i],
];

const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the calendar's colour law", () => {
  it("reads the whole territory — a sweep over nothing proves nothing", () => {
    for (const f of TERRITORY) {
      expect(existsSync(join(process.cwd(), f)), `${f} is missing from the territory`).toBe(true);
      expect(readFileSync(join(process.cwd(), f), "utf8").length, `${f} is empty`).toBeGreaterThan(400);
    }
    expect(TERRITORY.length, "the territory shrank").toBeGreaterThan(6);
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
