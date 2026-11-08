/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v30: "How it works." — ONE component, two hosts: the empty page's container under the navy
 * panel, and the pop-up "How comp tracking works" opens from the populated header. The words are the ref's, word for
 * word (design-refs/comps-v30/, `how()`); the three drawings are the landing page's own, as v27's were.
 *
 * Replaces comps v27's `CompsSteps` and `CompsHowDialog` (retired with v30).
 *
 * ⚠️ THE POP-UP IS PORTALLED (`.cp30-layer`), on the escape stack at `pageModal`; focus goes to ✕ as it opens and
 *    back to its opener as it closes. The scrim closes on `click`, never `pointerdown` (v27's finding).
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { openerOf, refocus } from "../comps28/refocus";
import { Close30 } from "./marks30";

export const HOW_HEADING = "How it works.";
export const HOW_FOOT = "Two or three comps in a letter is usual. Keep more on your shelf to choose from.";
export const HOW_STEPS30 = [
  { art: "/images/get-good-stories-told.png", v: "8baf6c8a", w: 482, h: 440,
    head: "Add titles to your shelf that are comparable to your manuscript",
    line: "Books, films and shows like yours, each with a line on why it fits." },
  { art: "/images/let-writers-write.png", v: "d481eb31", w: 347, h: 440,
    head: "Record which query letter references which titles",
    line: "Log the comps each letter names. Once a letter has gone out, that record is fixed." },
  { art: "/images/make-querying-simple.png", v: "be581a5e", w: 456, h: 440,
    head: "Track their success and shape your strategy",
    line: "See which comps went out with the queries that got agents asking for more." },
] as const;

export const CompsHow30: React.FC<{ headingId: string; children?: React.ReactNode }> = ({ headingId, children }) => (
  <section className="cp30-how" data-cp="how-steps" aria-labelledby={headingId}>
    {children}
    <h2 className="cp30-howh" id={headingId}>{HOW_HEADING}</h2>
    <ol className="cp30-steps">
      {HOW_STEPS30.map((s, i) => (
        <li key={s.art} className="cp30-stp" data-cp="how-step">
          <img src={`${s.art}?v=${s.v}`} width={s.w} height={s.h} alt="" />
          <span className="cp30-n" aria-hidden="true">{i + 1}</span>
          <h3 className="cp30-stph">{s.head}</h3>
          <p>{s.line}</p>
        </li>
      ))}
    </ol>
    <p className="cp30-foot" data-cp="how-foot">{HOW_FOOT}</p>
  </section>
);

export const CompsHowPop30: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const opener = openerOf();
    closeRef.current?.focus();
    return () => refocus(opener);
  }, [open]);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageModal);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="cp30-layer cp30-popdim" data-cp="how-dim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cp30-pop" role="dialog" aria-modal="true" aria-label="How comp tracking works" data-cp="how-pop">
        <CompsHow30 headingId="cp30-how-pop-h">
          <Close30 ref={closeRef} data-cp="how-close" onClick={onClose} />
        </CompsHow30>
      </div>
    </div>,
    document.body,
  );
};
