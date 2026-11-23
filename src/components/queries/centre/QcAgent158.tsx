/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v158 §3 (design-refs/query-card-v158/query-card-v158.html, "Profile, facts first") — the slide-out card's
 * Agent tab while reading: three fact boxes (Replies in, Takes queries, Last heard) and what the agent asks for.
 *
 * Query card v167 §A — THE SAME SHELL WHATEVER IS RECORDED: a missing value is a ghost bar in its place (QcGhost167),
 * never a sentence, a dash or a link. The three boxes are a fixed 86px, their value 15.5px on one line.
 * Query card v167 §B — THE SLIMMER TAB: the tiles, "What {first} asks for", and one row to the agent's full card. Copy
 * email, the website, the wishlist, "Edit these details" and the "You sent everything" line live on the full card.
 * A tile, or the asks list, opens the card's own profile drawer (QcProfile167) — never the old double-click edit mode.
 *
 * ⚠️ THE AGENT IS ALWAYS NAMED. Never "he", "she" or "they": the shared method words' "Through their submission form" is
 *    said "By online form" here (`takesWords`).
 */
import { MaterialItemIcon } from "../../shared/MaterialIcon";
import React from "react";
import type { AskChip } from "../../../lib/qcThread152";
import { dayLabel } from "../../../lib/qcThread152";
import { ARROW, Bar, Ghost, Seal, editable } from "./QcGhost167";
import { EditPen } from "./QcEdit168";

/** v167 — the three things the Agent tab edits, each in its own profile drawer */
export type ProfileKey = "weeks" | "method" | "asks";

export interface AgentTab158Props {
  first: string;
  /** the agent's initials, for the seal on the full-card row */
  initials: string;
  nowMs: number;
  weeks: number | null;
  nrmn: boolean | null;
  how: string | null;
  queriedVia: string | null;
  sentMs: number | null;
  lastHeardMs: number | null;
  asks: { chips: AskChip[] };
  hasAsks: boolean;
  /** v167 — open a profile drawer at a detail (null: not editable here, e.g. while the pencil's edit mode is on) */
  onOpen: ((k: ProfileKey) => void) | null;
  /** Query card v168 §7 — Last heard is not edited here: the props that show why, in the card's tip box */
  heardWhy?: Record<string, unknown>;
  /** "{first}'s full card": the agent's card, by the route the card has always used */
  onFullCard: () => void;
  /** the detail whose drawer is open (its box keeps the navy edge) */
  editing?: ProfileKey | null;
  /** the detail just saved: its value fades in (350ms), its box does not change size */
  just?: { k: ProfileKey; n: number } | null;
}

/** "Through their submission form" (lib/agentPanel methodAnswer) names the agent by a pronoun: the box says it plainly */
export const takesWords = (how: string | null): string | null => (how === "Through their submission form" ? "By online form" : how);
const days = (a: number, b: number) => Math.max(0, Math.round((a - b) / 86_400_000));
const pl = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
/** "Query letter" → "Query letter"; "FIRST 5 CHAPTERS" → "First 5 chapters" */
export const sentenceCase = (s: string): string => { const t = s.trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t; };

export const TICK = <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 6.2 2 2 4-4.4" /></svg>;

/* Agent card v2 — the presentational part the agent card shares (lifted, not copied): a fact box (v167 retired Copy
   email and the website button with the tab's contact row; the agent card draws its own). Their DOM is the query card's own; the agent card draws them inside its own `.qc152` root. */
export const NxBox: React.FC<{ k: string; label: string; value: React.ReactNode; sub?: React.ReactNode; extra?: Record<string, unknown> }> = ({ k, label, value, sub, extra }) => (
  <div className="nx-box" data-qc158="box" data-k={k} {...extra}>
    <small>{label}</small>
    <b data-qc158="value">{value}</b>
    {sub ? <i>{sub}</i> : null}
  </div>
);

/** v167 — a fact box on the query card: a fixed 86px, the value on one line, a ghost bar where nothing is recorded */
const Tile: React.FC<{ k: string; label: string; value: React.ReactNode | null; sub?: React.ReactNode; ghost: { w: number; words: string } | null;
  open: (() => void) | null; valueClass?: string; cls?: string; fin?: string; finKey?: string; extra?: Record<string, unknown> }> = ({ k, label, value, sub, ghost, open, valueClass, cls, fin, finKey, extra }) => (
  /* v168 — a tile with a value takes the pencil (the keyboard's way in; a click anywhere on the tile still opens it);
     a ghost tile stays one "+ Add …" button, as v167 drew it */
  <div className={`nx-box qc167-tile${cls ?? ""}`} data-qc158="box" data-qc167="tile" data-k={k} data-ghost={value == null ? "" : undefined}
    {...(open && value != null ? { onClick: open, "data-qc168-host": "", "data-qc167-ed": "" } : editable(value == null && ghost ? `${label}: + ${ghost.words}` : `${label}: edit`, open))} {...extra}>
    <small>{label}</small>
    {value == null
      ? <b data-qc158="value" className="qc167-gv">{ghost ? <Ghost w={ghost.w} words={open ? ghost.words : null} /> : null}</b>
      : <b key={finKey} data-qc158="value" className={[valueClass, fin].filter(Boolean).join(" ") || undefined}>{value}</b>}
    <i key={`i-${finKey}`} data-qc167="sub" className={value != null && sub ? fin : undefined}>{value != null && sub ? sub : "\u00a0"}</i>
    {open && value != null ? <EditPen label={label.toLowerCase()} onOpen={open} data={{ "data-qc168-k": `tile:${k}` }} /> : null}
  </div>
);

export const AgentTab158: React.FC<AgentTab158Props> = (p) => {
  const how = takesWords(p.how);
  const heardSub = p.lastHeardMs != null ? (days(p.nowMs, p.lastHeardMs) === 0 ? "today" : `${pl(days(p.nowMs, p.lastHeardMs), "day")} ago`)
    : p.sentMs != null ? <>since {dayLabel(p.sentMs, p.nowMs)}</> : null;
  const open = (k: ProfileKey) => (p.onOpen ? () => p.onOpen!(k) : null);
  const fin = (k: ProfileKey) => (p.just && p.just.k === k ? "qc167-fin" : undefined);
  const finKey = (k: ProfileKey) => (p.just && p.just.k === k ? `fin-${p.just.n}` : "rest");
  const ed = (k: ProfileKey) => (p.editing === k ? " is-ed" : "");
  return (
    <div className="nx" data-qc152="agent-pane" data-qc158="agent" data-qc167="agent">
      <div className="nx-boxes" data-qc158="boxes">
        <Tile k="reply" label="Replies in" open={open("weeks")} cls={ed("weeks")} fin={fin("weeks")} finKey={finKey("weeks")}
          value={p.weeks != null ? <>About {pl(p.weeks, "week")}</> : null} ghost={{ w: 70, words: "Add reply time" }}
          sub={p.nrmn === true ? "no reply means no" : p.nrmn === false ? "always replies" : null} />
        <Tile k="method" label="Takes queries" open={open("method")} cls={ed("method")} fin={fin("method")} finKey={finKey("method")}
          value={how ?? null} ghost={{ w: 62, words: "Add how" }}
          sub={p.queriedVia ? <>you queried {p.queriedVia}</> : null} />
        {/* Last heard is the thread's, never the profile's: not editable, and "Not yet" (smaller, italic, grey) until a reply */}
        <Tile k="heard" label="Last heard" open={null} ghost={null} extra={p.heardWhy}
          value={p.lastHeardMs != null ? dayLabel(p.lastHeardMs, p.nowMs) : "Not yet"} valueClass={p.lastHeardMs != null ? undefined : "qc167-notyet"}
          sub={heardSub} />
      </div>

      <section data-qc158="asks" data-qc167="asks">
        <h4 data-qc167="asks-head">What {p.first} asks for</h4>
        {/* one wrapper whatever is recorded (the same shell): the list, or three ghost rows with the words over them */}
        {p.hasAsks ? (
          <div className={`qc167-gsw${ed("asks")}`} data-qc167="asks-list" {...(open("asks") ? { onClick: open("asks")!, "data-qc168-host": "", "data-qc167-ed": "" } : {})}>
          {open("asks") ? <EditPen label={`what ${p.first} asks for`} onOpen={open("asks")!} data={{ "data-qc168-k": "tile:asks" }} /> : null}
          <ul key={finKey("asks")} className={`nx-list qc167-asks${fin("asks") ? ` ${fin("asks")}` : ""}`}>
            {p.asks.chips.map((c) => (
              <li key={c.label} data-qc158="ask" data-sent={c.sent ? "" : undefined}>
                <span className={`nx-tick${c.sent ? "" : " no"}`} aria-hidden="true">{TICK}</span>
                <MaterialItemIcon kind={c.icon} size={20} />{sentenceCase(c.label)}
                <span className="r">{c.sent ? "sent with your query" : "not sent"}</span>
              </li>
            ))}
          </ul>
          </div>
        ) : (
          <div className={`qc167-gsw${ed("asks")}`} data-qc167="asks-list" data-ghost="" {...editable(`+ Add what ${p.first} asks for`, open("asks"))}>
            <ul className="nx-list qc167-gl">
              {[38, 30, 46].map((w) => <li key={w}><span className="nx-tick no" aria-hidden="true" /><Bar w={w} /></li>)}
            </ul>
            {p.onOpen ? <span className="qc167-gso" data-qc167="words" aria-hidden="true">+ Add what {p.first} asks for</span> : null}
          </div>
        )}
      </section>

      {/* v167 §B — the agent's email, website, wishlist and the rest live on the full card */}
      <button type="button" className="qc167-fullc" data-qc152="open-agent" data-qc167="full-card" onClick={p.onFullCard}>
        <Seal initials={p.initials} /><span>{p.first}’s full card</span><span className="qc167-ar" aria-hidden="true">{ARROW}</span>
      </button>
    </div>
  );
};
