/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERY ANSWER MARKS ITS JOURNEY ANSWERED (Agent card v1 P5). Decision 8 makes `dirty` decide what
 * a close means: with answers, Escape and the backdrop PARK the journey and ✕ asks before
 * discarding; with none, they simply cancel. So an answer control that changes a journey's state
 * without setting `touched` lets a stray Escape throw that answer away in silence — the faults this
 * pass found in Record a response (the synopsis, the reminder, the feedback, the offer's date and
 * "tell the others"), Answer the offer, I've sent it, Close and Log a query.
 *
 * ⚠️ A SOURCE LOCK, ON PURPOSE: the claim is about every handler in every journey, most of which
 * sit behind an answer that already set the flag, so a rendered probe would pass on the flow it
 * happened to drive and miss the next control. The scan is scoped to each journey's own function
 * (`sliceBetween`, which fails loudly if an anchor goes) — its sub-forms keep their own state.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** journey file → the journey's own function: from its declaration to the next top-level one */
const SCOPES: [file: string, from: string, to: string][] = [
  ["LogJourney.tsx", "export function LogJourney(", "\nfunction AgentPicker("],
  ["ResponseJourney.tsx", "function ResponseJourneyForQuery(", "\nexport function emptyView("],
  ["SentJourney.tsx", "export function SentJourney(", "\nfunction PlanWs("],
  ["NudgeJourney.tsx", "export function NudgeJourney(", "\n}\n"],
  ["CloseJourney.tsx", "export function CloseJourney(", "\n}\n"],
  ["OfferJourney.tsx", "export function OfferJourney(", "\n}\n"],
  ["EditJourney.tsx", "export function EditJourney(", "\n}\n"],
];

/** Setters that are not answers: furniture the writer opens or closes, never a fact recorded. */
const NOT_ANSWERS = new Set(["setTouched", "setLeaving", "setOpenCal", "setLog"]);
/** Helpers that set `touched` themselves (each is checked to, below). */
const MARKERS = ["setTouched(true)", "touchMat(", "pickAgent(", "chooseHow(", "attach("];

/** Every `onX={…}` handler's source, braces balanced. */
function handlers(src: string): string[] {
  const out: string[] = [];
  const re = /\bon(?:Click|Pick|Change|Toggle)=\{/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
    }
    out.push(src.slice(m.index, i));
  }
  return out;
}

describe("every answer marks its journey answered (decision 8 reads it)", () => {
  for (const [file, from, to] of SCOPES) {
    it(`${file}: no answer control changes state without setting touched`, () => {
      const raw = strip(readFileSync(`src/components/queryActions/journeys/${file}`, "utf8"));
      const body = sliceBetween(raw, from, to, file);
      const setters = new Set([...body.matchAll(/const \[\w+, (set\w+)\] = useState/g)].map((m) => m[1]));
      expect(setters.size, `${file}: population first — no state found in the journey`).toBeGreaterThan(1);
      /* a setter handed straight to a control can never also set touched */
      const bare = [...body.matchAll(/\bon\w+=\{(set[A-Z]\w*)\}/g)].map((m) => m[1]).filter((s) => setters.has(s) && !NOT_ANSWERS.has(s));
      expect(bare, `${file}: a setter is handed straight to a control — it cannot mark the journey answered`).toEqual([]);
      const faults = handlers(body).filter((h) => {
        const calls = [...h.matchAll(/\b(set[A-Z]\w*)\(/g)].map((m) => m[1]).filter((s) => setters.has(s) && !NOT_ANSWERS.has(s));
        return calls.length > 0 && !MARKERS.some((k) => h.includes(k));
      });
      expect(faults, `${file}: an answer that does not mark the journey answered`).toEqual([]);
    });
  }

  it("the helpers counted as marking the journey answered do set it", () => {
    const log = strip(readFileSync("src/components/queryActions/journeys/LogJourney.tsx", "utf8"));
    for (const fn of ["function pickAgent(", "const touchMat = ", "function chooseHow(", "function attach("]) {
      const at = log.indexOf(fn);
      expect(at, `the helper ${fn} is gone`).toBeGreaterThan(-1);
      expect(log.slice(at, at + 900), `${fn} no longer sets touched`).toContain("setTouched(true)");
    }
  });
});
