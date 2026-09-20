/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryPeek — a glance at a query, beside the row that raised it (feed/to-do pass, 20 Sep).
 *
 * ⚠️ A POPOVER, NOT A MODAL AND NOT A SIDE PANEL, AND THE REF ARGUES THE CASE ITSELF. Clicking a feed
 * entry is a glance — "what is this query, where is it up to" — and a glance must not dim the page,
 * move the layout or take the reader out of the list. So: anchored beside the entry, the entry left
 * highlighted behind it, Escape or a click outside to close, one open at a time. Reading three
 * entries costs three clicks and no navigation.
 *
 * ⚠️ IT IS A SECOND RENDERER OF THE PANE'S OWN MODEL, NEVER A SECOND MODEL. The task pane's reference
 * rail already shows this history; both build `TaskPaneEvent[]` through `lib/dockTimeline` and
 * `taskPaneJourney.toEntry`. Two derivations of one history is how two surfaces come to disagree
 * about what happened to a query — invisibly, because each would be internally consistent.
 *
 * ⚠️ AND IT IS PURE. Reading the subcollection is `QueryPeekLive`'s job; nothing here touches
 * Firebase, which is what keeps it out of eleven dashboard suites' import graph.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { StatusDot } from "../StatusDot";
import { useFixedMenu } from "../forms/useFixedMenu";
import type { QueryStatus } from "../../types";
import type { TaskPaneEvent } from "../todo/TaskPane";
import "./queryPeek.css";

/** The ref's own width. Stated here because `useFixedMenu`'s side placement has to flip on it. */
export const PEEK_W = 400;

export interface QueryPeekModel {
  /** the query's own status, for the glyph — null only where the record has none */
  status: QueryStatus | null;
  /** its words, through `getStatusLabel` — never mapped again here */
  statusWord: string;
  agent: { name: string; agency?: string; initials: string; onOpen?: () => void };
  /**
   * The two-column fact strip.
   *
   * ⚠️ TWO CELLS, ALWAYS, AND AN ABSENT FACT STATES ITS ABSENCE. A cell that disappears leaves a
   * half-empty strip saying nothing; "None sent" says the app looked and there was nothing.
   */
  facts: { k: string; v: string }[];
  /** "the story so far", ending in its own terminus — see `taskPaneJourney.withTerminus` */
  events: TaskPaneEvent[];
  onOpenQuery: () => void;
  /** the next thing to do, where there is one. Absent on a closed query, which has none. */
  primary?: { label: string; onPress: () => void };
}

export const QueryPeek: React.FC<{
  model: QueryPeekModel;
  /** the row the peek belongs to — it stays highlighted, and the peek is placed against it */
  anchor: HTMLElement;
  onClose: () => void;
}> = ({ model, anchor, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  /* ⚠️ `anchorEl`, NOT THE HOOK'S OWN `triggerRef`. The trigger here is somebody else's element —
     the feed row — and assigning the ref in an effect points it AFTER the hook's layout effect has
     already run and returned early. See the option's own note; the symptom was a 400px popover
     laid out at full viewport width, below the fold, with every declaration correct. */
  const { menuStyle } = useFixedMenu<HTMLElement>(true, {
    placement: "side", menuRef: ref, width: PEEK_W, constrain: true, anchorEl: anchor,
  });

  /**
   * ⚠️ `pointerdown`, NOT `click`, AND THE ANCHOR COUNTS AS INSIDE. On `click` the row that opened
   * the peek would close it again in the same gesture; and a pointerdown that starts inside and ends
   * outside (a drag over the text) is not a dismissal.
   */
  useEffect(() => {
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

  /* ⚠️ PORTALLED TO THE BODY. The feed card is a scroller with `overflow: auto` and a radius; a
     popover rendered inside it would be clipped by its own column, which is the thing a popover
     exists to escape. */
  return createPortal(
    <div className="qpk" style={menuStyle} ref={ref} role="dialog" aria-label={`${model.statusWord} — ${model.agent.name}`}>
      <div className="qpk-mount"><div className="qpk-frame">
        <div className="qpk-top">
          <span className="st">
            {/* the real glyph: a query status is only ever drawn by `StatusDot`, and the words beside
                it say the same thing, so the mark itself is decorative */}
            {model.status && <StatusDot status={model.status} overrideSize={18} decorative />}
            <b>{model.statusWord}</b>
          </span>
          <button type="button" className="x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <button type="button" className="qpk-agent" onClick={model.agent.onOpen} disabled={!model.agent.onOpen}>
          <span className="av" aria-hidden="true">{model.agent.initials}</span>
          <span className="qpk-who">
            <b>{model.agent.name}</b>
            {model.agent.agency && <span>{model.agent.agency}</span>}
          </span>
          {model.agent.onOpen && <span className="arw" aria-hidden="true">→</span>}
        </button>

        <div className="qpk-facts">
          {model.facts.map((f) => (
            <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>
          ))}
        </div>

        <div className="qpk-tl">
          <p className="t">The story so far</p>
          {model.events.map((e) => (
            <div className={`ev${e.kind === "now" ? " now" : ""}`} key={e.key}>
              <span className="dot">
                {e.kind === "status"
                  ? <StatusDot status={e.status} overrideSize={10} decorative />
                  : <i aria-hidden="true" />}
              </span>
              <b>{e.t}</b>
              <span>{e.d}</span>
            </div>
          ))}
        </div>

        <div className="qpk-foot">
          <button type="button" onClick={model.onOpenQuery}>Open the full query →</button>
          {model.primary && (
            <button type="button" className="b" onClick={model.primary.onPress}>{model.primary.label}</button>
          )}
        </div>
      </div></div>
    </div>,
    document.body,
  );
};
