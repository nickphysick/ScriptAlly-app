/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenMark — the mark slot in a dashboard container header (§1; ref design-refs/header-marks.html).
 *
 * ⚠️ THE SLOT IS THE DELIVERABLE, NOT THE ICON. These headers label SURFACES, so the destination is
 * an illustrated mark Nick commissions; the monoline icon is the temporary occupant. So the box is
 * built for the SWAP: fixed 28px, `flex: 0 0 28px`, contents bounded and `object-fit: contain`, and
 * the box's size stated independently of whatever is inside it. An icon at 17px and a future
 * illustration at full bleed occupy the same footprint, so replacing one with the other is a
 * one-line change per header and moves nothing.
 *
 * ⚠️ THIS IS NOT A REVERSAL OF THE ICONS-VS-ILLUSTRATIONS RULE. Monoline icons are for navigation,
 * state and controls; illustrated marks are for objects and surfaces. A container header names a
 * surface, so it lands in the illustrated family — these icons are standing in until it arrives,
 * which is exactly why they must not become load-bearing.
 *
 * ⚠️ EVERY BRIEF LIVES IN A COMMENT, NEVER IN RENDERED MARKUP. A brief that renders is a brief that
 * ships: the To-do board's ArtSlot learned this on 7 Aug when its caption had to be deleted after
 * shipping as body text. The placeholder shows the slot NAME in mono, nothing more.
 */
import React, { useState } from "react";

/** The four marks, and the brief each one is waiting for. */
export type MarkName = "active-queries" | "goals" | "activity" | "tasks";

/**
 * ⚠️ THE BRIEFS. Kept beside the icons they will replace so the two never drift apart, and kept
 * OUT of the rendered output (see above).
 *
 *   active-queries — a line rising across a ruled page, ink-drawn
 *   goals          — a wax-sealed target, or a pin in a chart
 *   activity       — a clock face over a stack of filed cards
 *   tasks          — a pencil resting on a ticked list
 *
 * ⚠️ `src` IS ABSENT FOR ALL FOUR, and that absence is the whole state machine: present → the
 * artwork, absent → the mono placeholder. Adding an asset is a one-line change here.
 */
const MARK: Record<MarkName, { label: string; icon: React.ReactNode; src?: string }> = {
  /* a line rising across a ruled page, ink-drawn */
  "active-queries": {
    label: "chart",
    icon: <><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>,
  },
  /* a wax-sealed target, or a pin in a chart */
  goals: {
    label: "goal",
    icon: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 4V2M12 22v-2M4 12H2M22 12h-2" /></>,
  },
  /* a clock face over a stack of filed cards */
  activity: {
    label: "clock",
    icon: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  },
  /* a pencil resting on a ticked list */
  tasks: {
    label: "list",
    icon: <><path d="M4 6h10M4 12h7M4 18h5" /><path d="M15 15l5-5 2 2-5 5-3 1z" /></>,
  },
};

export const OneScreenMark: React.FC<{ name: MarkName }> = ({ name }) => {
  const m = MARK[name];
  /* ⚠️ THE DEGRADE PATH, borrowed from ArtSlot: a 404 or a decode failure must not leave a broken-
     image glyph in a header. It falls back to the mono slot name — the ArtSlot convention — which
     is also what the box shows if a future mark ever arrives without an icon to stand in for it. */
  const [failed, setFailed] = useState(false);
  const showArt = !!m.src && !failed;
  return (
    <span className="os-mark" data-mark={name} aria-hidden="true">
      {showArt
        ? <img src={m.src} alt="" onError={() => setFailed(true)} />
        : m.icon
          /* ⚠️ 1.5 STROKE, BURGUNDY, 17px — and the 17 is the ICON's size, never the BOX's. The box
             is 28 whatever sits in it, which is exactly what makes the swap free. */
          ? <svg viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth={1.5}
                 strokeLinecap="round" strokeLinejoin="round">{m.icon}</svg>
          : <i className="os-mark-k">{m.label}</i>}
    </span>
  );
};
