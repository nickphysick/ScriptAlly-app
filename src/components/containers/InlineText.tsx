/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ INLINE TEXT — edit in place, and a placeholder that cannot be saved ═══════════════════════
 *
 * ⚠️ IT IS A REAL `<textarea>`, NOT A `contenteditable`, AND THAT IS THE WHOLE DESIGN. The known
 * trap with a click-to-edit block is that its placeholder is rendered as TEXT CONTENT and therefore
 * gets saved the moment anyone commits without typing. A native `placeholder` attribute is not
 * content: it is never in `value`, never in the DOM's text, and there is no code path by which it
 * can reach `onCommit`. The guarantee is structural rather than a check somebody has to remember.
 *
 * ⚠️ AND IT LOOKS LIKE PROSE UNTIL IT IS TOUCHED. No border, no fill, inherited type — a field that
 * announced itself would make a page of reading matter look like a form. Hover tints it; focus gives
 * it the field appearance. That is styling, not two components.
 *
 * ⚠️ COMMIT ON BLUR, REVERT ON ESCAPE. The same contract `ManuscriptPlate`'s title editor already
 * uses, which is the nearest thing this codebase had to a click-to-edit primitive — embedded in a
 * 450-line component rather than extractable, which is why this exists rather than a second copy of
 * that behaviour appearing beside it.
 *
 * ⚠️ AN EMPTY COMMIT IS `""`, AND THE CALLER DECIDES WHAT THAT MEANS. Clearing the field and blurring
 * commits an empty string; the manuscript writes `deleteField()` for it, so absence stays absence
 * and never becomes a stored empty. The placeholder then returns because there is nothing to show.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./containers.css";

export interface InlineTextProps {
  /** The stored text, or null when nothing has been written. */
  value: string | null;
  /** Shown by the BROWSER when the field is empty. Never content, never committed. */
  placeholder: string;
  /** Fires on blur, with the trimmed text. `""` means the writer cleared it. */
  onCommit: (next: string) => void;
  ariaLabel: string;
  className?: string;
  /** Rows at rest. The field grows to its content either way. */
  rows?: number;
}

export const InlineText: React.FC<InlineTextProps> = ({
  value, placeholder, onCommit, ariaLabel, className, rows = 1,
}) => {
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);

  /* The stored value wins whenever it changes underneath — a manuscript switch, or another
     surface editing the same field. A draft the writer is mid-way through is not disturbed,
     because this only runs when `value` itself moves. */
  useEffect(() => { setDraft(value ?? ""); }, [value]);

  /**
   * ⚠️ HEIGHT IS SET FROM `scrollHeight` AFTER A RESET TO `auto`, and in a LAYOUT effect so the box
   * is never painted at the wrong size. Without the reset the field can only ever grow: `scrollHeight`
   * of an already-tall box is its own height, so deleting a paragraph would leave the hole behind.
   */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  return (
    <textarea
      ref={ref}
      className={`sa-inline${className ? ` ${className}` : ""}`}
      value={draft}
      rows={rows}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft.trim())}
      onKeyDown={(e) => {
        /* Escape reverts to the stored value and gives the field up — the same as the plate's. */
        if (e.key === "Escape") { setDraft(value ?? ""); e.currentTarget.blur(); }
      }}
    />
  );
};
