/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TO-DO LIST'S EXHIBITION (living headers v3 §5) — how the page looks once the writer's queries
 * are out, drawn by the page's OWN parts (`V2Tiles`, `V2Rows`, `V2Desk`) over a SAMPLE constant
 * declared here and nowhere else. The sample is the ref's (living-headers-v3.html, `DROWS` and the
 * rail): the tiles' figures, three rows, the writer's own tasks and notes.
 *
 * ⚠️ IT READS NOTHING LIVE AND DOES NOTHING. No store, no fetch, no listener (LH8 sweeps for them).
 * `LivingExhibition` marks the band `inert` and `aria-hidden` and the sheet takes pointer events
 * away, so every handler below is a required prop and nothing more. The rail is drawn as a STATIC
 * box with the rail's own classes — `PageRail` measures the window and sizes itself, which is the
 * page's behaviour, not a picture of it.
 *
 * ⚠️ AND IT IS NEVER ON A PAGE WITH DATA: the page mounts it only in the "nothing yet" state (no
 * queries and no tasks or notes of the writer's own) — never when the writer is all caught up.
 */
import React from "react";
import type { BoardCard } from "../../../lib/todoBoard";
import type { TileCount, Tile, V2Group, V2Row } from "../../../lib/todoV2";
import type { UserTask } from "../../../types";
import { QueryStatus } from "../../../types";
import { LivingExhibition } from "../../shell/LivingExhibition";
import { V2Tiles } from "./V2Tiles";
import { V2Rows } from "./V2Rows";
import { V2Desk } from "./V2Desk";

export const TODO_EXHIBIT_LABEL = "HOW THE PAGE LOOKS ONCE YOUR QUERIES ARE OUT";
/** The sample's own "today" — fixed, so the band is the same picture on every render. */
export const TODO_SAMPLE_TODAY = "2026-10-01";

export const TODO_SAMPLE_COUNTS: Record<Tile, TileCount> = {
  move: { tile: "move", n: 4, parts: { req: 2, yours: 2 }, sub: "2 agent requests · 2 yours" },
  chase: { tile: "chase", n: 4, parts: { nudge: 3, quiet: 1 }, sub: "3 nudges · 1 gone quiet" },
  house: { tile: "house", n: 1, parts: { house: 1 }, sub: "gaps worth filling in" },
};

/* a row needs a card only for its state band (`card.status`) — the rest is the row's own words */
const row = (key: string, deed: string, who: string, agency: string, status: QueryStatus | null, dueYmd: string | null, dateKey: string, dateValue: string, cat: V2Row["cat"]): V2Row => ({
  key, card: { key, status: status ?? undefined } as unknown as BoardCard, cat, tile: cat === "nudge" || cat === "quiet" ? "chase" : cat === "house" ? "house" : "move",
  typeLabel: cat === "req" ? "Agent request" : cat === "nudge" ? "Nudge" : cat === "quiet" ? "Gone quiet" : cat === "house" ? "Housekeeping" : "Your task",
  yours: cat !== "quiet", deed, who, agency, dateKey, dateValue, spanValue: null,
  dueYmd, when: dueYmd && dueYmd < TODO_SAMPLE_TODAY ? "past" : dueYmd ? "this" : "none", past: !!dueYmd && dueYmd < TODO_SAMPLE_TODAY,
  daysPast: 0, verb: "Open", pkg: "Standard", setAside: false,
});

/** The ref's first three rows, in its order. */
export const TODO_SAMPLE_ROWS: readonly V2Row[] = [
  row("s-req-mr", "Send Marcus Reed the partial", "Marcus Reed", "Bloomsbury Quill", QueryStatus.PARTIAL_REQUESTED, "2026-10-03", "Requested", "23 Jul", "req"),
  row("s-nudge-ak", "Nudge Aisha Kapoor", "Aisha Kapoor", "The Lantern Agency", QueryStatus.QUERIED, "2026-09-26", "Queried", "14 Aug", "nudge"),
  row("s-quiet-ew", "Consider closing Eleanor Whitfield", "Eleanor Whitfield", "Greenfield Literary", QueryStatus.QUERIED, null, "Queried", "11 Apr", "quiet"),
];
const GROUPS: V2Group[] = [{ id: "sample", label: "", rows: [...TODO_SAMPLE_ROWS] }];

/** The rail's own list — the writer's tasks and notes, as the ref draws them. */
const YOURS: V2Row[] = [
  row("s-own-1", "Polish the synopsis", "—", "", null, null, "Added", "7 Oct", "yours"),
  row("s-own-2", "Ask Sarah to read ch.1", "—", "", null, "2026-10-12", "Added", "2 Oct", "yours"),
];
const NOTES: UserTask[] = [
  { id: "s-note-1", text: "Agents who like rural noir", createdAt: "2026-09-28T09:00:00.000Z" } as unknown as UserTask,
  { id: "s-note-2", text: "Conference in November", createdAt: "2026-09-21T09:00:00.000Z" } as unknown as UserTask,
];

const noop = () => {};
const never = async () => false;

export const TodoExhibit: React.FC = () => (
  <LivingExhibition label={TODO_EXHIBIT_LABEL}>
    <div className="lh-expg">
      <div className="lh-exmc">
        <V2Tiles counts={TODO_SAMPLE_COUNTS} selected="move" onPick={noop} />
        <div className="tdv2-body">
          <V2Rows groups={GROUPS} landedKey={null} onOpen={noop} empty="" />
        </div>
      </div>
      <aside className="sa-prail tdv2-rail lh-exrail">
        <div className="sa-prail-tray tdv2-tray"><h3 className="tdv2-deskttl">Your desk</h3></div>
        <div className="sa-prail-body">
          <V2Desk today={TODO_SAMPLE_TODAY} agents={[]} yours={YOURS} notes={NOTES} onAddTask={never} onAddNote={never} onOpenRow={noop} onOpenNoteboard={noop} />
        </div>
      </aside>
    </div>
  </LivingExhibition>
);
