/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashSnooze — the app's snooze dial, mounted a third time (to-do row round, 20 Sep).
 *
 * ⚠️ IT IS THE EXISTING `SnoozeDial`, NOT A SECOND TRACK, and the decision is Nick's. The brief
 * describes a six-stop drag; `SNOOZE_STOPS` already travels twelve with six of them marked on the
 * axis, so the change is which stops the SCALE shows, not how far the knob can go. A fresh
 * six-position track would also have dropped the dial's **ceiling** — `reachableStops` stops the
 * knob at the thing you are waiting for, so you cannot snooze a task past the reply it is about —
 * which no prose asked for and which nobody would have noticed going.
 *
 * ⚠️ A SEPARATE, LAZY MODULE FOR THE USUAL REASON: the dial's write is `upsertTaskFlag` on the db
 * context, so a static import would pull `lib/firebase` into the dashboard suites' import graph.
 *
 * ⚠️ SNOOZING HIDES THE TASK AND TOUCHES NO QUERY. That is the flag's own contract and the dial's
 * footer says so; nothing here writes a status, a date or an activity.
 */
import React from "react";
import { SnoozeDial } from "../todo/SnoozeDial";
import { useScriptAllyDb } from "../../lib/db";
import { flagKeyForTask } from "../../lib/taskFlags";
import { listRowInputs } from "../../lib/taskCardFacts";
import type { BoardCard } from "../../lib/todoBoard";

export const DashSnooze: React.FC<{
  card: BoardCard | null;
  anchor: HTMLElement;
  onClose: () => void;
  onSnoozed: (days: number) => void;
}> = ({ card, anchor, onClose, onSnoozed }) => {
  const db = useScriptAllyDb();
  if (!card) return null;

  /**
   * ⚠️ THE CEILING IS THE ROW'S OWN CLOCK, and it is what the dial reads to stop the knob early.
   * `listRowInputs` is the same accessor the row's day figure comes from, so the dial cannot let a
   * writer put a task off past the date the row is counting to.
   */
  const inputs = listRowInputs(card, {
    queries: db.queries, agents: db.agents, manuscripts: db.manuscripts,
    userTasks: db.userTasks, activities: db.activities,
  });

  return (
    <SnoozeDial
      card={card}
      anchor={anchor}
      daysUntilDeadline={inputs.days === null ? null : -inputs.days}
      onClose={onClose}
      onSnooze={(days) => {
        /* the flag, and only the flag — see the header */
        if (card.taskType && card.relatedRecordId) {
          void db.upsertTaskFlag(flagKeyForTask(card.taskType, card.relatedRecordId), {
            snoozedUntil: new Date(Date.now() + days * 86400000).toISOString(),
            bumpSnooze: true,
          });
        }
        onSnoozed(days);
      }}
    />
  );
};
