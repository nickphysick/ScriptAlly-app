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
import type { RailChip, RailKind, RailSection } from "../../lib/builderRail";
import { CardGlyph, MaterialCard } from "./MaterialCard";
import "./builderRail.css";

/** The Add button's wording, per the ref: the section names what it adds (D4). */
export const ADD_LABEL: Record<RailKind, string> = {
  let: "Add a letter",
  syn: "Add a synopsis",
  ver: "Add a version",
};

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
            <MaterialCard
              key={c.id}
              chip={c}
              pick={{
                onPick: () => onPick(c),
                onDragStart: (e) => {
                  e.dataTransfer.setData("text/plain", c.id);
                  e.dataTransfer.setData("application/x-sa-kind", c.kind);
                  e.dataTransfer.effectAllowed = "copy";
                  onDragStart(c);
                },
                onDragEnd,
                onHover: (on) => onHoverChip(on ? c : null),
                inBench: inBench(c.id),
                lit: litId === c.id,
                dimmed: dimming,
              }}
            />
          ))}
        </div>
        {/* ⚠️ ONLY VERSIONS HAS ONE, because only its `＋ Add` writes somewhere else (D11). */}
        {sec.note && <div className="bldr-rnote">{sec.note}</div>}
      </div>
    ))}
  </div>
);
