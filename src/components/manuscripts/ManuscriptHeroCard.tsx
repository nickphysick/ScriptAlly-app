/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE LANDING'S HERO — one book, the only bright surface on the page ════════════════════════
 *
 * Ref: `design-refs/manuscripts-hero-landing.html`.
 *
 * ⚠️ THE CARD IS FULL BECAUSE THERE IS ENOUGH IN IT, and is never padded to a height. The record
 * column's foot is pinned with `margin-top: auto`, so a book with a short pitch gives a shorter
 * card rather than a card with a hole in it — which is the fault the list-and-tiles landing had in
 * every container it drew.
 *
 * ⚠️ EVERY FIGURE IS DERIVED AT READ TIME, through `bookFigures` — the book page's own derivation,
 * so the hero and the page it opens cannot disagree about the same book.
 */
import React from "react";
import { Manuscript, Query } from "../../types";
import { bookFigures } from "../../lib/bookFigures";
import { coverType } from "../../lib/heroBook";
import "./manuscriptHeroCard.css";

export interface ManuscriptHeroCardProps {
  manuscript: Manuscript;
  queries: Query[];
  genres: string[];
  status: string;
  shelved: boolean;
  /** Formatted, or null where nothing has been sent. */
  since: string | null;
  /** ⚠️ The ACCOUNT holder's name. There is no pen-name field — an open product item, not a gap
   *  to paper over here; see CLAUDE.md. */
  author: string;
  onOpen: () => void;
  onEditDetails: () => void;
  onWritePitch: () => void;
}

/** The four the brief names, in its order, pulled from the one derivation. */
const FIGURES: { key: string; label: string }[] = [
  { key: "sent", label: "Queries sent" },
  { key: "responses", label: "Responses" },
  { key: "holding", label: "Agents holding" },
  { key: "last", label: "Last sent" },
];

export const ManuscriptHeroCard: React.FC<ManuscriptHeroCardProps> = ({
  manuscript, queries, genres, status, shelved, since, author, onOpen, onEditDetails, onWritePitch,
}) => {
  const mine = queries.filter((q) => q.manuscriptId === manuscript.id);
  const figs = bookFigures(mine);
  const val = (k: string) => figs.find((f) => f.key === k)?.value ?? "—";
  const type = coverType(manuscript.title, author);

  return (
    <section className="mhc">
      {/* ⚠️ THE COVER WELL — sage with fine grain, and the ONLY tinted area left on this page. */}
      <div className="mhc-well">
        {/**
          * ⚠️ A TYPESET COVER, NEVER A PLACEHOLDER. A manuscript without artwork still has a title
          * and an author, which is enough to set a cover from. An empty tinted block reads as a
          * failed image and a glyph reads as "no cover"; this reads as a book, which is what it is.
          *
          * ⚠️ THE TYPE SIZE IS DERIVED, because the box has a fixed height: overflow here is a CROP,
          * not a reflow, so a long title loses its bottom line and nothing looks broken. See
          * `coverType`.
          */}
        <div className="mhc-cover">
          <div
            className="mhc-covertitle"
            style={{ fontSize: type.titleSize, WebkitLineClamp: type.titleLines } as React.CSSProperties}
          >
            {manuscript.title}
          </div>
          <div className="mhc-coverrule" aria-hidden="true" />
          <div className="mhc-coverby" style={{ fontSize: type.authorSize }}>{author}</div>
        </div>
      </div>

      <div className="mhc-rec">
        {/* ⚠️ A PLAIN DOT, not `StatusDot`: that draws the QUERY pipeline, and a manuscript's status
            is another system. The shelf list made the same call for the same reason. */}
        <div className="mhc-kicker">
          <span className={`mhc-dot${shelved ? " mhc-dot--shelved" : ""}`} aria-hidden="true" />
          {status}
          {/* ⚠️ `· since <date>` OMITS ITSELF when nothing has been sent — a since-date the app does
              not have is not rendered as a dash, which would assert a start it does not know. */}
          {since && <span className="mhc-since">· since {since}</span>}
        </div>

        <h2 className="mhc-title">{manuscript.title}</h2>

        <div className="mhc-byline">
          {genres.map((g, i) => (
            <React.Fragment key={g}>{i > 0 && " · "}<b>{g}</b></React.Fragment>
          ))}
          {manuscript.wordCount ? (
            <>{genres.length > 0 && " · "}{manuscript.wordCount.toLocaleString("en-GB")} words</>
          ) : null}
        </div>

        {/**
          * ⚠️ THE EMPTY PITCH IS ONE LINE AND IS NOT CLAMPED. `.mhc-pitch` carries a line-clamp for
          * a long pitch; applying it to the prompt as well would clip the invitation the state
          * exists to make — the trap named in the brief. Two classes, one clamp.
          *
          * ⚠️ AND THE PROMPT IS A CONTROL, NOT A PLACEHOLDER: nothing here can be persisted as the
          * field's value.
          */}
        {manuscript.elevatorPitch ? (
          <p className="mhc-pitch">{manuscript.elevatorPitch}</p>
        ) : (
          <p className="mhc-nopitch">
            No elevator pitch yet.{" "}
            <button type="button" className="mhc-write" onClick={onWritePitch}>Write one</button>
            {" "}— it&rsquo;s what you&rsquo;d say to an agent in the space of a few seconds.
          </p>
        )}

        {/* ⚠️ PINNED WITH `margin-top: auto`, never by giving the card a height. */}
        <div className="mhc-foot">
          <div className="mhc-figs">
            {FIGURES.map((f) => (
              <div className="mhc-fig" key={f.key}>
                <div className="mhc-fign">{val(f.key)}</div>
                <div className="mhc-figl">{f.label}</div>
              </div>
            ))}
          </div>
          <div className="mhc-acts">
            <button type="button" className="mhc-quiet" onClick={onEditDetails}>Edit details</button>
            {/* ⚠️ THE APP'S NEAR-BLACK. No burgundy fill — the house rule, not a preference. */}
            <button type="button" className="mhc-pill" onClick={onOpen}>Open manuscript</button>
          </div>
        </div>
      </div>
    </section>
  );
};
