/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PaneJourney — the recording journey, rendered INSIDE the card's body (Item 9, Phase 2; ref
 * design-refs/todo-journey-in-pane.html `journeyView`).
 *
 * ⚠️ IT IS NOT AN OVERLAY, AND THAT IS THE FEATURE. `FocusFlow` mounted a full-viewport takeover
 * through `useOverlay`, whose `sealBackground()` puts `inert` on `#root` on the stated premise that
 * overlays portal to `document.body`. FocusFlow does not portal — so the takeover sealed itself,
 * and every control inside it was unreachable by pointer AND by keyboard. Measured on the deployed
 * page: `elementsFromPoint` at the primary's own centre returned `[body, html]`. A journey that is
 * simply the card's body cannot have that fault, so this removes the bug rather than patching it.
 *
 * ⚠️ THE BAND STAYS AND ONLY ITS PRE-LINE CHANGES — the card above this is untouched. "Sending your
 * partial to / Greg Panetta" becomes "Recording what you sent to / Greg Panetta", so the writer
 * never loses who they are recording against half way through recording it.
 *
 * ⚠️ THREE WAYS OUT AND ALL THREE WRITE NOTHING: `Back to the task` at the top of the body, `Cancel`
 * in the footer, and Escape. There is no confirmation, because there is nothing to lose that the
 * writer did not just type and can see.
 *
 * ⚠️ THE REFERENCE SITS ABOVE THE FIRST STEP, NOT BESIDE IT. The ref draws it there and the reason
 * is the measure: at 860px there is no room for a sticky panel next to the steps, and what the agent
 * asked for reads better BEFORE the questions than alongside them.
 */
import React, { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { MaterialRow } from "../../lib/todoHandoff";
import {
  CLOSE_REASON_COPY, CloseReason, JOURNEY_HINT, JOURNEY_STEPS, JourneyKind, JourneySendValues,
  OFFER_ACT, OFFER_BRANCHES, OFFER_HINT, OfferBranch, SEND_METHODS, SendMethod,
  StepId, canCommit, checkBackLabel, journeySummary, shortDay, whenMode, ymdLocal,
} from "../../lib/paneJourney";
import { HolderRow } from "../../lib/todoHandoff";
import { RecordingCalendar } from "./RecordingCalendar";
import "./paneJourney.css";

/** One title per step id — the numbering comes from the stack's position, never from here. */
const STEP_TITLE: Record<StepId, string> = {
  "what-went": "What went",
  how: "How it went",
  when: "When",
  "check-back": "Come back to it",
  why: "How it ended",
  remember: "Anything to remember",
};

export interface PaneJourneyProps {
  /** The rows the card states as on file — pre-ticked, because this confirms rather than asks. */
  materials: MaterialRow[];
  /**
   * ⚠️ THE REQUEST, IN THE ONE REGISTER THE DATA CAN SUPPORT — a plain fact line, never a quote.
   *
   * The ref draws this slot carrying the agent's actual words ("First fifty pages as a PDF
   * attachment"), which is why it reads as something they said. NOTHING IN THIS APP STORES THAT.
   * Every `note` on a per-query activity rung is written by `buildActivityNote` /
   * `statusChangeDescription` — pure functions of the status and four typed fields, with no writer
   * text and no agent text folded in anywhere. So the quoted register would not be occasionally
   * wrong; it would be wrong every time.
   *
   * Two registers chosen by source is the right design and it needs a source. What would have to
   * exist: a writer-supplied field on the rung, captured when a response is recorded. `details`
   * exists on the LEGACY GLOBAL feed doc and is also derived (`respondBy()`), so it is not it.
   */
  ask?: { fact?: string; meta?: string };
  /** Which journey — the step stack is declared per kind in `JOURNEY_STEPS`. */
  kind: JourneyKind;
  /**
   * ⚠️ THE OFFER'S NOTIFY BRANCH — THE AGENTS STILL HOLDING MATERIAL, AND HERE THEY ARE THE WORK.
   * §4.4 shows this same set on the CARD as reference; in the journey it is the thing being acted
   * on. One derivation, two presentations: `holderRows` is a presenter over
   * `notifyGroups(...).pages`, which is what the write already reads.
   *
   * ⚠️ AND IT CARRIES THE QUERY-ONLY AGENTS TOO. Courtesy says everyone still considering the
   * manuscript hears about an offer, not only the ones holding pages — the existing notify write
   * covers both, and narrowing it to §4.4's `pages` here would silently stop telling people.
   */
  holders?: { holding: HolderRow[]; queried: HolderRow[] };
  /** The reply-by day, where the record has one — the `time` branch caps its reminder there. */
  replyBy?: string;
  value: JourneySendValues;
  onChange: (v: JourneySendValues) => void;
  /** `Back to the task` — the way out at the TOP of the body. Writes nothing. */
  onCancel: () => void;
}

export const PaneJourney: React.FC<PaneJourneyProps> = ({ materials, ask, kind, holders, replyBy, value, onChange, onCancel }) => {
  const now = useMemo(() => new Date(), []);
  const [calAnchor, setCalAnchor] = useState<HTMLElement | null>(null);
  const dateBtn = useRef<HTMLButtonElement | null>(null);

  const set = (patch: Partial<JourneySendValues>) => onChange({ ...value, ...patch });
  /** One level down inside the offer — the back control goes up one, never all the way out. */
  const inBranch = kind === "offer" && !!value.branch;
  const yesterday = () => ymdLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const toggleNotify = (queryId: string) =>
    set({ notifySel: { ...value.notifySel, [queryId]: !value.notifySel[queryId] } });

  /**
   * ⚠️ ONE TOGGLE PER GROUP, AND IT SAYS WHAT IT WILL DO. All ticked → "None"; anything else →
   * "Select all". That is why the two groups open showing different words without either being
   * hard-coded: holding opens fully ticked, queried opens empty.
   */
  const groupToggle = (rows: HolderRow[]) => {
    const all = rows.length > 0 && rows.every((r) => value.notifySel[r.queryId]);
    return (
      <button type="button" className="pj-grouptog" onClick={() => {
        const next = { ...value.notifySel };
        for (const r of rows) next[r.queryId] = !all;
        set({ notifySel: next });
      }}>{all ? "None" : "Select all"}</button>
    );
  };

  const holderPick = (h: HolderRow) => {
    const on = !!value.notifySel[h.queryId];
    return (
      <button type="button" key={h.queryId} className={`pj-orow${on ? " on" : ""}`}
        aria-pressed={on} onClick={() => toggleNotify(h.queryId)}>
        <span className="pj-bx" aria-hidden>{on ? <Check size={10} /> : null}</span>
        <span className="pj-otx">{h.name}<span className="sub">{h.holds}{h.caution ? ` · ${h.caution}` : ""}</span></span>
      </button>
    );
  };

  const renderOffer = (): React.ReactNode => {
    /* ── screen one: which of the three ─────────────────────────────────────────────────────── */
    if (!value.branch) {
      return (
        <div className="pj-branches">
          {OFFER_BRANCHES.map((b) => (
            <button type="button" key={b.key} className="pj-branch"
              onClick={() => set({ branch: b.key as OfferBranch })}>
              <span className="pj-branchtx"><b>{b.title}</b><span>{b.gloss}</span></span>
              <ChevronRight size={15} aria-hidden />
            </button>
          ))}
        </div>
      );
    }
    /* ── screen two: the branch ─────────────────────────────────────────────────────────────── */
    if (value.branch === "notify") {
      const holding = holders?.holding ?? [];
      const queried = holders?.queried ?? [];
      return (
        <>
          {/* ⚠️ THE ONES HOLDING YOUR PAGES COME FIRST AND ARE NAMED AS SUCH. It is the difference
              between "someone is reading your manuscript" and "someone has your query in a pile",
              and it is the whole reason this branch is the most consequential of the three. */}
          {holding.length > 0 && (
            <div className="pj-step">
              <div className="pj-n">
                <span className="i">01</span><h4>Still holding your pages</h4>
                <span className="pj-count">{holding.length}</span>
                {groupToggle(holding)}
              </div>
              <div className="pj-opts">{holding.map(holderPick)}</div>
            </div>
          )}
          {queried.length > 0 && (
            <div className="pj-step">
              <div className="pj-n">
                <span className="i">{holding.length ? "02" : "01"}</span><h4>Still considering your query</h4>
                <span className="pj-count">{queried.length}</span>
                {groupToggle(queried)}
              </div>
              <div className="pj-opts">{queried.map(holderPick)}</div>
            </div>
          )}
          {/* ⚠️ NOBODY ELSE IS A FACT WORTH TELLING at offer stage — it means there is no one to
              notify, which is a real and reassuring answer rather than an absence. */}
          {holding.length === 0 && queried.length === 0 && (
            <div className="pj-step"><div className="pj-none">No other agent is still considering this manuscript.</div></div>
          )}
        </>
      );
    }
    if (value.branch === "decide") {
      return (
        <>
          <div className="pj-step">
            <div className="pj-n"><span className="i">01</span><h4>What did you tell them?</h4></div>
            <div className="pj-opts">
              {([["accepted", "I accepted", "They represent this manuscript now"],
                 ["declined", "I declined", "The querying continues"]] as const).map(([k, label, gloss]) => {
                const on = value.decision === k;
                return (
                  <button type="button" key={k} className={`pj-orow${on ? " on" : ""}`}
                    aria-pressed={on} onClick={() => set({ decision: k })}>
                    <span className="pj-bx" aria-hidden>{on ? <Check size={10} /> : null}</span>
                    <span className="pj-otx">{label}<span className="sub">{gloss}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      );
    }
    return (
      <>
        <div className="pj-step">
          <div className="pj-n"><span className="i">01</span><h4>When should this come back?</h4></div>
          <div className="pj-seg">
            {[3, 7, 14].map((d) => {
              const day = ymdLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() + d));
              /* ⚠️ CAPPED AT THE REPLY-BY, because a reminder after the deadline is a reminder about
                 something already decided for you. */
              const capped = replyBy && day > replyBy.slice(0, 10) ? replyBy.slice(0, 10) : day;
              return (
                <button type="button" key={d} className={value.remindDate === capped ? "on" : undefined}
                  aria-pressed={value.remindDate === capped} onClick={() => set({ remindDate: capped })}>
                  {checkBackLabel(d)}
                </button>
              );
            })}
          </div>
          {replyBy && (
            <div className="pj-refm" style={{ borderTop: 0, paddingTop: 10 }}>
              Reply-by is {shortDay(replyBy.slice(0, 10))} — a later day is capped there.
            </div>
          )}
        </div>
      </>
    );
  };

  const renderStep = (id: StepId): React.ReactNode => {
    switch (id) {
      case "what-went":
        return (
          <>
            <div className="pj-opts">
              {materials.map((m) => {
                const on = value.materials.includes(m.label);
                return (
                  <button type="button" key={m.label} className={`pj-orow${on ? " on" : ""}`}
                    aria-pressed={on} onClick={() => toggle(m.label)}>
                    <span className="pj-bx" aria-hidden>{on ? <Check size={10} /> : null}</span>
                    <span className="pj-otx">{m.label}{m.sub && <span className="sub">{m.sub}</span>}</span>
                  </button>
                );
              })}
              {/* ⚠️ NO ROWS IS A STATE, NOT AN EMPTY LIST. A send whose package has nothing on file
                  is a real thing to record; the step says so rather than rendering a gap. */}
              {materials.length === 0 && <div className="pj-none">Nothing is on file for this send.</div>}
            </div>
            <div className="pj-also">
              <label htmlFor="pj-also">Anything else?</label>
              <textarea id="pj-also" value={value.also} placeholder="A covering line, a note on the changes…"
                onChange={(e) => set({ also: e.target.value })} />
            </div>
          </>
        );
      case "how":
        return (
          <div className="pj-seg">
            {SEND_METHODS.map((m) => (
              <button type="button" key={m} className={value.method === m ? "on" : undefined}
                aria-pressed={value.method === m} onClick={() => set({ method: m as SendMethod })}>{m}</button>
            ))}
          </div>
        );
      case "when":
        return (
          <>
            <div className="pj-seg">
              <button type="button" className={mode === "today" ? "on" : undefined}
                onClick={() => set({ sentDate: ymdLocal(now) })}>Today</button>
              <button type="button" className={mode === "yesterday" ? "on" : undefined}
                onClick={() => set({ sentDate: yesterday() })}>Yesterday</button>
              {/* ⚠️ THE ANCHOR RELABELS ITSELF once a day is chosen — a button still reading
                  "Another date…" beside a chosen date states that nothing has been picked. */}
              <button type="button" className={mode === "other" ? "on" : undefined} aria-haspopup="dialog"
                onClick={(e) => setCalAnchor(e.currentTarget)}>
                {mode === "other" ? shortDay(value.sentDate) : "Another date…"}
              </button>
            </div>
            {calAnchor && (
              <RecordingCalendar
                anchor={calAnchor}
                value={value.sentDate}
                /* ⚠️ THE JOURNEY SUPPLIES `max`, THE COMPONENT ASSUMES NOTHING. You cannot have sent
                   something tomorrow — but that is this caller's fact about recording, not the
                   calendar's about dates. */
                max={ymdLocal(now)}
                onPick={(day) => set({ sentDate: day })}
                onClose={() => setCalAnchor(null)}
              />
            )}
          </>
        );
      case "check-back":
        return (
          <div className="pj-seg">
            {[7, 14, 28].map((d) => (
              <button type="button" key={d} className={value.checkBackDays === d ? "on" : undefined}
                aria-pressed={value.checkBackDays === d} onClick={() => set({ checkBackDays: d })}>
                {checkBackLabel(d)}
              </button>
            ))}
          </div>
        );
      case "why":
        /* ⚠️ THE THREE WRITE THREE DIFFERENT STATUSES, so this is a real decision and not a label.
           Each carries its gloss, because "a pass arrived off the record" is not self-explaining. */
        return (
          <div className="pj-opts">
            {CLOSE_REASON_COPY.map((r) => {
              const on = value.reason === r.key;
              return (
                <button type="button" key={r.key} className={`pj-orow${on ? " on" : ""}`}
                  aria-pressed={on} onClick={() => set({ reason: r.key as CloseReason })}>
                  <span className="pj-bx" aria-hidden>{on ? <Check size={10} /> : null}</span>
                  <span className="pj-otx">{r.label}<span className="sub">{r.gloss}</span></span>
                </button>
              );
            })}
          </div>
        );
      case "remember":
        return (
          <div className="pj-also bare">
            <textarea value={value.note} placeholder="What you tweaked, what the covering line said…"
              onChange={(e) => set({ note: e.target.value })} />
          </div>
        );
    }
  };
  const mode = whenMode(value.sentDate, now);
  const toggle = (label: string) =>
    set({ materials: value.materials.includes(label)
      ? value.materials.filter((m) => m !== label)
      : [...value.materials, label] });

  return (
    <>
      {/* ⚠️ THE WAY BACK IS THE FIRST THING IN THE BODY, above the reference and the steps. A
          journey whose exit is only in the footer asks the writer to read to the end to find out
          they can leave.
          ⚠️ ONE CONTROL, DESTINATION BY DEPTH — and the walk is what forced this. The offer's branch
          screens first rendered a SECOND back button beneath this one, so the card carried "Back to
          the task" and "Back to the three" stacked, and the top one silently threw away the branch
          you had chosen. A single control goes up exactly one level: out of a branch to the three,
          and out of the three to the card. */}
      <div className="pj-head">
        <button type="button" className="pj-back"
          onClick={() => (inBranch ? onChange({ ...value, branch: null }) : onCancel())}>
          <ArrowLeft size={13} aria-hidden /> {inBranch ? "Back to the three" : "Back to the task"}
        </button>
      </div>

      {/* ⚠️ "ON THE RECORD", NOT "WHAT THEY ASKED FOR" — the heading is half the register. The old
          one framed a derived string as something the agent phrased; this one states where the line
          came from and claims nothing about who wrote it. Omitted entirely where the record holds
          nothing: a "no request recorded" panel is a heading over an absence. */}
      {/* ⚠️ THE FACT IS WHAT EARNS THE BLOCK. `meta` alone is the agent and their agency — which the
          BAND states two inches above, in larger type — so a block holding only that is a heading
          over a duplicate. Measured on a close card, which has no incoming rung to quote: it drew a
          bordered box containing "ON THE RECORD" and the name already on screen. */}
      {ask?.fact && (
        <div className="pj-ref">
          <h5>On the record</h5>
          {ask.fact && <div className="pj-reff">{ask.fact}</div>}
          {ask.meta && <div className="pj-refm">{ask.meta}</div>}
        </div>
      )}

      {/* ⚠️ THE OFFER RENDERS ITS BRANCHES, NOT A STACK — see `OfferBranch`'s note. The selector is
          screen one; the chosen branch is screen two, reached by a choice and left by `Back`. */}
      {kind === "offer" ? renderOffer() : null}

      {kind !== "offer" && (
      <>
      {/* ⚠️ THE STACK IS DECLARED, NOT BRANCHED — `JOURNEY_STEPS[kind]`. A send asks four things; a
          chase asks two; a close asks one. Numbering follows the stack, so a shorter journey LOOKS
          shorter rather than showing "03 of 04" with a step that does nothing. */}
      {JOURNEY_STEPS[kind].map((id, i) => (
        <div className="pj-step" key={id}>
          <div className="pj-n">
            <span className="i">{String(i + 1).padStart(2, "0")}</span>
            <h4>{STEP_TITLE[id]}</h4>
            {id === "remember" && <span className="opt">optional</span>}
          </div>
          {renderStep(id)}
        </div>
      ))}
      </>
      )}

    </>
  );
};

/**
 * ⚠️ THE SUMMARY AND THE FOOTER ARE A SEPARATE EXPORT BECAUSE THEY ARE SIBLINGS OF THE SCROLLER,
 * NOT CHILDREN OF IT — and building them as children is exactly the mistake this file made first.
 *
 * Measured on the deployed page: with all of it inside `EdgeFadeScroll`, the commit sat at y 1271
 * in a 1000px viewport. It was reachable by scrolling to the bottom of the form, which is precisely
 * what "pinned" is supposed to prevent — you would answer four questions and then have to go
 * looking for the button. The file's own CSS comment said "siblings of the scroller"; the component
 * did not, and only a real measurement could tell the two apart.
 *
 * The steps scroll; the sentence about to be committed and the button that commits it stay on
 * screen together.
 */
export interface PaneJourneyFootProps {
  kind: JourneyKind;
  actLabel: string;
  value: JourneySendValues;
  onCancel: () => void;
  onCommit: () => void;
  saving?: boolean;
}

export const PaneJourneyFoot: React.FC<PaneJourneyFootProps> = ({ kind, actLabel, value, onCancel, onCommit, saving = false }) => {
  const now = useMemo(() => new Date(), []);
  /**
   * ⚠️ THE SELECTOR HAS NO DEED, SO IT OFFERS NO BUTTON. An offer with no branch chosen is a writer
   * deciding which of three things they came to do; a primary there would have to be labelled
   * something, and every honest label for it ("Continue", "Next") describes navigation rather than
   * a deed — which is exactly the register the black button is reserved against.
   */
  const onSelector = kind === "offer" && !value.branch;
  const summary = journeySummary(kind, value, now);
  const hint = kind === "offer"
    ? (value.branch ? OFFER_HINT[value.branch] : "Three ways to answer this — pick the one you are here for.")
    : JOURNEY_HINT[kind];
  const label = kind === "offer" && value.branch ? OFFER_ACT[value.branch] : actLabel;
  return (
    <>
      {/* the summary is absent on the selector too — there is nothing yet to summarise */}
      {summary && (
        <div className="pj-sum" role="status">
          <span className="i" aria-hidden><Check size={10} /></span>
          <span className="t">{summary}</span>
        </div>
      )}
      <div className="pj-foot">
        <button type="button" className="pj-btn" onClick={onCancel}>Cancel</button>
        <span className="pj-hint">{hint}</span>
        <span className="pj-grow" />
        {!onSelector && (
          <button type="button" className="pj-prime" disabled={!canCommit(kind, value) || saving} onClick={onCommit}>
            <Check size={14} aria-hidden /> {saving ? "Recording…" : label}
          </button>
        )}
      </div>
    </>
  );
};

export default PaneJourney;
