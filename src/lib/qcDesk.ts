/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DESK, v131 (§2) — three sections with no header: an eyebrow in the court's colour, the total, two
 * facts, the weekly bars, and a foot with the next relevant date and what the bars count.
 *
 * ⚠️ IT READS THE SAME ROWS AS `courtTiles` AND THE SAME MEMBERSHIP (`rowsForTile`), so a section's
 * total, the carousel it chooses for and every fact here agree by construction. `courtTiles` stays
 * for the carousel's chosen title and its own locks.
 */
import { QueryStatus } from "../types";
import { rowsForTile, type QcRow, type TileCourt } from "./qcSummary";
import { deskBars, type DeskBars } from "./qcDeskWeeks";
import { MONTHS_SHORT } from "./dates";

const DAY = 86_400_000;

export interface DeskFact { n: number; text: string }
export interface DeskSection {
  key: TileCourt;
  label: string;
  total: number;
  facts: [DeskFact, DeskFact];
  /** The foot's left: the label and the date, or null where the court has no date to state. */
  foot: { label: string; date: string | null };
  /** The foot's right: what the bars count. */
  caption: string;
  bars: DeskBars;
}

export const DESK_LABEL: Record<TileCourt, string> = { you: "With you", agent: "With the agent", closed: "Closed" };
export const DESK_CAPTION: Record<TileCourt, string> = { you: "REQUESTS & OFFERS IN", agent: "QUERIES SENT", closed: "CLOSED" };

/** "31 JUL" — day and month, the foot's date. */
export const footDate = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toUpperCase()}`;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function deskSections(rows: readonly QcRow[], nowMs: number): DeskSection[] {
  const bars = deskBars(rows, nowMs);
  const you = rowsForTile(rows, "you");
  const agent = rowsForTile(rows, "agent");
  const closed = rowsForTile(rows, "closed");

  /* with you: offers to decide, and materials requested and not yet sent (everything else here) */
  const offers = you.filter((r) => r.status === QueryStatus.OFFER).length;
  const toSend = you.length - offers;
  const youNext = you.filter((r) => r.expectedMs != null).sort((a, b) => a.expectedMs! - b.expectedMs!)[0] ?? null;

  /* with the agent: past the date, and due within the next seven days */
  const past = agent.filter((r) => r.pastExpected).length;
  const dueWeek = agent.filter((r) => !r.pastExpected && r.expectedMs != null && r.expectedMs >= nowMs && r.expectedMs < nowMs + 7 * DAY).length;
  const agentNext = agent.filter((r) => r.expectedMs != null && r.expectedMs >= nowMs).sort((a, b) => a.expectedMs! - b.expectedMs!)[0] ?? null;

  /* closed: passed, and no reply */
  const passed = closed.filter((r) => r.closedHow === "passed").length;
  const noReply = closed.filter((r) => r.closedHow === "noReply").length;
  const lastClosed = closed.filter((r) => r.stageStartMs != null).sort((a, b) => b.stageStartMs! - a.stageStartMs!)[0] ?? null;

  return [
    {
      key: "you", label: DESK_LABEL.you, total: you.length,
      facts: [
        { n: offers, text: plural(offers, "offer to decide", "offers to decide") },
        { n: toSend, text: "to send" },
      ],
      foot: {
        label: youNext?.status === QueryStatus.OFFER ? "OFFER DUE" : "NEXT DUE",
        date: youNext ? footDate(youNext.expectedMs!) : null,
      },
      caption: DESK_CAPTION.you, bars: bars.you,
    },
    {
      key: "agent", label: DESK_LABEL.agent, total: agent.length,
      facts: [
        { n: past, text: "past the date" },
        { n: dueWeek, text: "due this week" },
      ],
      foot: { label: "NEXT REPLY DUE", date: agentNext ? footDate(agentNext.expectedMs!) : null },
      caption: DESK_CAPTION.agent, bars: bars.agent,
    },
    {
      key: "closed", label: DESK_LABEL.closed, total: closed.length,
      facts: [
        { n: passed, text: "passed" },
        { n: noReply, text: "no reply" },
      ],
      foot: { label: "LAST CLOSED", date: lastClosed ? footDate(lastClosed.stageStartMs!) : null },
      caption: DESK_CAPTION.closed, bars: bars.closed,
    },
  ];
}

/** §2's bar heights: the tallest 30px, the rest to scale (a non-empty week never under 4), an empty week a 2px stub. */
export function barHeights(counts: readonly number[]): number[] {
  const max = Math.max(1, ...counts);
  return counts.map((v) => (v ? Math.max(4, (v / max) * 30) : 2));
}
