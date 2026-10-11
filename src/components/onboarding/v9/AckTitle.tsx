/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step 2 opens here (onboarding v9, ref-ack-*.png): what the writer picked, a short passage that
 * types in, then the title card.
 *
 *   · The stamp: a navy box whose tick draws itself, "Where you are", the option's title, Change.
 *   · The passage: three lines, typed letter by letter with no cursor (Typewriter.tsx). A click
 *     finishes it at once.
 *   · The card is in the page from the start, unseen and inert, so the passage never moves; when
 *     the last letter lands it pops in and its first input takes focus.
 *
 * "Just getting started" carries two extras in its card: `Title TBC`, which fills the field with
 * "Untitled manuscript" (held like any other title until the flow's one write), and the readiness
 * question, so that branch is one page.
 */
import React, { useEffect, useRef, useState } from "react";
import { ManuscriptStatus } from "../../../types";
import { OptionGroup, OptionRow, BackLink, StepFoot, FieldError } from "../setupParts";
import {
  ACK, STAMP_EYEBROW, STAMP_CHANGE, TITLE_LABEL, TITLE_PLACEHOLDER, TITLE_TBC, UNTITLED, READINESS_Q,
  STILL_WRITING_LEAD, STILL_WRITING_NOTE, lineText, type V9Stage,
} from "../../../lib/onboardingV9";
import { useTypewriter, TypedLine } from "./Typewriter";
import "./onbV9.css";

export const READINESS: { status: ManuscriptStatus; title: string; desc: string }[] = [
  { status: ManuscriptStatus.DRAFTING, title: "Still being written", desc: "I'm partway through the draft." },
  { status: ManuscriptStatus.REVISING, title: "In revision, nearly there", desc: "Drafted, working through edits." },
  { status: ManuscriptStatus.READY_TO_QUERY, title: "Ready to query", desc: "Polished and ready to send to agents." },
];

export interface AckTitleProps {
  stage: V9Stage;
  /** the picked option's title, as step 1 words it */
  stageTitle: string;
  initialTitle?: string;
  initialStatus?: ManuscriptStatus | null;
  error?: string | null;
  /** back to step 1 (the stamp's Change, and Back) */
  onChange: () => void;
  onContinue: (r: { title: string; status: ManuscriptStatus | null }) => void;
}

export const AckTitle: React.FC<AckTitleProps> = ({ stage, stageTitle, initialTitle = "", initialStatus = null, error, onChange, onContinue }) => {
  const passage = ACK[stage];
  const texts = passage.map(lineText);
  /* the stamp's tick draws first; the letters start as it lands */
  const type = useTypewriter(texts, { startDelay: 550 });
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<ManuscriptStatus | null>(initialStatus);
  const starting = stage === "starting";
  const input = useRef<HTMLInputElement>(null);
  /* the first input takes focus as the card lands, once */
  const focused = useRef(false);
  useEffect(() => {
    if (!type.done || focused.current) return;
    focused.current = true;
    input.current?.focus({ preventScroll: true });
  }, [type.done]);

  const ready = title.trim().length > 0 && (!starting || status !== null);
  const go = () => { if (ready) onContinue({ title: title.trim(), status: starting ? status : null }); };

  return (
    <div className="o9-solo" data-screen="ack" data-stage={stage}>
      <div className="o9-ack" data-o9="stamp">
        <span className="o9-ackbox" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
        <div className="o9-acklbl">
          <small>{STAMP_EYEBROW}</small>
          <b data-o9="stamp-title">{stageTitle}</b>
        </div>
        <button type="button" className="sf-link sf-link--quiet o9-ackchange" onClick={onChange} data-act="change">{STAMP_CHANGE}</button>
      </div>

      {/* a click anywhere on the passage finishes it */}
      <div className="o9-beats" data-o9="passage" data-typed={type.shown} data-total={type.total} onClick={type.finish}>
        <TypedLine runs={passage[0]} from={0} shown={type.shown} className="o9-beat o9-beat--lead" />
        <TypedLine runs={passage[1]} from={texts[0].length} shown={type.shown} className="o9-beat" />
        <TypedLine runs={passage[2]} from={texts[0].length + texts[1].length} shown={type.shown} className="o9-beat" />
      </div>

      <section
        className={`sf-card sf-stepcard o9-late${type.done ? " is-in" : ""}`} data-o9="title-card"
        aria-hidden={type.done ? undefined : true} inert={!type.done}
      >
        <div className={starting ? "o9-tbc" : undefined}>
          <div className="sf-field o9-field0">
            <label className="sf-lab" htmlFor="o9-title">{TITLE_LABEL}</label>
            <div className="sf-inwrap">
              <input
                ref={input} id="o9-title" className="sf-in" type="text" value={title} placeholder={TITLE_PLACEHOLDER}
                onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }}
              />
            </div>
          </div>
          {starting && (
            <button type="button" className="sf-btn sf-btn--sm" data-act="tbc" onClick={() => setTitle(UNTITLED)}>{TITLE_TBC}</button>
          )}
        </div>
        {starting && (
          <>
            <p className="sf-qlab o9-readyq" id="o9-ready-q">{READINESS_Q}</p>
            <OptionGroup labelledBy="o9-ready-q">
              {READINESS.map((r) => (
                <OptionRow key={r.status} title={r.title} desc={r.desc} selected={status === r.status} onClick={() => setStatus(r.status)} />
              ))}
            </OptionGroup>
            <p className="sf-note" data-sf="still-writing"><strong>{STILL_WRITING_LEAD}</strong> {STILL_WRITING_NOTE}</p>
          </>
        )}
        {error && <FieldError>{error}</FieldError>}
        <StepFoot left={<BackLink onClick={onChange} />}>
          <button type="button" className="sf-btn" disabled={!ready} onClick={go} data-act="continue">Continue</button>
        </StepFoot>
      </section>
    </div>
  );
};
