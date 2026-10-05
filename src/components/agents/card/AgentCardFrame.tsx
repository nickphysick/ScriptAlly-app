/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's frame (Agent card v1 §2): the overlay, the backdrop, the white rim and the
 * burgundy line, and the entrance and exit. What is INSIDE — the quick view's band and body, and
 * (Phase 3) the editor's — is the caller's.
 *
 * ⚠️ THE OVERLAY'S OBLIGATIONS ARE THE SHELL'S, NOT A NEW COPY: `useOverlay` traps focus, seals the
 * page behind it (counted `inert` on #root), locks the stage's scroll and returns focus on close.
 * Its Escape is NOT used — the card's Escape is a layer on the app's one stack, owned by whatever
 * is inside, because only the inside knows what is open within it.
 *
 * ⚠️ THE ENTRANCE IS MEASURED, SO IT RUNS IN A LAYOUT EFFECT: the card grows out of the row's (or
 * button's) box — 260ms, the mock's ease — or, with no box to grow from, lifts from 8px below. The
 * exit shrinks back into the row if the row is on screen, else falls 8px and fades (180ms). Reduced
 * motion: none of it.
 */
import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "../../shell/useOverlay";
import type { AgentCardOrigin } from "../../../lib/agentCardStore";
import "./agentCard.css";

export interface AgentCardFrameHandle {
  /** Play the exit — into `to` when it is on screen, else down and out — and resolve when done. */
  leave: (to: AgentCardOrigin | null) => Promise<void>;
}

interface Props {
  /** the editor's width (780); the quick view is 548 */
  big?: boolean;
  /** the element naming the dialog */
  labelledBy?: string;
  originRect?: AgentCardOrigin | null;
  /** false when the card is already open and only its contents changed (back from the editor) */
  entrance?: boolean;
  /** a click on the backdrop itself */
  onScrim: () => void;
  children: React.ReactNode;
}

const reduced = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const EASE_IN = "cubic-bezier(.22,.8,.3,1)";
const EASE_OUT = "cubic-bezier(.4,0,.8,.4)";
const CENTRE = "translate(-50%,-50%)";

/** The keyframe that puts the card's centre on a box's centre at the box's size. */
const toBox = (card: DOMRect, box: AgentCardOrigin): string => {
  const dx = box.x + box.width / 2 - (card.left + card.width / 2);
  const dy = box.y + box.height / 2 - (card.top + card.height / 2);
  return `${CENTRE} translate(${dx}px,${dy}px) scale(${box.width / card.width},${box.height / card.height})`;
};

export const AgentCardFrame = forwardRef<AgentCardFrameHandle, Props>(function AgentCardFrame(
  { big = false, labelledBy, originRect = null, entrance = true, onScrim, children },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { scrimClasses: ["ac-scrim"], onScrimClick: onScrim });

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!entrance || !el || reduced() || typeof el.animate !== "function") return;
    const card = el.getBoundingClientRect();
    const grow = originRect && originRect.width > 0 && originRect.height > 0 && card.width > 0 && card.height > 0;
    el.animate(
      grow
        ? [{ transform: toBox(card, originRect), opacity: 0.4 }, { transform: CENTRE, opacity: 1 }]
        : [{ transform: "translate(-50%,calc(-50% + 8px))", opacity: 0 }, { transform: CENTRE, opacity: 1 }],
      { duration: 260, easing: EASE_IN },
    );
    /* the contents arrive after the box, so a scaled card never shows squashed text */
    el.querySelector<HTMLElement>(".ac-frame")?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1 }], { duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the entrance plays once, at the open
  }, []);

  useImperativeHandle(ref, () => ({
    leave: (to) => new Promise<void>((resolve) => {
      const el = cardRef.current;
      rootRef.current?.classList.add("is-leaving");
      if (!el || reduced() || typeof el.animate !== "function") { resolve(); return; }
      const card = el.getBoundingClientRect();
      const onScreen = !!to && to.width > 0 && to.height > 0 && to.y + to.height > 0 && to.y < window.innerHeight;
      const a = el.animate(
        onScreen
          ? [{ transform: CENTRE, opacity: 1 }, { transform: toBox(card, to!), opacity: 0 }]
          : [{ transform: CENTRE, opacity: 1 }, { transform: "translate(-50%,calc(-50% + 8px))", opacity: 0 }],
        { duration: 180, easing: EASE_OUT, fill: "forwards" },
      );
      a.onfinish = () => resolve();
      a.oncancel = () => resolve();
    }),
  }), []);

  return createPortal(
    <div className="ac-ov" ref={rootRef} tabIndex={-1} onKeyDown={trapTab} onClick={scrimClick} data-ac="overlay">
      <div className="ac-scrim" data-ac="scrim" />
      <div
        ref={cardRef}
        className={`ac agent-card${big ? " big" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-ac="card"
      >
        <div className="ac-frame">{children}</div>
      </div>
    </div>,
    document.body,
  );
});
