/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * STAGE 1 — the agent picker (ref design-refs/63-qc-create-stepper.html, step 1).
 *
 * ⚠️ NO POPUP, AND THEREFORE NO OPEN/CLOSE STATE AT ALL. `AgentSearchField` is a combobox whose
 * listbox opens on focus; stage 1 autofocuses, so the pane arrived with an expanded, empty overlay
 * hanging beneath the field. The grid replaces that overlay rather than sitting beside it: the
 * results are always on screen, the field filters them in place, and there is no state in which a
 * writer has to make results appear.
 *
 * ⚠️ THE ARIA MOVED WITH THE BEHAVIOUR. The field keeps `role="combobox"` because it still controls
 * a list, but it points at THIS grid — `aria-controls`, `aria-activedescendant`, and
 * `aria-expanded="true"` because the list is genuinely always expanded. Leaving the old roles
 * pointing at a popup that no longer renders would describe a component that does not exist.
 *
 * The inline quick-add is NOT rebuilt here. `AgentSearchField` owns it, and it is a form with its
 * own validation and write path; a second copy would fork it. The helper beside the field hands
 * over to the same flow through `onAddAgent`.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Agent, Query } from "../../types";
import { agentInitials, agentPrimary, agentAgencyLine } from "../../lib/agentDisplay";
import { SubmissionStatus } from "../../types";
import { ArtSlot } from "../todo/ArtSlot";
import {
  pickerState, pickerCards, queriedCount, replyLine, moveInGrid,
  dropdownResults, queryHistoryLabel,
} from "../../lib/agentPicker";

export interface AgentPickerProps {
  agents: Agent[];
  queries: Query[];
  /** Named in the heading, so the count is scoped to the book being queried. */
  manuscriptTitle?: string;
  onSelect: (a: Agent) => void;
  /** Hands over to AgentSearchField's quick-add — never a second copy of that form. */
  onAddAgent: () => void;
  /** Omitted rather than rendered dead when the host cannot navigate. */
  onSeeAll?: () => void;
  onDiscover?: () => void;
}

const GRID_ID = "qc-agent-grid";
const LIST_ID = "qc-agent-list";

export const AgentPicker: React.FC<AgentPickerProps> = ({
  agents, queries, manuscriptTitle, onSelect, onAddAgent, onSeeAll, onDiscover,
}) => {
  const [query, setQuery] = useState("");
  const [hl, setHl] = useState(-1);
  /* ⚠️ THE DROPDOWN OPENS ON THE FIRST KEYSTROKE — never on mount, never on focus. `dismissed` is
     what lets Esc and an outside click close it while the text stays in the field: without it,
     "open" would be a pure function of the query and the writer could not put it away. */
  const [dismissed, setDismissed] = useState(false);
  const [dhl, setDhl] = useState(-1);
  const fieldRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const state = pickerState(agents, queries);
  /* ⚠️ THE GRID IS COMPUTED WITHOUT THE QUERY. It is a standing set of suggestions, not a result
     set — filtering it as you type made the page reshuffle under the writer mid-keystroke. */
  const res = useMemo(() => pickerCards(agents, queries), [agents, queries]);
  const hits = useMemo(() => dropdownResults(agents, query), [agents, query]);
  const open = query.trim().length > 0 && !dismissed;
  const counts = queriedCount(agents, queries);

  /* Outside click closes it. Bound only while it is open, so the picker adds no listener to a
     page that has no dropdown on it. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setDismissed(true);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  /* ⚠️ THE HIGHLIGHT IS CLAMPED ON EVERY RENDER, NOT RESET ON EVERY KEYSTROKE. Typing shrinks the
     result set, so an index that pointed at card 6 can suddenly point past the end — and an
     `aria-activedescendant` naming an element that is not in the document is worse than none. */
  const active = hl >= 0 && hl < res.cards.length ? hl : -1;
  const dActive = dhl >= 0 && dhl < hits.length ? dhl : -1;

  const choose = (a: Agent) => { setHl(-1); setDhl(-1); setDismissed(true); onSelect(a); };

  const onFieldKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) { e.preventDefault(); setDismissed(true); setDhl(-1); return; }
    /* ⚠️ ↓ MEANS TWO DIFFERENT THINGS, AND WHICH ONE DEPENDS ON WHETHER THE DROPDOWN IS OPEN.
       Open, it walks the results the writer is looking at; closed, it enters the standing grid.
       Sending it to the grid while a list of matches is on screen would step past the answer. */
    if (open) {
      if (e.key === "ArrowDown") { e.preventDefault(); setDhl((h) => Math.min(h + 1, hits.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setDhl((h) => Math.max(h - 1, 0)); return; }
      /* Enter with nothing highlighted does NOTHING — no silent selection of a row nobody chose. */
      if (e.key === "Enter" && dActive >= 0) { e.preventDefault(); choose(hits[dActive]); return; }
      return;
    }
    if (e.key === "ArrowDown" && res.cards.length > 0) { e.preventDefault(); setHl(0); return; }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(res.cards[active]); }
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); setHl(-1); fieldRef.current?.focus(); return; }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(res.cards[active]); return; }
    const next = moveInGrid(active < 0 ? 0 : active, e.key, res.cards.length);
    if (next === null) return;
    e.preventDefault();
    if (next < 0) { setHl(-1); fieldRef.current?.focus(); return; }
    setHl(next);
    /* Focus follows the highlight so the browser scrolls it into view and screen readers announce
       it — `aria-activedescendant` alone would move the marker and leave the viewport behind. */
    (document.getElementById(`qc-ac-${next}`) as HTMLElement | null)?.focus();
  };

  /* ══ 3 · COLD START — the only state that gets art ══════════════════════════════════════════
     ⚠️ ART BELONGS TO AN EMPTY ADDRESS BOOK AND NOWHERE ELSE. Used in the other two states it
     would decorate a space the grid is meant to fill, and it would stop meaning "there is nothing
     here yet" — which is the one thing it is for. */
  if (state === "cold") {
    return (
      <div className="qc-pick qc-pick-cold">
        <ArtSlot name="no-quick-picks" maxWidth={200} />
        <div className="qc-coldtx">
          <h3>Your contact list is empty</h3>
          <p>Add an agent and they will appear here every time you log a query.</p>
          <button type="button" className="f12-btn-pri" onClick={onAddAgent}>Add your first agent</button>
        </div>
      </div>
    );
  }

  const field = (
    <div className="qc-pickhead" ref={wrapRef}>
      <span className="qc-pickwrap">
      <input
        ref={fieldRef}
        className="qc-pickfield"
        type="text"
        autoFocus
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? LIST_ID : GRID_ID}
        aria-autocomplete="list"
        aria-activedescendant={open ? (dActive >= 0 ? `qc-dr-${dActive}` : undefined) : (active >= 0 ? `qc-ac-${active}` : undefined)}
        aria-label="Search your contacts by name or agency"
        placeholder="Search by name or agency…"
        value={query}
        /* Typing re-opens it — `dismissed` survives only until the writer asks again. */
        onChange={(e) => { setQuery(e.target.value); setHl(-1); setDhl(-1); setDismissed(false); }}
        onKeyDown={onFieldKey}
      />
      {open && (
        <div className="qc-drop" id={LIST_ID} role="listbox" aria-label="Matching contacts">
          {hits.length === 0 ? (
            /* Not an empty box — the writer asked a question and this is the answer, with the
               only useful thing to do about it beside it. */
            <p className="qc-dropnone">
              No contact matches that —{" "}
              <button type="button" onClick={onAddAgent}>Add a new agent</button>
            </p>
          ) : hits.map((a, i) => (
            <button
              key={a.id}
              id={`qc-dr-${i}`}
              type="button"
              role="option"
              aria-selected={dActive === i}
              className={`qc-drow${dActive === i ? " on" : ""}`}
              onMouseEnter={() => setDhl(i)}
              onClick={() => choose(a)}
            >
              <span className="qc-dmg" aria-hidden="true">{agentInitials(a)}</span>
              <span className="qc-dwho">
                <b>{agentPrimary(a)}</b>
                <i>{agentAgencyLine(a)}</i>
              </span>
              {/* ⚠️ QUERIED CONTACTS ARE SHOWN, NOT HIDDEN — a resubmission is a real thing, and in
                  the all-queried state it is the only thing left to do. The row states the history
                  so the writer is told rather than prevented. */}
              <span className="qc-dhist">{queryHistoryLabel(a, queries)}</span>
            </button>
          ))}
        </div>
      )}
      </span>
      {/* Beside the field, not beneath it: it is an alternative to searching, not a footnote. */}
      <span className="qc-pickadd">
        Not listed? <button type="button" onClick={onAddAgent}>Add a new agent</button>
      </span>
    </div>
  );

  /* ══ 2 · ALL QUERIED ═══════════════════════════════════════════════════════════════════════
     ⚠️ THE RING IS MUTED GREY, NEVER SAGE. Sage means "done well" everywhere else in this app,
     and a writer who has queried their whole list has not finished anything — they have run out
     of people, which is a neutral fact and often an uncomfortable one.
     ⚠️ AND THE FIELD STAYS LIVE. A resubmission, or a second manuscript to the same agent, is a
     real thing; this is a state with nothing to SUGGEST, not a state with nothing to do. */
  if (state === "all-queried") {
    return (
      <div className="qc-pick">
        {field}
        <div className="qc-allq">
          <div className="qc-allqtop">
            <span className="qc-allqring" aria-hidden="true">{counts.done}</span>
            <div>
              <div className="qc-allqn">{counts.done} of {counts.total} contacts queried</div>
              <p>
                Every agent on your contact list has been queried
                {manuscriptTitle ? <> for <i>{manuscriptTitle}</i></> : null}.
              </p>
              <p className="qc-allqsm">
                You can still log a query to any of them — a resubmission, or a second manuscript.
                Search above as usual.
              </p>
            </div>
          </div>
          <div className="qc-routes">
            <button type="button" className="qc-route" onClick={onAddAgent}>
              <b>Add a new agent</b><i>Straight into your list</i>
            </button>
            {onDiscover && (
              <button type="button" className="qc-route" onClick={onDiscover}>
                <b>Find agents in Discover</b><i>By genre and openness</i>
              </button>
            )}
            {onSeeAll && (
              <button type="button" className="qc-route" onClick={onSeeAll}>
                <b>Review your contacts</b><i>{counts.total} agents on file</i>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ══ 1 · THE GRID ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="qc-pick">
      {field}
      <div className="qc-pickcap">
        <b>Not yet queried</b>
        <span>
          {manuscriptTitle ? <>for <i>{manuscriptTitle}</i> · </> : null}{res.total} contacts
        </span>
        {res.truncated && onSeeAll && (
          <button type="button" className="qc-pickall" onClick={onSeeAll}>See all →</button>
        )}
      </div>

      {(
        <div className="qc-grid" id={GRID_ID} role="listbox" aria-label="Your contacts" onKeyDown={onGridKey}>
          {res.cards.map((a, i) => {
            const shut = a.submissionStatus === SubmissionStatus.CLOSED;
            const reply = replyLine(a);
            return (
              <div
                key={a.id}
                id={`qc-ac-${i}`}
                role="option"
                aria-selected={active === i}
                tabIndex={active === i ? 0 : -1}
                className={`qc-acard${active === i ? " on" : ""}`}
                onClick={() => choose(a)}
                onFocus={() => setHl(i)}
              >
                <div className="qc-actop">
                  <span className="qc-acav" aria-hidden="true">{agentInitials(a)}</span>
                  <span className="qc-acwho">
                    <b>{agentPrimary(a)}</b>
                    <i>{agentAgencyLine(a)}</i>
                  </span>
                </div>
                <div className="qc-acmeta">
                  <span className={`qc-actag${shut ? " shut" : ""}`}>{shut ? "Closed" : "Open"}</span>
                  {/* Absent is absent — a card with one fewer line beats a card asserting it does
                      not know something. */}
                  {reply && <span className="qc-acrt">{reply}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
