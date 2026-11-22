/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SPOTLIGHT'S PAGE-DRIVEN CARD — the dim with a live hole over a target, and a step card beside it.
 *
 * Lifted out of `PageChecklist` (Dashboard first visit v2, Part D) so the dashboard's first-visit tour uses THE SAME
 * spotlight rather than a second overlay. `PageChecklist` renders its Query Centre walkthrough cards through this, and
 * the tour renders its three stops through it. The geometry is `lib/pageChecklist` (`holeFor`, `dimPath`, `cardPlace`),
 * the look is `pageChecklist.css`.
 *
 * ⚠️ PLACED ONLY ONCE ITS TARGET HAS STOPPED MOVING. A panel slides in over ~300ms; a card placed on the first frame
 *    lands on top of the moving panel (Query Centre v139's own fix). The target's box is read every frame, and the card
 *    waits until two frames agree; after that it follows the target only when `follow` is set.
 * ⚠️ THE HOLE IS A CLIP PATH ON THE DIM (even-odd), so hit-testing passes through it to the target.
 * ⚠️ ESCAPE IS THE OWNER'S (`onEscape`), read in the capture phase so nothing underneath sees it.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { cardPlace, dimPath, holeFor } from "../../../lib/pageChecklist";

const boxOf = (el: Element) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };

export interface SpotSpec {
  /** changes whenever the card does, so it is placed afresh */
  id: string;
  target: () => HTMLElement | null;
  /** "left": beside the target, to its left; otherwise below, or above near the window's foot */
  place?: "auto" | "left";
  /** the hole and the card move with the target every frame it moves */
  follow?: boolean;
  /** presses outside the hole reach the page */
  passThrough?: boolean;
  onEscape: () => void;
}

export const SpotCard: React.FC<{
  spec: SpotSpec;
  kicker: React.ReactNode;
  title: React.ReactNode;
  body: React.ReactNode;
  /** the card's foot: its buttons */
  foot: React.ReactNode;
  /** called with the card's element once it is placed (a tour moves focus to its Next) */
  onPlaced?: (card: HTMLDivElement) => void;
  /** extra attributes on the outer layer (`data-*` probes) */
  attrs?: Record<string, string>;
}> = ({ spec, kicker, title, body, foot, onPlaced, attrs }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [geo, setGeo] = useState<{ path: string; hole: { left: number; top: number; width: number; height: number; r: number } } | null>(null);
  const [card, setCard] = useState<{ left: number; top: number; up: boolean; side: boolean } | null>(null);
  const specRef = useRef(spec);
  specRef.current = spec;

  const placeCard = (hole: { left: number; top: number; width: number; height: number }) => {
    const c = cardRef.current;
    const cw = c?.offsetWidth ?? 320; const ch = c?.offsetHeight ?? 160;
    if (specRef.current.place === "left") {
      setCard({ left: Math.max(12, hole.left - 14 - cw), top: Math.max(12, Math.min(hole.top + 40, window.innerHeight - 12 - ch)), up: false, side: true });
    } else {
      setCard({ ...cardPlace(hole, { width: cw, height: ch }, window.innerWidth, window.innerHeight), side: false });
    }
  };

  useLayoutEffect(() => {
    setGeo(null); setCard(null);
    let raf = 0; let last = ""; let still = 0; let shownOnce = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = specRef.current.target();
      const b = el ? boxOf(el) : null;
      if (!b || b.width === 0) { last = ""; still = 0; return; }
      const sig = `${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.width)},${Math.round(b.height)},${window.innerWidth},${window.innerHeight}`;
      if (sig === last) still += 1; else { still = 0; last = sig; if (shownOnce && !specRef.current.follow) return; }
      if (!shownOnce && still < 2) return;
      if (shownOnce && still !== 0) return;
      shownOnce = true;
      const hole = holeFor(b);
      setGeo({ path: dimPath(window.innerWidth, window.innerHeight, hole), hole });
      placeCard(hole);
    };
    raf = requestAnimationFrame(tick);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); e.preventDefault(); specRef.current.onEscape();
    };
    window.addEventListener("keydown", key, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", key, true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.id]);

  /* the card's size is known after its first paint: placed once more then */
  useLayoutEffect(() => {
    if (!geo || !cardRef.current) return;
    placeCard(geo.hole);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.id, geo?.path]);

  const placed = !!card;
  useLayoutEffect(() => {
    if (placed && cardRef.current) onPlaced?.(cardRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, spec.id]);

  return (
    <div className={`pck-spot${spec.passThrough ? " pck-thru" : ""}`} data-pck="flow" data-flow={spec.id} {...(attrs ?? {})}>
      <div className="pck-dim" data-pck="dim" style={geo ? { clipPath: `path(evenodd, "${geo.path}")` } : { opacity: 0 }}
        data-hole={geo ? JSON.stringify(geo.hole) : undefined} />
      <div ref={cardRef} className={`pck-card${card?.up ? " up" : ""}${card?.side ? " side" : ""}`} role="status" data-pck="card" data-flow-card={spec.id}
        style={card ? { left: card.left, top: card.top } : { visibility: "hidden", left: 0, top: 0 }}>
        <span className="pck-ck">{kicker}</span>
        <b>{title}</b>
        <span className="pck-ci">{body}</span>
        <span className="pck-cf">{foot}</span>
      </div>
    </div>
  );
};
