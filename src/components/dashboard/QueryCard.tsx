/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryCard — the app's one query card, anchored beside whatever raised it (to-do row round,
 * 20 Sep; ref `todo-row-v2.html`'s `.qc`).
 *
 * ⚠️ IT IS THE ONLY ONE, AND THAT IS THE DECISION RATHER THAN THE STYLING (Nick, 20 Sep). It
 * replaces `QueryPeek`, which drew the same query in a different chrome for the feed a day earlier:
 * two cards three inches apart, same data, and the whole argument for either was that a query looks
 * like a query wherever it appears. The feed's rows and the to-do rows open THIS.
 *
 * ⚠️ AND THERE IS NO LANDING-PAGE COMPONENT TO IMPORT — checked rather than assumed. Nothing in
 * `src/marketing/` draws a query card; it exists only in design refs. So this is the canonical one,
 * and if the public pages ever want it they take this rather than the other way round.
 *
 * ⚠️ A POPOVER, NOT A MODAL AND NOT A SIDE PANEL. Opening it is a glance — "what is this, where is
 * it up to" — so it must not dim the page, move the layout or take the reader out of the list.
 * Anchored beside the row, the row left lit behind it, Escape or a click outside to close, one at a
 * time. Reading three rows costs three clicks and no navigation.
 *
 * ⚠️ IT IS PURE. Reading the subcollection is `QueryCardLive`'s job; nothing here touches Firebase,
 * which is what keeps it out of eleven dashboard suites' import graph.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StatusDot } from "../StatusDot";
import { useFixedMenu } from "../forms/useFixedMenu";
import type { QueryStatus } from "../../types";
import type { TaskPaneEvent } from "../todo/TaskPane";
import "./queryCard.css";

/** the ref's own width */
export const CARD_W = 440;

export type QueryCardTab = "tracking" | "agent" | "materials";
export const CARD_TABS: { key: QueryCardTab; label: string }[] = [
  { key: "tracking", label: "Tracking" },
  { key: "agent", label: "Agent" },
  { key: "materials", label: "Materials" },
];

export interface QueryCardModel {
  /**
   * Whose court, in the band — and `Day n` beside it.
   *
   * ⚠️ THE BAND'S FILL IS THE COURT, NOT THE STATUS, and it is the same three fills the to-do row's
   * left band uses. So a row and the card it opens agree about whose move it is because they read
   * one derivation, not because two were matched by hand.
   */
  court: { label: string; band: "rose" | "sand" | "stone" };
  day: string | null;
  agent: { name: string; agency?: string; initials: string; onOpen?: () => void };
  status: QueryStatus | null;
  statusWord: string;
  /** the manuscript block — absent where the query names none */
  ms: { title: string; tags: string[] } | null;
  /** "the story so far", ending in its own terminus where the ball is with the writer */
  events: TaskPaneEvent[];
  /** the Agent tab: what this app knows about them, as stated facts */
  agentFacts: { k: string; v: string }[];
  /** the Materials tab: what went, and what was asked for */
  materials: { k: string; v: string }[];
  /** the foot's left line — the window, and whose figure it is */
  window: string;
  /**
   * The foot's button.
   *
   * ⚠️ THE LABEL IS THE MODEL'S BECAUSE THE FAN'S IS CONTEXTUAL (v21 §5) — "Record a response",
   * "Mark full sent" — where the popover's is always "Open the full query". Defaulting keeps every
   * existing caller's words exactly as they were.
   */
  actionLabel?: string;
  onOpenQuery: () => void;
}

/**
 * ⚠️ THE ONE SEAM: IS THIS A POPOVER, OR IS IT PLACED BY ITS HOST? (v21 §5, 21 Sep.)
 *
 * With an `anchor` it is what it has always been — portalled to the body, positioned against the
 * row that raised it, dismissing itself on Escape or a pointerdown outside. Without one it renders
 * IN PLACE and installs nothing: the Query Centre's fan deals twelve of these inside a modal, and
 * twelve popovers would be twelve competing Escape handlers, each closing a card when the reader
 * meant to close the fan.
 *
 * ⚠️ IT IS ONE CONCEPT RATHER THAN FIVE FLAGS, WHICH IS WHY IT IS AN EXTENSION AND NOT A FORK. A
 * card that is not a popover does not position itself and does not dismiss itself — those are the
 * same fact. Everything else the fan wants of it (260px instead of 440, no tab row, a tighter
 * foot) follows its HOST through a descendant selector, which is the treatment this repo already
 * settled on for the To-do reference card: *"a prop would have forked the component"*.
 *
 * Every existing caller passes an anchor and is byte-identical.
 */
export const QueryCard: React.FC<{
  model: QueryCardModel;
  /** the row the card belongs to — it stays lit, and the card is placed against it */
  anchor?: HTMLElement;
  onClose?: () => void;
}> = ({ model, anchor, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<QueryCardTab>("tracking");

  /* ⚠️ `anchorEl`, NOT THE HOOK'S OWN `triggerRef`. The trigger is somebody else's element, and
     assigning a ref in an effect points it AFTER the hook's layout effect has already run and
     returned early — measured once as a 400px popover at x 0, y 900, full viewport width. */
  const { menuStyle } = useFixedMenu<HTMLElement>(!!anchor, {
    placement: "side", menuRef: ref, width: CARD_W, constrain: true, anchorEl: anchor,
  });

  /**
   * ⚠️ `pointerdown`, NOT `click`, AND THE ANCHOR COUNTS AS INSIDE. On `click` the control that
   * opened the card would close it again in the same gesture; and a pointerdown that starts inside
   * and ends outside (a drag over the text) is not a dismissal.
   */
  useEffect(() => {
    /* placed by a host rather than anchored: it is not a popover, so it dismisses nothing */
    if (!anchor || !onClose) return undefined;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", key, true);
    };
  }, [anchor, onClose]);

  const rows = tab === "agent" ? model.agentFacts : tab === "materials" ? model.materials : null;

  /* ⚠️ PORTALLED TO THE BODY. Both surfaces that open this sit in a scroller with a radius; a
     popover rendered inside one would be clipped by its own column, which is what a popover is for
     escaping. */
  const card = (
    <div className="qcard" style={anchor ? menuStyle : undefined} ref={ref} role={anchor ? "dialog" : "group"}
      aria-label={`${model.statusWord} — ${model.agent.name}`}>

      <div className={`qcard-band qcard-band--${model.court.band}`}>
        <span>{model.court.label}</span>
        {model.day && <span>{model.day}</span>}
      </div>

      <div className="qcard-who">
        <span className="qcard-av" aria-hidden="true">{model.agent.initials}</span>
        <span className="qcard-name">
          <b>{model.agent.name}</b>
          {model.agent.agency && <small>{model.agent.agency}</small>}
        </span>
        <span className="qcard-st">
          {/* the app's ONE drawing of a query status; the words beside it say the same thing */}
          {model.status && <StatusDot status={model.status} overrideSize={12} decorative />}
          {model.statusWord}
        </span>
      </div>

      {model.ms && (
        <div className="qcard-ms">
          <p className="qcard-k">Querying</p>
          <b>{model.ms.title}</b>
          {model.ms.tags.length > 0 && (
            <div className="qcard-tags">{model.ms.tags.map((t) => <span key={t}>{t}</span>)}</div>
          )}
        </div>
      )}

      {/* ⚠️ LIVE, NOT DECORATION. A tab row that does not switch teaches a reader the card holds
          more than it will show them, which is worse than one tab and no row at all. */}
      <div className="qcard-tabs" role="tablist">
        {CARD_TABS.map((t) => (
          <button type="button" key={t.key} role="tab" aria-selected={tab === t.key}
            className={tab === t.key ? "on" : undefined}
            data-probe={`qcard-tab-${t.key}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {rows ? (
        <div className="qcard-facts" role="tabpanel">
          {rows.length === 0
            ? <p className="qcard-none">Nothing recorded.</p>
            : rows.map((f) => (
              <div className="qcard-fact" key={f.k}><span className="qcard-k">{f.k}</span><span>{f.v}</span></div>
            ))}
        </div>
      ) : (
        <div className="qcard-tl" role="tabpanel">
          {model.events.map((e) => (
            <div className={`qcard-ev${e.kind === "now" ? " qcard-ev--now" : ""}`} key={e.key}>
              <span className="qcard-g">
                {e.kind === "status"
                  ? <StatusDot status={e.status} overrideSize={16} decorative />
                  : <i aria-hidden="true" />}
              </span>
              <span><b>{e.t}</b></span>
              <span className="qcard-d">{e.d}</span>
            </div>
          ))}
          {model.events.length === 0 && <p className="qcard-none">Nothing logged yet.</p>}
        </div>
      )}

      <div className="qcard-foot">
        <span className="qcard-exp">{model.window}</span>
        <button type="button" onClick={model.onOpenQuery}>{model.actionLabel ?? "Open the full query"}</button>
      </div>
    </div>
  );
  return anchor ? createPortal(card, document.body) : card;
};
