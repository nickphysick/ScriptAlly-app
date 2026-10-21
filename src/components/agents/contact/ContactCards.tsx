/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v20 §B — THE CARDS VIEW: the same list, drawn as paper cards in a grid (design-refs/contact-list-v20/,
 * screens 02–04 and 10). It replaces the rows inside the same list card, under the same toolbar, applied row and sticky
 * stack; there are no column headings.
 *
 *   - ONE LIST: the cards are exactly the rows the list would show, in the same order, under the same groups (the page
 *     hands both views the one `groups` array). Every list control works the same here.
 *   - THE GRID: as many 340px cards across as fit with 22px between, never more than three (`cardColumns`), measured
 *     from the grid's own content width before paint and on every resize.
 *   - THE CARD: `AgentPaperCard` framed, exactly as built. The whole card is a button (a div with role=button, because it
 *     holds real links and "+ Add" buttons): a click, Enter or Space opens the agent panel as the row does; a link or a
 *     "+ Add" inside answers its own click and does not open the panel.
 *   - THE ARRIVAL (v19 §H, applied to cards): every list change lands the same way — the cards ON SCREEN arrive top-down,
 *     24ms apart, the stagger capped at the 18th; a group heading fades only. Nothing holds a style once it ends.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { AgentPaperCard, type PaperAddKey } from "../../shared/AgentPaperCard";
import type { AgentFacts, ContactGroup, GroupKey } from "../../../lib/contactList";
import { surnameInitial } from "../../../lib/contactList";
import { cardColumns, paperDataOf } from "../../../lib/contactCards";
import type { PersonalGenre } from "../../../lib/genres";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { ContactCardsHeading } from "./ContactGroupHeading";
import "./contactV20.css";

const ADD_TARGET: Record<PaperAddKey, { tab: AgentCardTab; focus: AgentCardField }> = {
  website: { tab: "who", focus: "website" }, email: { tab: "who", focus: "email" },
  genres: { tab: "want", focus: "genres" }, wishlist: { tab: "want", focus: "wishlist" }, materials: { tab: "want", focus: "materials" },
};

const Card: React.FC<{
  x: AgentFacts; genreHit: (g: string) => boolean; personalGenres: PersonalGenre[];
  current: boolean; focused: boolean;
  onOpen: (r: DOMRect) => void; onEdit: (tab: AgentCardTab, focus?: AgentCardField) => void;
}> = ({ x, genreHit, personalGenres, current, focused, onOpen, onEdit }) => {
  const data = paperDataOf(x, genreHit, personalGenres);
  return (
    <div role="button" tabIndex={0} className={`cl20-card${focused ? " kf" : ""}`} data-clv="card" data-agent-card={x.agent.id}
      data-initial={surnameInitial(x.agent)} data-stand={x.stand} aria-current={current || undefined}
      aria-label={`${data.name}${data.agency ? `, ${data.agency}` : ""}. ${data.statusLabel}`}
      onClick={(e) => {
        /* a link or a "+ Add" inside the card answers its own click */
        if ((e.target as HTMLElement).closest("a, button")) return;
        onOpen(e.currentTarget.getBoundingClientRect());
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(e.currentTarget.getBoundingClientRect()); }
      }}>
      {/* v20 §F — a card whose next step is the writer's (`stand === "you"`, the band's own "your move") wears the pink band */}
      <AgentPaperCard variant="framed" data={data} tone={x.stand === "you" ? "pink" : undefined}
        onAdd={(k) => { const t = ADD_TARGET[k]; onEdit(t.tab, t.focus); }} />
    </div>
  );
};

/** the grid of one group's (or the whole list's) cards; its column count is measured from its own content width */
const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      if (w > 0) setCols(cardColumns(w));
    };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="cl20-grid" data-cl20="grid" ref={ref} data-cols={cols || undefined}
      style={cols ? ({ "--cols": cols } as React.CSSProperties) : undefined}>{children}</div>
  );
};

export const ContactCards: React.FC<{
  groups: ContactGroup[];
  byId: Map<string, AgentFacts>;
  groupKey: GroupKey;
  genreHit: (g: string) => boolean;
  personalGenres: PersonalGenre[];
  openId: string | null;
  focusId?: string | null;
  onOpen: (agentId: string, from?: DOMRect) => void;
  onEdit: (agentId: string, tab: AgentCardTab, focus?: AgentCardField) => void;
  /** v19 §H — a new key plays the arrival; `before` runs first (the page puts a remembered scroll back there) */
  arrival?: { key: string; before?: () => void };
}> = ({ groups, byId, groupKey, genreHit, personalGenres, openId, focusId = null, onOpen, onEdit, arrival }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardsOf = (g: ContactGroup) => g.ids.map((id) => {
    const x = byId.get(id);
    if (!x) return null;
    return (
      <Card key={id} x={x} genreHit={genreHit} personalGenres={personalGenres} current={openId === id} focused={focusId === id}
        onOpen={(r) => onOpen(id, r)} onEdit={(tab, focus) => onEdit(id, tab, focus)} />
    );
  });

  /* ── the arrival: built before the first paint, the cards on screen arriving top-down ── */
  const arriving = useRef(new WeakMap<Element, Animation>());
  const arrivedKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!arrival || arrivedKey.current === arrival.key) return;
    arrivedKey.current = arrival.key;
    arrival.before?.();
    const root = rootRef.current;
    if (!root || typeof root.animate !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const sc = root.closest<HTMLElement>(".wpg-scroll");
    const view = sc ? sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    let i = 0;
    for (const el of root.querySelectorAll<HTMLElement>('[data-clv="card"], [data-clv="band"]')) {
      const b = el.getBoundingClientRect();
      if (b.height === 0 || b.bottom <= view.top || b.top >= view.bottom) continue;
      const band = el.dataset.clv === "band";
      const delay = Math.min(i, 17) * 24;
      i += 1;
      const was = arriving.current.get(el);
      if (was && was.playState === "running") continue;
      arriving.current.set(el, band
        ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay, easing: "ease", fill: "backwards" })
        : el.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }],
          { duration: 300, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
    }
  });

  const ungrouped = groupKey === "none";
  return (
    <div className="cl20-cards" data-cl20="cards" ref={rootRef}>
      {ungrouped ? (
        <Grid>{groups.flatMap((g) => cardsOf(g))}</Grid>
      ) : groups.map((g) => (
        <section className="cl20-gsec" key={g.key ?? g.label} data-cl19="group-section" data-gkey={g.key ?? g.label}>
          <ContactCardsHeading groupKey={groupKey} g={g} />
          <Grid>{cardsOf(g)}</Grid>
        </section>
      ))}
    </div>
  );
};

/** the Cards view's empty result (the list keeps its own dead end) */
export const ContactCardsEmpty: React.FC = () => (
  <p className="cl20-none" data-cl20="cards-none" role="status">No agents match. Clear a filter to see more.</p>
);
