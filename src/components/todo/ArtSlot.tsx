/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ArtSlot — ONE component, six named slots (board-optimise pack, Phase 3; ref
 * design-refs/art-slots.html).
 *
 * ⚠️ WHERE ART GOES, AND WHERE IT DOES NOT. Two homes are REJECTED with reasons, and the
 * rejections are as load-bearing as the slots:
 *  · NOT in page headers — a permanent illustration is seen five hundred times and read once; it
 *    pushes the work down the page on every visit, and the headers already carry meaning.
 *  · NOT per card — kind is already the pastille band and the family colour; a second signal in
 *    the same place competes rather than reinforces, and sixteen drawings on one screen is a
 *    sticker album, not a desk.
 * Art belongs where the interface has NOTHING TO SAY (an empty column, a fresh page, a cleared
 * desk) or SOMETHING TO MARK (a flow completed, a week reviewed). Both rejections are asserted in
 * artSlots.test.tsx — a rule with no tripwire is a comment.
 *
 * ⚠️ THE PLACEHOLDER SHIPS NOW SO NOTHING SHIFTS LATER. Each slot declares a fixed RATIO from the
 * brief, so the space the illustration will occupy is already reserved: when the asset lands, the
 * artwork replaces the placeholder inside the same box and no layout moves. And a MISSING ASSET
 * DEGRADES TO THE CAPTION — never a broken image — because an `img` whose src 404s is worse than
 * no art at all, and the caption is the piece of it that carries meaning anyway.
 */
import React, { useState } from "react";
import "./artSlot.css";

export type ArtSlotName =
  | "desk-clear"        // Today: nothing committed ∧ nothing urgent ∧ bench exhausted — the hero
  | "noteboard-empty"   // the Noteboard's first run
  | "done-empty"        // the Done column before the first tick today (must read at 260px)
  | "dock-seal"         // 600ms flourish as a flow completes, before the card animates to Done
  | "review-masthead"   // the weekly briefing card, while fresh
  | "first-run-board";  // the To-do list before the first query — "not yet", not "well done"

interface SlotBrief {
  /** The illustrator's brief, one line — rendered as the placeholder's own caption. */
  caption: string;
  /** Intrinsic size from the brief. The BOX is ratio-locked to this, never to a fixed height. */
  w: number;
  h: number;
  /** The asset path, once it exists. Absent = placeholder only (every slot, today). */
  src?: string;
  /** Alt text for the day the asset lands — descriptive, never "illustration". */
  alt: string;
}

/**
 * ⚠️ THE SIX BRIEFS, VERBATIM FROM THE REF. This record is the illustrator's handover and the
 * component's contract at once: change a ratio here and the reserved space changes everywhere the
 * slot appears, which is exactly the coupling you want.
 */
export const ART_SLOTS: Record<ArtSlotName, SlotBrief> = {
  "desk-clear": {
    caption: "The hero — the writer’s desk at rest: manuscript squared, lamp off, teacup done.",
    w: 520, h: 300,
    alt: "A writer’s desk at rest — the manuscript squared, the lamp off, the teacup finished",
  },
  "noteboard-empty": {
    caption: "A corkboard with one blank card and a pin.",
    w: 380, h: 200,
    alt: "A corkboard with a single blank card pinned to it",
  },
  "done-empty": {
    caption: "An empty letter tray, a pen laid down.",
    w: 240, h: 150,
    alt: "An empty letter tray with a pen laid down beside it",
  },
  "dock-seal": {
    caption: "The completion stamp — a wax seal struck as the flow finishes.",
    w: 120, h: 120,
    alt: "A wax seal, freshly struck",
  },
  "review-masthead": {
    caption: "A slim banner across the weekly briefing card.",
    w: 640, h: 90,
    alt: "A slim decorative banner for the week’s review",
  },
  "first-run-board": {
    caption: "An empty desk waiting to be used — before the first query.",
    w: 460, h: 260,
    alt: "An empty writing desk, waiting to be used",
  },
};

export interface ArtSlotProps {
  name: ArtSlotName;
  /** Cap the rendered width (the Done vignette must read at 260px inside its column). */
  maxWidth?: number;
  className?: string;
}

export const ArtSlot: React.FC<ArtSlotProps> = ({ name, maxWidth, className }) => {
  const brief = ART_SLOTS[name];
  /* ⚠️ THE DEGRADE PATH. `src` is absent for every slot today, and when one lands a 404 or a
     decode failure flips this — either way the caption renders alone. A broken-image glyph in an
     empty state would be the app looking broken exactly where it is trying to be gracious. */
  const [failed, setFailed] = useState(false);
  const showArt = !!brief.src && !failed;

  return (
    <figure
      className={`art art--${name}${className ? ` ${className}` : ""}`}
      style={maxWidth ? { maxWidth } : undefined}
      data-art={name}
    >
      {/* The ratio box: padding-top holds the space whether or not the asset exists, so the
          placeholder and the artwork occupy exactly the same room. */}
      <div className="art-box" style={{ paddingTop: `${(brief.h / brief.w) * 100}%` }}>
        {showArt ? (
          <img className="art-img" src={brief.src} alt={brief.alt} onError={() => setFailed(true)} />
        ) : (
          <span className="art-ph" aria-hidden>
            <span className="art-phk">ART · {name.toUpperCase()}</span>
          </span>
        )}
      </div>
      <figcaption className="art-cap">{brief.caption}</figcaption>
    </figure>
  );
};
