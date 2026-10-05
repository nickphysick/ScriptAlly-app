/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PARKED CHIP (Agent card v1 §6.3–§6.5; the Journey map's Continuity table). A journey put away
 * with answers waits here, bottom-right, on every page, until it is finished or discarded:
 * "Send the full · Jonathan Marsh · step 2 of 5 · nothing lost", with Resume and ✕.
 *
 * Three faces, one element:
 *   · RESTING — the title, the line, Resume, ✕.
 *   · ✕ ASKS — "Discard send the full for Jonathan Marsh? Nothing has been saved yet · Keep it ·
 *     Discard" (the mock's words). Discard drops it; nothing was saved, so nothing is undone.
 *   · THE CLASH — a door asked for another journey while this one is parked: "Send the full for
 *     Jonathan Marsh is half done. Finish it first, or put it away and start recording a response
 *     for Ana Reyes." · Finish it · Discard and start. The chip nudges sideways once. Never a silent
 *     replace (Continuity: "One journey at a time").
 *
 * ⚠️ IT SITS ABOVE AN OPEN AGENT CARD (z 69 against the card's 63–68) — the clash is asked in answer
 * to a button ON the card, so a chip under the card's backdrop could not be answered. Below the
 * drawer (70), which is never open while a journey is parked.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import {
  discardAndStart, discardParked, keepParked, resumeQueryDrawer, type OpenRequest, type ParkedJourney,
} from "../../lib/queryActions/drawerStore";
import { clashAsk, discardAsk, parkedLine } from "../../lib/queryActions/parking";

const reduced = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function ParkedChip({ parked, clash, next }: {
  parked: ParkedJourney;
  clash: OpenRequest | null;
  /** what the clashing door would start, and for whom — the host resolves the names */
  next: { doing: string; name: string } | null;
}) {
  const [asking, setAsking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* the chip arrives as the drawer shrinks into it (the mock's 340ms, faded in over its second half) */
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || typeof el.animate !== "function") return;
    el.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 0, offset: 0.5 }, { opacity: 1, transform: "none" }],
      { duration: parked.live ? 340 : 240 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the chip appears
  }, []);

  /* the clash nudges it sideways once */
  useEffect(() => {
    const el = ref.current;
    if (!clash || !el || reduced() || typeof el.animate !== "function") return;
    setAsking(false);
    el.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 240 });
  }, [clash]);

  /* an open question takes Escape first, and Escape keeps the parked journey as it was */
  useEscapeLayer(asking || !!clash, () => { if (clash) keepParked(); else setAsking(false); }, ESC_LEVEL.drawer);

  let body: React.ReactNode;
  if (clash && next) {
    const c = clashAsk(parked, next);
    body = (
      <>
        <span className="pk-tx"><b>{c.head}</b><small>{c.sub}</small></span>
        <button type="button" className="pk-btn gh" data-qad-park="finish" onClick={() => resumeQueryDrawer()}>Finish it</button>
        <button type="button" className="pk-btn danger" data-qad-park="swap" onClick={() => discardAndStart()}>Discard and start</button>
      </>
    );
  } else if (asking) {
    body = (
      <>
        <span className="pk-tx"><b>{discardAsk(parked)}</b><small>Nothing has been saved yet.</small></span>
        <button type="button" className="pk-btn gh" data-qad-park="keep" onClick={() => setAsking(false)}>Keep it</button>
        <button type="button" className="pk-btn danger" data-qad-park="drop" onClick={() => discardParked()}>Discard</button>
      </>
    );
  } else {
    body = (
      <>
        {/* drawn, as the card's own pen is — a typed ✎ is a request to a font (the house glyph rule) */}
        <span className="pk-ic" aria-hidden="true">
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M9.5 2l2.5 2.5L5 11.5 2 12l.5-3z" /></svg>
        </span>
        <span className="pk-tx"><b>{parked.title}</b><small>{parkedLine(parked)}</small></span>
        <button type="button" className="pk-btn" data-qad-park="resume" onClick={() => resumeQueryDrawer()}>Resume</button>
        <button type="button" className="pk-x" data-qad-park="x" aria-label="Discard" onClick={() => setAsking(true)}>✕</button>
      </>
    );
  }

  return createPortal(
    <div ref={ref} className={`qad-park${asking || clash ? " ask" : ""}`} role="status" data-qad-park-chip>
      {body}
    </div>,
    document.body,
  );
}
