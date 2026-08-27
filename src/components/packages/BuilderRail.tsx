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
import "./builderRail.css";

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
  /** True while ANY ledger cell is hovered — the chips that are not lit dim. */
  dimming?: boolean;
  /** Hovering a chip drives the ledger the other way. */
  onHoverChip: (chip: RailChip | null) => void;
}

export const BuilderRail: React.FC<BuilderRailProps> = ({
  sections, onPick, onAdd, onDragStart, onDragEnd, litId = null, dimming = false, onHoverChip,
}) => (
  <div className="bldr-rail">
    {sections.map((sec) => (
      <div key={sec.kind} className={`bldr-rsec bldr-t-${sec.kind}`}>
        <div className="bldr-rh">
          <h4>{sec.heading}</h4>
          <span className="bldr-n">{sec.chips.length}</span>
          <button type="button" className="bldr-add" onClick={() => onAdd(sec.kind)}>＋ Add</button>
        </div>
        <div className="bldr-items">
          {/**
            * ⚠️ AN EMPTY SECTION INVITES ITS FIRST, RATHER THAN SHOWING A HEAD OVER NOTHING (D4).
            *
            * ⚠️ AND ALL THREE GET IT, because all three had the gap. The brief asked for the
            * Versions section to "match how the other two behave when empty" — they behaved the
            * same way, which is to say they rendered a heading, a zero and a blank. Fixing the
            * instance that was seen would have left two-thirds of the fault in place.
            */}
          {sec.chips.length === 0 && (
            <button type="button" className="bldr-radd" onClick={() => onAdd(sec.kind)}>
              {RAIL_EMPTY[sec.kind]}
            </button>
          )}
          {sec.chips.map((c) => (
            <div
              key={c.id}
              className={`bldr-chip bldr-t-${c.kind}${litId === c.id ? " bldr-chip--lit" : ""}${dimming && litId !== c.id ? " bldr-chip--dim" : ""}`}
              role="button" tabIndex={0} draggable
              data-chip={c.id} data-kind={c.kind}
              aria-label={`${c.name} — ${c.meta}. Adds to the package you are building.`}
              onClick={() => onPick(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(c); }
              }}
              onDragStart={(e) => {
                /* ⚠️ THE KIND TRAVELS ON THE EVENT, so a slot can refuse a type it does not take
                   during dragover — where the only thing readable is the dataTransfer, not the
                   element. `text/plain` carries the id for anything that wants it. */
                e.dataTransfer.setData("text/plain", c.id);
                e.dataTransfer.setData("application/x-sa-kind", c.kind);
                e.dataTransfer.effectAllowed = "copy";
                onDragStart(c);
              }}
              onDragEnd={onDragEnd}
              onMouseEnter={() => onHoverChip(c)}
              onMouseLeave={() => onHoverChip(null)}
            >
              {/* ⚠️ THE TAG IS FIRST IN THE DOM AND POSITIONED OUT OF FLOW, so it never displaces
                  the name — it sits on the chip's top edge (D10). A fact, not a nudge. */}
              {c.unused && <span className="bldr-unused">Not used</span>}
              <span className="bldr-grip" aria-hidden="true">
                <i /><i /><i /><i /><i /><i />
              </span>
              <span className="bldr-tx">
                <b>{c.name}</b>
                <span className="bldr-m">{c.meta}</span>
              </span>
            </div>
          ))}
        </div>
        {/* ⚠️ ONLY VERSIONS HAS ONE, because only its `＋ Add` writes somewhere else (D11). */}
        {sec.note && <div className="bldr-rnote">{sec.note}</div>}
      </div>
    ))}
  </div>
);
