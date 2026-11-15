/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The load error, as the Your notes page draws it ("We couldn’t load your notes. Try again?"): the same markup, the
 * same `.yn-empty` / `.yn-btn` classes and the same "Try again". Lifted out of YourNotesPage (overnight fixes v1,
 * Part 2) so every page that shows a failed read draws exactly this, with no visuals of its own.
 *
 * The `.yn` wrapper carries the page's ink and navy tokens, and the scope the classes' rules hang on.
 *
 * ⚠️ PURE, AND IMPORTS NO DB: pages that tests render bare import this. The loader's state is `useLoadFailure`.
 */
import React from "react";
import "./yourNotes.css";

export const LoadFailed: React.FC<{ words: string; onRetry: () => void; busy?: boolean; probe?: string }> = ({ words, onRetry, busy, probe }) => (
  <div className="yn" data-load-failed={probe ?? ""}>
    <div className="yn-empty" data-yn="error" role="alert">
      <p>{words}</p>
      <button type="button" className="yn-btn" onClick={onRetry} disabled={busy || undefined}>Try again</button>
    </div>
  </div>
);
