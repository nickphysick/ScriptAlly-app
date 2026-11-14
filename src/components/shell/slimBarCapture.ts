/**
 * To-do list v56 — the Query Centre's collapsed header (QcSlim156) rendered in a fixed set of states. Used ONCE to
 * capture the markup before its frame was lifted into `shell/SlimBar` (slimBar.fixture.json), and by the lock that
 * holds it byte-identical after (slimBarShared.test.tsx).
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { weekGoal154 } from "../../lib/qc154goal";
import { QcSlim156 } from "../queries/centre/QcSlim156";

const NOW = Date.UTC(2026, 10, 11, 12);
const at = (m: number, d: number) => Date.UTC(2026, m - 1, d, 10);
const WEEKLY3 = [{ target: 3, cadence: "week" as const, effectiveFrom: "2026-01-01" }];
const noop = () => {};

export function captureQcSlimStates(): Record<string, string> {
  const streak = weekGoal154([at(10, 26), at(10, 27), at(10, 28), at(11, 2), at(11, 3), at(11, 4), at(11, 9), at(11, 10)], WEEKLY3, NOW);
  const none = weekGoal154([at(9, 1)], WEEKLY3, NOW);
  const r = (p: React.ComponentProps<typeof QcSlim156>) => renderToStaticMarkup(React.createElement(QcSlim156, p));
  return {
    streakWithMs: r({ sent: 26, ms: "Murphy’s Day Out", goal: streak, onLog: noop }),
    noStreakNoMs: r({ sent: 1, ms: null, goal: none, onLog: noop }),
    noGoalFirst: r({ sent: 0, ms: null, goal: null, onLog: noop }),
    logDisabled: r({ sent: 26, ms: "Murphy’s Day Out", goal: streak, onLog: noop, logDisabled: true }),
  };
}
