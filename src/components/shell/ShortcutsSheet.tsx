/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE KEYBOARD SHORTCUTS SHEET (switcher v2, Part B). `?` opens it from anywhere except an editable
 * field or an open modal; the Help centre's "Keyboard shortcuts" opens it too (Help has no menu of
 * its own — its one action is that page — so the item lives there). Escape, the ✕ or the backdrop
 * closes it, and focus returns to where it was (`useOverlay`, the shell's overlay primitive).
 *
 * ⚠️ IT LISTS THE REGISTRY AND NOTHING ELSE (`lib/shortcuts.ts`), grouped by scope, keys as keycaps
 * with ⌘ or Ctrl by platform. A row cannot be written here by hand, so the sheet cannot advertise a
 * key the app does not bind — and every registry entry names the file that binds it.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./shortcutsSheet.css";
import { SHORTCUTS, isMac, keycaps, matchesShortcut, shortcutBlocked, shortcutGroups, type Shortcut } from "../../lib/shortcuts";
import { useOverlay } from "./useOverlay";

/** Anything may ask for the sheet — the Help centre's item does. */
export const OPEN_SHORTCUTS_EVENT = "sa:open-shortcuts";

/** A shortcut's keys as the sheet shows them: each chord a run of keycaps, alternatives joined by "or". */
function Keys({ sc, mac }: { sc: Shortcut; mac: boolean }) {
  const chords = sc === SHORTCUTS.taskChoice
    ? [[keycaps(sc.chords[0], mac)[0] + "–" + keycaps(sc.chords[1], mac)[0]]]
    : sc.chords.map((c) => keycaps(c, mac));
  return (
    <span className="sks-keys">
      {chords.map((caps, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sks-or">or</span>}
          {caps.map((cap, j) => <kbd key={j} className="sks-cap">{cap}</kbd>)}
        </React.Fragment>
      ))}
    </span>
  );
}

const Sheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { onEscape: onClose, captureEscape: true, scrimClasses: ["sks-scrim"], onScrimClick: onClose });
  const mac = isMac();
  /* ⚠️ PORTALLED TO document.body: `useOverlay` makes `#root` inert while the sheet is open, so a sheet
     rendered inside the shell would be inert itself. Its palette is therefore declared at `:root`
     (shortcutsSheet.css) — a portal is where a page-scoped token resolves to nothing. */
  return createPortal(
    <div className="sks-scrim" onClick={scrimClick}>
      <div
        className="sks"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sks-title"
        data-shell="shortcuts"
        ref={rootRef}
        tabIndex={-1}
        onKeyDown={trapTab}
      >
        <header className="sks-head">
          <h2 id="sks-title" className="sks-title">Keyboard shortcuts</h2>
          <button type="button" className="sks-x" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </header>
        <div className="sks-body">
          {shortcutGroups().map((g) => (
            <section key={g.scope} className="sks-group" data-scope={g.scope}>
              <h3 className="sks-scope">{g.scope}</h3>
              <ul className="sks-list">
                {g.items.map(({ id, sc }) => (
                  <li key={id} className="sks-row" data-shortcut={id}>
                    <span className="sks-label">{sc.label}</span>
                    <Keys sc={sc} mac={mac} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Mounted once, in the shell. Owns `?` and the open event; the sheet itself mounts only while open. */
export const ShortcutsSheet: React.FC = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || !matchesShortcut(SHORTCUTS.shortcuts, e) || shortcutBlocked(e)) return;
      e.preventDefault();
      setOpen(true);
    };
    const onAsk = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, onAsk);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_SHORTCUTS_EVENT, onAsk); };
  }, [open]);
  return open ? <Sheet onClose={() => setOpen(false)} /> : null;
};
