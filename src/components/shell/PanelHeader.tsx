/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PANEL HEADER (header v3, 10 Oct; ref design-refs/shell/header-v3-qc.html `.ohdr`). One header on every
 * workspace page: the Analytics navy panel, the text block on the left and the page's drawing on the right,
 * vertically centred.
 *
 * Two kinds, one panel:
 *   · NUMBER — a page with a living count leads with it: a large typewriter number, its words beside it on the
 *     first row and a subline on the second, the buttons underneath.
 *   · TITLE — a page with no count shows a title in the number's place, its subline under it.
 *
 * ⚠️ THE `h1` HOLDS THE NUMBER AND THE WORDS AND NOTHING ELSE. Its accessible name is "{number} {words}" and it
 *    keeps `data-page-title`. The subline is a `<p>` OUTSIDE the h1, placed in the title block's second row
 *    (the h1 is a subgrid of that block, so the number, the words and the subline share one set of tracks).
 * ⚠️ NO STAMP AND NO FACES IN ANY HEADER (baked decision 3). `.hpanel-stamp` stays in headerPanel.css, unused.
 * ⚠️ LOADING: the number is a blank of its full box (`number === null`); the words, the subline, the buttons
 *    and the drawing hold their sizes, so nothing moves when the count arrives.
 * ⚠️ EVERY PAGE KEEPS ITS OWN PLACE IN ITS OWN GRID: `className` carries the page's root class (which its
 *    sheet places), and `attrs` its own data attributes. This component states the panel and nothing about
 *    where the panel sits.
 */
import React from "react";
import "./headerPanel.css";

export interface PanelButton {
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  btnRef?: React.Ref<HTMLButtonElement>;
  /** data attributes for the page's own probes */
  attrs?: Record<string, string | undefined>;
}

export interface PanelHeaderProps {
  kind: "number" | "title";
  /** NUMBER: the count; null while it settles (a blank of the number's box) */
  number?: number | null;
  /** NUMBER: the words after the number, lowercase as the page writes them ("queries sent") */
  words?: string;
  /** TITLE: the title, and anything that rides after it (Discover's Pro pill) */
  title?: React.ReactNode;
  titleAdornment?: React.ReactNode;
  /** the subline; a book's title in it is the caller's `<em>` */
  sub?: React.ReactNode;
  /** true keeps the subline's line while it has nothing to say yet */
  subPending?: boolean;
  primary?: PanelButton;
  secondary?: PanelButton;
  /** a page that builds its own buttons passes them whole, in place of `primary` / `secondary` */
  acts?: React.ReactNode;
  /** rides in the buttons' row (a popover anchored to it) */
  actsExtra?: React.ReactNode;
  /** the drawing; `disc` stands a drawing made for a light ground on the panel's white disc */
  art?: React.ReactNode;
  disc?: boolean;
  /** a sentence only a screen reader reads */
  said?: React.ReactNode;
  loading?: boolean;
  className?: string;
  attrs?: Record<string, string | undefined>;
  headerRef?: React.Ref<HTMLElement>;
}

const Btn: React.FC<{ b: PanelButton; kind: "b1" | "b2"; off: boolean }> = ({ b, kind, off }) => (
  <button ref={b.btnRef} type="button" className={`hp3-btn hpanel-${kind}`} onClick={b.onClick} disabled={b.disabled || off} {...b.attrs}>{b.label}</button>
);

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  kind, number = null, words = "", title, titleAdornment, sub, subPending = false, primary, secondary, acts, actsExtra,
  art, disc = false, said, loading = false, className, attrs, headerRef,
}) => {
  const blank = kind === "number" && (loading || number === null);
  const hasActs = !!(primary || secondary || acts);
  return (
    <header ref={headerRef} className={`${className ? `${className} ` : ""}hpanel hpanel--hero hp3 hp3--${kind}${art ? "" : " hp3--noart"}`}
      data-hpanel="" data-hp3={kind} data-loading={loading || blank ? "" : undefined} aria-busy={loading || blank || undefined} {...attrs}>
      <div className="hp3-txt" data-hp3-part="text">
        {kind === "number" ? (
          <div className="hp3-tb" data-hp3-part="title-block">
            <h1 className="hp3-h1" data-probe="title" data-page-title="" aria-label={blank ? undefined : `${number} ${words}`}>
              {/* ⚠️ UNSETTLED = NO TEXT, AND THE SAME BOXES. While the count is not known the number and its words are
                  blanks: their text is drawn by `::before` from `data-blank`, hidden, so each keeps its full box and
                  the h1 holds no text a reader or a screen reader could take for a count (living headers LH10). */}
              {blank ? (
                <>
                  <span className="hp3-n hp3-blank" data-hp3-part="number" data-blank="00" aria-hidden="true" />
                  <span className="hp3-w hp3-blank" data-hp3-part="words" data-blank={words} aria-hidden="true" />
                </>
              ) : (
                <>
                  <span className="hp3-n" data-hp3-part="number">{number}</span>
                  {/* a real space, so the title still reads "27 queries sent" as text (the grid draws none) */}
                  {" "}
                  <span className="hp3-w" data-hp3-part="words">{words}</span>
                </>
              )}
            </h1>
            {(sub || subPending) && <p className="hp3-s" data-probe="intro" data-hp3-part="sub">{sub ?? " "}</p>}
          </div>
        ) : (
          <>
            <h1 className="hp3-title" data-probe="title" data-page-title="">{title}{titleAdornment}</h1>
            {(sub || subPending) && <p className="hp3-sub" data-probe="intro" data-hp3-part="sub">{sub ?? " "}</p>}
          </>
        )}
        {said ? <span className="sr-only" data-hp3-part="said">{said}</span> : null}
        {hasActs && (
          <div className="hp3-acts" data-probe="actions" data-hp3-part="acts">
            {acts ?? (
              <>
                {primary && <Btn b={primary} kind="b1" off={loading} />}
                {secondary && <Btn b={secondary} kind="b2" off={loading} />}
              </>
            )}
            {actsExtra}
          </div>
        )}
      </div>
      {art ? <div className={`hp3-art${disc ? " hpanel-disc" : ""}`} data-probe="art" data-hp3-part="art" aria-hidden="true">{art}</div> : null}
    </header>
  );
};

/** Split a living headline into its number and its words: "12 comp titles" → "comp titles"; null when it has no number. */
export function wordsOf(headline: string): string | null {
  const m = headline.match(/^(?:\d[\d,]*|One)\s+(.+)$/);
  return m ? m[1] : null;
}
