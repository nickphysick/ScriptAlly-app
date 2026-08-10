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
import type { AgentQuickAddProps } from "./AgentQuickAdd";
import { agentInitials, agentPrimary, agentAgencyLine } from "../../lib/agentDisplay";
import { SubmissionStatus } from "../../types";
import { ArtSlot } from "../todo/ArtSlot";
import { AgentQuickAdd } from "./AgentQuickAdd";
import {
  pickerState, pickerCards, queriedCount, replyLine, moveInGrid,
  dropdownResults, queryHistoryLabel, nameplates, foldedLine, plateName,
} from "../../lib/agentPicker";

export interface AgentPickerProps {
  agents: Agent[];
  queries: Query[];
  /** Named in the heading, so the count is scoped to the book being queried. */
  manuscriptTitle?: string;
  onSelect: (a: Agent) => void;
  /** The write path for an inline add — the same contract the retired popup called. */
  onCreateAgent: AgentQuickAddProps["onCreateAgent"];
  /** Omitted rather than rendered dead when the host cannot navigate. */
  onSeeAll?: () => void;
  onDiscover?: () => void;
}

const GRID_ID = "qc-agent-grid";
const LIST_ID = "qc-agent-list";

export const AgentPicker: React.FC<AgentPickerProps> = ({
  agents, queries, manuscriptTitle, onSelect, onCreateAgent, onSeeAll, onDiscover,
}) => {
  const [query, setQuery] = useState("");
  const [hl, setHl] = useState(-1);
  /* ⚠️ FOCUS IS NOT INTENT, AND THAT DISTINCTION IS THE WHOLE OPEN MODEL. The field takes focus on
     mount so typing works immediately — but programmatic focus is the app's act, not the writer's,
     and opening on it is what put an expanded empty popup under the field on arrival. So `open` is
     explicit state, raised only by things the writer DID: a click on the field, ↓, or a keystroke.
     There is deliberately no `onFocus` handler here; adding one would restore the fault. */
  const [open, setOpen] = useState(false);
  const [dhl, setDhl] = useState(-1);
  const fieldRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  /* ⚠️ ONE OPEN STATE, TWO ENTRY POINTS. The link beside the field and the all-queried panel's
     action are the same destination; two states would let one of them be open while the other
     thought it was closed, and the second click would appear to do nothing. */
  const [adding, setAdding] = useState(false);
  const onAddAgent = () => { setOpen(false); setAdding(true); };
  /* Cancel and Esc both land here: the form closes and the caret goes back where it started, so
     changing your mind returns you to the thing you were doing rather than to nowhere. */
  const closeAdd = () => { setAdding(false); fieldRef.current?.focus(); };

  const state = pickerState(agents, queries);
  /* ⚠️ THE GRID IS COMPUTED WITHOUT THE QUERY. It is a standing set of suggestions, not a result
     set — filtering it as you type made the page reshuffle under the writer mid-keystroke. */
  const res = useMemo(() => pickerCards(agents, queries), [agents, queries]);
  const hits = useMemo(() => dropdownResults(agents, query), [agents, query]);
  const counts = queriedCount(agents, queries);
  /* ⚠️ THE GRID IS UNCONDITIONAL — only its CONTENTS switch. It used to vanish in the all-queried
     state, leaving the one state most in need of a browsable list as the only state without one. */
  const plates = useMemo(() => nameplates(agents, queries), [agents, queries]);
  /* ⚠️ CLOSED BY DEFAULT. The writer came to this state to get PAST it — sixteen names they have
     already used are context, not a choice being offered. One sentence, and the set on request. */
  const [showPlates, setShowPlates] = useState(false);

  /* Outside click closes it. Bound only while it is open, so the picker adds no listener to a
     page that has no dropdown on it. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  /* ⚠️ THE HIGHLIGHT IS CLAMPED ON EVERY RENDER, NOT RESET ON EVERY KEYSTROKE. Typing shrinks the
     result set, so an index that pointed at card 6 can suddenly point past the end — and an
     `aria-activedescendant` naming an element that is not in the document is worse than none. */
  const active = hl >= 0 && hl < res.cards.length ? hl : -1;
  const dActive = dhl >= 0 && dhl < hits.length ? dhl : -1;

  const choose = (a: Agent) => { setHl(-1); setDhl(-1); setOpen(false); onSelect(a); };

  const onFieldKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) { e.preventDefault(); setOpen(false); setDhl(-1); return; }
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
    /* ↓ on a closed field OPENS the list — it is a request to see the options, and answering it
       by jumping past them into the standing grid would skip the thing being asked for. */
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setDhl(0); return; }
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
        /* A keystroke opens it; clearing back to empty closes it again, because an empty field is
           the writer having withdrawn the question. */
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v); setHl(-1); setDhl(-1);
          setOpen(v.trim().length > 0);
        }}
        onClick={() => setOpen(true)}
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
      {/* ⚠️ INLINE, BENEATH THE FIELD, WHERE THE LINK ALREADY POINTED. Nothing navigates and
          nothing scrolls — the previous behaviour scrolled to a second field further down the
          page, which is what made this action look like it opened a list of agents. */}
      {adding && (
        <div className="qc-qawrap">
          <AgentQuickAdd
            initialName={query}
            onCreateAgent={onCreateAgent}
            onCreated={(a) => { setAdding(false); choose(a); }}
            onCancel={closeAdd}
          />
        </div>
      )}
    </div>
  );

  /* ══ 2 · ALL QUERIED ═══════════════════════════════════════════════════════════════════════
     ⚠️ THE RING IS MUTED GREY, NEVER SAGE. Sage means "done well" everywhere else in this app,
     and a writer who has queried their whole list has not finished anything — they have run out
     of people, which is a neutral fact and often an uncomfortable one.
     ⚠️ AND THE FIELD STAYS LIVE. A resubmission, or a second manuscript to the same agent, is a
     real thing; this is a state with nothing to SUGGEST, not a state with nothing to do. */
  /* ⚠️ THE PANEL SITS ABOVE THE GRID, NOT INSTEAD OF IT. It states the situation; the grid is what
     you act on. Returning early here is what made the all-queried state a dead end in practice
     while its own copy said it was not one. */
  const allQueried = state === "all-queried";

  /* ══ 1 · THE GRID ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="qc-pick">
      {field}
      {allQueried && (
<div className="qc-pick">
        <div className="qc-allq">
          <div className="qc-allqtop">
            {/* ⚠️ THE NUMBER LIVES IN THE RING, AND NOWHERE ELSE IN THIS PANEL. It was stated
                three times over — ring, heading and route — which made a small fact look like the
                subject of the page. The heading names the STATE; the ring carries the figure. */}
            <span className="qc-allqring" aria-hidden="true">{counts.done}</span>
            <div className="qc-allqtx">
              <div className="qc-allqn">Every contact queried</div>
              <p>
                Every agent on your contact list has been queried
                {manuscriptTitle ? <> for <i>{manuscriptTitle}</i></> : null}. You can still log a
                query to any of them — a resubmission, or a second manuscript.
              </p>
            </div>
          </div>
          {/* ⚠️ COMPACT INLINE ACTIONS ON ONE ROW, not three full-width cards. At card width the
              panel outranked the search field that does the actual work, and this state is not
              the subject of the page — it is the absence of one. Second lines are gone with the
              cards: "Straight into your list" only restated its own label. The contacts route
              keeps its count, because a number is information rather than description. */}
          <div className="qc-routes">
            <button type="button" className="qc-route" onClick={onAddAgent}>Add a new agent</button>
            {onDiscover && (
              <button type="button" className="qc-route" onClick={onDiscover}>Find agents in Discover</button>
            )}
            {onSeeAll && (
              <button type="button" className="qc-route" onClick={onSeeAll}>
                Review your contacts <span>{counts.total}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}
      <div className="qc-pickcap">
        <b>{allQueried ? "Already queried for this manuscript" : "Suggested — not yet queried"}</b>
        <span>
          {manuscriptTitle ? <>for <i>{manuscriptTitle}</i> · </> : null}{res.total} contacts
        </span>
        {res.truncated && onSeeAll && (
          <button type="button" className="qc-pickall" onClick={onSeeAll}>See all →</button>
        )}
      </div>

      {allQueried ? (
        /* ⚠️ NOT A GRID. A grid is the shape this component uses to RECOMMEND, and nothing here is
           being recommended — they have all been queried. Folded, the state is one sentence and
           the names are there if wanted. */
        <div className="qc-fold">
          <p className="qc-foldline">
            {foldedLine(plates, manuscriptTitle)}
            <button type="button" className="qc-foldbtn" aria-expanded={showPlates} onClick={() => setShowPlates((o) => !o)}>
              {showPlates ? "Hide them" : "Show them"}
            </button>
          </p>
          {showPlates && (
            <>
              {/* ⚠️ DIMMED AT REST, FORWARD ON HOVER OR KEYBOARD FOCUS — available, not suggested.
                  `focus-within` is what keeps that true for a keyboard: a set that only lit under a
                  pointer would leave a tabbing writer reading it at rest permanently. */}
              <div className="qc-plates">
                {plates.map((p) => (
                  <button
                    key={p.agent.id}
                    type="button"
                    className={`qc-plate qc-plate-${p.state}`}
                    /* the agency belongs here, not on the plate — a nameplate carries a name */
                    title={agentAgencyLine(p.agent) || undefined}
                    onClick={() => choose(p.agent)}
                  >
                    <i className="qc-platedot" aria-hidden="true" />
                    <span className="qc-platename">{plateName(p.agent)}</span>
                    {/* an unparseable or absent date renders NOTHING — never "Invalid Date" */}
                    {p.sentLabel && <span className="qc-platedate">{p.sentLabel}</span>}
                  </button>
                ))}
              </div>
              {/* ⚠️ THE STATE IS NAMED ONCE, not sixteen times. A legend beneath a set is how you
                  say what the dots mean without repeating it on every plate. */}
              <p className="qc-platekey">
                <span><i className="qc-platedot qc-plate-active" aria-hidden="true" /> Active query</span>
                <span><i className="qc-platedot qc-plate-previous" aria-hidden="true" /> Previously queried</span>
              </p>
            </>
          )}
        </div>
      ) : (
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
