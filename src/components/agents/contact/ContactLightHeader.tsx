/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17 §A — THE ONE LIGHT HEADER, on the page colour: the eyebrow, "{N} agents on file", the byline
 * and two buttons; the cut-out hawk beside the title with its soft shadow behind the header's left; and a white
 * SUMMARY CARD on the right (a bar and three rows: Not queried, Querying, Closed) that filters the list.
 *
 * ⚠️ THE CARD'S FIGURES ARE v16's STRIP MODEL (`lib/contactGlance`), AND ITS FILTER IS THE STRIP'S OWN GROUP
 *    FILTER: the page's `glance` state, which "Clear all" already clears. Nothing is derived here.
 * ⚠️ THE ROWS ARE THE CONTROLS. A bar segment takes a pointer press too, but it is `aria-hidden`: the same
 *    three choices read once, as three buttons with `aria-pressed`.
 * ⚠️ THE TITLE KEEPS `data-page-title` (the hook anything asking "has the page's title scrolled past?" reads)
 *    and takes focus from the pinned row's "back to the top".
 */
import React from "react";
import type { GlanceKey, GlanceModel } from "../../../lib/contactGlance";
import { GLANCE_LABEL } from "../../../lib/contactGlance";
import { CONTACT_DISC_HAWK } from "./ContactOpenHeader";
import "./contactV17.css";

export const CONTACT_EYEBROW = "— CONTACT LIST —";
export const CONTACT_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };
/** "41 agents on file" / "1 agent on file" */
export const onFileWords = (n: number): string => (n === 1 ? "agent on file" : "agents on file");

const SEG: Record<GlanceKey, string> = { none: "n", live: "a", closed: "c" };

/** The bar and its three rows. `loading` holds every box and shows no figure. */
export const ContactSummaryCard: React.FC<{
  model: GlanceModel;
  active: GlanceKey | null;
  onGroup: (k: GlanceKey) => void;
  loading?: boolean;
}> = ({ model, active, onGroup, loading = false }) => (
  <div className="cl17-card" data-cl17="card" data-on={active ?? undefined} data-loading={loading ? "" : undefined}
    role="group" aria-label="Where your agents stand">
    <div className="cl17-bar" data-cl17="card-bar" aria-hidden="true">
      {model.cells.map((c) => (
        <i key={c.key} className={`cl17-sg cl17-sg--${SEG[c.key]}`} data-cl17="card-seg" data-k={c.key}
          data-on={active === c.key ? "" : undefined}
          style={{ flex: `${loading ? 1 : Math.max(c.n, 0)} 1 0` }}
          onClick={loading ? undefined : () => onGroup(c.key)} />
      ))}
    </div>
    {model.cells.map((c) => (
      <button key={c.key} type="button" className="cl17-row" data-cl17="card-row" data-k={c.key}
        aria-pressed={active === c.key} disabled={loading} onClick={() => onGroup(c.key)}>
        <i className={`cl17-sw cl17-sg--${SEG[c.key]}`} aria-hidden="true" />
        <b className="cl17-n" data-cl17="card-n">{loading ? "" : c.n}</b>
        <span className="cl17-lb" data-cl17="card-label">{GLANCE_LABEL[c.key]}</span>
        <span className="cl17-d" data-cl17="card-detail">
          {loading ? null : c.parts.map((p, i) => (
            <React.Fragment key={p.text}>
              {i > 0 ? ", " : null}
              <b className={p.hot ? "cl17-hot" : undefined}>{p.n}</b> {p.text}
            </React.Fragment>
          ))}
        </span>
      </button>
    ))}
  </div>
);

export const ContactLightHeader: React.FC<{
  /** true while the page settles: the header holds its shape and its controls are inert */
  loading: boolean;
  /** every agent on file; null while loading */
  total: number | null;
  /** the manuscript in scope, or null */
  msTitle: string | null;
  model: GlanceModel;
  active: GlanceKey | null;
  onGroup: (k: GlanceKey) => void;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  /** opens Discover; omitted when the route cannot be taken, and the button is then not drawn */
  onDiscover?: () => void;
  /** Part B — the search and filter row, under the header's rule */
  children?: React.ReactNode;
}> = ({ loading, total, msTitle, model, active, onGroup, addRef, onAdd, onDiscover, children }) => (
  <header className="cl17-hd" data-cl17="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    <img className="cl17-shadow" data-cl17="shadow" alt="" aria-hidden="true" src={`${CONTACT_SHADOW.src}?v=${CONTACT_SHADOW.version}`} />
    <div className="cl17-tr" data-cl17="header-row">
      <div className="cl17-tb" data-cl17="title-block">
        <span className="cl17-ey" data-cl17="eyebrow">{CONTACT_EYEBROW}</span>
        <h1 className="cl17-title" data-page-title="" data-cl17="title" tabIndex={-1}
          aria-label={total === null ? "Agents on file" : `${total} ${onFileWords(total)}`}>
          <span aria-hidden="true">
            {total === null ? <span className="cl17-blank" data-cl17="title-blank">00</span> : <span data-cl17="title-n">{total}</span>}
            {" "}{onFileWords(total ?? 0)}
          </span>
        </h1>
        <div className="cl17-by" data-cl17="byline">
          {msTitle ? <span className="cl17-byt">for <i className="cl17-ms" data-cl17="ms">{msTitle}</i></span> : <span className="cl17-byt">for your book</span>}
        </div>
        <div className="cl17-acts" data-cl17="acts">
          <button type="button" className="cl17-b1" data-cl15="add" data-cl17="add" ref={addRef} disabled={loading} onClick={onAdd}>+ Add an agent</button>
          {onDiscover ? <button type="button" className="cl17-b2" data-cl16="discover" data-cl17="discover" disabled={loading} onClick={onDiscover}>Discover agents</button> : null}
        </div>
      </div>
      <img className="cl17-art" data-cl17="art" alt="" aria-hidden="true" src={`${CONTACT_DISC_HAWK.src}?v=${CONTACT_DISC_HAWK.version}`} />
      <ContactSummaryCard model={model} active={active} onGroup={onGroup} loading={loading} />
    </div>
    {children}
  </header>
);
