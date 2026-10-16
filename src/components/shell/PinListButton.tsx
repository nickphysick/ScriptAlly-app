/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v138.6 §A — THE PIN BUTTON, one for both list pages (the Query Centre and the Contact list), in the navy list
 * header's top-right. A 44px circle with a 1.5px cream line and a cream pushpin; pinned, cream with a navy pin turned
 * −45°. Its label is drawn below it on hover and on keyboard focus — "Pin the list" or "Unpin", then a key cap
 * reading F — and never as a native `title`.
 *
 * ⚠️ IT OWNS NO STATE. The pin is the shared hook's (`usePinList`, shell/useFullScreenList.ts); this only draws it.
 */
import React from "react";
import "./pinListButton.css";

export const PinListButton: React.FC<{
  pinned: boolean;
  onToggle: () => void;
  /** page hooks for the locks (e.g. `data-qc138="pin"`) */
  attrs?: Record<`data-${string}`, string>;
}> = ({ pinned, onToggle, attrs }) => (
  <button type="button" className="plb" data-pin-list="" {...attrs} aria-pressed={pinned} aria-keyshortcuts="F"
    aria-label={pinned ? "Unpin" : "Pin the list"} onClick={onToggle}>
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3h6l-1 6 4 4v2H6v-2l4-4z" /><path d="M12 15v6" />
    </svg>
    <span className="plb-tip" data-pin-tip="" aria-hidden="true">
      <span className="plb-tl">{pinned ? "Unpin" : "Pin the list"}</span><kbd className="plb-k">F</kbd>
    </span>
  </button>
);
