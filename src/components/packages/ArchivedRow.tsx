/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ ARCHIVED — the way back (F-H) ═════════════════════════════════════════════════════════════
 *
 * ⚠️ A FILTER, NOT A PAGE (D1). Archiving used to hide a material or a package with no route to it,
 * which was liveable while building and is not shippable. The fix is a toggle in the band head and
 * the items appearing in place — not a separate screen, which would make "archived" a location the
 * writer has to remember rather than a state of a thing they are already looking at.
 *
 * ⚠️ RESTORE IS THE ONLY ACTION (D2). Not edit, not delete, not attach. An archived item is out of
 * the working set; the one question worth asking of it is whether it should come back. Offering the
 * rest would make the archived list a second, quieter version of the live one.
 *
 * ⚠️ AND THE TOGGLE DOES NOT RENDER WHEN NOTHING IS ARCHIVED (D5). The concept appears when it
 * becomes true. There is no empty state, because an empty state here would teach a writer about a
 * place they have never put anything.
 */
import React from "react";
import "./archivedRow.css";

export const ArchivedToggle: React.FC<{ n: number; on: boolean; onClick: () => void }> = ({ n, on, onClick }) =>
  n === 0 ? null : (
    <button type="button" className="pkgb-arcToggle" onClick={onClick} aria-pressed={on}>
      {/* ⚠️ THE COUNT IS THE ARCHIVED ONE AND IT IS NOT THE BAND'S TALLY. `N held` / `N built` stay
          active-only in every state of this control (D3) — the two numbers answer different
          questions and are never added together. */}
      {on ? "Hide archived" : `Show archived · ${n}`}
    </button>
  );

/**
 * ⚠️ RECESSED, NOT DISABLED. Reduced contrast and no hover lift say "out of the working set"; a
 * disabled treatment would say "you cannot have this", which is the opposite of a row whose whole
 * purpose is a control you can press.
 */
export const ArchivedRow: React.FC<{ name: string; meta?: string; onRestore: () => void }> = ({
  name, meta, onRestore,
}) => (
  <div className="pkgb-arcRow">
    <span className="pkgb-arcName">{name}</span>
    {meta ? <span className="pkgb-arcMeta">{meta}</span> : null}
    {/* ⚠️ "Restore" STATES THE ACT AND NOTHING ELSE (D6). No reason, no verdict — the app does not
        know why this was put away and has no business guessing. */}
    <button type="button" className="pkgb-arcRestore" onClick={onRestore}>Restore</button>
  </div>
);

/** The section wrapper — rendered only while the toggle is on and something is in it. */
export const ArchivedSection: React.FC<{ show: boolean; n: number; children: React.ReactNode }> = ({
  show, n, children,
}) => (!show || n === 0 ? null : (
  <div className="pkgb-arcSec">
    <div className="pkgb-arcLabel">Archived</div>
    {children}
  </div>
));
