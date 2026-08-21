/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Put this away" — the archive/delete confirmation (broadsheet Ruling 2).
 * Design authority: design-refs/submission-packages-broadsheet.html (`.pop`), COPY REWRITTEN.
 *
 * ⚠️ THE REF'S IN-USE COPY IS DELETED, NOT ADAPTED. It read: "Take it out of that package first,
 * then it can be deleted" — D9's blocked delete, which Ruling 2 struck. That sentence asks the
 * writer to dismantle something they built in order to tidy something else, and the guard behind it
 * could never be enforced anyway: "refuse while any package references it" is a predicate over a
 * COLLECTION, and Firestore rules have no query capability. Archiving is a single-document field
 * update, which rules CAN hold, so the model moved to where it can actually be kept.
 *
 * ⚠️ AND THE TWO OUTCOMES ARE NOT A CHOICE. `removalChoice` reads the data: nothing holds it, so it
 * goes; something holds it, so it is put away. Offering both would be asking the writer to answer a
 * question already answered — and inviting them to pick the one that breaks a package.
 *
 * ⚠️ ONE ACT, ONE DECISION. The popover computes the choice and performs it; a caller cannot show
 * "Archive" and run a delete, because the label and the handler come from the same object.
 */
import React, { useEffect, useRef, useState } from "react";
import { SubmissionPackage } from "../../types";
import { removalChoice, type RemovalChoice } from "../../lib/packagesOverview";
import { useFixedMenu } from "../forms/useFixedMenu";
import "./packagesBroadsheet.css";

/** The list of holders, as prose. Two are named; three or more become a count. */
const holderPhrase = (names: string[]): string => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.length} packages`;
};

export interface RemovalCopy {
  heading: string;
  body: React.ReactNode;
  /** The confirming button's word — "Delete" or "Archive". Never both. */
  verb: string;
}

/**
 * ⚠️ THE COPY STATES WHAT WILL HAPPEN, NOT WHAT THE WRITER SHOULD FEEL ABOUT IT. No "are you sure",
 * no "permanently", no warning adjective — the archive branch is genuinely undoable in the data
 * sense (the record survives) and the delete branch says plainly that it is not.
 */
export function removalCopy(name: string, typeLabel: string, choice: RemovalChoice): RemovalCopy {
  if (choice.kind === "delete") {
    return {
      heading: `Delete ${name}?`,
      body: <>No package holds this {typeLabel.toLowerCase()}, so it can go for good. This can&rsquo;t be undone.</>,
      verb: "Delete",
    };
  }
  return {
    heading: `Archive ${name}?`,
    body: (
      <>
        It leaves your materials list and stays in <b>{holderPhrase(choice.packageNames)}</b>
        {choice.packageNames.length > 2 ? " that hold it" : ""}. Nothing you have already sent changes.
      </>
    ),
    verb: "Archive",
  };
}

export interface RemovePopoverProps {
  /** The record being removed — its id decides the branch, its name and type write the copy. */
  id: string;
  name: string;
  typeLabel: string;
  packages: SubmissionPackage[];
  /**
   * ⚠️ `onDelete` MAY REPORT A REFUSAL. `db.deleteVersion` returns `false` without writing when a
   * package holds the material — a last check before an irreversible act, which can only disagree
   * with `removalChoice` if a package took the material between this render and the click. Handled
   * rather than ignored: the popover stays open, and by then its props carry the new package, so it
   * re-renders on the ARCHIVE branch. A delete that silently did nothing would be the dead-undo
   * fault one collection along — the writer told it worked, and nothing moved.
   */
  onDelete: (id: string) => void | Promise<unknown>;
  onArchive: (id: string) => void | Promise<unknown>;
  /** The trigger's accessible name — the sheet already says which material this is. */
  label?: string;
}

export const RemovePopover: React.FC<RemovePopoverProps> = ({
  id, name, typeLabel, packages, onDelete, onArchive, label,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  /* Anchored right: the trigger sits at the sheet's right edge, and a 280px panel hung off its left
     would reach into the next column. `useFixedMenu` also escapes the scroller's clip. */
  const { triggerRef, menuStyle } = useFixedMenu<HTMLButtonElement>(open, { align: "right" });

  /* Dismissal follows the shell's pattern: pointerdown outside, Escape. Escape is NOT stopped — this
     sits inside a page that owns its own Escape handling, and swallowing the key here would reach
     past this popover's business. */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choice = removalChoice(id, packages);
  const copy = removalCopy(name, typeLabel, choice);

  return (
    <span className="pkgb-remwrap" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="pkgb-rem"
        aria-label={label ?? `Remove ${name}`}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
        </svg>
      </button>

      {open && (
        <div className="pkgb-pop" style={menuStyle} role="dialog" aria-label={copy.heading}>
          <h5>{copy.heading}</h5>
          <p>{copy.body}</p>
          <div className="pkgb-popacts">
            <button type="button" className="pkgb-btn pkgb-btn--sm" onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="button"
              className="pkgb-btn pkgb-btn--sm pkgb-btn--danger"
              onClick={async () => {
                /* The verb and the handler come from the same `choice` — they cannot disagree. */
                if (choice.kind === "archive") { setOpen(false); await onArchive(id); return; }
                const done = await onDelete(id);
                /* `false` is an explicit refusal; anything else (including `undefined`) is a write. */
                if (done !== false) setOpen(false);
              }}
            >
              {copy.verb}
            </button>
          </div>
        </div>
      )}
    </span>
  );
};
