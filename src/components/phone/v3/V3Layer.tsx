/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — THE ONE OVERLAY HOST (ref `#layer`): whichever sheet or journey v3Store holds, over a scrim, and the
 * navy snackbar. Portalled under <body> in a `.pa-layer` host, so it reads the phone tokens and covers the whole
 * screen. Mounted by the shell on a phone only.
 */
import React, { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { closeV3, clearV3Snack, subscribeV3, v3Overlay, v3Seq, v3Snack, type V3Overlay } from "./v3Store";
import { useV3Data } from "./V3Provider";
import { QueryPageV4 } from "../v4/QueryPageV4";
import { SearchV4 } from "../v4/SearchV4";

export interface V3Panels {
  /** the panels later phases add (+, journeys, agent sheet); each returns null when it does not draw this overlay */
  render?: (o: V3Overlay) => React.ReactNode;
}

export const V3Layer: React.FC<V3Panels> = ({ render }) => {
  const o = useSyncExternalStore(subscribeV3, v3Overlay, v3Overlay);
  const snack = useSyncExternalStore(subscribeV3, v3Snack, v3Snack);
  const seq = useSyncExternalStore(subscribeV3, v3Seq, v3Seq);
  const v = useV3Data();
  /* Escape closes the overlay (the app's journeys own their own Escape) */
  useEffect(() => {
    if (!o) return undefined;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") closeV3(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [o]);
  let body: React.ReactNode = null;
  let full = false;
  if (o?.type === "query") {
    const q = v.byId.get(o.id);
    body = q ? <QueryPageV4 v={q} nowMs={v.now} quietWeeks={v.quietWeeks} /> : null;
    full = true;
  } else if (o?.type === "search") {
    body = <SearchV4 />;
    full = true;
  } else if (o) {
    body = render?.(o) ?? null;
    full = o.type === "reply" || o.type === "add" || o.type === "agents-all";
  }
  if (!body && !snack) return null;
  return createPortal(
    <div className="pa3 pa3-layer pa-layer pa4-layer" data-pa3="layer" data-pa4="layer" style={body ? undefined : { pointerEvents: "none", inset: "auto" }}>
      {body ? (<React.Fragment key={seq}>{full ? null : <div className="pa4-scrim" data-pa3="scrim" onClick={closeV3} />}{body}</React.Fragment>) : null}
      {snack ? (
        /* Phone app v4: the snackbar keeps Undo and loses the hawk (the board's `.snack`) */
        <div className={`pa4-snack${o?.type === "query" ? "" : " low"}`} role="status" data-pa3="snack" data-pa4="snack" style={{ pointerEvents: "auto" }}>
          <span>{snack.msg}</span>
          {snack.undo ? <button type="button" data-pa3="undo" onClick={() => { const u = snack.undo!; clearV3Snack(); void u(); }}>Undo</button> : null}
        </div>
      ) : null}
    </div>,
    document.body,
  );
};
