/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28.1 — the logline's CLOSING quote mark, the rust ” that mirrors the opening “ (a `::before` on the line).
 *
 * ⚠️ THE LAST WORD AND THE MARK ARE ONE NO-WRAP SPAN, so the mark always sits on the last line of the text and never
 *    wraps onto a line of its own. The mark is decoration (`aria-hidden`): the logline reads the same without it.
 *    Used by the page's logline strip and the book view's right-hand page; never in the empty state.
 */
import React from "react";

/** The text split for typesetting: everything before the last word, and the last word (the copy is unchanged). */
export const splitLastWord = (text: string): { head: string; last: string } => {
  const t = text.trim();
  const i = t.search(/\S+$/);
  return i <= 0 ? { head: "", last: t } : { head: t.slice(0, i), last: t.slice(i) };
};

export const QuotedLine: React.FC<{ text: string }> = ({ text }) => {
  const { head, last } = splitLastWord(text);
  return (
    <>
      {head}
      <span className="ms28-qend" data-ms28="qend">{last}<span className="ms28-cq" aria-hidden="true" data-ms28="close-quote">{"”"}</span></span>
    </>
  );
};
