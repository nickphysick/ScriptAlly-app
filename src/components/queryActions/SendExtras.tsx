/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHAT THE SEND RUNG CARRIES, ON EVERY SURFACE THAT DRAWS A QUERY'S HISTORY (clean-up pass, 28 Sep).
 * Two things, in this order:
 *   · a requery's explanation — "Requery · previously closed 12 Aug, no reply" — as a link that opens
 *     the earlier query (lib/requery, the one check);
 *   · the materials treatment — the package band, the dashed box or the "not recorded" box — passed in
 *     as children, always the shared `SentBox` (components/queryActions/SentHow).
 * One component, so the quick card, the To-do pane and the Calendar cannot come to draw them apart.
 *
 * ⚠️ ITS STYLES ARE LITERALS, NOT TOKENS: the quick card portals to `document.body`, outside every
 * page's token scope, and a `var()` there resolves to nothing.
 */
import React from "react";
import "./sendExtras.css";

export interface RequeryRef { text: string; queryId: string }

export const SendExtras: React.FC<{
  requery?: RequeryRef | null;
  onOpenQuery?: (queryId: string, anchor: HTMLElement) => void;
  children?: React.ReactNode;
}> = ({ requery, onOpenQuery, children }) => {
  if (!requery && !children) return null;
  return (
    <div className="sx" data-send-extras>
      {requery ? (
        onOpenQuery
          ? <button type="button" className="sx-rq" data-requery={requery.queryId} title="Open the earlier query"
              onClick={(e) => { e.stopPropagation(); onOpenQuery(requery.queryId, e.currentTarget); }}>{requery.text}</button>
          : <span className="sx-rq" data-requery={requery.queryId}>{requery.text}</span>
      ) : null}
      {children}
    </div>
  );
};
