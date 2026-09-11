/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryCard — one query as an object you can scan, and nothing else.
 *
 * ⚠️ IT IS PURE AND IT DERIVES NOTHING. Every word on it arrives as `facts` from `cardFacts`; this
 * file decides where things sit and never what they say. A card that computed its own elapsed
 * figure would be a second derivation of the one thing the panel behind it also states. The verbs
 * follow the same rule: which ones a card offers arrives as `verbs`, from `queryVerbs`.
 *
 * ⚠️ THE DOT IS `StatusDot` AND NOTHING ELSE. `design-refs/query-centre.html` draws its own inline
 * SVG circles because a standalone mockup has no component to import — they are stand-ins, not a
 * design. Every query status in this app is drawn by that one component, at 24px here.
 *
 * ⚠️ NO BURGUNDY. Not in the band, not in the marker, not on hover. On this page burgundy belongs
 * to `StatusDot` and the Form 11 chrome; anything else wearing it reads as a control.
 */
import React, { useRef } from "react";
import "./queryCard.css";
import { StatusDot } from "../StatusDot";
import type { QueryStatus } from "../../types";
import { MATERIAL_ROW_NAMES, type MaterialKind } from "../../lib/agentMaterials";
import { MATERIAL_SLOTS, REGISTER_LABEL, sentenceText, type CardFacts } from "../../lib/queryCardFacts";
import type { QueryVerbs } from "../../lib/queryRowFacts";

/* ── the four marks ─────────────────────────────────────────────────────────────────────────── */
/* Line-drawn at 1.8, matching the ref. `currentColor` so the faded state is one opacity rule
   rather than a second palette. */
const MARK: Record<MaterialKind, React.ReactNode> = {
  queryLetter: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  synopsis: <path d="M4 6h16M4 10h16M4 14h10M4 18h7" />,
  sample: (
    <>
      <path d="M6 3h8l5 5v13H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  other: <path d="M21 12l-8.5 8.5a5 5 0 01-7-7L14 5a3.3 3.3 0 014.7 4.7L10.5 18a1.7 1.7 0 01-2.4-2.4L15 8.5" />,
};

/** ⚠️ EXPORTED FOR THE LIST (colours v2, Phase 3), not copied into it. The four slot glyphs are
 *  the same four facts in both views; a second set of paths is a second thing to keep in step. */
export const Mark: React.FC<{ kind: MaterialKind }> = ({ kind }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {MARK[kind]}
  </svg>
);

/** §5 (Grid pass) — the snooze verb's bell: the page's own line-drawn bell, at the marks' weight. */
const BELL = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export type CardVerb = "primary" | "snooze" | "closed";

export interface QueryCardProps {
  id: string;
  status: QueryStatus;
  name: string;
  agency: string;
  initials: string;
  facts: CardFacts;
  selected?: boolean;
  entering?: boolean;
  onOpen?: (id: string) => void;
  /**
   * ⚠️ THE LIVE PREVIEW OF A QUERY BEING WRITTEN — dashed throughout, inert, and hidden from
   * assistive technology. It is a picture of the form beside it, not a second copy of the form:
   * announcing it would read out a half-finished record as though it existed.
   */
  ghost?: boolean;
  /** §3 (log-sheet) — one pulse as the saved card takes the ghost's place. Presentation only. */
  fresh?: boolean;
  /**
   * §5 (Grid pass) — THE BAND'S VERBS. Which verbs, from `queryVerbs`; the card only places them.
   * No `verbs` or no `onVerb` means no verb row at all: the ghost has none, and a host with nowhere
   * to send a press must not draw controls that do nothing.
   */
  verbs?: QueryVerbs | null;
  onVerb?: (id: string, verb: CardVerb, anchor: HTMLElement) => void;
  onMore?: (id: string, anchor: HTMLElement) => void;
}

export const QueryCard: React.FC<QueryCardProps> = ({
  id,
  status,
  name,
  agency,
  initials,
  facts,
  selected = false,
  entering = false,
  onOpen,
  ghost = false, fresh = false,
  verbs = null,
  onVerb,
  onMore,
}) => {
  /* the card's one open control — where Escape in the verb row hands focus back to */
  const openRef = useRef<HTMLButtonElement>(null);

  const cls = [
    "qcc",
    /* ⚠️ THE STAGE, NOT THE TURN. The band is the tint ladder's rung — eight of them — while the
       turn is the five-court split the filters use. They are different questions about one status. */
    `qcc--st-${facts.state}`,
    selected ? "qcc--sel" : "",
    entering ? "qcc--enter" : "",
    ghost ? "qcc--ghost" : "",
    fresh ? "qcc--fresh" : "",
  ]
    .filter(Boolean)
    .join(" ");

  /**
   * §5 (Grid pass) — THE VERB ROW, INSIDE THE BAND. Placed absolutely against the band, so it
   * takes no height from it, and at the band's right — where the turn caption stood, which fades
   * as the row arrives. The band is its containing block, which is why it cannot reach the fact
   * line; both are measured on the page rather than argued here.
   *
   * ⚠️ ESCAPE HANDS FOCUS BACK TO THE CARD, AND STOPS THERE. Leaving the row is this row's
   * business; a keypress that also closed whatever else was listening would do two things at once.
   */
  const verbRow =
    !ghost && verbs && onVerb ? (
      <span
        className="qcc-verbs"
        role="group"
        aria-label={`Actions for ${name}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          e.stopPropagation();
          openRef.current?.focus();
        }}
      >
        <button
          type="button"
          className={`qcc-vb qcc-vb--p${verbs.primary.enabled ? "" : " qcc-vb--off"}`}
          disabled={!verbs.primary.enabled}
          title={verbs.primary.enabled ? undefined : "Reopening a closed query is not built yet"}
          onClick={(e) => onVerb(id, "primary", e.currentTarget)}
        >
          {verbs.primary.label}
        </button>
        {verbs.nudge && (
          <button
            type="button"
            className="qcc-vb"
            aria-label="Snooze the nudge"
            onClick={(e) => onVerb(id, "snooze", e.currentTarget)}
          >
            {BELL}
          </button>
        )}
        {verbs.markClosed && (
          <button
            type="button"
            className="qcc-vb"
            aria-label="Mark closed"
            onClick={(e) => onVerb(id, "closed", e.currentTarget)}
          >
            ×
          </button>
        )}
        <button
          type="button"
          className="qcc-vb"
          aria-label={`More actions for ${name}`}
          onClick={(e) => onMore?.(id, e.currentTarget)}
        >
          ⋯
        </button>
      </span>
    ) : null;

  const body = (
    <>
      <span className="qcc-band">
        <StatusDot status={status} overrideSize={24} />
        <span className="qcc-word">{status}</span>
        <span className="qcc-turn">{facts.turnWord}</span>
        {verbRow}
      </span>

      <span className="qcc-body">
        <span className="qcc-who">
          <span className="qcc-chip" aria-hidden="true">
            {initials}
          </span>
          <span className="qcc-whotx">
            <span className={`qcc-nm${ghost ? " qcc-ph" : ""}`}>{name}</span>
            <span className={`qcc-ag${ghost ? " qcc-ph" : ""}`}>{agency}</span>
          </span>
          {facts.leaf && (
            <span className="qcc-leaf">
              <span className="qcc-leaf-mo">{facts.leaf.month}</span>
              <span className="qcc-leaf-dy">{facts.leaf.day}</span>
              <span className="qcc-leaf-cap">{facts.leaf.caption}</span>
            </span>
          )}
        </span>

        <span className={`qcc-fact qcc-fact--${facts.register}`}>
          {/* ⚠️ THE CHIP REPLACES THE `!` RING, AND IT IS NOT THE RING WITH WORDS ADDED.
              The ring said "something is wrong here" in one shape and left the reader to find out
              what; the chip NAMES the register, so a reader scanning a grid reads the state without
              parsing the sentence. It leads the line for that reason — the first thing on the row
              is what kind of thing this is.

              ⚠️ AND IT NEEDS NO `aria-label`. The ring's did, because "!" is a shape; the chip's
              own text IS its label, and adding one would make a screen reader say it twice. */}
          <span className="qcc-rc">{REGISTER_LABEL[facts.register]}</span>
          <span className="qcc-facttx">
            <span className="qcc-s">
              <span>
                {facts.sentence.map((run, i) =>
                  run.strong ? <b key={i}>{run.text}</b> : <React.Fragment key={i}>{run.text}</React.Fragment>,
                )}
              </span>
            </span>
            {facts.caption && <span className="qcc-m">{facts.caption}</span>}
          </span>

          {/* ⚠️ OMITTED ENTIRELY WHEN NOTHING IS RECORDED — four faded slots would state that this
              query went out with nothing in it, which is a different and much stronger claim than
              "we do not know what went". */}
          {facts.materialsRecorded && (
            <span className="qcc-mats">
              {MATERIAL_SLOTS.map((k) => (
                <span
                  key={k}
                  className={`qcc-ic${facts.materials[k] ? "" : " qcc-ic--off"}`}
                  title={MATERIAL_ROW_NAMES[k]}
                >
                  <Mark kind={k} />
                </span>
              ))}
              <span className="qcc-tip" role="note">
                <span className="qcc-tip-h">What went with this query</span>
                {MATERIAL_SLOTS.map((k) => (
                  <span key={k} className={`qcc-tip-row${facts.materials[k] ? "" : " qcc-tip-row--no"}`}>
                    <span>{MATERIAL_ROW_NAMES[k]}</span>
                    <span className="qcc-tip-v">{facts.materials[k] ?? "—"}</span>
                  </span>
                ))}
              </span>
            </span>
          )}
        </span>
      </span>
    </>
  );

  if (ghost) {
    return (
      <div className={cls} aria-hidden="true">
        {body}
      </div>
    );
  }

  /**
   * ⚠️ A CONTAINER, NOT A CONTROL, SINCE §5 OF THE GRID PASS. The band holds buttons now, and a
   * button may not contain another — so the card's open action is `.qcc-open`, its FIRST child:
   * first, so that Tab from the card reaches this card's verbs next. It carries the card's whole
   * name. A click anywhere else on the card reaches the handler below by bubbling; the verb row
   * stops its own clicks, so pressing a verb never opens the card underneath it.
   */
  return (
    <div className={cls} data-qcc-id={id} data-qcc-turn={facts.turn} onClick={() => onOpen?.(id)}>
      <button
        ref={openRef}
        type="button"
        className="qcc-open"
        aria-label={`${name}, ${agency} — ${status}. ${sentenceText(facts.sentence)}`}
      />
      {body}
    </div>
  );
};
