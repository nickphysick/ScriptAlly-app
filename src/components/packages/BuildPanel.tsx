/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE NEW PACKAGE PANEL — the bench, pinned beside the library.
 * Reference: `design-refs/three-tabs.html`, `.bench` / `.slots3` / `.bfoot`.
 *
 * ⚠️ IT REPLACES `BuildRow`, mounted here and deleted there in the SAME commit. The row was a
 * collapsed strip UNDER the library that opened on click, which is why it carried `open` and
 * `armed`: a drag needed a target and the target was hidden. A pinned panel is always its own
 * target, so both states go with it, and `Cancel` becomes `Clear` — there is no longer anything to
 * close, only slots to empty.
 *
 * ⚠️ A FILLED SLOT HOLDS THE LIBRARY'S OWN CARD, not a compact row (Nick's ruling; the ref draws
 * the row). `MaterialCard` is rendered by both surfaces so they cannot come to disagree about what
 * a material looks like — the alternative is two card implementations, which this repo has already
 * paid for once as two ghost cards differing by a single word.
 *
 * ⚠️ THE NAME IS THE PANEL'S HEADING, not a field at its foot. What you are assembling is a
 * package with a name; asking for the name last makes it a form's final field rather than the
 * thing at the top of the thing you are looking at. It keeps `suggestedName`'s behaviour exactly:
 * the suggestion stops the moment the writer types, including when they clear it back to empty.
 */
import React, { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import type { RailChip, RailKind } from "../../lib/builderRail";
import { blockedReason, duplicateOf, suggestedName } from "../../lib/buildRow";
import type { SubmissionPackage } from "../../types";
import { MaterialCard } from "./MaterialCard";
import "./buildPanel.css";

const SLOT_LABEL: Record<RailKind, React.ReactNode> = {
  let: <>Covering letter · <em>required</em></>,
  syn: <>Synopsis · optional</>,
  ver: <>Version · optional</>,
};
const KIND_MIME = "application/x-sa-kind";

export interface BuildPanelProps {
  /**
   * ⚠️ THE PANEL HOLDS WHOLE CHIPS; `lib/buildRow`'s `Slots` HOLDS `{ id, name }` AND STAYS THAT WAY.
   * Those helpers need a name to suggest one and an id to spot a duplicate, and nothing else — a
   * pure function asking for more than it uses is a pure function that breaks when the view model
   * moves. A `RailChip` satisfies `SlotFill` structurally, so the narrow type is what they keep.
   */
  slots: Record<RailKind, RailChip | null>;
  existing: readonly SubmissionPackage[];
  onClear: (kind: RailKind) => void;
  /**
   * ⚠️ IT TAKES AN ID AND A KIND, NOT A CHIP — because a drop cannot know the chip.
   *
   * The only things readable from a `dataTransfer` are what was put on it, and putting the whole
   * chip on would be serialising a view model through the clipboard. The first version of this
   * built a `RailChip` here with `name: ""`, which filled the slot with a BLANK NAME — the drag
   * worked and the slot said nothing. The page owns the rail, so the page resolves the id.
   */
  onDrop: (kind: RailKind, id: string) => void;
  onClearAll: () => void;
  onCreate: (name: string) => void;
}

export const BuildPanel: React.FC<BuildPanelProps> = ({
  slots, existing, onClear, onDrop, onClearAll, onCreate,
}) => {
  const [typed, setTyped] = useState<string | null>(null);
  const [over, setOver] = useState<RailKind | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const suggestion = suggestedName(slots);
  /**
   * ⚠️ THE SUGGESTION STOPS THE MOMENT THE WRITER TYPES (D15). `typed` is null until they touch the
   * field, and non-null forever after — including when they clear it back to empty, which is a
   * choice rather than a reset. Re-suggesting over a name someone deleted is the app overruling
   * them about what their own package is called.
   */
  const name = typed ?? suggestion;
  const dupe = duplicateOf(slots, existing);
  const blocked = blockedReason(slots);
  const anything = !!(slots.let || slots.syn || slots.ver);

  /**
   * ⚠️ ESCAPE EMPTIES THE SLOTS (D18), and it no longer closes anything — there is nothing to
   * close. Bound only while something is IN the panel, so an empty bench never swallows a key the
   * page's own handlers want.
   */
  useEffect(() => {
    if (!anything) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setTyped(null);
      onClearAll();
    };
    const el = panelRef.current;
    el?.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onKey);
    return () => { el?.removeEventListener("keydown", onKey); window.removeEventListener("keydown", onKey); };
  }, [anything, onClearAll]);

  return (
    <aside className="bldp" ref={panelRef} aria-label="New package">
      <div className="bldp-head">
        {/**
          * ⚠️ A DASHED UNDERLINE AND A PENCIL, BECAUSE OTHERWISE IT READS AS A HEADING (D12). Set in
          * the heading's own face with no box, the name looked like the panel's title rather than
          * something you could type into — which is exactly the trap `InlineText` exists to avoid on
          * the book profile. The dashed underline is this app's established "editable in place" mark
          * (`.qp-inplace`), and the pencil is `lucide-react`'s, the same one the agent card and the
          * manuscript actions use rather than a fourth drawing of the same object.
          *
          * ⚠️ THE BORDER IS ON THE WRAPPER AND THE PENCIL IS `pointer-events: none`, so the mark
          * cannot swallow a click aimed at the field it is advertising.
          */}
        <span className="bldp-titlewrap">
          <input
            type="text" className="bldp-title" placeholder="Name this package"
            aria-label="Package name"
            value={name}
            onChange={(e) => setTyped(e.target.value)}
          />
          <Pencil className="bldp-pencil" width={12} height={12} aria-hidden="true" />
        </span>
        {/* ⚠️ THE HEAD'S `Drag or click a part in` IS RETIRED, and the ref carried it because its
            slots said nothing. Now that each empty slot states how it is filled, the head line was
            the same instruction a fourth time, three inches above three copies of itself — which is
            the fault this build has spent two passes removing from the card foot. One line to put
            back if the slots ever stop saying it. */}
      </div>

      {/* ⚠️ THE SCROLL IS ON THE SLOTS, NOT THE PANEL. The name at the top and the reason and the
          button at the foot must stay on screen while three full cards are being reviewed — a panel
          that scrolls whole takes its own Create button out of reach at exactly the moment it
          becomes usable. `min-height: 0` is what lets this shrink inside the flex column. */}
      <div className="bldp-slots">
        {(["let", "syn", "ver"] as const).map((k) => {
          const held = slots[k];
          return (
            <div
              key={k}
              className={`bldp-slot bldr-t-${k}${held ? " bldp-slot--on" : ""}${over === k ? " bldp-slot--over" : ""}`}
              data-slot={k}
              /**
               * ⚠️ THE TYPE IS CHECKED FROM THE `dataTransfer`, NOT FROM STATE (D13). During
               * `dragover` the only thing readable is the transfer's own types — a slot that
               * consulted React state would be answering about whatever was last set, which is
               * how a synopsis ends up accepted by the letter slot.
               */
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(KIND_MIME)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setOver(k);
              }}
              onDragLeave={() => setOver((o) => (o === k ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const kind = e.dataTransfer.getData(KIND_MIME) as RailKind;
                const id = e.dataTransfer.getData("text/plain");
                /* ⚠️ A SLOT REFUSES A TYPE THAT IS NOT ITS OWN, silently — the drag simply does not
                   land. An error message for a gesture nobody completed is noise. */
                if (kind !== k || !id) return;
                onDrop(k, id);
              }}
            >
              {held
                ? <MaterialCard chip={held} onRemove={() => onClear(k)} />
                : (
                  /* ⚠️ THE SLOT SAYS WHAT GOES IN IT AND HOW IT GETS THERE. The label alone names
                     the part and offers nothing — a dashed rectangle is not an affordance, and the
                     click target was discoverable only by hovering it. The second line is quieter
                     than the first on purpose: what this slot is for is the fact, how to fill it is
                     the instruction, and a reader who already knows should be able to skip it. */
                  <span className="bldp-ph">
                    <span className="bldp-phk">{SLOT_LABEL[k]}</span>
                    <span className="bldp-phc">Drag a card here, or click one</span>
                  </span>
                )}
            </div>
          );
        })}
      </div>

      <div className="bldp-foot">
        {/* ⚠️ THE REASON SITS BESIDE THE BUTTON, NOT IN A TOOLTIP (D17) — an explanation only
            reachable by hovering the control that is not working is not an explanation. */}
        <span className={`bldr-why${dupe && !blocked ? " bldr-why--dupe" : ""}`}>
          {blocked ?? (dupe ? <>Same combination as “{dupe.packageName}”</> : "")}
        </span>
        <span className="bldp-sp">
          {/* ⚠️ PRESENT ONLY WHEN THERE IS SOMETHING TO CLEAR. A permanently disabled Clear on an
              empty bench is a control that has never once done anything. */}
          {anything && (
            <button type="button" className="bldr-btn"
                    onClick={() => { setTyped(null); onClearAll(); }}>Clear</button>
          )}
          {/* ⚠️ A DUPLICATE IS STATED, NOT BLOCKED (D16) — only the missing letter disables. */}
          <button type="button" className="bldr-btn bldr-btn--primary" disabled={!!blocked}
                  onClick={() => onCreate(name.trim() || suggestion)}>Create package</button>
        </span>
      </div>
    </aside>
  );
};
