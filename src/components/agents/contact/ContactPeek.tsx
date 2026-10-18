/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §D — THE OPEN ROW: ONE POWDER STRIP under the row's main line, opened after 450ms of hover (or
 * Space on a focused row). It runs from the left edge of the name to the right edge of the Query status column and
 * holds, on one line: the genres as white pills (a genre that fits the current manuscript keeps the fit mark), a 1px
 * divider, then the wishlist in Special Elite inside ink curly quotes — ending in "…" when it overflows, and scrolling
 * to show the rest while the pointer is on it. A missing piece is v14's add link, opening the card at that field.
 *
 * It replaces v18.3.3 §A's details line: the contact details are the row's own columns now (Part C), and the social
 * handle and the next step left the row (they remain in the agent card).
 *
 * ⚠️ AN ADD LINK NEVER OPENS THE CARD AT THE ROW: it stops its own click and keys and opens the card AT ITS FIELD.
 */
import React, { useEffect, useRef } from "react";
import type { Agent } from "../../../types";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
export { copyText, domainOf } from "./ContactCells";

type Edit = (tab: AgentCardTab, focus?: AgentCardField) => void;

/**
 * v14 §6 — THE WISHLIST MARQUEE, moved here with the wishlist. While the pointer is on it, a wishlist that does not
 * fit scrolls to its end and back at ~28px a second after a 0.5s pause. ⚠️ Run by the Web Animations API, never a CSS
 * keyframe reading a custom property: a `var()` inside `@keyframes` fails silently in this setup (house rule). Off
 * under reduced motion. The overflow is measured on hover, so a resize never leaves a stale distance.
 */
export function startMarquee(p: HTMLElement | null): Animation | null {
  if (!p || typeof window === "undefined") return null;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  const sp = p.querySelector<HTMLElement>(".clv-mq");
  if (!sp || typeof sp.animate !== "function") return null;
  const over = sp.scrollWidth - p.clientWidth;
  if (over <= 2) return null;
  const dist = over + 6;
  return sp.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-dist}px)` }], {
    duration: Math.max(3000, (dist / 28) * 1000), delay: 500, iterations: Infinity, direction: "alternate", easing: "linear",
  });
}

/** v14's add link (the dashed slate pill): it opens the card at that field and nothing else */
const AddLink: React.FC<{ probe: string; label: string; onPress: () => void }> = ({ probe, label, onPress }) => (
  <span
    className="clv-miss" role="button" tabIndex={0} data-clv={probe}
    onClick={(e) => { e.stopPropagation(); onPress(); }}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onPress(); } }}
  >
    {label}
  </span>
);

export const ContactPeek: React.FC<{
  agent: Agent;
  /** the agent's genres, the manuscript's own first */
  genres: readonly string[];
  /** a genre that fits the current manuscript (the fit mark) */
  genreHit: (g: string) => boolean;
  onEdit: Edit;
  /** the strip's own box, so the row can move it in and out */
  stripRef?: React.Ref<HTMLDivElement>;
}> = ({ agent: a, genres, genreHit, onEdit, stripRef }) => {
  const wish = (a.mswlNotes ?? "").trim();
  const wishRef = useRef<HTMLParagraphElement>(null);
  const mq = useRef<Animation | null>(null);
  const stop = () => { mq.current?.cancel(); mq.current = null; };
  useEffect(() => stop, []);
  return (
    <div className="cl19-strip" data-cl19="strip" data-cl18="peek" data-cl183="peek" ref={stripRef}>
      <span className="cl19-sg" data-cl19="genres">
        {genres.length > 0
          ? genres.map((g) => <span key={g} className={`cl19-pill${genreHit(g) ? " clv-hit" : ""}`} data-fit={genreHit(g) || undefined}>{g}</span>)
          : <AddLink probe="torn" label="+ Add genres" onPress={() => onEdit("want", "genres")} />}
      </span>
      <i className="cl19-sdiv" aria-hidden="true" />
      {wish ? (
        <p className="cl19-wish" ref={wishRef} data-cl19="wish" title={wish}
          onMouseEnter={() => { stop(); mq.current = startMarquee(wishRef.current); }}
          onMouseLeave={stop}>
          <span className="clv-mq">{wish}</span>
        </p>
      ) : (
        <AddLink probe="torn-wish" label="+ Add their wishlist" onPress={() => onEdit("want", "wishlist")} />
      )}
    </div>
  );
};
