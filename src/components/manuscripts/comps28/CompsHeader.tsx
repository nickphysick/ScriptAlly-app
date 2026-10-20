/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v28 §A — the header, in the app's two states (design-refs/comps-v28/comps-v28.html):
 *   · no comps (once loaded): the navy `EmptyPanel`, "Every comp, tracked";
 *   · comps: the `LightHeader`, "{n} comps on file", its card (where the comps are used; queries logged).
 * While loading, the light header's loading state and nothing else on the page (v27's rule: an account with comps
 * is never shown the empty page first).
 *
 * ⚠️ THE STATE IS THE COMP COUNT AND NOTHING ELSE, so the first save and the last remove switch it with no reload.
 * ⚠️ THE CARD'S THREE ROWS ARE `whereCounts` (lib/compsShelf), the shelf's own partition: pressing a row sets the
 *    shelf's "where" filter, which the shelf's segmented control also reads, so the two cannot disagree.
 */
import React from "react";
import { EmptyPanel } from "../../shell/EmptyPanel";
import { LightCardRing, LightCardRows, LightHeader } from "../../shell/LightHeader";
import type { Attachment } from "../../../lib/compUsage";
import { WHERE_LABEL, WHERE_ORDER, WHERE_SWATCH, type ShelfWhere } from "../../../lib/compsShelf";
import { COMPS_HEADER_ART } from "./art";

export const COMPS_EYEBROW = "— Comparable titles —";
export const EMPTY_TITLE = "Every comp, tracked";
export const HOW_LINK = "How comp tracking works";

/** "7 comps on file" / "1 comp on file" */
export const compsOnFile = (n: number): string => `${n} ${n === 1 ? "comp" : "comps"} on file`;

export const CompsStartPanel: React.FC<{ book: string | null; onAdd: () => void; onExplain: () => void; addRef?: React.Ref<HTMLButtonElement> }> = ({ book, onAdd, onExplain, addRef }) => (
  <EmptyPanel
    className="cx-empty-panel" attrs={{ "data-cx": "empty-panel" }}
    eyebrow={COMPS_EYEBROW}
    title={<>Every comp,<br />tracked</>} titleLabel={EMPTY_TITLE}
    body={<>Build a library of comps for <span className="epn-mono">{book ?? "your book"}</span>, add them to your query letters, and QueryHawk tracks which ones went out with the queries that got agents asking for more.</>}
    acts={(
      <>
        <button ref={addRef} type="button" className="epn-b1" data-cx="add-first" data-cx-key="add-first" onClick={onAdd}>+ Add your first comp</button>
        <button type="button" className="epn-b2" data-cx="explain" data-cx-key="explain" aria-haspopup="dialog" onClick={onExplain}>What makes a good comp?</button>
      </>
    )}
    art={<img data-cx="empty-art" alt="" src={`${COMPS_HEADER_ART.src}?v=${COMPS_HEADER_ART.version}`} width={COMPS_HEADER_ART.width} height={COMPS_HEADER_ART.height} />}
  />
);

export const CompsLightHeader: React.FC<{
  loading: boolean;
  count: number;
  book: string | null;
  counts: Record<ShelfWhere, number> | null;
  where: ShelfWhere | null;
  attachment: Attachment | null;
  full: boolean;
  onAdd: () => void;
  onPick: () => void;
  onHow: () => void;
  onWhere: (w: ShelfWhere) => void;
  onLanding: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
}> = (p) => {
  const att = p.attachment;
  const sent = att?.sent ?? 0;
  return (
    <LightHeader
      className="cx-lh" attrs={{ "data-cx": "header" }} loading={p.loading}
      eyebrow={COMPS_EYEBROW}
      title={p.loading
        ? <><span className="slh-blank">00</span> comps on file</>
        : <><b>{p.count}</b> {p.count === 1 ? "comp" : "comps"} on file</>}
      titleLabel={p.loading ? "Comparable titles" : compsOnFile(p.count)}
      book={p.book}
      acts={(
        <>
          <button ref={p.addRef} type="button" className="slh-p1" data-cx="add" data-cx-key="add" onClick={p.onAdd} disabled={p.loading || p.full}>{p.full ? "This list is full" : "+ Add a comp"}</button>
          <button type="button" className="slh-p2" data-cx="pick" data-cx-key="pick" onClick={p.onPick} disabled={p.loading}>Log comps in a letter</button>
        </>
      )}
      extra={(
        <button type="button" className="cx-hwl" data-cx="how-link" data-cx-key="how-link" aria-haspopup="dialog" onClick={p.onHow} disabled={p.loading}>
          <i aria-hidden="true">?</i><span>{HOW_LINK}</span>
        </button>
      )}
      card={(
        <>
          <LightCardRows
            label="Where your comps are used" loading={p.loading}
            rows={p.counts ? WHERE_ORDER.map((w) => ({
              key: w, count: p.counts![w], label: WHERE_LABEL[w], swatch: WHERE_SWATCH[w], pressed: p.where === w, onPress: () => p.onWhere(w),
            })) : null}
          />
          <LightCardRing
            loading={p.loading} pct={att?.rate ?? 0} label="Queries logged"
            sub={sent ? `${att!.logged} of ${sent} sent name their comps` : "No queries sent yet"}
            ariaLabel={sent ? `Queries logged: ${att!.logged} of ${sent} sent name their comps. See what’s landing.` : "Queries logged: no queries sent yet. See what’s landing."}
            onPress={p.onLanding}
          />
        </>
      )}
    />
  );
};
