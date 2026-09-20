/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashSnooze — the app's snooze dial, mounted a third time (to-do row round, 20 Sep).
 *
 * ⚠️ IT IS THE EXISTING `SnoozeDial`, NOT A SECOND TRACK, and the decision is Nick's. The brief
 * describes a six-stop drag; `SNOOZE_STOPS` already travels twelve with six of them marked on the
 * axis, so the change is which stops the SCALE shows, not how far the knob can go. A fresh
 * six-position track would also have dropped the dial's **ceiling**, which the offer branch below
 * still enforces.
 *
 * ⚠️ `daysUntilDeadline` IS DELIBERATELY NOT PASSED, AND PASSING IT MADE EVERY ROW UNSNOOZEABLE.
 * `snoozeCeilingDays` documents it as *the caller supplies the REMAINING days*; the only figure
 * this surface has is `listRowInputs().days`, which is days **elapsed** since the anchor. The first
 * version handed it over negated — so a request asked 9 days ago arrived as `-9`, the ceiling
 * clamped to `Math.max(0, -9)` = 0, and the dial answered *"This one cannot be put off — its date
 * has already passed"* on a task that has no date to pass. Measured on the rendered page; every
 * non-offer row on the dashboard was affected, and nothing in the source looked wrong.
 *
 * ⚠️ AND THERE IS NO HONEST NUMBER TO SUPPLY INSTEAD, which is why the argument is omitted rather
 * than corrected. The one real deadline in the model is an offer's, and `snoozeCeilingDays` reads
 * `taskType === "offer_received"` BEFORE it looks at this argument — so the clamp that matters
 * applies whether or not it is passed. Every other mount of the dial omits it for the same reason.
 * Inventing a deadline where the app has none is a confident wrong value, not a tighter guard.
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
import type { BoardCard } from "../../lib/todoBoard";

export const DashSnooze: React.FC<{
  card: BoardCard | null;
  anchor: HTMLElement;
  onClose: () => void;
  /**
   * ⚠️ IT HANDS BACK THE WAY OUT, NOT JUST THE NUMBER OF DAYS. A snooze takes the row off the board,
   * so unless the caller is given the undo there is no route back from the dashboard at all — the
   * writer would have to find the task on the To-do page. It was `(days) => void` for one build and
   * the row simply vanished: no strip, no Undo, on the control sitting next to Dismiss, which has
   * both. Measured on the rendered page.
   *
   * ⚠️ THE CLOSURE COMES FROM HERE BECAUSE THE DB DOES. `upsertTaskFlag` is on this module's
   * context; the caller would otherwise need its own copy of the flag key and its own writer, which
   * is two places that have to agree about what undoing a snooze means.
   */
  onSnoozed: (days: number, undo: () => void) => void;
}> = ({ card, anchor, onClose, onSnoozed }) => {
  const db = useScriptAllyDb();
  if (!card) return null;

  return (
    <SnoozeDial
      card={card}
      anchor={anchor}
      onClose={onClose}
      onSnooze={(days) => {
        /* the flag, and only the flag — see the header */
        if (!card.taskType || !card.relatedRecordId) { onSnoozed(days, () => {}); return; }
        const key = flagKeyForTask(card.taskType, card.relatedRecordId);
        void db.upsertTaskFlag(key, {
          snoozedUntil: new Date(Date.now() + days * 86400000).toISOString(),
          bumpSnooze: true,
        });
        /* ⚠️ THE SAME PAIR DISMISS UNDOES WITH — `snoozedUntil: null` AND `unbumpSnooze`. Clearing
           the date alone leaves the bump behind, so the task comes back already counted as having
           been put off once, and the next snooze starts from the wrong rung. */
        onSnoozed(days, () => { void db.upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); });
      }}
    />
  );
};
