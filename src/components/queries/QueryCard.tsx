/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryCard — one query as an object you can scan, and nothing else.
 *
 * ⚠️ IT IS PURE AND IT DERIVES NOTHING. Every word on it arrives as `facts` from `cardFacts`; this
 * file decides where things sit and never what they say. A card that computed its own elapsed
 * figure would be a second derivation of the one thing the panel behind it also states.
 *
 * ⚠️ THE DOT IS `StatusDot` AND NOTHING ELSE. `design-refs/query-centre.html` draws its own inline
 * SVG circles because a standalone mockup has no component to import — they are stand-ins, not a
 * design. Every query status in this app is drawn by that one component, at 24px here.
 *
 * ⚠️ NO BURGUNDY. Not in the band, not in the marker, not on hover. On this page burgundy belongs
 * to `StatusDot` and the Form 11 chrome; anything else wearing it reads as a control.
 */
import React from "react";
import "./queryCard.css";
import { StatusDot } from "../StatusDot";
import type { QueryStatus } from "../../types";
import { MATERIAL_ROW_NAMES, type MaterialKind } from "../../lib/agentMaterials";
import { MATERIAL_SLOTS, sentenceText, type CardFacts } from "../../lib/queryCardFacts";

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

const Mark: React.FC<{ kind: MaterialKind }> = ({ kind }) => (
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
  ghost = false,
}) => {
  const cls = [
    "qcc",
    `qcc--${facts.turn}`,
    selected ? "qcc--sel" : "",
    entering ? "qcc--enter" : "",
    ghost ? "qcc--ghost" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span className="qcc-band">
        <StatusDot status={status} overrideSize={24} />
        <span className="qcc-word">{status}</span>
        <span className="qcc-turn">{facts.turnWord}</span>
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

        <span className="qcc-fact">
          <span className="qcc-facttx">
            <span className="qcc-s">
              {/* ⚠️ THE MARKER CARRIES ITS OWN WORDS. A bare "!" is a shape to a screen reader;
                  the sentence beside it already states the fact, so the label names the CONDITION
                  rather than repeating it. */}
              {facts.attention && (
                <span className="qcc-mk" role="img" aria-label="Needs attention">
                  !
                </span>
              )}
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

  return (
    <button
      type="button"
      className={cls}
      data-qcc-id={id}
      data-qcc-turn={facts.turn}
      /* The whole card is one control, so its name is the whole card: who, and where it stands. */
      aria-label={`${name}, ${agency} — ${status}. ${sentenceText(facts.sentence)}`}
      onClick={() => onOpen?.(id)}
    >
      {body}
    </button>
  );
};
