/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE QUERYING GOALS CARD, EXTRACTED FROM `OneScreenRail` (ref v16, Phase 3).
 *
 * v16 moves this card out of the right column and into the LEFT, between the manuscript card and
 * Community — which is what frees the right column for Activity, top to bottom. The rail owned it
 * only because the two shared a column; they share nothing else. Its whole surface, its two pieces
 * of state and its one write came across unchanged.
 *
 * ⚠️ EXTRACTED RATHER THAN MOUNTED TWICE. `OneScreenRail` could have taken a `part` prop and been
 * rendered once per column, which is fewer lines and runs every one of the feed's derivations a
 * second time on a card that has no feed in it. A component that renders one of two unrelated
 * things depending on a prop is two components sharing a file.
 */
import React, { useRef, useState } from "react";
import { User } from "../../types";
import { AnchoredPanel } from "../todo/AnchoredPanel";
import { GoalTargetSheet } from "./GoalTargetSheet";
import { appendGoalEntry, CADENCE_TAG, formatReached, goalRings, historyBars, londonDay, unsetLine } from "../../lib/queryingGoals";
import type { GoalProgress } from "../../lib/queryingGoals";
import type { GoalCadence } from "../../types";
import "./queryingGoals.css";
import { OneScreenPanel } from "./OneScreenPanel";
import targetMark from "../../assets/shell/query-target-icon.png";

export const OneScreenGoals: React.FC<{
  loading: boolean;
  goal: GoalProgress;
  currentUser: User | null;
  now: Date;
  updateUserProfile: (patch: Partial<User>) => Promise<void>;
}> = ({ loading, goal, currentUser, now, updateUserProfile }) => {
  /* ⚠️ TWO PIECES OF STATE, AND NEITHER IS A DRAFT. The old inline editor kept a `goalDraft` in
     the card because the card WAS the editor; the sheet owns its own working values now, so all
     this holds is whether a surface is open. */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  const writeGoal = async (next: { target: number; cadence: GoalCadence } | null) => {
    await updateUserProfile({ queryingGoals: appendGoalEntry(currentUser?.queryingGoals, next, now) });
  };

  const reached = goal.target !== null && goal.count >= goal.target && goal.reachedOn !== null;
  /**
   * ⚠️ THE ENTRANCE IS GATED ON THE DAY, NOT ON THE MOUNT. `reachedOn` is derived, so nothing is
   * stored to remember the animation ran — and a card that replayed its moment on every visit to
   * the dashboard would turn a pleasant thing into an irritating one within a day.
   */
  const justReached = reached && goal.reachedOn === londonDay(now);
  const rings = goalRings(goal.count, goal.target);

  return (
    <>
      {/* ══ querying goals ══ */}
      {/* ⚠️ NO LONGER `stowable` (ref v16, Phase 3) — nothing stows it. The class existed so the
          feed's expander could collapse this card and take its height; the card is the LEFT
          column's now and the expander is retired, so the modifier selected a state that could not
          occur. */}
      <OneScreenPanel variant="os-goal" probe="goals-card" loading={loading} skel={["h", "", ""]}>
        {/* ⚠️ NO BAND AND NO MARK BOX HERE — both were tried and rejected. The goals header is a
            LABEL, not an instrument: it names the card and gets out of the way, and the band gave
            it a weight the card does not carry. A bare flex row inside the card's own padding —
            title, status word right-aligned, line and meter beneath.

            ⚠️ RE-CONFIRMED 23 Aug, IN THE BROWSER, against a local build AND deployed dev: the
            card renders bare on both. A banded version of it exists only in a preview harness,
            which is what `cfccf325` says in as many words — "the band was never applied to it in
            code — only in the preview harness". The goals pack arrived asking for the band back
            and the measurement is why it did not get it. Two locks guard this. */}
        <div className="os-goal-r1">
          {/* ⚠️ BARE, and no transform on this wrapper — see the blend traps in oneScreen.css. */}
          <span className="os-mark-il os-goalmark" aria-hidden="true"><img src={targetMark} alt="" /></span>
          <h2>Querying goals</h2>
          {/* the cadence and the ⋯ appear only once there is a target for them to be about */}
          {goal.cadence !== null && (
            <>
              <span className="os-goal-cad">{CADENCE_TAG[goal.cadence]}</span>
              <button
                ref={moreRef}
                type="button"
                className="os-goal-more"
                aria-label="Change this target"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                ⋯
              </button>
            </>
          )}
        </div>

        {goal.target === null ? (
          /* ⚠️ NO ILLUSTRATION AND NO PROMPT TO ENGAGE. The line states a fact the writer already
             owns; the button is there if they want it. Empty-state art here would sell a feature
             on a card whose whole job is to report. */
          <>
            <div className="os-goal-line">{unsetLine(goal.count)}</div>
            <button type="button" className="os-goal-set" onClick={() => setSheetOpen(true)}>
              Set a target
            </button>
          </>
        ) : reached ? (
          /* ⚠️ THE METER IS ABSENT, NOT FULL — at or past the target it could only read 100%, so
             it states nothing and the illustration takes its place. The count keeps climbing and
             the date holds, so this stays true for the rest of the period rather than ageing into
             a stale cheer. */
          <div className="os-goal-moment">
            {/* ⚠️ A DECLARED PLACEHOLDER. `Goal_Reached.png` does not exist; a second copy of the
                target icon would read as finished work. See design-refs/goals/README.md. */}
            <div className={`os-goal-illph${justReached ? " os-goal-fade" : ""}`} aria-hidden="true">
              <span>Illustration</span>
              <span>104 × 104</span>
            </div>
            <div className="os-goal-count">
              <span className="os-goal-n">{goal.count}</span>
              <span className="os-goal-of">of {goal.target}</span>
            </div>
            <div className="os-goal-sub">Queries sent · {goal.periodLabel}</div>
            <div className="os-goal-reached">Target reached {formatReached(goal.reachedOn!)}</div>
          </div>
        ) : (
          <>
            <div className="os-goal-count">
              <span className="os-goal-n">{goal.count}</span>
              <span className="os-goal-of">of {goal.target}</span>
            </div>
            <div className="os-goal-sub">Queries sent · {goal.periodLabel}</div>
            {/* ⚠️ RINGS, NOT A BAR (dashboard redesign, Phase 7) — one ring per query the writer
                said they would send, filling one at a time. A bar states a proportion; a row of
                slots states a plan, which is what a target is.

                ⚠️ AND THERE ARE `target` OF THEM, NOT FIVE. Five is the ref's example; hard-coding
                it would draw five rings beside a card reading "3 of 10". Above `RING_MAX` there are
                NONE — not a truncated row, which would understate a target the writer set, and not
                the meter, which is the thing being retired. The numeral above already says it. */}
            {rings.length > 0 && (
              <div className="os-goal-rings" role="img" aria-label={`${goal.count} of ${goal.target} queries sent`}>
                {rings.map((on, i) => <i key={i} className={on ? "on" : undefined} />)}
              </div>
            )}
          </>
        )}

        {/* ⚠️ IT DRAWS IN EVERY STATE, INCLUDING THE UNSET ONE. What you sent last month is true
            whether or not you have declared a target — the strip is not a goal artefact. */}
        {/* ⚠️ BARS, PROPORTIONAL TO THE TALLEST PERIOD ON SHOW — never to the target. A month that
            beat the target would draw past the top of its own track, and a quiet run against a big
            target would be four invisible stubs. The strip reports what was SENT; the target is a
            different fact, stated above it. Beneath a hairline, because it is a different period
            from the one the rings are about. */}
        {goal.history.length > 0 && (
          <div className={`os-goal-hist${reached ? " mid" : ""}`}>
            {historyBars(goal.history).map((h) => (
              <span className="os-goal-hb" key={h.label}>
                <span className="os-goal-hbt" aria-hidden="true">
                  <i className={h.zero ? "z" : undefined} style={{ height: `${h.px}px` }} />
                </span>
                {/* ⚠️ ONE LINE — "10 Aug · 3", ref `.wk .lb`. It was a figure over a label, which
                    made the count the loudest thing in a strip whose subject is the SHAPE of four
                    periods; the bar already states the count, in the only units that compare. */}
                <span className="os-goal-hlb">{h.label} · {h.count}</span>
              </span>
            ))}
          </div>
        )}
      </OneScreenPanel>

      {/* ⚠️ ANCHORED THROUGH THE SHARED PANEL, never a locally positioned popover — `placeMenu`
          owns right-alignment, viewport clamping, flip-above, Escape, outside-press and returning
          focus to the trigger. Both edit rows open the SAME sheet, pre-filled: "change the target"
          and "change the cadence" are one decision seen from two sides. */}
      {menuOpen && moreRef.current && (
        <AnchoredPanel
          anchor={moreRef.current}
          ariaLabel="Change this target"
          onClose={(back) => { setMenuOpen(false); if (back) moreRef.current?.focus(); }}
        >
          <button type="button" role="menuitem" className="m-i"
            onClick={() => { setMenuOpen(false); setSheetOpen(true); }}>Change target</button>
          <button type="button" role="menuitem" className="m-i"
            onClick={() => { setMenuOpen(false); setSheetOpen(true); }}>Change cadence</button>
          <div className="m-rule" />
          {/* ⚠️ REMOVAL APPENDS A NULL ENTRY — it does not delete the list, so the history strip
              survives and a past period keeps the target it ran under. */}
          <button type="button" role="menuitem" className="m-i"
            onClick={() => { setMenuOpen(false); void writeGoal(null); }}>Remove target</button>
        </AnchoredPanel>
      )}

      {sheetOpen && (
        <GoalTargetSheet
          initialTarget={goal.target ?? 10}
          initialCadence={goal.cadence ?? "month"}
          now={now}
          onCommit={(next) => writeGoal(next)}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
};
