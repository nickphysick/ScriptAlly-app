/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Colours v2 — the five flat state fills (design-refs/query-state-colours-v2.md). The palette's
 * own claims, where they cannot rot: the values, the derivation, the deep step, and the two
 * separations the sheet states in words ("sand must never be mistaken for closed grey").
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus } from "../types";
import { stateFor, STATE_TOKEN, STATE_ACCENT_TOKEN, type State } from "./queryCardFacts";

const f12 = readFileSync(join(process.cwd(), "src/components/shell/f12.css"), "utf8");
const hex = (token: string) => {
  const m = f12.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`));
  expect(m, `${token} is not declared in f12.css`).toBeTruthy();
  return m![1].toLowerCase();
};

/** CIE76 ΔE over Lab — enough to say "these two are not the same colour to a reader". */
function deltaE(a: string, b: string): number {
  const lab = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
    const [X, Y, Z] = [
      (r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047,
      r * 0.2126 + g * 0.7152 + bl * 0.0722,
      (r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883,
    ].map((v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116));
    return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
  };
  const [l1, a1, b1] = lab(a), [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

describe("the five fills are the rulesheet's, declared once", () => {
  const TABLE: [State, string][] = [
    ["queried", "#f7efe3"], ["agent", "#e0e5dd"], ["you", "#f5e6df"],
    ["offer", "#d7e0e8"], ["closed", "#e4e1db"],
  ];
  it("every value matches the sheet, and each is declared exactly once", () => {
    for (const [state, value] of TABLE) {
      expect(hex(`--state-${state}`), `--state-${state}`).toBe(value);
      expect((f12.match(new RegExp(`--state-${state}:`, "g")) ?? []).length, `--state-${state} declared twice`).toBe(1);
    }
  });

  it("⚠️ sand is not grey — the one separation the sheet states in words", () => {
    /* "Sand is warmer than closed grey and must never be mistaken for it." A reader cannot check a
       hex; ΔE is the assertable form of that sentence. */
    const d = deltaE(hex("--state-queried"), hex("--state-closed"));
    expect(d, `sand and closed grey are ΔE ${d.toFixed(1)} apart`).toBeGreaterThan(5);
  });

  it("every deep step belongs to its own family — nearer its fill than to any other fill", () => {
    for (const [state] of TABLE) {
      const own = deltaE(hex(`--state-${state}-deep`), hex(`--state-${state}`));
      for (const [other] of TABLE) {
        if (other === state) continue;
        expect(own, `${state}-deep is closer to ${other} than to its own fill`)
          .toBeLessThan(deltaE(hex(`--state-${state}-deep`), hex(`--state-${other}`)));
      }
    }
  });
});

describe("the derivation is the one mapping, and nothing stores a colour", () => {
  it("status → state, with the three asks in one family", () => {
    expect(stateFor(QueryStatus.QUERIED)).toBe("queried");
    expect(stateFor(QueryStatus.PARTIAL_SENT)).toBe("agent");
    expect(stateFor(QueryStatus.FULL_SENT)).toBe("agent");
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT])
      expect(stateFor(s), `${s} is not in the "with you" family`).toBe("you");
    expect(stateFor(QueryStatus.OFFER)).toBe("offer");
    for (const s of [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE])
      expect(stateFor(s), `${s} is not closed`).toBe("closed");
  });

  it("⚠️ every status is mapped — a new one cannot land unpainted", () => {
    const seen = new Set<State>();
    for (const s of Object.values(QueryStatus)) seen.add(stateFor(s as QueryStatus));
    expect([...seen].sort()).toEqual(["agent", "closed", "offer", "queried", "you"]);
  });

  it("the token maps are exported once and cover the five, fill and deep", () => {
    for (const state of ["queried", "agent", "you", "offer", "closed"] as State[]) {
      expect(STATE_TOKEN[state]).toBe(`var(--state-${state})`);
      expect(STATE_ACCENT_TOKEN[state]).toBe(`var(--state-${state}-deep)`);
    }
  });
});

describe("⚠️ the ladder is gone from the Query Centre — and still alive for the To-do stream", () => {
  const QC = [
    "src/components/queries/queryCard.css", "src/components/queries/queryPanel.css",
    "src/components/queries/correctionDesk.css", "src/components/queries/respondDesk.css",
    "src/components/queries/QueryCard.tsx", "src/components/queries/QueryPanel.tsx",
    "src/components/queries/CorrectionDesk.tsx", "src/components/queries/QueryAgentTab.tsx",
  ];
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("no Query Centre surface reads a ladder token or emits a ladder class", () => {
    for (const f of QC) {
      const src = strip(readFileSync(join(process.cwd(), f), "utf8"));
      expect(src, `${f} still reads --stage-*`).not.toMatch(/var\(\s*--stage-/);
      expect(src, `${f} still emits qcc--s-*`).not.toMatch(/qcc--s-[a-z]/);
    }
  });

  /**
   * ⚠️ AND THE LADDER IS NOT DELETED, DELIBERATELY. `stageFor` is a SHARED export: TodoCalendarPage
   * reads it at three sites and TaskPane at one, and `calendarStageTints.test.ts` locks the
   * calendar's mirror against `.t-f12`'s copy. Deleting the tokens here would blank another
   * stream's live surfaces silently and redden their lock, mid-flight. This case states the
   * survivors so the next reader knows the leftovers are load-bearing rather than missed — and
   * fails the day the To-do stream stops needing them, which is when they can go.
   */
  it("the ladder's remaining consumers are named, and they are all outside this page", () => {
    expect(f12, "the ladder tokens went — the To-do stream reads them").toContain("--stage-out-1:");
    const owners = ["src/components/todo/TodoCalendarPage.tsx", "src/components/todo/TaskPane.tsx"];
    let live = 0;
    for (const f of owners) {
      const src = strip(readFileSync(join(process.cwd(), f), "utf8"));
      if (/stageFor\(|var\(--stage-/.test(src)) live += 1;
    }
    expect(live, "no To-do surface reads the ladder any more — the tokens can now be retired").toBe(owners.length);
  });
});
