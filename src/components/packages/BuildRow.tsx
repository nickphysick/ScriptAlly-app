/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The build row — closed line, three slots, footer.
 * Reference: `design-refs/builder-refined.html`, `.buildclosed` / `.drop` / `.slots` / `.buildfoot`.
 */
import React, { useEffect, useRef, useState } from "react";
import type { RailChip, RailKind } from "../../lib/builderRail";
import { blockedReason, duplicateOf, suggestedName, type Slots } from "../../lib/buildRow";
import type { SubmissionPackage } from "../../types";
import "./buildRow.css";

const SLOT_LABEL: Record<RailKind, React.ReactNode> = {
  let: <>Covering letter · <em>required</em></>,
  syn: <>Synopsis · optional</>,
  ver: <>Version · optional</>,
};
const SLOT_KIND: Record<RailKind, string> = { let: "Letter", syn: "Synopsis", ver: "Version" };
const KIND_MIME = "application/x-sa-kind";

export interface BuildRowProps {
  open: boolean;
  /** True while a chip is being dragged — the row arms itself so the drag has a target (D12). */
  armed: boolean;
  slots: Slots;
  existing: readonly SubmissionPackage[];
  onOpen: () => void;
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
  onClose: () => void;
  onCreate: (name: string) => void;
}

export const BuildRow: React.FC<BuildRowProps> = ({
  open, armed, slots, existing, onOpen, onClear, onDrop, onClose, onCreate,
}) => {
  const [typed, setTyped] = useState<string | null>(null);
  const [over, setOver] = useState<RailKind | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

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

  /* ⚠️ ESCAPE CLOSES AND CLEARS (D18) — bound while open only, so it never reaches past this row. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setTyped(null);
      onClose();
    };
    const el = rowRef.current;
    el?.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onKey);
    return () => { el?.removeEventListener("keydown", onKey); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) {
    return (
      <div className="bldr-buildwrap">
        <button
          type="button"
          className={`bldr-closed${armed ? " bldr-closed--armed" : ""}`}
          onClick={onOpen}
        >
          <span className="bldr-g">＋ Build a package</span>
          <span className="bldr-h">or drag a chip here</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bldr-buildwrap" ref={rowRef}>
      <div className={`bldr-drop${armed ? " bldr-drop--armed" : ""}`}>
        <div className="bldr-slots">
          {(["let", "syn", "ver"] as const).map((k) => {
            const held = slots[k];
            return (
              <div
                key={k}
                className={`bldr-slot bldr-t-${k}${held ? " bldr-slot--on" : ""}${over === k ? " bldr-slot--over" : ""}`}
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
                  /* ⚠️ A SLOT REFUSES A TYPE THAT IS NOT ITS OWN, silently — the drag simply does
                     not land. An error message for a gesture nobody completed is noise. */
                  if (kind !== k || !id) return;
                  onDrop(k, id);
                }}
              >
                {held ? (
                  <span className="bldr-filled">
                    <span className="bldr-tx">
                      <b>{held.name}</b>
                      <span className="bldr-k">{SLOT_KIND[k]}</span>
                    </span>
                    <button type="button" className="bldr-x" aria-label={`Remove ${held.name}`}
                            onClick={() => onClear(k)}>×</button>
                  </span>
                ) : (
                  <span className="bldr-ph">{SLOT_LABEL[k]}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="bldr-buildfoot">
          <input
            type="text" className="bldr-name" placeholder="Name this package"
            value={name}
            onChange={(e) => setTyped(e.target.value)}
          />
          {/* ⚠️ THE REASON SITS BESIDE THE BUTTON, NOT IN A TOOLTIP (D17) — an explanation only
              reachable by hovering the control that is not working is not an explanation. */}
          <span className={`bldr-why${dupe && !blocked ? " bldr-why--dupe" : ""}`}>
            {blocked ?? (dupe ? <>Same combination as “{dupe.packageName}”</> : "")}
          </span>
          <span className="bldr-sp">
            <button type="button" className="bldr-btn" onClick={() => { setTyped(null); onClose(); }}>Cancel</button>
            {/* ⚠️ A DUPLICATE IS STATED, NOT BLOCKED (D16) — only the missing letter disables. */}
            <button type="button" className="bldr-btn bldr-btn--primary" disabled={!!blocked}
                    onClick={() => onCreate(name.trim() || suggestion)}>Create</button>
          </span>
        </div>
      </div>
    </div>
  );
};
