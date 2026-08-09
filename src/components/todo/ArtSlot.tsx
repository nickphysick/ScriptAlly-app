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
  | "first-run-board"   // the To-do list before the first query — "not yet", not "well done"
  | "seize-the-day"     // Today's plan card — the ONE slot with a real asset committed
  | "agent-unknown";    // Query Centre: the agent context panel with nothing on file to report

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
 * ⚠️ A BRIEF IS FOR THE ILLUSTRATOR, NEVER FOR THE READER (tasks-viewport fixes, 7 Aug). These
 * captions used to render as body text under every placeholder, so a writer met "An empty letter
 * tray, a pen laid down." as though it were something the app was telling them. They live HERE
 * and in code comments only; the placeholder shows the slot's name in mono and nothing else.
 *
 * ⚠️ THE BRIEFS, VERBATIM FROM THE REF. This record is the illustrator's handover and the
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
  /* ⚠️ THE ONLY SLOT WITH A REAL ASSET (tasks-viewport P2). It arrived embedded in
     today-redesign.html as base64; it is committed at public/todo-seize-the-day.png and read by
     path like any other. The `src` is what takes this slot off the placeholder path — every
     other brief still renders its caption, and the degrade route is shared, so a 404 here lands
     back on the caption rather than a broken-image glyph. */
  "seize-the-day": {
    caption: "The plan-your-day mark, on the card that opens the pass over Up next.",
    w: 100, h: 100,
    src: "/todo-seize-the-day.png",
    alt: "A mark for planning the day ahead",
  },
  /* Query Centre · stage 2's right column when the agent record is a name and nothing else.
     BRIEF: a closed reference book on a desk, seen from above, with the reader's chair empty —
     the record exists but has not been filled in yet. Quiet, no question mark, no shrug: this is
     an invitation to go and find out, not a fault being reported. */
  "agent-unknown": {
    caption: "A closed reference book, waiting to be opened",
    w: 220, h: 150,
    alt: "A closed reference book on an empty desk",
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
  /* ⚠️ THE BOX IS ALWAYS EXPLICIT. `maxWidth` caps the slot; without one the brief's own width is
     the box. Both dimensions are computed here so the rendered element carries real numbers
     rather than inheriting whatever the parent happens to offer. */
  const boxW = maxWidth ?? brief.w;
  const boxH = Math.round((brief.h / brief.w) * boxW);

  return (
    <figure
      className={`art art--${name}${className ? ` ${className}` : ""}`}
      style={maxWidth ? { maxWidth } : undefined}
      data-art={name}
    >
      {/* ⚠️ THE SLOT ALWAYS SIZES ITS OWN OUTPUT (7 Aug fix). The asset used to render at its
          natural size, unbounded, and spilled out of the card behind the page content. A slot
          DECLARES a box and the artwork lives inside it — `object-fit: contain` so it is never
          distorted, `max-width/height: 100%` so it can never exceed the box, `display: block` so
          it is not sitting on a text baseline. NEVER a background-image (unmeasurable, and it
          takes the alt text with it) and never a bare <img>. */}
      {showArt ? (
        <img
          className="art-img art-real"
          src={brief.src}
          alt={brief.alt}
          width={boxW}
          height={boxH}
          style={{ width: boxW, height: boxH }}
          onError={() => setFailed(true)}
        />
      ) : (
        /* The ratio box reserves exactly the room the artwork will take, so nothing shifts when
           it lands. Its only content is the slot's NAME, in mono — see the brief note above. */
        <div className="art-box" style={{ paddingTop: `${(brief.h / brief.w) * 100}%` }}>
          <span className="art-ph" aria-hidden>
            <span className="art-phk">ART · {name.toUpperCase()}</span>
          </span>
        </div>
      )}
    </figure>
  );
};
