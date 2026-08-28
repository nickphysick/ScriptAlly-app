/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE CARD, TWO SURFACES — the builder's library and the New-package panel's slots.
 *
 * ⚠️ IT IS EXTRACTED RATHER THAN COPIED, AND THAT IS THE WHOLE POINT OF THE FILE. Part C puts a
 * FULL card in each slot instead of the compact name-and-kind row the ref draws; the alternative
 * was a second card implementation in `BuildPanel`, which is how two surfaces come to disagree
 * about what a material looks like — and this repo has already paid for that once with two ghost
 * cards that differed by a single word.
 *
 * ⚠️ THE MODES ARE ADDITIVE PROPS, NOT A `variant` STRING. A library card drags, picks, reports its
 * hover and dims when it is in the bench; a slot card does none of those and offers a remove
 * control instead. Passing neither gives a card that only renders — which is what a slot needs and
 * what a `variant` union would have had to spell out as a third member.
 */
import React from "react";
import type { CardBody, CardIcon, RailChip } from "../../lib/builderRail";

/**
 * The card's small marks — a page, a document, a plus.
 *
 * ⚠️ INLINE AND STROKE-ONLY, taking `currentColor`, so each sits in its family's ink without the
 * component knowing which family it is in. A shared icon set keyed by name would be a second
 * registry for three paths used in two files.
 */
export const CardGlyph: React.FC<{ kind: CardIcon | "plus" | "doc" }> = ({ kind }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {kind === "page" && <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>}
    {/* the plate's mark — the page, with ruled lines, because it stands for a document rather than
        for the act of writing one */}
    {kind === "doc" && <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M10 13h7M10 17h5" /></>}
    {kind === "plus" && <path d="M12 5v14M5 12h14" />}
  </svg>
);

/**
 * ⚠️ THE DESCRIPTION BAND HOLDS SOMETHING TRUE IN EVERY STATE, AND THE SWITCH IS EXHAUSTIVE.
 * It was a string that could be blank, and the blank read as a line which had failed to load. The
 * `never` close is the house idiom: a fifth kind of body cannot be added without saying what the
 * band does with it, which is the guard a default branch would quietly remove.
 */
export const CardDescription: React.FC<{ body: CardBody }> = ({ body }) => {
  switch (body.kind) {
    case "text":
      /* ⚠️ CLAMPED BY CSS, NEVER BY CUTTING THE STRING — a substring bakes a width into the data. */
      return <div className="bldr-desc">{body.text}</div>;
    case "file":
      return (
        <div className="bldr-plate">
          <span className="bldr-plateico"><CardGlyph kind="doc" /></span>
          <span className="bldr-platetx">
            <span className="bldr-platefn">{body.fileName}</span>
            {/* ⚠️ OMITTED WHERE THE NAME DOES NOT SAY WHAT KIND OF DOCUMENT IT IS — the filename
                stands alone rather than the app naming a kind it cannot read. */}
            {body.fileKind && <span className="bldr-platekind">{body.fileKind}</span>}
          </span>
        </div>
      );
    case "none":
      return <div className="bldr-desc bldr-desc--none">Nothing written yet</div>;
    case "version":
      /* ⚠️ TWO ELEMENTS, NOT ONE STRING — the note is clamped to two lines and the holdings line is
         not, so a long note can never push the holdings out of the card or swallow it into its own
         clamp. The holdings line is omitted at zero; `Not in a package` in the foot says it once. */
      return (
        <div className="bldr-vband">
          <div className={`bldr-desc${body.note ? "" : " bldr-desc--none"}`}>
            {body.note ?? "No note on this version"}
          </div>
          {body.holdings && <div className="bldr-hold">{body.holdings}</div>}
        </div>
      );
    default: {
      const unhandled: never = body;
      return unhandled;
    }
  }
};

/** What a screen reader hears in the band's place — the plate is two elements and one sentence. */
export const bandSpoken = (b: CardBody): string =>
  b.kind === "text" ? b.text
  : b.kind === "file" ? `Attached file ${b.fileName}${b.fileKind ? `, ${b.fileKind}` : ""}`
  : b.kind === "none" ? "Nothing written yet"
  : `${b.note ?? "No note on this version"}${b.holdings ? `. ${b.holdings}` : ""}`;

export interface MaterialCardProps {
  chip: RailChip;
  /** Library only. Absent gives a card that renders and nothing else — what a slot holds. */
  pick?: {
    onPick: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onHover: (on: boolean) => void;
    inBench: boolean;
    lit: boolean;
    dimmed: boolean;
  };
  /** Slot only — empties the slot this card is sitting in. */
  onRemove?: () => void;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({ chip: c, pick, onRemove }) => (
  <div
    className={`bldr-mc bldr-t-${c.kind}`
      + (pick?.inBench ? " bldr-mc--used" : "")
      + (pick?.lit ? " bldr-mc--lit" : "")
      + (pick && pick.dimmed && !pick.lit ? " bldr-mc--dim" : "")
      + (pick ? "" : " bldr-mc--slot")}
    {...(pick
      ? {
          role: "button" as const, tabIndex: 0, draggable: true,
          "aria-label": `${c.name}. ${bandSpoken(c.body)} ${[c.src, c.use].filter(Boolean).join(". ")}. Adds to the package you are building.`,
          onClick: pick.onPick,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick.onPick(); }
          },
          onDragStart: pick.onDragStart,
          onDragEnd: pick.onDragEnd,
          onMouseEnter: () => pick.onHover(true),
          onMouseLeave: () => pick.onHover(false),
        }
      : {})}
    data-chip={c.id} data-kind={c.kind}
  >
    <div className="bldr-mctop">
      <h5>{c.name}</h5>
      {/* ⚠️ THE GRIP IS THE LIBRARY'S, NOT THE SLOT'S — it advertises a drag, and a card already in
          a slot is not dragged anywhere. The remove control takes its place, in its place. */}
      {pick
        ? <span className="bldr-grip" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
        : onRemove && (
          <button type="button" className="bldr-mcx" aria-label={`Remove ${c.name}`} onClick={onRemove}>×</button>
        )}
    </div>
    <CardDescription body={c.body} />
    {/* ⚠️ TWO SLOTS, TWO REGISTERS — what it IS on the left, where it is USED on the right (D7/D8).
        The `Not used` tag that used to sit at the card's top right is retired: the right slot now
        says `Not in a package` in one grammar, and a card carrying both would say one thing twice in
        two vocabularies. */}
    <div className="bldr-mcfoot">
      <span className="bldr-src">
        {c.srcIcon && <CardGlyph kind={c.srcIcon} />}
        {c.src}
      </span>
      <span className="bldr-use">{c.use}</span>
    </div>
    {/**
      * ⚠️ A CARD IN THE BENCH DIMS IN PLACE — it is NOT removed from the grid (D9). Removing it
      * reflows every card after it while the writer's hand is still moving, which is how someone
      * clicks the thing that slid under the cursor.
      */}
    {pick?.inBench && <div className="bldr-inuse">In this package</div>}
  </div>
);
