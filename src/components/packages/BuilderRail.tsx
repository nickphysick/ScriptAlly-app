/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Builder's rail — three sections of draggable chips.
 * Reference: `design-refs/builder-refined.html`, `.rail` / `.rsec` / `.chip`.
 *
 * ⚠️ IT REPLACES THE MATERIALS SHELF, mounted here and unmounted there in the same commit, so the
 * two never coexist. The shelf was a band of banded cards BELOW the ledger; the rail is the same
 * information beside it, where a writer assembling a package can see both at once.
 *
 * ⚠️ A CHIP IS A BUTTON THAT FILLS A SLOT, AND DRAG IS AN ACCELERANT (D14). Every chip is
 * focusable and carries the app's existing idiom — `Enter`/`Space` performs the element's own
 * action — so the build path is never mouse-only. Drag is added on top and reaches the same
 * handler; a picker that only accepts a drag is the trap this repo has recorded once already.
 */
import React from "react";
import { RAIL_EMPTY } from "../../lib/builderRail";
import type { CardIcon, RailChip, RailKind, RailSection } from "../../lib/builderRail";
import "./builderRail.css";

/** The Add button's wording, per the ref: the section names what it adds (D4). */
export const ADD_LABEL: Record<RailKind, string> = {
  let: "Add a letter",
  syn: "Add a synopsis",
  ver: "Add a version",
};

/**
 * The card's three small marks — a page, a paperclip, a plus.
 *
 * ⚠️ INLINE AND STROKE-ONLY, taking `currentColor`, so each sits in its family's ink without the
 * component knowing which family it is in. A shared icon set keyed by name would be a second
 * registry for three paths used in one file.
 */
const CardGlyph: React.FC<{ kind: CardIcon | "plus" }> = ({ kind }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {kind === "page" && <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>}
    {kind === "clip" && <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" />}
    {kind === "plus" && <path d="M12 5v14M5 12h14" />}
  </svg>
);

export interface BuilderRailProps {
  sections: RailSection[];
  /** Fill the next empty slot of this chip's type — click, Enter and Space all reach it (D14). */
  onPick: (chip: RailChip) => void;
  /** `＋ Add` — a material modal for the first two, a version on the MANUSCRIPT for the third. */
  onAdd: (kind: RailKind) => void;
  /** Drag start/end, so the build row can arm itself before a drag needs a target (D12). */
  onDragStart: (chip: RailChip) => void;
  onDragEnd: () => void;
  /** The chip currently lit by a ledger hover, or null (D19). */
  litId?: string | null;
  /** Whether this material is already in the New package bench — it dims in place (D9). */
  inBench: (id: string) => boolean;
  /** True while ANY ledger cell is hovered — the chips that are not lit dim. */
  dimming?: boolean;
  /** Hovering a chip drives the ledger the other way. */
  onHoverChip: (chip: RailChip | null) => void;
}

export const BuilderRail: React.FC<BuilderRailProps> = ({
  sections, onPick, onAdd, onDragStart, onDragEnd, litId = null, dimming = false, onHoverChip, inBench,
}) => (
  <div className="bldr-rail">
    {sections.map((sec) => (
      <div key={sec.kind} className={`bldr-rsec bldr-t-${sec.kind}`}>
        <div className="bldr-sh">
          {/* ⚠️ THE HEAD IS A FILLED PILL IN THE FAMILY COLOUR, and it is why a library CARD needs
              no type pill of its own (D6): the section has already said what these are. */}
          <h4>{sec.heading}</h4>
          <span className="bldr-n">{sec.chips.length}</span>
          <button type="button" className="bldr-addbtn" onClick={() => onAdd(sec.kind)}>
            <CardGlyph kind="plus" /> {ADD_LABEL[sec.kind]}
          </button>
        </div>
        <div className="bldr-cards">
          {/**
            * ⚠️ AN EMPTY SECTION INVITES ITS FIRST, RATHER THAN SHOWING A HEAD OVER NOTHING (D4,
            * previous pack). All three have it, because all three had the gap.
            */}
          {sec.chips.length === 0 && (
            <button type="button" className="bldr-radd" onClick={() => onAdd(sec.kind)}>
              {RAIL_EMPTY[sec.kind]}
            </button>
          )}
          {sec.chips.map((c) => (
            <div
              key={c.id}
              className={`bldr-mc bldr-t-${c.kind}${inBench(c.id) ? " bldr-mc--used" : ""}${litId === c.id ? " bldr-mc--lit" : ""}${dimming && litId !== c.id ? " bldr-mc--dim" : ""}`}
              role="button" tabIndex={0} draggable
              data-chip={c.id} data-kind={c.kind}
              aria-label={`${c.name}. ${c.desc ?? ""} ${c.src}. Adds to the package you are building.`}
              onClick={() => onPick(c)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(c); } }}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", c.id);
                e.dataTransfer.setData("application/x-sa-kind", c.kind);
                e.dataTransfer.effectAllowed = "copy";
                onDragStart(c);
              }}
              onDragEnd={onDragEnd}
              onMouseEnter={() => onHoverChip(c)}
              onMouseLeave={() => onHoverChip(null)}
            >
              {/* ⚠️ THE TAG IS OUT OF FLOW so it never displaces the name (D10, previous pack). */}
              {c.unused && <span className="bldr-unused">Not used</span>}
              <div className="bldr-mctop">
                <h5>{c.name}</h5>
                <span className="bldr-grip" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
              </div>
              {/* ⚠️ CLAMPED BY CSS, NEVER BY CUTTING THE STRING — a substring bakes a width into the
                  data. And an attached file with no draft leaves this EMPTY rather than narrating an
                  absence the source line has already stated. */}
              <div className={`bldr-desc${c.descNone ? " bldr-desc--none" : ""}`}>
                {c.desc ?? (c.descNone ? "Nothing written yet" : "")}
              </div>
              <div className="bldr-mcfoot">
                <span className="bldr-src">
                  {c.srcIcon && <CardGlyph kind={c.srcIcon} />}
                  {c.src}
                </span>
                {c.use && <span className="bldr-use">{c.use}</span>}
              </div>
              {/**
                * ⚠️ A CARD IN THE BENCH DIMS IN PLACE — it is NOT removed from the grid (D9).
                * Removing it reflows every card after it while the writer's hand is still moving,
                * which is how someone clicks the thing that slid under the cursor.
                */}
              {inBench(c.id) && <div className="bldr-inuse">In this package</div>}
            </div>
          ))}
        </div>
        {/* ⚠️ ONLY VERSIONS HAS ONE, because only its `＋ Add` writes somewhere else (D11). */}
        {sec.note && <div className="bldr-rnote">{sec.note}</div>}
      </div>
    ))}
  </div>
);
